import os
import sys
import uuid
import subprocess
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import shutil

import jwt
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Query
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from osgeo import gdal
from docker import from_env
import sqlite3

# Import der DXF- und Raster-Konvertierungsfunktionen
from convert_dxf_to_geopdf import dxf_to_geopdf, convert_pdf_to_tms
from convert_raster_to_geopdf import raster_to_geopdf
from controllers.jobController import get_all_jobs, jobs_db, thread_lock
from routes.jobRoutes import router as job_router
import threading

from routes.workflow_routes import router as workflow_router, init_workflow_tables

# Logging konfigurieren - FRÜHER DEFINIEREN
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Integration in main.py - Fügen Sie diese Imports und Endpunkte hinzu
# Am Anfang der Datei zu den bestehenden Imports hinzufügen:
from system_metrics import (
    get_system_metrics,
    get_cpu_metrics, 
    get_memory_metrics,
    get_disk_metrics,
    get_network_metrics, # metrics_collector wird bereits in system_metrics.py instanziiert
    metrics_collector
)

# Am Anfang der main.py, bei den anderen Imports ergänzen:
from controllers.jobController import get_all_jobs, jobs_db, thread_lock
from routes.jobRoutes import router as job_router
import importlib.util
filebrowser_router = None
filebrowser_routes_spec = importlib.util.find_spec("routes.filebrowser_routes")
if filebrowser_routes_spec is not None:
    from routes.filebrowser_routes import router as filebrowser_router
else:
    logger.error("Module 'routes.filebrowser_routes' not found. File browser functionality will be unavailable.")
    logger.error("Please ensure 'server/routes/filebrowser_routes.py' and 'server/routes/__init__.py' exist.")


SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

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
    openapi_url="/api/openapi.json",
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

DB_PATH = "files.db"

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute("PRAGMA journal_mode=WAL;")
    try:
        yield db
    finally:
        db.close()

# Initialisierung und Migration (einmalig beim Start, nicht für jede Anfrage)
with sqlite3.connect(DB_PATH) as conn:
    conn.execute("PRAGMA journal_mode=WAL;")
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
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN status TEXT DEFAULT 'uploaded'")
    except sqlite3.OperationalError:
        pass
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

# Nach der DB-Initialisierung:
with sqlite3.connect(DB_PATH) as conn:
    init_workflow_tables(conn)

# Router registrieren:
app.include_router(workflow_router, prefix="/api")

# Verzeichnisse erstellen
for directory in [UPLOAD_DIR, OUTPUT_DIR, STATIC_ROOT, TEMPLATES_DIR]:
    os.makedirs(directory, exist_ok=True)

# Static files und Templates
app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/api/swagger", include_in_schema=False)
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

@app.post("/api/login")
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

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """DXF oder TIF/GeoTIFF Datei hochladen"""
    try:
        logger.info("Upload-Endpoint aufgerufen")
        logger.debug(f"Benutzer: {user}")
        logger.debug(f"Dateiname: {file.filename}")

        # Dateivalidierung: Erlaube DXF und TIF/GeoTIFF
        allowed_ext = ['.dxf', '.tif', '.tiff', '.geotiff']
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_ext:
            logger.warning(f"Ungültige Dateiendung: {ext}")
            raise HTTPException(status_code=400, detail="Only DXF and TIF/GeoTIFF files are allowed")

        file_id = str(uuid.uuid4())
        save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

        # Datei speichern
        content = await file.read()
        logger.debug(f"Dateigröße: {len(content)} Bytes")
        with open(save_path, "wb") as f:
            f.write(content)

        # Metadaten in SQLite speichern
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO files (id, name, path, size, converted, uploaded_at, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (file_id, file.filename, save_path, len(content), False, datetime.utcnow().isoformat(), user)
        )
        db.commit()

        logger.info(f"Datei erfolgreich hochgeladen: {file.filename} (ID: {file_id})")
        return {"id": file_id, "name": file.filename, "path": save_path, "size": len(content), "converted": False, "uploaded_at": datetime.utcnow().isoformat(), "uploaded_by": user}

    except Exception as e:
        logger.error(f"Upload fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/files")
async def list_files(
    user: str = Depends(verify_token),
    status: str = None,
    uploaded_by: str = None,
    date_from: str = Query(None, description="YYYY-MM-DD"),
    date_to: str = Query(None, description="YYYY-MM-DD"),
    db: sqlite3.Connection = Depends(get_db)
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
        cursor = db.cursor()
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        files = []
        for row in rows:
            bbox = row[9] if len(row) > 9 else None
            layer_info = row[10] if len(row) > 10 else None
            # Deserialisierung
            try:
                bbox = json.loads(bbox) if bbox else None
            except Exception:
                pass
            try:
                layer_info = json.loads(layer_info) if layer_info else None
            except Exception:
                pass
            files.append({
                "id": row[0],
                "name": row[1],
                "path": row[2],
                "size": row[3],
                "converted": bool(row[4]),
                "uploaded_at": row[5],
                "uploaded_by": row[6],
                "status": row[7] if len(row) > 7 else 'uploaded',
                "error_message": row[8] if len(row) > 8 else None,
                "bbox": bbox,
                "layer_info": layer_info,
                "srs": row[11] if len(row) > 11 else None
            })
        return files
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Dateien: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Dateien")

@app.get("/api/files/{file_id}")
async def get_file_details(file_id: str, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """Details zu einer Datei abrufen"""
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")
        bbox = row[9] if len(row) > 9 else None
        layer_info = row[10] if len(row) > 10 else None
        try:
            bbox = json.loads(bbox) if bbox else None
        except Exception:
            pass
        try:
            layer_info = json.loads(layer_info) if layer_info else None
        except Exception:
            pass
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
            "bbox": bbox,
            "layer_info": layer_info,
            "srs": row[11] if len(row) > 11 else None
        }

        return file_details
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Dateidetails: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Dateidetails")

@app.post("/api/convert/{file_id}")
async def convert_file(
    file_id: str,
    user: str = Depends(verify_token),
    page_size: str = "A4",
    dpi: int = 300,
    db: sqlite3.Connection = Depends(get_db)
):
    """DXF oder Raster zu GeoPDF konvertieren und Metadaten speichern (mit Parametern)"""
    try:
        cursor = db.cursor()
        cursor.execute("UPDATE files SET status = ? WHERE id = ?", ("converting", file_id))
        db.commit()
        cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")
        input_path = row[2]
        ext = os.path.splitext(input_path)[1].lower()
        geopdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
        try:
            bbox, layer_info, srs = None, None, None
            if ext == ".dxf":
                try:
                    result = dxf_to_geopdf(input_path, geopdf_path, page_size=page_size, dpi=dpi, return_metadata=True)
                    if isinstance(result, dict):
                        bbox = result.get('bbox')
                        layer_info = result.get('layer_info')
                        srs = result.get('srs')
                except TypeError:
                    dxf_to_geopdf(input_path, geopdf_path, page_size=page_size, dpi=dpi)
            elif ext in [".tif", ".tiff", ".geotiff"]:
                raster_to_geopdf(input_path, geopdf_path, dpi=dpi, page_size=page_size)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type for conversion")
            # --- Fallbacks und Typkorrektur für bbox und srs ---
            if bbox is None or not (isinstance(bbox, list) and len(bbox) == 4):
                # Versuche Layer-Extent aus QGIS zu holen (als Fallback)
                try:
                    from convert_dxf_to_geopdf import DXFToGeoPDFConverter
                    with DXFToGeoPDFConverter() as converter:
                        layer = converter.load_dxf_layer(input_path)
                        extent = layer.extent()
                        bbox = [extent.xMinimum(), extent.yMinimum(), extent.xMaximum(), extent.yMaximum()]
                        if not srs or srs.lower() in ("", "none", None):
                            srs = layer.crs().authid() or "EPSG:3857"
                except Exception as e:
                    bbox = [0, 0, 0, 0]
                    if not srs:
                        srs = "EPSG:3857"
            # bbox als JSON-Array speichern, niemals als String
            bbox_str = json.dumps(bbox) if bbox is not None else None
            layer_info_str = json.dumps(layer_info) if layer_info is not None else None
            cursor.execute("UPDATE files SET converted = ?, path = ?, status = ?, error_message = NULL, bbox = ?, layer_info = ?, srs = ? WHERE id = ?", (True, geopdf_path, "converted", bbox_str, layer_info_str, srs, file_id))
            db.commit()
            return {"message": "File converted successfully", "fileName": row[1], "page_size": page_size, "dpi": dpi, "bbox": bbox, "srs": srs}
        except Exception as e:
            cursor.execute("UPDATE files SET status = ?, error_message = ? WHERE id = ?", ("error", str(e), file_id))
            db.commit()
            logger.error(f"Error converting file {file_id}: {e}")
            raise HTTPException(status_code=500, detail="Conversion failed")
    except Exception as e:
        logger.error(f"Error converting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Conversion failed")

@app.post("/api/dxf2geopdf/{file_id}")
async def dxf_to_geopdf_endpoint(file_id: str, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """DXF zu GeoPDF Konvertierung auslösen"""
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        dxf_path = row[2]
        geopdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")

        # Konvertierung durchführen
        dxf_to_geopdf(dxf_path, geopdf_path)

        # Datei als konvertiert markieren
        cursor.execute("UPDATE files SET converted = ?, path = ?, status = ? WHERE id = ?", (True, geopdf_path, "converted", file_id))
        db.commit()

        return {"message": "File converted successfully", "fileName": row[1]}
    except Exception as e:
        cursor.execute("UPDATE files SET status = ?, error_message = ? WHERE id = ?", ("error", str(e), file_id))
        db.commit()
        logger.error(f"Error converting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Conversion failed")

@app.post("/api/tms/{file_id}")
async def create_tms_layer(file_id: str, maxzoom: int = 6, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """GeoPDF zu TMS (Tile Map Service) konvertieren"""
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = cursor.fetchone()
        if not row or not row[2] or not row[4]:
            raise HTTPException(status_code=404, detail="GeoPDF nicht gefunden oder nicht konvertiert")
        geopdf_path = row[2] if row[2].endswith('.pdf') else os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
        if not os.path.exists(geopdf_path):
            raise HTTPException(status_code=404, detail="GeoPDF file missing on disk")
        
        # SRS aus der Datenbank holen (gespeichert während der Konvertierung)
        file_srs = row[11] if len(row) > 11 else None
        if not file_srs or file_srs.strip() == '' or file_srs.lower() == 'none':
            file_srs = 'EPSG:3857'  # Fallback-SRS
            logger.warning(f"Kein SRS gefunden, setze Fallback SRS '{file_srs}' für TMS-Generierung von {file_id}")
        else:
            logger.info(f"Verwende SRS '{file_srs}' für TMS-Generierung von {file_id}")

        tms_dir = os.path.join(STATIC_ROOT, file_id)
        convert_pdf_to_tms(geopdf_path, tms_dir, minzoom=0, maxzoom=maxzoom, srs=file_srs)
        return {"message": "TMS erfolgreich erzeugt", "tms_dir": tms_dir, "url": f"/static/{file_id}"}
    except Exception as e:
        logger.error(f"TMS-Erstellung fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=f"TMS-Erstellung fehlgeschlagen: {e}")

@app.get("/api/tms")
async def list_tms(db: sqlite3.Connection = Depends(get_db)):
    """Alle TMS Layer auflisten inkl. Metadaten"""
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
                    # Hole Metadaten aus DB
                    cursor = db.cursor()
                    cursor.execute("SELECT name, bbox, srs FROM files WHERE id = ?", (name,))
                    row = cursor.fetchone()
                    layers.append({
                        "id": name,
                        "url": f"/static/{name}",
                        "config": config,
                        "fileName": row[0] if row else name,
                        "bbox": row[1] if row else None,
                        "srs": row[2] if row else None
                    })
        return layers
    except Exception as e:
        logger.error(f"Failed to list TMS layers: {e}")
        raise HTTPException(status_code=500, detail="Failed to list TMS layers")

@app.delete("/api/tms/{tms_id}")
async def delete_tms_layer(tms_id: str, user: str = Depends(verify_token)):
    """Einen TMS-Layer und sein Verzeichnis löschen."""
    try:
        # Sicherheitsüberprüfung für tms_id, um Path Traversal zu verhindern
        if not tms_id or ".." in tms_id or "/" in tms_id or "\\" in tms_id:
            logger.warning(f"Ungültige TMS ID für Löschvorgang: {tms_id}")
            raise HTTPException(status_code=400, detail="Ungültige TMS ID")

        tms_layer_path = os.path.join(STATIC_ROOT, tms_id)
        if not os.path.isdir(tms_layer_path):
            logger.warning(f"TMS-Layer Verzeichnis nicht gefunden: {tms_layer_path}")
            raise HTTPException(status_code=404, detail="TMS-Layer nicht gefunden")

        shutil.rmtree(tms_layer_path) # shutil importieren, falls noch nicht geschehen
        logger.info(f"TMS-Layer {tms_id} erfolgreich gelöscht von Benutzer {user}")
        return {"message": f"TMS-Layer {tms_id} erfolgreich gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Löschen des TMS-Layers {tms_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Löschen des TMS-Layers: {e}")

@app.get("/api/download/{file_id}")
async def download_file(file_id: str, request: Request, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """GeoPDF Datei herunterladen"""
    try:
        logger.info(f"Download-Request für Datei: {file_id} von {request.client.host}")
        cursor = db.cursor()
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

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT path FROM files WHERE id = ?", (file_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")
        file_path = row[0]
        if os.path.exists(file_path):
            os.remove(file_path)
        cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
        db.commit()
        return {"message": "Datei erfolgreich gelöscht"}
    except Exception as e:
        logger.error(f"Fehler beim Löschen der Datei: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Löschen der Datei")

@app.get("/api/containers")
async def get_container_status(user: str = Depends(verify_token)):
    """Status aller Docker-Container (laufend & gestoppt), Images und Volumes abrufen"""
    try:
        client = from_env()
        containers = []
        for container in client.containers.list(all=True):
            containers.append({
                "id": str(container.id),
                "name": str(container.name),
                "status": str(container.status),
                "image": [str(tag) for tag in (container.image.tags or [])],
                "created": str(container.attrs.get('Created', ''))
            })
        images = []
        for image in client.images.list():
            images.append({
                "id": str(image.id),
                "tags": image.tags,
                "created": str(image.attrs.get('Created', '')),
                "size": image.attrs.get('Size', 0)
            })
        volumes = []
        for volume in client.volumes.list():
            volumes.append({
                "name": volume.name,
                "mountpoint": volume.attrs.get('Mountpoint', ''),
                "created": volume.attrs.get('CreatedAt', ''),
                "labels": volume.attrs.get('Labels', {})
            })
        return {"containers": containers, "images": images, "volumes": volumes}
    except Exception as e:
        import traceback
        # Log the full traceback for better debugging
        logger.error(f"Error fetching container status: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen des Container-Status")

@app.get("/api/containers/{container_id}/logs", response_class=PlainTextResponse)
async def get_container_logs(container_id: str, user: str = Depends(verify_token)):
    """Logs eines Docker-Containers abrufen"""
    try:
        client = from_env()
        container = client.containers.get(container_id)
        logs = container.logs(tail=200, stdout=True, stderr=True)
        return logs.decode("utf-8", errors="replace")
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Container {container_id} not found")
    except docker.errors.APIError as e:
        logger.error(f"Fehler beim Abrufen der Logs für Container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Logs: {e}")

@app.get("/api/openapi.json", include_in_schema=False)
def get_openapi_json():
    """OpenAPI-Schema bereitstellen"""
    return app.openapi()

@app.get("/api/docs", include_in_schema=False)
def get_docs():
    """Swagger UI bereitstellen"""
    return get_swagger_ui_html(openapi_url="/api/openapi.json", title="DXF to GeoPDF API Docs")

@app.delete("/api/cleanup")
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

@app.get("/api/jobs")
async def api_get_jobs():
    """Gibt alle Jobs für das Frontend zurück (ServiceTaskManager)"""
    return get_all_jobs()

def run_maptiler_job(file_id, input_path, output_dir, job_id, params=None):
    """Führt MapTiler Engine im Container für die angegebene Datei aus (asynchroner Task)."""
    import subprocess
    import datetime
    job = jobs_db[job_id]
    try:
        job['status'] = 'running'
        job['startedAt'] = datetime.datetime.now().isoformat()
        # MapTiler Engine Docker-Aufruf
        # Beispiel: docker run --rm -v ... maptiler/engine:latest --input ... --output ...
        cmd = [
            'docker', 'run', '--rm',
            '-v', f"{os.path.abspath(output_dir)}/../:/data/input:ro",
            '-v', f"{os.path.abspath(output_dir)}/../../maptiler-output:/data/output",
            '-e', f"MT_KEY={os.environ.get('MT_KEY', 'replace-with-your-license')}",
            'maptiler/engine:latest',
            '--input', f"/data/input/{os.path.basename(input_path)}",
            '--output', f"/data/output/{file_id}"
        ]
        if params and 'format' in params:
            cmd += ['--format', params['format']]
        # Optional: weitere Parameter
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            job['status'] = 'completed'
            job['completedAt'] = datetime.datetime.now().isoformat()
            job['artifacts'] = [{
                'name': f'{file_id}',
                'type': 'tiles',
                'url': f'/maptiler-output/{file_id}',
                'viewable': True
            }]
        else:
            job['status'] = 'failed'
            job['completedAt'] = datetime.datetime.now().isoformat()
            job['error'] = result.stderr
    except Exception as e:
        job['status'] = 'failed'
        job['completedAt'] = datetime.datetime.now().isoformat()
        job['error'] = str(e)

@app.post("/api/maptiler/{file_id}")
async def start_maptiler_job(file_id: str, user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """Startet einen MapTiler-Job für eine konvertierte Datei (asynchron, als Service-Task)."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
    row = cursor.fetchone()
    if not row or not row[2] or not row[4]:
        raise HTTPException(status_code=404, detail="GeoPDF nicht gefunden oder nicht konvertiert")
    input_path = row[2] if row[2].endswith('.pdf') else os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="GeoPDF file missing on disk")
    output_dir = os.path.abspath(os.path.join('..', 'maptiler-output'))
    job_id = str(uuid.uuid4())
    job = {
        'id': job_id,
        'name': f"MapTiler für {row[1]}",
        'type': 'maptiler',
        'status': 'queued',
        'createdAt': datetime.datetime.now().isoformat(),
        'inputFile': {'name': row[1], 'size': row[3]},
        'parameters': {},
        'artifacts': [],
        'error': None,
        'progress': None
    }
    with thread_lock:
        jobs_db[job_id] = job
        thread = threading.Thread(target=run_maptiler_job, args=(file_id, input_path, output_dir, job_id))
        thread.start()
    return {'job_id': job_id, 'status': 'queued'}

app.include_router(job_router, prefix="/api/jobs")


# Neue Systemmetriken-Endpunkte hinzufügen:

@app.get("/api/system/metrics")
async def system_metrics(user: str = Depends(verify_token)):
    """
    Vollständige Systemmetriken abrufen
    
    Liefert CPU, Memory, Disk, Network, Docker und Prozess-Metriken
    """
    try:
        metrics = get_system_metrics()
        
        # Für Frontend-Kompatibilität: Flache Struktur für Hauptmetriken
        frontend_metrics = {
            "cpu": {
                "usage": metrics["cpu"]["usage"],
                "cores": metrics["cpu"]["cores"],
                "loadAverage": metrics["cpu"]["loadAverage"]
            },
            "memory": {
                "used": metrics["memory"]["used"],
                "total": metrics["memory"]["total"],
                "percentage": metrics["memory"]["percentage"],
                "available": metrics["memory"]["available"]
            },
            "disk": {
                "used": metrics["disk"]["used"],
                "total": metrics["disk"]["total"],
                "percentage": metrics["disk"]["percentage"],
                "free": metrics["disk"]["free"]
            },
            "network": {
                "bytesReceived": metrics["network"]["bytesReceived"],
                "bytesSent": metrics["network"]["bytesSent"],
                "packetsReceived": metrics["network"]["packetsReceived"],
                "packetsSent": metrics["network"]["packetsSent"]
            },
            "uptime": metrics["system"]["uptime"],
            "dockerVersion": metrics["system"]["dockerVersion"],
            "hostname": metrics["system"]["hostname"],
            "timestamp": metrics["timestamp"],
            
            # Vollständige Daten für erweiterte Ansichten
            "detailed": metrics
        }
        
        return frontend_metrics
        
    except Exception as e:
        logger.error(f"Error fetching system metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch system metrics: {str(e)}")

@app.get("/api/system/cpu")
async def cpu_metrics(user: str = Depends(verify_token)):
    """CPU-Metriken abrufen"""
    try:
        return get_cpu_metrics()
    except Exception as e:
        logger.error(f"Error fetching CPU metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CPU metrics: {str(e)}")

@app.get("/api/system/memory")
async def memory_metrics(user: str = Depends(verify_token)):
    """Memory-Metriken abrufen"""
    try:
        return get_memory_metrics()
    except Exception as e:
        logger.error(f"Error fetching memory metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch memory metrics: {str(e)}")

@app.get("/api/system/disk")
async def disk_metrics(user: str = Depends(verify_token)):
    """Disk-Metriken abrufen"""
    try:
        return get_disk_metrics()
    except Exception as e:
        logger.error(f"Error fetching disk metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch disk metrics: {str(e)}")

@app.get("/api/system/network")
async def network_metrics(user: str = Depends(verify_token)):
    """Network-Metriken abrufen"""
    try:
        return get_network_metrics()
    except Exception as e:
        logger.error(f"Error fetching network metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch network metrics: {str(e)}")

@app.get("/api/system/processes")
async def process_metrics(user: str = Depends(verify_token)):
    """Prozess-Metriken abrufen"""
    try:
        return metrics_collector.get_process_metrics()
    except Exception as e:
        logger.error(f"Error fetching process metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch process metrics: {str(e)}")

@app.get("/api/system/docker")
async def docker_metrics(user: str = Depends(verify_token)):
    """Docker-spezifische Metriken abrufen"""
    try:
        return metrics_collector.get_docker_metrics()
    except Exception as e: # metrics_collector ist bereits in system_metrics.py definiert
        logger.error(f"Error fetching Docker metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Docker metrics: {str(e)}")

# Erweiterte Container-Endpunkte

@app.get("/api/containers/{container_id}/stats")
async def container_stats(container_id: str, user: str = Depends(verify_token)):
    """Detaillierte Container-Statistiken abrufen"""
    try:
        if not metrics_collector.docker_client:
            raise HTTPException(status_code=503, detail="Docker client not available")
        
        container = metrics_collector.docker_client.containers.get(container_id)
        stats = container.stats(stream=False)
        
        # CPU-Nutzung berechnen
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        cpu_percent = 0.0
        if system_delta > 0 and cpu_delta > 0:
            cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100.0
        
        # Memory-Nutzung
        memory_usage = stats['memory_stats']['usage']
        memory_limit = stats['memory_stats']['limit']
        memory_percent = (memory_usage / memory_limit) * 100.0 if memory_limit > 0 else 0
        
        # Network I/O
        network_io = {"rx_bytes": 0, "tx_bytes": 0}
        if 'networks' in stats:
            for interface, data in stats['networks'].items():
                network_io["rx_bytes"] += data['rx_bytes']
                network_io["tx_bytes"] += data['tx_bytes']
        
        # Block I/O
        block_io = {"read_bytes": 0, "write_bytes": 0}
        if 'blkio_stats' in stats and 'io_service_bytes_recursive' in stats['blkio_stats']:
            for entry in stats['blkio_stats']['io_service_bytes_recursive']:
                if entry['op'] == 'Read':
                    block_io["read_bytes"] += entry['value']
                elif entry['op'] == 'Write':
                    block_io["write_bytes"] += entry['value']
        
        return {
            "container_id": container_id,
            "name": container.name,
            # Ensure cpu_percent is not NaN or Inf
            "cpu_percent": round(cpu_percent, 2) if math.isfinite(cpu_percent) else 0.0,
            "memory": {
                "usage": memory_usage,
                "limit": memory_limit,
                "percent": round(memory_percent, 2)
            },
            "network": network_io,
            "block_io": block_io,
            "timestamp": datetime.now().isoformat()
        }
        
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Container {container_id} not found")
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        logger.error(f"Error fetching container stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch container stats: {str(e)}")

@app.get("/api/containers/{container_id}/logs")
async def container_logs(
    container_id: str, 
    lines: int = 100,
    since: str = None,
    user: str = Depends(verify_token)
):
    """Container-Logs abrufen"""
    try:
        if not metrics_collector.docker_client:
            raise HTTPException(status_code=503, detail="Docker client not available")
        
        container = metrics_collector.docker_client.containers.get(container_id)
        
        # Log-Parameter
        log_kwargs = {
            "tail": lines,
            "timestamps": True
        }
        
        if since:
            log_kwargs["since"] = since
        
        logs = container.logs(**log_kwargs).decode('utf-8').strip()
        log_lines = logs.split('\n') if logs else []
        
        return {
            "container_id": container_id,
            "name": container.name,
            # Return logs as a list of strings
            "logs": log_lines, 
            "lines_returned": len(log_lines),
            "timestamp": datetime.now().isoformat()
        }
        
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        logger.error(f"Error fetching container logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch container logs: {str(e)}")

# Health Check für System-Monitoring
@app.get("/api/system/health")
async def system_health():
    """System-Health-Check"""
    try:
        # Basis-Systemchecks
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {}
        }
        
        # CPU-Check
        cpu_usage = metrics_collector.get_cpu_metrics()["usage"]
        health_status["checks"]["cpu"] = {
            "status": "critical" if cpu_usage > 95 else "warning" if cpu_usage > 80 else "healthy",
            "usage": cpu_usage
        }
        
        # Memory-Check
        memory = metrics_collector.get_memory_metrics()
        health_status["checks"]["memory"] = {
            "status": "critical" if memory["percentage"] > 95 else "warning" if memory["percentage"] > 80 else "healthy",
            "usage": memory["percentage"]
        }
        
        # Disk-Check
        disk = metrics_collector.get_disk_metrics()
        health_status["checks"]["disk"] = {
            "status": "critical" if disk["percentage"] > 95 else "warning" if disk["percentage"] > 80 else "healthy",
            "usage": disk["percentage"]
        }
        
        # Docker-Check
        docker_available = metrics_collector.docker_client is not None
        health_status["checks"]["docker"] = {
            "status": "healthy" if docker_available else "warning",
            "available": docker_available
        }
        
        # Gesamtstatus bestimmen
        check_statuses = [check["status"] for check in health_status["checks"].values()]
        if "critical" in check_statuses:
            health_status["status"] = "critical"
        elif "warning" in check_statuses:
            health_status["status"] = "warning"
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error during system health check: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
app.include_router(job_router, prefix="/api/jobs")
if filebrowser_router:
    app.include_router(filebrowser_router, prefix="/api/filebrowser")
else:
    logger.warning("FileBrowser router not loaded due to missing module.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)