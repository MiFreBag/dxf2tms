# maptiler_routes.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
import subprocess
import json
import shutil
from datetime import datetime
import asyncio
from typing import Optional, Dict, Any
import docker
from pathlib import Path
import zipfile

router = APIRouter()

# MapTiler Konfiguration
MAPTILER_IMAGE = "maptiler/engine:latest"
MAPTILER_LICENSE_KEY = os.getenv("MAPTILER_LICENSE_KEY", "")
MAPTILER_OUTPUT_DIR = os.path.abspath("./maptiler_output")
MAPTILER_INPUT_DIR = os.path.abspath("./uploads")
MAPTILER_JOBS_DB = {}  # In Produktion: Redis oder DB verwenden

# Verzeichnisse erstellen
os.makedirs(MAPTILER_OUTPUT_DIR, exist_ok=True)

class MapTilerJob:
    def __init__(self, job_id: str, file_id: str, input_file: str):
        self.job_id = job_id
        self.file_id = file_id
        self.input_file = input_file
        self.output_dir = os.path.join(MAPTILER_OUTPUT_DIR, job_id)
        self.status = "pending"
        self.progress = 0
        self.error = None
        self.created_at = datetime.utcnow()
        self.completed_at = None
        self.container_id = None
        self.tiles_url = None
        
    def to_dict(self):
        return {
            "job_id": self.job_id,
            "file_id": self.file_id,
            "status": self.status,
            "progress": self.progress,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "tiles_url": self.tiles_url,
            "output_dir": self.output_dir if self.status == "completed" else None
        }

@router.post("/maptiler/convert/{file_id}")
async def start_maptiler_conversion(
    file_id: str,
    background_tasks: BackgroundTasks,
    format: str = "mbtiles",
    zoom_levels: str = "0-18",
    tile_size: int = 256,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Startet MapTiler-Konvertierung für eine GeoPDF-Datei
    
    Parameters:
    - format: mbtiles, folder, geopackage
    - zoom_levels: z.B. "0-18" oder "10-15"
    - tile_size: 256 oder 512
    """
    
    # Datei aus DB holen
    cursor = db.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ? AND converted = 1", (file_id,))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="GeoPDF not found or not converted")
    
    # Input-Datei prüfen
    input_file = row[2]  # Pfad zur GeoPDF
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="Input file not found on disk")
    
    # Job erstellen
    job_id = str(uuid.uuid4())
    job = MapTilerJob(job_id, file_id, input_file)
    MAPTILER_JOBS_DB[job_id] = job
    
    # MapTiler im Hintergrund starten
    background_tasks.add_task(
        run_maptiler_docker,
        job,
        format=format,
        zoom_levels=zoom_levels,
        tile_size=tile_size
    )
    
    return {
        "job_id": job_id,
        "status": "started",
        "message": "MapTiler conversion started"
    }

async def run_maptiler_docker(
    job: MapTilerJob,
    format: str = "mbtiles",
    zoom_levels: str = "0-18",
    tile_size: int = 256
):
    """Führt MapTiler in einem Docker Container aus"""
    
    docker_client = docker.from_env()
    
    try:
        job.status = "running"
        os.makedirs(job.output_dir, exist_ok=True)
        
        # Docker Volumes vorbereiten
        input_dir = os.path.dirname(job.input_file)
        input_filename = os.path.basename(job.input_file)
        
        # MapTiler Command zusammenbauen
        maptiler_cmd = [
            "-o", f"/output/{format}",  # Output im Container
            "-f", format,
            "--zoom", zoom_levels,
            "--tile-size", str(tile_size),
        ]
        
        # Lizenzschlüssel wenn vorhanden
        if MAPTILER_LICENSE_KEY:
            maptiler_cmd.extend(["--license-key", MAPTILER_LICENSE_KEY])
        
        # Input-Datei
        maptiler_cmd.append(f"/input/{input_filename}")
        
        # Docker Container starten
        container = docker_client.containers.run(
            MAPTILER_IMAGE,
            maptiler_cmd,
            volumes={
                input_dir: {"bind": "/input", "mode": "ro"},
                job.output_dir: {"bind": "/output", "mode": "rw"}
            },
            environment={
                "MAPTILER_LICENSE_KEY": MAPTILER_LICENSE_KEY
            },
            detach=True,
            remove=False
        )
        
        job.container_id = container.id
        
        # Auf Container warten und Logs streamen
        for line in container.logs(stream=True):
            log_line = line.decode('utf-8').strip()
            print(f"MapTiler [{job.job_id}]: {log_line}")
            
            # Progress aus Logs extrahieren (MapTiler spezifisch)
            if "Progress:" in log_line:
                try:
                    progress_str = log_line.split("Progress:")[1].split("%")[0].strip()
                    job.progress = int(float(progress_str))
                except:
                    pass
        
        # Container-Exit-Status prüfen
        container.reload()
        exit_code = container.attrs['State']['ExitCode']
        
        if exit_code == 0:
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            job.progress = 100
            
            # Output-Struktur prüfen
            output_path = os.path.join(job.output_dir, format)
            if os.path.exists(output_path):
                # Tiles-URL generieren
                job.tiles_url = f"/maptiler/tiles/{job.job_id}/{format}"
                
                # Metadata.json erstellen
                create_tile_metadata(job, format, zoom_levels, tile_size)
            else:
                raise Exception("Output directory not created by MapTiler")
                
        else:
            # Fehler aus Container-Logs
            error_logs = container.logs(tail=50).decode('utf-8')
            raise Exception(f"MapTiler failed with exit code {exit_code}: {error_logs}")
        
        # Container entfernen
        container.remove()
        
    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.completed_at = datetime.utcnow()
        print(f"MapTiler error for job {job.job_id}: {e}")
        
        # Container aufräumen falls noch vorhanden
        if job.container_id:
            try:
                container = docker_client.containers.get(job.container_id)
                container.remove(force=True)
            except:
                pass

def create_tile_metadata(job: MapTilerJob, format: str, zoom_levels: str, tile_size: int):
    """Erstellt Metadaten für die generierten Tiles"""
    
    metadata = {
        "job_id": job.job_id,
        "file_id": job.file_id,
        "format": format,
        "zoom_levels": zoom_levels,
        "tile_size": tile_size,
        "created_at": job.created_at.isoformat(),
        "completed_at": job.completed_at.isoformat(),
        "bounds": get_tile_bounds(job.output_dir, format),
        "center": get_tile_center(job.output_dir, format),
        "tilejson": "2.2.0",
        "tiles": [
            f"/maptiler/tiles/{job.job_id}/{format}/{{z}}/{{x}}/{{y}}.png"
        ]
    }
    
    metadata_path = os.path.join(job.output_dir, "metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # TileJSON erstellen
    tilejson_path = os.path.join(job.output_dir, format, "tilejson.json")
    os.makedirs(os.path.dirname(tilejson_path), exist_ok=True)
    with open(tilejson_path, 'w') as f:
        json.dump(metadata, f, indent=2)

def get_tile_bounds(output_dir: str, format: str) -> list:
    """Extrahiert Bounds aus MapTiler Output"""
    # MapTiler erstellt normalerweise eine metadata.json
    metadata_path = os.path.join(output_dir, format, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            data = json.load(f)
            if "bounds" in data:
                return data["bounds"]
    
    # Fallback: Standard Web Mercator Bounds
    return [-180, -85.05112878, 180, 85.05112878]

def get_tile_center(output_dir: str, format: str) -> list:
    """Berechnet Center aus Bounds"""
    bounds = get_tile_bounds(output_dir, format)
    return [
        (bounds[0] + bounds[2]) / 2,  # lon
        (bounds[1] + bounds[3]) / 2,  # lat
        10  # default zoom
    ]

@router.get("/maptiler/status/{job_id}")
async def get_maptiler_status(job_id: str):
    """Status eines MapTiler-Jobs abrufen"""
    
    job = MAPTILER_JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.to_dict()

@router.get("/maptiler/jobs")
async def list_maptiler_jobs(
    user: str = Depends(verify_token)
):
    """Alle MapTiler-Jobs auflisten"""
    
    jobs = []
    for job in MAPTILER_JOBS_DB.values():
        jobs.append(job.to_dict())
    
    # Nach Datum sortieren
    jobs.sort(key=lambda x: x["created_at"], reverse=True)
    
    return jobs

@router.delete("/maptiler/jobs/{job_id}")
async def delete_maptiler_job(
    job_id: str,
    user: str = Depends(verify_token)
):
    """MapTiler-Job und Output löschen"""
    
    job = MAPTILER_JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Output-Verzeichnis löschen
    if os.path.exists(job.output_dir):
        shutil.rmtree(job.output_dir)
    
    # Job aus DB entfernen
    del MAPTILER_JOBS_DB[job_id]
    
    return {"message": "Job deleted successfully"}

@router.get("/maptiler/download/{job_id}")
async def download_maptiler_output(
    job_id: str,
    format: str = "zip"
):
    """MapTiler-Output als ZIP herunterladen"""
    
    job = MAPTILER_JOBS_DB.get(job_id)
    if not job or job.status != "completed":
        raise HTTPException(status_code=404, detail="Job not found or not completed")
    
    if format == "zip":
        # ZIP erstellen
        zip_path = os.path.join(job.output_dir, f"tiles_{job_id}.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(job.output_dir):
                for file in files:
                    if file.endswith('.zip'):
                        continue
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, job.output_dir)
                    zipf.write(file_path, arcname)
        
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"maptiler_{job_id}.zip"
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

# NGINX Configuration für Tiles-Serving
"""
# nginx.conf Beispiel für Tiles-Serving:

location /maptiler/tiles/ {
    alias /path/to/maptiler_output/;
    
    # Cache-Header für Tiles
    expires 7d;
    add_header Cache-Control "public, immutable";
    
    # CORS wenn benötigt
    add_header Access-Control-Allow-Origin *;
    
    # Gzip für Tiles
    gzip on;
    gzip_types image/png image/jpeg application/json;
    
    # Fehlerbehandlung
    try_files $uri =404;
}

# Für MBTiles-Serving (benötigt zusätzliches Modul):
location ~ ^/maptiler/mbtiles/([^/]+)/([0-9]+)/([0-9]+)/([0-9]+)\.png$ {
    mbtiles /path/to/maptiler_output/$1/mbtiles/$1.mbtiles;
    mbtiles_zoom $2;
    mbtiles_column $3;
    mbtiles_row $4;
}
"""

# Docker Compose Erweiterung
"""
# docker-compose.yml Ergänzung:

services:
  maptiler:
    image: maptiler/engine:latest
    volumes:
      - ./uploads:/input:ro
      - ./maptiler_output:/output:rw
    environment:
      - MAPTILER_LICENSE_KEY=${MAPTILER_LICENSE_KEY}
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./maptiler_output:/var/www/tiles:ro
      - ./static:/var/www/static:ro
    depends_on:
      - api
    networks:
      - app-network
"""