# routes/filebrowser_routes.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import Dict, List, Any
import os
import shutil
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Basis-Verzeichnisse definieren
BASE_DIRS = {
    "uploads": "./uploads",
    "output": "./output", 
    "tms": "./uploads/nodes/static"
}

def get_file_info(path: Path) -> Dict[str, Any]:
    """Holt Datei-Informationen"""
    stat = path.stat()
    return {
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
    }

def scan_directory(dir_path: Path, base_path: Path = None) -> Dict[str, Any]:
    """Scannt ein Verzeichnis rekursiv"""
    if base_path is None:
        base_path = dir_path
        
    result = {}
    
    try:
        for item in dir_path.iterdir():
            rel_path = item.relative_to(base_path)
            
            if item.is_dir():
                # Ordner
                children = scan_directory(item, base_path)
                result[item.name] = {
                    "type": "folder",
                    "children": children,
                    "path": str(rel_path)
                }
            else:
                # Datei
                file_info = get_file_info(item)
                result[item.name] = {
                    "type": "file",
                    **file_info,
                    "path": str(rel_path)
                }
    except PermissionError:
        logger.warning(f"Permission denied for {dir_path}")
        pass
        
    return result

@router.get("/tree")
async def get_file_tree():
    """Gibt den kompletten Dateibaum zurück"""
    tree = {}
    
    for name, path in BASE_DIRS.items():
        dir_path = Path(path)
        if dir_path.exists():
            tree[name] = {
                "type": "folder",
                "children": scan_directory(dir_path),
                "path": name
            }
        else:
            logger.warning(f"Directory does not exist: {path}")
    
    return {"tree": tree}

@router.delete("/delete")
async def delete_items(data: Dict[str, List[str]]):
    """Löscht die angegebenen Dateien/Ordner"""
    paths = data.get("paths", [])
    deleted = []
    errors = []
    
    for path_str in paths:
        # Sicherheitsprüfung: Pfad muss in einem der BASE_DIRS sein
        parts = path_str.split("/", 1)
        if len(parts) < 1 or parts[0] not in BASE_DIRS:
            errors.append({"path": path_str, "error": "Invalid base directory"})
            continue
            
        base_name = parts[0]
        rel_path = parts[1] if len(parts) > 1 else ""
        
        full_path = Path(BASE_DIRS[base_name]) / rel_path
        
        # Weitere Sicherheitsprüfung: Pfad darf nicht außerhalb des Basis-Verzeichnisses zeigen
        try:
            full_path = full_path.resolve()
            base_path = Path(BASE_DIRS[base_name]).resolve()
            
            if not str(full_path).startswith(str(base_path)):
                errors.append({"path": path_str, "error": "Path traversal attempt blocked"})
                continue
                
            if full_path.exists():
                if full_path.is_dir():
                    shutil.rmtree(full_path)
                else:
                    full_path.unlink()
                deleted.append(path_str)
                logger.info(f"Deleted: {path_str}")
            else:
                errors.append({"path": path_str, "error": "File not found"})
                
        except Exception as e:
            errors.append({"path": path_str, "error": str(e)})
            logger.error(f"Error deleting {path_str}: {e}")
    
    return {
        "deleted": deleted,
        "errors": errors,
        "success": len(errors) == 0
    }

@router.get("/download/{path:path}")
async def download_file(path: str):
    """Download einer einzelnen Datei"""
    # Sicherheitsprüfung wie oben
    parts = path.split("/", 1)
    if len(parts) < 2 or parts[0] not in BASE_DIRS:
        raise HTTPException(status_code=400, detail="Invalid path")
        
    base_name = parts[0]
    rel_path = parts[1]
    
    full_path = Path(BASE_DIRS[base_name]) / rel_path
    
    # Sicherheitsprüfung
    try:
        full_path = full_path.resolve()
        base_path = Path(BASE_DIRS[base_name]).resolve()
        
        if not str(full_path).startswith(str(base_path)):
            raise HTTPException(status_code=403, detail="Access denied")
            
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
            
        return FileResponse(full_path, filename=full_path.name)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))