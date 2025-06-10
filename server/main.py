from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import uuid
import subprocess
import json
from datetime import datetime, timedelta
import jwt
from osgeo import gdal
from .convert_dxf_to_geopdf import dxf_to_geopdf

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
STATIC_ROOT = os.path.join(UPLOAD_DIR, "nodes", "static")

SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
auth_scheme = HTTPBearer()

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload.get("sub")

app = FastAPI(
    title="DXF to GeoPDF API",
    description="API for converting DXF files to GeoPDF using QGIS",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url=None,
)
files = {}

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_ROOT, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

@app.get("/swagger", include_in_schema=False)
async def swagger_ui() -> HTMLResponse:
    """Serve Swagger UI for interactive API documentation."""
    return get_swagger_ui_html(openapi_url=app.openapi_url, title=f"{app.title} - Swagger UI")

def custom_openapi():
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
def login(credentials: dict):
    username = credentials.get("username")
    password = credentials.get("password")
    if username == "admin" and password == "admin123":
        token = create_token(username)
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")

def pdf_to_tms(pdf_path: str, out_dir: str, minzoom: int = 0, maxzoom: int = 6) -> None:
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
    cmd = [
        "gdal2tiles.py",
        "-z", f"{minzoom}-{maxzoom}",
        "-r", "bilinear",
        "-w", "none",
        pdf_path, out_dir
    ]
    subprocess.run(cmd, check=True)


def write_config(bounds, srs, resolution, minzoom, maxzoom, out_dir: str) -> None:
    config = {
        "bounds": bounds,
        "srs": srs,
        "resolution": resolution,
        "minzoom": minzoom,
        "maxzoom": maxzoom,
        "comments": ""
    }
    with open(os.path.join(out_dir, "config.json"), "w") as f:
        json.dump(config, f)


def write_openlayers_html(bounds, minzoom, maxzoom, resolution, out_dir: str) -> None:
    html = f"""<!DOCTYPE html>
<html>
<head>
<title>GeoPDF TMS Viewer</title>
<meta http-equiv=\"imagetoolbar\" content=\"no\"/>
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0\">
<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">
<style>
html, body {{ margin:0; padding: 0; height: 100%; width: 100%; }}
body {{ width:100%; height:100%; background: #ffffff; }}
#map {{ position: absolute; height: 100%; width: 100%; background-color: #FFFFFF; }}
</style>
<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.css\" type=\"text/css\">
<script src=\"https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.js\" type=\"text/javascript\"></script>
</head>
<body>
<div id=\"map\"></div>
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
</html>
"""
    with open(os.path.join(out_dir, "openlayers.html"), "w") as f:
        f.write(html)


def get_pdf_metadata(pdf_path: str):
    ds = gdal.Open(pdf_path)
    gt = ds.GetGeoTransform()
    xsize = ds.RasterXSize
    ysize = ds.RasterYSize
    minx = gt[0]
    maxy = gt[3]
    maxx = minx + gt[1] * xsize
    miny = maxy + gt[5] * ysize
    srs = ds.GetProjectionRef()
    resolution = gt[1]
    return [minx, miny, maxx, maxy], srs, resolution

@app.post("/upload")
async def upload(file: UploadFile = File(...), user: str = Depends(verify_token)):
    file_id = str(uuid.uuid4())
    dxf_path = os.path.join(UPLOAD_DIR, f"{file_id}.dxf")
    with open(dxf_path, "wb") as f:
        f.write(await file.read())
    files[file_id] = {"id": file_id, "name": file.filename, "converted": False}
    return files[file_id]

@app.get("/files")
def list_files(user: str = Depends(verify_token)):
    return list(files.values())


@app.get("/tms")
def list_tms():
    layers = []
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
                    "url": f"/api/static/{name}",
                    "config": config,
                })
    return layers

@app.post("/convert/{file_id}")
def convert(file_id: str, user: str = Depends(verify_token)):
    info = files.get(file_id)
    if not info:
        raise HTTPException(status_code=404, detail="Not found")
    dxf_path = os.path.join(UPLOAD_DIR, f"{file_id}.dxf")
    pdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
    dxf_to_geopdf(dxf_path, pdf_path)

    bounds, srs, resolution = get_pdf_metadata(pdf_path)
    job_id = str(uuid.uuid4())
    static_dir = os.path.join(STATIC_ROOT, job_id)
    pdf_to_tms(pdf_path, static_dir, minzoom=0, maxzoom=6)
    write_config(bounds, srs, resolution, 0, 6, static_dir)
    write_openlayers_html(bounds, 0, 6, resolution, static_dir)

    info["converted"] = True
    info["static_folder"] = f"/api/static/{job_id}/"
    return {"static_folder": info["static_folder"]}

@app.get("/download/{file_id}")
def download(file_id: str, token: str):
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    info = files.get(file_id)
    if not info or not info.get("converted"):
        raise HTTPException(status_code=404, detail="File not converted")
    pdf_path = os.path.join(OUTPUT_DIR, f"{file_id}.pdf")
    return FileResponse(pdf_path, filename=f"{info['name']}.pdf")
