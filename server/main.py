import os
import sys
import uuid
import subprocess
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

import jwt
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from osgeo import gdal
from docker import from_env

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

# File storage (in production use database)
files: Dict[str, Dict[str, Any]] = {}

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

        # File info speichern
        files[file_id] = {
            "id": file_id,
            "name": file.filename,
            "size": len(content),
            "converted": False,
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": user
        }

        logger.info(f"Datei erfolgreich hochgeladen: {file.filename} (ID: {file_id})")
        return files[file_id]

    except Exception as e:
        logger.error(f"Upload fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/files")
async def list_files(user: str = Depends(verify_token)):
    """Alle hochgeladenen Dateien auflisten"""
    return list(files.values())

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

@app.post("/convert/{file_id}")
async def convert_file(file_id: str, user: str = Depends(verify_token)):
    """DXF zu GeoPDF konvertieren"""
    try:
        # Datei suchen
        file_info = files.get(file_id)
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")

        dxf_path = file_info["path"]
        geopdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")

        # Konvertierung durchführen
        dxf_to_geopdf(dxf_path, geopdf_path)

        # Datei als konvertiert markieren
        file_info["converted"] = True
        file_info["geopdf_path"] = geopdf_path

        return {"message": "File converted successfully", "fileName": file_info["name"]}
    except Exception as e:
        logger.error(f"Error converting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Conversion failed")

@app.get("/download/{file_id}")
async def download_file(file_id: str, user: str = Depends(verify_token)):
    """GeoPDF Datei herunterladen"""
    try:
        file_info = files.get(file_id)
        if not file_info or not file_info.get("geopdf_path"):
            raise HTTPException(status_code=404, detail="GeoPDF not found")

        return FileResponse(file_info["geopdf_path"], filename=f"{file_info['name']}_converted.pdf")
    except Exception as e:
        logger.error(f"Error downloading GeoPDF for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")
    
@app.delete("/files/{file_id}")
async def delete_file(file_id: str, user: str = Depends(verify_token)):
    """Datei löschen"""
    try:
        info = files.get(file_id)
        if not info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Dateien löschen
        dxf_path = os.path.join(UPLOAD_DIR, f"{file_id}.dxf")
        pdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
        
        for path in [dxf_path, pdf_path]:
            if os.path.exists(path):
                os.remove(path)
        
        # Aus Memory entfernen
        del files[file_id]
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)