import os
import sys
import uuid
import subprocess
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

import jwt
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from osgeo import gdal
from docker import from_env
import sqlite3

# Import der DXF-Konvertierungsfunktion
from convert_dxf_to_geopdf import dxf_to_geopdf

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Konfiguration
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
STATIC_ROOT = os.path.join(UPLOAD_DIR, "nodes", "static")
TEMPLATES_DIR = "templates"

SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

auth_scheme = HTTPBearer()

def create_token(username: str) -> str:
    """JWT Token erstellen"""
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> str:
    """JWT Token verifizieren"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        logger.error("Token abgelaufen")
        raise HTTPException(status_code=403, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        logger.error("Ungültiges Token")
        raise HTTPException(status_code=403, detail="Ungültiges Token")
    except Exception as e:
        logger.error(f"Unerwarteter Fehler bei der Token-Überprüfung: {e}")
        raise HTTPException(status_code=500, detail="Unerwarteter Fehler bei der Token-Überprüfung")

# FastAPI App erstellen
app = FastAPI(
    title="DXF to GeoPDF API",
    description="API for converting DXF files to GeoPDF using QGIS",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url=None,
)

# CORS middleware for development and local frontend/backend separation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://10.254.64.14"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite-Datenbank initialisieren
DB_PATH = "files.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.execute("PRAGMA journal_mode=WAL;")  # WAL-Modus für bessere Parallelisierung
# Kein globaler Cursor mehr!

# Tabelle erstellen
with conn:
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT,
        path TEXT,
        size INTEGER,
        converted BOOLEAN,
        uploaded_at TEXT,
        uploaded_by TEXT
    )
    """)
    conn.commit()

# Erweiterung der Tabelle um weitere Metadatenfelder
with conn:
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN status TEXT DEFAULT 'uploaded'")
    except sqlite3.OperationalError:
        pass  # Spalte existiert evtl. schon
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN error_message TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN bbox TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN layer_info TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN srs TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()

# Verzeichnisse erstellen
for directory in [UPLOAD_DIR, OUTPUT_DIR, STATIC_ROOT, TEMPLATES_DIR]:
    os.makedirs(directory, exist_ok=True)

# Static files und Templates
app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/swagger", include_in_schema=False)
async def swagger_ui() -> HTMLResponse:
    """Swagger UI bereitstellen"""
    return get_swagger_ui_html(openapi_url=app.openapi_url, title=f"{app.title} - Swagger UI")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Frontend Homepage"""
    return templates.TemplateResponse("index.html", {"request": request})

def custom_openapi():
    """Custom OpenAPI Schema"""
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.post("/login")
async def login(credentials: dict):
    """Benutzer-Login"""
    try:
        username = credentials.get("username")
        password = credentials.get("password")
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            token = create_token(username)
            logger.info(f"User {username} logged in successfully")
            return {"access_token": token, "token_type": "bearer"}
        else:
            logger.warning(f"Failed login attempt for user: {username}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

def pdf_to_tms(pdf_path: str, out_dir: str, minzoom: int = 0, maxzoom: int = 6) -> None:
    """PDF zu TMS Tiles konvertieren"""
    try:
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)
        
        cmd = [
            "gdal2tiles.py",
            "-z", f"{minzoom}-{maxzoom}",
            "-r", "bilinear",
            "-w", "none",
            pdf_path, out_dir
        ]
        
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"TMS generation completed for {pdf_path}")
        
    except subprocess.CalledProcessError as e:
        logger.error(f"TMS generation failed: {e.stderr}")
        raise Exception(f"TMS generation failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Unexpected error in TMS generation: {e}")
        raise

def write_config(bounds: List[float], srs: str, resolution: float, minzoom: int, maxzoom: int, out_dir: str) -> None:
    """Konfigurationsdatei schreiben"""
    try:
        config = {
            "bounds": bounds,
            "srs": srs,
            "resolution": resolution,
            "minzoom": minzoom,
            "maxzoom": maxzoom,
            "comments": "",
            "created": datetime.utcnow().isoformat()
        }
        
        config_path = os.path.join(out_dir, "config.json")
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Config written to {config_path}")
        
    except Exception as e:
        logger.error(f"Failed to write config: {e}")
        raise

def write_openlayers_html(bounds: List[float], minzoom: int, maxzoom: int, resolution: float, out_dir: str) -> None:
    """OpenLayers HTML Viewer erstellen"""
    try:
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>GeoPDF TMS Viewer</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.css">
    <style>
        html, body {{ margin: 0; padding: 0; height: 100%; width: 100%; }}
        #map {{ position: absolute; height: 100%; width: 100%; background-color: #FFFFFF; }}
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.js"></script>
    <script>
        var mapExtent = [{bounds[0]}, {bounds[1]}, {bounds[2]}, {bounds[3]}];
        var mapMinZoom = {minzoom};
        var mapMaxZoom = {maxzoom};
        var mapMaxResolution = {resolution};
        var tileExtent = mapExtent;
        
        var mapResolutions = [];
        for (var z = 0; z <= mapMaxZoom; z++) {{
            mapResolutions.push(Math.pow(2, mapMaxZoom - z) * mapMaxResolution);
        }}
        
        var mapTileGrid = new ol.tilegrid.TileGrid({{
            extent: tileExtent,
            minZoom: mapMinZoom,
            resolutions: mapResolutions
        }});
        
        var map = new ol.Map({{
            target: 'map',
            layers: [
                new ol.layer.Tile({{
                    source: new ol.source.XYZ({{
                        projection: 'EPSG:21781',
                        tileGrid: mapTileGrid,
                        url: "{{z}}/{{x}}/{{y}}.png"
                    }})
                }})
            ],
            view: new ol.View({{
                projection: ol.proj.get('EPSG:21781'),
                extent: mapExtent,
                maxResolution: mapTileGrid.getResolution(mapMinZoom)
            }})
        }});
        
        map.getView().fit(mapExtent, map.getSize());
        map.addControl(new ol.control.MousePosition());
    </script>
</body>
</html>"""
        
        html_path = os.path.join(out_dir, "openlayers.html")
        with open(html_path, "w") as f:
            f.write(html)
        
        logger.info(f"OpenLayers viewer created at {html_path}")
        
    except Exception as e:
        logger.error(f"Failed to create OpenLayers HTML: {e}")
        raise

def get_pdf_metadata(pdf_path: str):
    """PDF Metadaten extrahieren"""
    try:
        ds = gdal.Open(pdf_path)
        if ds is None:
            raise Exception("Could not open PDF file")
        
        gt = ds.GetGeoTransform()
        xsize = ds.RasterXSize
        ysize = ds.RasterYSize
        
        minx = gt[0]
        maxy = gt[3]
        maxx = minx + gt[1] * xsize
        miny = maxy + gt[5] * ysize
        
        srs = ds.GetProjectionRef()
        resolution = gt[1]
        
        ds = None  # Close dataset
        
        return [minx, miny, maxx, maxy], srs, resolution
        
    except Exception as e:
        logger.error(f"Failed to extract PDF metadata: {e}")
        raise

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: str = Depends(verify_token)):
    """DXF Datei hochladen"""
    try:
        logger.info("Upload-Endpoint aufgerufen")
        logger.debug(f"Benutzer: {user}")
        logger.debug(f"Dateiname: {file.filename}")

        # Dateivalidierung
        if not file.filename.lower().endswith('.dxf'):
            logger.warning("Ungültige Dateiendung")
            raise HTTPException(status_code=400, detail="Only DXF files are allowed")

        file_id = str(uuid.uuid4())
        dxf_path = os.path.join(UPLOAD_DIR, f"{file_id}.dxf")

        # Datei speichern
        content = await file.read()
        logger.debug(f"Dateigröße: {len(content)} Bytes")
        with open(dxf_path, "wb") as f:
            f.write(content)

        # Metadaten in SQLite speichern
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO files (id, name, path, size, converted, uploaded_at, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (file_id, file.filename, dxf_path, len(content), False, datetime.utcnow().isoformat(), user)
            )

        logger.info(f"Datei erfolgreich hochgeladen: {file.filename} (ID: {file_id})")
        return {"id": file_id, "name": file.filename, "path": dxf_path, "size": len(content), "converted": False, "uploaded_at": datetime.utcnow().isoformat(), "uploaded_by": user}

    except Exception as e:
        logger.error(f"Upload fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/files")
async def list_files(
    user: str = Depends(verify_token),
    status: str = None,
    uploaded_by: str = None,
    date_from: str = Query(None, description="YYYY-MM-DD"),
    date_to: str = Query(None, description="YYYY-MM-DD")
):
    """Dateien mit erweiterten Filtern auflisten"""
    try:
        query = "SELECT * FROM files WHERE 1=1"
        params = []
        if status:
            query += " AND status = ?"
            params.append(status)
        if uploaded_by:
            query += " AND uploaded_by = ?"
            params.append(uploaded_by)
        if date_from:
            query += " AND uploaded_at >= ?"
            params.append(date_from)
        if date_to:
            query += " AND uploaded_at <= ?"
            params.append(date_to)
        with conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
        files = [
            {
                "id": row[0],
                "name": row[1],
                "path": row[2],
                "size": row[3],
                "converted": bool(row[4]),
                "uploaded_at": row[5],
                "uploaded_by": row[6],
                "status": row[7] if len(row) > 7 else 'uploaded',
                "error_message": row[8] if len(row) > 8 else None,
                "bbox": row[9] if len(row) > 9 else None,
                "layer_info": row[10] if len(row) > 10 else None,
                "srs": row[11] if len(row) > 11 else None
            }
            for row in rows
        ]
        return files
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Dateien: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Dateien")

@app.get("/files/{file_id}")
async def get_file_details(file_id: str, user: str = Depends(verify_token)):
    """Details zu einer Datei abrufen"""
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        file_details = {
            "id": row[0],
            "name": row[1],
            "path": row[2],
            "size": row[3],
            "converted": bool(row[4]),
            "uploaded_at": row[5],
            "uploaded_by": row[6],
            "status": row[7] if len(row) > 7 else 'uploaded',
            "error_message": row[8] if len(row) > 8 else None,
            "bbox": row[9] if len(row) > 9 else None,
            "layer_info": row[10] if len(row) > 10 else None,
            "srs": row[11] if len(row) > 11 else None
        }

        return file_details
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Dateidetails: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Dateidetails")

@app.post("/convert/{file_id}")
async def convert_file(
    file_id: str,
    user: str = Depends(verify_token),
    page_size: str = "A4",
    dpi: int = 300
):
    """DXF zu GeoPDF konvertieren und Metadaten speichern (mit Parametern)"""
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE files SET status = ? WHERE id = ?", ("converting", file_id))
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")
        dxf_path = row[2]
        geopdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
        try:
            bbox, layer_info, srs = None, None, None
            try:
                result = dxf_to_geopdf(dxf_path, geopdf_path, page_size=page_size, dpi=dpi, return_metadata=True)
                if isinstance(result, dict):
                    bbox = result.get('bbox')
                    layer_info = result.get('layer_info')
                    srs = result.get('srs')
            except TypeError:
                dxf_to_geopdf(dxf_path, geopdf_path, page_size=page_size, dpi=dpi)
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE files SET converted = ?, path = ?, status = ?, error_message = NULL, bbox = ?, layer_info = ?, srs = ? WHERE id = ?", (True, geopdf_path, "converted", bbox, layer_info, srs, file_id))
            return {"message": "File converted successfully", "fileName": row[1], "page_size": page_size, "dpi": dpi, "bbox": bbox, "srs": srs}
        except Exception as e:
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE files SET status = ?, error_message = ? WHERE id = ?", ("error", str(e), file_id))
            logger.error(f"Error converting file {file_id}: {e}")
            raise HTTPException(status_code=500, detail="Conversion failed")
    except Exception as e:
        logger.error(f"Error converting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Conversion failed")

@app.post("/dxf2geopdf/{file_id}")
async def dxf_to_geopdf_endpoint(file_id: str, user: str = Depends(verify_token)):
    """DXF zu GeoPDF Konvertierung auslösen"""
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        dxf_path = row[2]
        geopdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")

        # Konvertierung durchführen
        dxf_to_geopdf(dxf_path, geopdf_path)

        # Datei als konvertiert markieren
        with conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE files SET converted = ?, path = ?, status = ? WHERE id = ?", (True, geopdf_path, "converted", file_id))

        return {"message": "File converted successfully", "fileName": row[1]}
    except Exception as e:
        with conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE files SET status = ?, error_message = ? WHERE id = ?", ("error", str(e), file_id))
        logger.error(f"Error converting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Conversion failed")

@app.get("/tms")
async def list_tms():
    """Alle TMS Layer auflisten"""
    layers = []
    try:
        if os.path.exists(STATIC_ROOT):
            for name in os.listdir(STATIC_ROOT):
                path = os.path.join(STATIC_ROOT, name)
                if os.path.isdir(path):
                    config_path = os.path.join(path, "config.json")
                    config = {}
                    if os.path.exists(config_path):
                        with open(config_path) as f:
                            config = json.load(f)
                    
                    layers.append({
                        "id": name,
                        "url": f"/static/{name}",
                        "config": config,
                    })
        
        return layers
        
    except Exception as e:
        logger.error(f"Failed to list TMS layers: {e}")
        raise HTTPException(status_code=500, detail="Failed to list TMS layers")

@app.get("/download/{file_id}")
async def download_file(file_id: str, request: Request, user: str = Depends(verify_token)):
    """GeoPDF Datei herunterladen"""
    try:
        logger.info(f"Download-Request für Datei: {file_id} von {request.client.host}")
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
        if not row or not row[2] or not row[4]:  # row[2]=Pfad, row[4]=converted
            logger.warning(f"Download: Datei nicht gefunden oder nicht konvertiert: {file_id}")
            raise HTTPException(status_code=404, detail="GeoPDF not found")

        geopdf_path = row[2] if row[2].endswith('.pdf') else os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
        if not os.path.exists(geopdf_path):
            logger.warning(f"Download: Datei auf Disk nicht gefunden: {geopdf_path}")
            raise HTTPException(status_code=404, detail="GeoPDF file missing on disk")

        logger.info(f"Download wird ausgeliefert: {geopdf_path}")
        return FileResponse(geopdf_path, filename=f"{row[1].rsplit('.',1)[0]}_converted.pdf")
    except HTTPException as e:
        logger.error(f"HTTPException beim Download: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Error downloading GeoPDF for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@app.delete("/files/{file_id}")
async def delete_file(file_id: str, user: str = Depends(verify_token)):
    """Datei löschen"""
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        # Dateien löschen
        dxf_path = row[2]
        pdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")

        for path in [dxf_path, pdf_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    logger.warning(f"Fehler beim Löschen von {path}: {e}")

        # Aus Datenbank entfernen
        with conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))

        logger.info(f"File deleted: {file_id}")
        return {"message": "File deleted successfully"}
    except Exception as e:
        logger.error(f"Delete failed for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Delete failed")

@app.get("/containers")
async def get_container_status(user: str = Depends(verify_token)):
    """Status der laufenden Docker-Container abrufen"""
    try:
        client = from_env()
        containers = []

        for container in client.containers.list():
            containers.append({
                "id": container.id,
                "name": container.name,
                "status": container.status,
                "image": container.image.tags,
                "created": container.attrs['Created']
            })

        return {"containers": containers}
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Container-Status: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen des Container-Status")

@app.get("/openapi.json", include_in_schema=False)
def get_openapi_json():
    """OpenAPI-Schema bereitstellen"""
    return app.openapi()

@app.get("/docs", include_in_schema=False)
def get_docs():
    """Swagger UI bereitstellen"""
    return get_swagger_ui_html(openapi_url="/openapi.json", title="DXF to GeoPDF API Docs")

@app.delete("/cleanup")
async def cleanup_files(days: int = 7, status: str = "error"):
    """Automatische Bereinigung alter/gefehlerter Dateien"""
    import datetime
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=days)).isoformat()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, path FROM files WHERE status = ? AND uploaded_at < ?", (status, cutoff))
        rows = cursor.fetchall()
    deleted = 0
    for file_id, path in rows:
        if os.path.exists(path):
            os.remove(path)
        with conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
        deleted += 1
    return {"deleted": deleted, "status": status, "older_than": days}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)