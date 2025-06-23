# simple_maptiler_api.py
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import docker
import os
import uuid
import shutil
from pathlib import Path

router = APIRouter()

# Konfiguration
MAPTILER_IMAGE = "maptiler/engine:latest"
UPLOAD_PATH = "/tmp/maptiler/input"
OUTPUT_PATH = "/var/www/maptiler"  # NGINX serviert von hier
MAPTILER_KEY = os.getenv("MAPTILER_LICENSE_KEY", "")

# Verzeichnisse erstellen
Path(UPLOAD_PATH).mkdir(parents=True, exist_ok=True)
Path(OUTPUT_PATH).mkdir(parents=True, exist_ok=True)

@router.post("/api/maptiler/process")
async def process_with_maptiler(file: UploadFile = File(...)):
    """
    Nimmt eine GeoPDF-Datei entgegen, verarbeitet sie mit MapTiler 
    und gibt den Pfad zu den generierten Tiles zurück
    """
    
    # 1. Unique ID für diesen Job
    job_id = str(uuid.uuid4())
    
    # 2. Datei speichern
    input_file = os.path.join(UPLOAD_PATH, f"{job_id}.pdf")
    with open(input_file, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 3. Output-Verzeichnis
    output_dir = os.path.join(OUTPUT_PATH, job_id)
    
    try:
        # 4. Docker Client
        client = docker.from_env()
        
        # 5. MapTiler Container ausführen
        container = client.containers.run(
            MAPTILER_IMAGE,
            command=[
                "-o", f"/output",
                "-f", "png",  # PNG tiles
                "--zoom", "0-18",
                input_file
            ],
            volumes={
                os.path.abspath(UPLOAD_PATH): {"bind": "/input", "mode": "ro"},
                os.path.abspath(output_dir): {"bind": "/output", "mode": "rw"}
            },
            environment={
                "MAPTILER_LICENSE_KEY": MAPTILER_KEY
            },
            remove=True,  # Container nach Ausführung löschen
            detach=False  # Warten bis fertig
        )
        
        # 6. Aufräumen
        os.remove(input_file)
        
        # 7. Erfolg - Rückgabe der Tile-URL
        return JSONResponse({
            "success": True,
            "job_id": job_id,
            "tiles_url": f"/tiles/{job_id}/{{z}}/{{x}}/{{y}}.png",
            "output_path": output_dir
        })
        
    except docker.errors.ContainerError as e:
        # Container-Fehler
        shutil.rmtree(output_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"MapTiler error: {str(e)}")
    
    except Exception as e:
        # Andere Fehler
        shutil.rmtree(output_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@router.delete("/api/maptiler/{job_id}")
async def delete_tiles(job_id: str):
    """Löscht die generierten Tiles"""
    output_dir = os.path.join(OUTPUT_PATH, job_id)
    
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        return {"success": True, "message": "Tiles deleted"}
    else:
        raise HTTPException(status_code=404, detail="Tiles not found")