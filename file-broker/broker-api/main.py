import os
import json
import hashlib
import uuid
import asyncio
import mimetypes
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import uvicorn
import aiofiles
import jwt
from PIL import Image
import io

# Configuration
class Config:
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1024 * 1024))  # 1MB chunks
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/file-broker")
    THUMBNAIL_SIZE = (150, 150)
    PREVIEW_SIZE = (800, 600)

config = Config()

# Pydantic Models
class FileMetadata(BaseModel):
    id: str
    filename: str
    size: int
    content_type: str
    chunks: List[str]
    owner: str
    created_at: str
    updated_at: Optional[str] = None
    hash: str
    tags: List[str] = []
    description: Optional[str] = None
    is_shared: bool = False
    share_token: Optional[str] = None
    access_count: int = 0

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    status: str = "uploaded"

class FileListResponse(BaseModel):
    files: List[FileMetadata]
    total: int
    page: int
    limit: int

class ShareLinkRequest(BaseModel):
    expires_in: Optional[int] = 3600  # 1 Stunde
    password: Optional[str] = None
    download_limit: Optional[int] = None

class UserInfo(BaseModel):
    user_id: str
    username: Optional[str] = None

# FastAPI App
app = FastAPI(
    title="File Broker API",
    description="Dropbox-like File Management with Redis Storage",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Redis Connection
redis_client = None

async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)
    return redis_client

# File Service Class
class FileBrokerService:
    def __init__(self):
        self.redis = None
        self.subscribers = {}
        
    async def init_redis(self):
        self.redis = await get_redis()
        
    async def store_file(self, file: UploadFile, user_id: str) -> FileMetadata:
        """Datei in Redis speichern mit Chunking"""
        if not self.redis:
            await self.init_redis()
            
        # File ID generieren
        file_id = str(uuid.uuid4())
        
        # File Content lesen
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        # Validierung
        if len(content) > config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size: {config.MAX_FILE_SIZE} bytes"
            )
        
        # Content Type ermitteln
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        
        # File in Chunks aufteilen
        chunks = []
        for i in range(0, len(content), config.CHUNK_SIZE):
            chunk_id = f"chunk:{file_id}:{i//config.CHUNK_SIZE}"
            chunk_data = content[i:i+config.CHUNK_SIZE]
            chunks.append(chunk_id)
            
            # Chunk in Redis speichern (binary data)
            await self.redis.set(chunk_id, chunk_data)
            # TTL für Chunks setzen (30 Tage)
            await self.redis.expire(chunk_id, 30 * 24 * 3600)
        
        # File Hash berechnen
        file_hash = hashlib.md5(content).hexdigest()
        
        # Metadata erstellen
        metadata = FileMetadata(
            id=file_id,
            filename=file.filename,
            size=len(content),
            content_type=content_type,
            chunks=chunks,
            owner=user_id,
            created_at=datetime.utcnow().isoformat(),
            hash=file_hash
        )
        
        # Metadata in Redis speichern
        await self.redis.set(f"file:{file_id}", metadata.json())
        await self.redis.expire(f"file:{file_id}", 30 * 24 * 3600)
        
        # User Files Index aktualisieren
        await self.redis.sadd(f"user_files:{user_id}", file_id)
        
        # Global Files Index
        await self.redis.zadd("all_files", {file_id: datetime.utcnow().timestamp()})
        
        # Statistics aktualisieren
        await self.update_user_stats(user_id, "upload", len(content))
        
        # Thumbnail generieren (Background Task)
        if content_type.startswith('image/'):
            asyncio.create_task(self.generate_thumbnail(file_id, content))
        
        return metadata
    
    async def get_file_content(self, file_id: str) -> bytes:
        """File Content aus Redis laden"""
        if not self.redis:
            await self.init_redis()
            
        # Metadata laden
        metadata_json = await self.redis.get(f"file:{file_id}")
        if not metadata_json:
            raise HTTPException(status_code=404, detail="File not found")
        
        metadata = FileMetadata.parse_raw(metadata_json)
        
        # Chunks zusammenfügen
        content = b''
        for chunk_id in metadata.chunks:
            chunk_data = await self.redis.get(chunk_id)
            if chunk_data:
                content += chunk_data if isinstance(chunk_data, bytes) else chunk_data.encode()
        
        # Access Count erhöhen
        metadata.access_count += 1
        await self.redis.set(f"file:{file_id}", metadata.json())
        
        return content
    
    async def get_file_metadata(self, file_id: str) -> Optional[FileMetadata]:
        """File Metadata laden"""
        if not self.redis:
            await self.init_redis()
            
        metadata_json = await self.redis.get(f"file:{file_id}")
        if not metadata_json:
            return None
        
        return FileMetadata.parse_raw(metadata_json)
    
    async def delete_file(self, file_id: str, user_id: str) -> bool:
        """Datei löschen"""
        if not self.redis:
            await self.init_redis()
            
        # Metadata prüfen
        metadata = await self.get_file_metadata(file_id)
        if not metadata:
            return False
        
        # Berechtigung prüfen
        if metadata.owner != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")
        
        # Chunks löschen
        for chunk_id in metadata.chunks:
            await self.redis.delete(chunk_id)
        
        # Metadata löschen
        await self.redis.delete(f"file:{file_id}")
        
        # Thumbnail löschen
        await self.redis.delete(f"thumbnail:{file_id}")
        
        # Indexes aktualisieren
        await self.redis.srem(f"user_files:{user_id}", file_id)
        await self.redis.zrem("all_files", file_id)
        
        # Statistics aktualisieren
        await self.update_user_stats(user_id, "delete", -metadata.size)
        
        return True
    
    async def list_user_files(self, user_id: str, page: int = 1, limit: int = 20, search: str = None) -> FileListResponse:
        """User Files auflisten"""
        if not self.redis:
            await self.init_redis()
        
        # File IDs für User laden
        file_ids = await self.redis.smembers(f"user_files:{user_id}")
        
        files = []
        for file_id in file_ids:
            metadata = await self.get_file_metadata(file_id)
            if metadata:
                # Search Filter
                if search and search.lower() not in metadata.filename.lower():
                    continue
                files.append(metadata)
        
        # Sortieren nach created_at (neueste zuerst)
        files.sort(key=lambda x: x.created_at, reverse=True)
        
        # Pagination
        total = len(files)
        start = (page - 1) * limit
        end = start + limit
        paginated_files = files[start:end]
        
        return FileListResponse(
            files=paginated_files,
            total=total,
            page=page,
            limit=limit
        )
    
    async def generate_thumbnail(self, file_id: str, content: bytes):
        """Thumbnail für Bilder generieren"""
        try:
            image = Image.open(io.BytesIO(content))
            image.thumbnail(config.THUMBNAIL_SIZE)
            
            # Thumbnail als JPEG speichern
            thumbnail_buffer = io.BytesIO()
            image.convert('RGB').save(thumbnail_buffer, format='JPEG', quality=85)
            thumbnail_data = thumbnail_buffer.getvalue()
            
            # In Redis speichern
            await self.redis.set(f"thumbnail:{file_id}", thumbnail_data)
            await self.redis.expire(f"thumbnail:{file_id}", 30 * 24 * 3600)
            
        except Exception as e:
            print(f"Error generating thumbnail for {file_id}: {e}")
    
    async def get_thumbnail(self, file_id: str) -> Optional[bytes]:
        """Thumbnail laden"""
        if not self.redis:
            await self.init_redis()
            
        thumbnail_data = await self.redis.get(f"thumbnail:{file_id}")
        return thumbnail_data if isinstance(thumbnail_data, bytes) else None
    
    async def create_share_link(self, file_id: str, user_id: str, request: ShareLinkRequest) -> Dict:
        """Share Link erstellen"""
        if not self.redis:
            await self.init_redis()
            
        # File existiert und gehört User?
        metadata = await self.get_file_metadata(file_id)
        if not metadata or metadata.owner != user_id:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Share Token generieren
        share_token = str(uuid.uuid4())
        
        # Share Info
        share_info = {
            "file_id": file_id,
            "created_by": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(seconds=request.expires_in)).isoformat() if request.expires_in else None,
            "password": request.password,
            "download_limit": request.download_limit,
            "download_count": 0
        }
        
        # In Redis speichern
        await self.redis.set(f"share:{share_token}", json.dumps(share_info))
        if request.expires_in:
            await self.redis.expire(f"share:{share_token}", request.expires_in)
        
        # File als shared markieren
        metadata.is_shared = True
        metadata.share_token = share_token
        await self.redis.set(f"file:{file_id}", metadata.json())
        
        return {
            "share_token": share_token,
            "share_url": f"/share/{share_token}",
            "expires_at": share_info["expires_at"]
        }
    
    async def update_user_stats(self, user_id: str, operation: str, size_delta: int):
        """User Statistics aktualisieren"""
        stats_key = f"stats:{user_id}"
        
        # Current stats laden
        stats_json = await self.redis.get(stats_key)
        stats = json.loads(stats_json) if stats_json else {
            "total_files": 0,
            "total_size": 0,
            "uploads_today": 0,
            "downloads_today": 0,
            "last_activity": None
        }
        
        # Stats aktualisieren
        if operation == "upload":
            stats["total_files"] += 1
            stats["total_size"] += size_delta
            stats["uploads_today"] += 1
        elif operation == "delete":
            stats["total_files"] -= 1
            stats["total_size"] += size_delta  # size_delta ist negativ
        elif operation == "download":
            stats["downloads_today"] += 1
        
        stats["last_activity"] = datetime.utcnow().isoformat()
        
        # Zurück in Redis
        await self.redis.set(stats_key, json.dumps(stats))
        await self.redis.expire(stats_key, 7 * 24 * 3600)  # 7 Tage

# Service Instance
file_service = FileBrokerService()

# WebSocket Manager
class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except:
                    pass  # Connection closed
    
    async def broadcast_event(self, event_type: str, data: Dict):
        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    await connection.send_text(message)
                except:
                    pass

ws_manager = WebSocketManager()

# Authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, config.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return UserInfo(user_id=user_id)
    except jwt.PyJWTError:
        # Für Development: Default User
        return UserInfo(user_id="default")

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials:
        return await get_current_user(credentials)
    return UserInfo(user_id="anonymous")

# API Endpoints

@app.on_event("startup")
async def startup_event():
    """App Startup"""
    # Redis Connection testen
    await file_service.init_redis()
    print("✅ File Broker Service started")
    print(f"✅ Redis connected: {config.REDIS_URL}")

@app.get("/health")
async def health_check():
    """Health Check"""
    redis_status = "ok"
    try:
        await file_service.redis.ping()
    except:
        redis_status = "error"
    
    return {
        "status": "ok",
        "redis": redis_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/auth/login")
async def login(user_id: str):
    """Simple Login für Development"""
    token = jwt.encode(
        {"sub": user_id, "exp": datetime.utcnow() + timedelta(days=7)},
        config.SECRET_KEY,
        algorithm="HS256"
    )
    return {"access_token": token, "token_type": "bearer"}

@app.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: UserInfo = Depends(get_current_user)
):
    """File Upload"""
    try:
        metadata = await file_service.store_file(file, user.user_id)
        
        # WebSocket Event senden
        background_tasks.add_task(
            ws_manager.send_personal_message,
            json.dumps({
                "type": "file_uploaded",
                "data": {
                    "file_id": metadata.id,
                    "filename": metadata.filename,
                    "size": metadata.size
                }
            }),
            user.user_id
        )
        
        return FileUploadResponse(
            file_id=metadata.id,
            filename=metadata.filename,
            size=metadata.size
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/{file_id}")
async def download_file(
    file_id: str,
    user: UserInfo = Depends(get_optional_user)
):
    """File Download"""
    try:
        content = await file_service.get_file_content(file_id)
        metadata = await file_service.get_file_metadata(file_id)
        
        if not metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Statistics aktualisieren
        await file_service.update_user_stats(user.user_id, "download", 0)
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type=metadata.content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{metadata.filename}"',
                "Content-Length": str(metadata.size)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/{file_id}/metadata", response_model=FileMetadata)
async def get_file_metadata(
    file_id: str,
    user: UserInfo = Depends(get_current_user)
):
    """File Metadata abrufen"""
    metadata = await file_service.get_file_metadata(file_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="File not found")
    
    return metadata

@app.get("/files/{file_id}/thumbnail")
async def get_file_thumbnail(
    file_id: str,
    user: UserInfo = Depends(get_optional_user)
):
    """File Thumbnail"""
    thumbnail = await file_service.get_thumbnail(file_id)
    if not thumbnail:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    return StreamingResponse(
        io.BytesIO(thumbnail),
        media_type="image/jpeg"
    )

@app.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    background_tasks: BackgroundTasks,
    user: UserInfo = Depends(get_current_user)
):
    """File löschen"""
    try:
        success = await file_service.delete_file(file_id, user.user_id)
        
        if success:
            # WebSocket Event
            background_tasks.add_task(
                ws_manager.send_personal_message,
                json.dumps({
                    "type": "file_deleted",
                    "data": {"file_id": file_id}
                }),
                user.user_id
            )
            
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/user/{user_id}", response_model=FileListResponse)
async def list_user_files(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    user: UserInfo = Depends(get_current_user)
):
    """User Files auflisten"""
    # Nur eigene Files anzeigen
    if user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return await file_service.list_user_files(user_id, page, limit, search)

@app.post("/files/{file_id}/share")
async def create_share_link(
    file_id: str,
    request: ShareLinkRequest,
    user: UserInfo = Depends(get_current_user)
):
    """Share Link erstellen"""
    return await file_service.create_share_link(file_id, user.user_id, request)

@app.get("/stats/user/{user_id}")
async def get_user_stats(
    user_id: str,
    user: UserInfo = Depends(get_current_user)
):
    """User Statistics"""
    if user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    redis_client = await get_redis()
    stats_json = await redis_client.get(f"stats:{user_id}")
    
    if stats_json:
        return json.loads(stats_json)
    else:
        return {
            "total_files": 0,
            "total_size": 0,
            "uploads_today": 0,
            "downloads_today": 0,
            "last_activity": None
        }

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket Endpoint für Real-time Updates"""
    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo oder spezielle Commands verarbeiten
            if data == "ping":
                await websocket.send_text("pong")
                
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        ws_manager.disconnect(websocket, user_id)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )