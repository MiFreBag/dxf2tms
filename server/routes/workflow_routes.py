# workflow_routes.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any
import json
import sqlite3
from datetime import datetime
import uuid
import aiosmtplib
from email.message import EmailMessage
import httpx
import os
import zipfile
import geopandas as gpd
from osgeo import ogr, gdal
import pandas as pd
from main import verify_token

router = APIRouter()

# Workflow-Datenbank erweitern
def init_workflow_tables(conn):
    """Erstellt Workflow-Tabellen in der Datenbank"""
    cursor = conn.cursor()
    
    # Workflows Tabelle
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        conditions TEXT,
        actions TEXT,
        notifications TEXT,
        created_at TEXT,
        updated_at TEXT,
        created_by TEXT
    )
    """)
    
    # API Keys Tabelle
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        type TEXT DEFAULT 'live',
        permissions TEXT,
        created_at TEXT,
        last_used TEXT,
        created_by TEXT
    )
    """)
    
    # Webhooks Tabelle
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT,
        active BOOLEAN DEFAULT 1,
        last_triggered TEXT,
        created_at TEXT,
        created_by TEXT
    )
    """)
    
    # Export Jobs Tabelle
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS export_jobs (
        id TEXT PRIMARY KEY,
        file_ids TEXT,
        format TEXT,
        options TEXT,
        status TEXT DEFAULT 'pending',
        result_path TEXT,
        created_at TEXT,
        completed_at TEXT,
        created_by TEXT
    )
    """)
    
    conn.commit()

# WORKFLOW ENDPOINTS

@router.get("/workflows")
async def list_workflows(user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """Alle Workflows abrufen"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM workflows WHERE created_by = ?", (user,))
    rows = cursor.fetchall()
    
    workflows = []
    for row in rows:
        workflows.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "enabled": bool(row[3]),
            "conditions": json.loads(row[4]) if row[4] else {},
            "actions": json.loads(row[5]) if row[5] else {},
            "notifications": json.loads(row[6]) if row[6] else {},
            "created_at": row[7],
            "updated_at": row[8]
        })
    
    return workflows

@router.post("/workflows")
async def create_workflow(
    workflow: Dict[str, Any],
    background_tasks: BackgroundTasks,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Neuen Workflow erstellen"""
    workflow_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO workflows (id, name, type, enabled, conditions, actions, notifications, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        workflow_id,
        workflow["name"],
        workflow["type"],
        workflow.get("enabled", True),
        json.dumps(workflow.get("conditions", {})),
        json.dumps(workflow.get("actions", {})),
        json.dumps(workflow.get("notifications", {})),
        now,
        now,
        user
    ))
    db.commit()
    
    return {"id": workflow_id, "message": "Workflow erstellt"}

@router.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    workflow: Dict[str, Any],
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Workflow aktualisieren"""
    cursor = db.cursor()
    cursor.execute("""
        UPDATE workflows 
        SET name = ?, type = ?, enabled = ?, conditions = ?, actions = ?, notifications = ?, updated_at = ?
        WHERE id = ? AND created_by = ?
    """, (
        workflow["name"],
        workflow["type"],
        workflow.get("enabled", True),
        json.dumps(workflow.get("conditions", {})),
        json.dumps(workflow.get("actions", {})),
        json.dumps(workflow.get("notifications", {})),
        datetime.utcnow().isoformat(),
        workflow_id,
        user
    ))
    db.commit()
    
    return {"message": "Workflow aktualisiert"}

@router.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Workflow löschen"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM workflows WHERE id = ? AND created_by = ?", (workflow_id, user))
    db.commit()
    
    return {"message": "Workflow gelöscht"}

# Workflow-Ausführung
async def execute_workflow(workflow: Dict, file_data: Dict, db: sqlite3.Connection):
    """Führt einen Workflow für eine Datei aus"""
    # Bedingungen prüfen
    conditions = workflow["conditions"]
    
    # Dateityp prüfen
    if conditions.get("fileType") != "any":
        if not file_data["name"].endswith(conditions["fileType"]):
            return False
    
    # Größe prüfen
    file_size = file_data["size"]
    if conditions.get("minSize", 0) > 0 and file_size < conditions["minSize"]:
        return False
    if conditions.get("maxSize", 0) > 0 and file_size > conditions["maxSize"]:
        return False
    
    # Aktionen ausführen
    actions = workflow["actions"]
    
    # Auto-Konvertierung
    if actions.get("convert", {}).get("enabled"):
        # Konvertierung auslösen
        # TODO: API-Call zur Konvertierung
        pass
    
    # TMS erstellen
    if actions.get("createTms", {}).get("enabled"):
        # TMS-Erstellung auslösen
        # TODO: API-Call zur TMS-Erstellung
        pass
    
    # Benachrichtigungen
    notifications = workflow["notifications"]
    
    # E-Mail senden
    if notifications.get("email") and notifications.get("emailTo"):
        await send_email_notification(
            to=notifications["emailTo"],
            subject=f"Workflow ausgeführt: {workflow['name']}",
            body=f"Die Datei {file_data['name']} wurde verarbeitet."
        )
    
    # Webhook auslösen
    if notifications.get("webhook") and notifications.get("webhookUrl"):
        await trigger_webhook(
            url=notifications["webhookUrl"],
            event="workflow.executed",
            data={
                "workflow": workflow["name"],
                "file": file_data
            }
        )
    
    return True

# EXPORT ENDPOINTS

@router.post("/export")
async def create_export(
    export_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Export-Job erstellen"""
    export_id = str(uuid.uuid4())
    
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO export_jobs (id, file_ids, format, options, status, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        export_id,
        json.dumps(export_data["file_ids"]),
        export_data["format"],
        json.dumps(export_data.get("options", {})),
        "processing",
        datetime.utcnow().isoformat(),
        user
    ))
    db.commit()
    
    # Export im Hintergrund ausführen
    background_tasks.add_task(process_export, export_id, export_data, db)
    
    return {"id": export_id, "status": "processing"}

async def process_export(export_id: str, export_data: Dict, db: sqlite3.Connection):
    """Export-Job verarbeiten"""
    try:
        format_type = export_data["format"]
        file_ids = export_data["file_ids"]
        options = export_data.get("options", {})
        
        # Temporäres Verzeichnis für Export
        export_dir = f"exports/{export_id}"
        os.makedirs(export_dir, exist_ok=True)
        
        # Format-spezifische Verarbeitung
        if format_type == "geojson":
            output_file = await export_to_geojson(file_ids, export_dir, options)
        elif format_type == "kml":
            output_file = await export_to_kml(file_ids, export_dir, options)
        elif format_type == "shapefile":
            output_file = await export_to_shapefile(file_ids, export_dir, options)
        elif format_type == "geopackage":
            output_file = await export_to_geopackage(file_ids, export_dir, options)
        elif format_type == "csv":
            output_file = await export_to_csv(file_ids, export_dir, options)
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        # Komprimierung wenn gewünscht
        if options.get("compression") == "zip":
            zip_file = f"{export_dir}/export.zip"
            with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.write(output_file, os.path.basename(output_file))
            output_file = zip_file
        
        # Status aktualisieren
        cursor = db.cursor()
        cursor.execute("""
            UPDATE export_jobs 
            SET status = ?, result_path = ?, completed_at = ?
            WHERE id = ?
        """, ("completed", output_file, datetime.utcnow().isoformat(), export_id))
        db.commit()
        
    except Exception as e:
        # Fehler behandeln
        cursor = db.cursor()
        cursor.execute("""
            UPDATE export_jobs 
            SET status = ?, completed_at = ?
            WHERE id = ?
        """, ("failed", datetime.utcnow().isoformat(), export_id))
        db.commit()
        raise

# API KEYS ENDPOINTS

@router.get("/api-keys")
async def list_api_keys(user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """Alle API-Schlüssel abrufen"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM api_keys WHERE created_by = ?", (user,))
    rows = cursor.fetchall()
    
    api_keys = []
    for row in rows:
        api_keys.append({
            "id": row[0],
            "name": row[1],
            "key": row[2],  # In Produktion: nur letzte 4 Zeichen zeigen
            "type": row[3],
            "permissions": json.loads(row[4]) if row[4] else [],
            "created_at": row[5],
            "last_used": row[6]
        })
    
    return api_keys

@router.post("/api-keys")
async def create_api_key(
    key_data: Dict[str, Any],
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Neuen API-Schlüssel erstellen"""
    import secrets
    
    key_id = str(uuid.uuid4())
    key_type = key_data.get("type", "live")
    api_key = f"sk_{key_type}_{secrets.token_urlsafe(24)}"
    
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO api_keys (id, name, key, type, permissions, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        key_id,
        key_data["name"],
        api_key,
        key_type,
        json.dumps(key_data.get("permissions", ["read"])),
        datetime.utcnow().isoformat(),
        user
    ))
    db.commit()
    
    return {
        "id": key_id,
        "key": api_key,  # Nur bei Erstellung vollständig anzeigen
        "message": "API-Schlüssel erstellt"
    }

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """API-Schlüssel löschen"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM api_keys WHERE id = ? AND created_by = ?", (key_id, user))
    db.commit()
    
    return {"message": "API-Schlüssel gelöscht"}

# API Key Authentifizierung
async def verify_api_key(api_key: str, required_permissions: List[str] = None):
    """API-Schlüssel verifizieren"""
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM api_keys WHERE key = ?", (api_key,))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Berechtigungen prüfen
    if required_permissions:
        permissions = json.loads(row[4]) if row[4] else []
        for perm in required_permissions:
            if perm not in permissions:
                raise HTTPException(status_code=403, detail=f"Missing permission: {perm}")
    
    # Last used aktualisieren
    cursor.execute(
        "UPDATE api_keys SET last_used = ? WHERE key = ?",
        (datetime.utcnow().isoformat(), api_key)
    )
    db.commit()
    
    return row[7]  # created_by (user)

# WEBHOOK ENDPOINTS

@router.get("/webhooks")
async def list_webhooks(user: str = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    """Alle Webhooks abrufen"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM webhooks WHERE created_by = ?", (user,))
    rows = cursor.fetchall()
    
    webhooks = []
    for row in rows:
        webhooks.append({
            "id": row[0],
            "url": row[1],
            "events": json.loads(row[2]) if row[2] else [],
            "active": bool(row[3]),
            "last_triggered": row[4],
            "created_at": row[5]
        })
    
    return webhooks

@router.post("/webhooks")
async def create_webhook(
    webhook_data: Dict[str, Any],
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Neuen Webhook erstellen"""
    webhook_id = str(uuid.uuid4())
    
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO webhooks (id, url, events, active, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        webhook_id,
        webhook_data["url"],
        json.dumps(webhook_data.get("events", [])),
        webhook_data.get("active", True),
        datetime.utcnow().isoformat(),
        user
    ))
    db.commit()
    
    return {"id": webhook_id, "message": "Webhook erstellt"}

@router.put("/webhooks/{webhook_id}/toggle")
async def toggle_webhook(
    webhook_id: str,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Webhook aktivieren/deaktivieren"""
    cursor = db.cursor()
    cursor.execute(
        "UPDATE webhooks SET active = NOT active WHERE id = ? AND created_by = ?",
        (webhook_id, user)
    )
    db.commit()
    
    return {"message": "Webhook-Status geändert"}

@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Webhook testen"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM webhooks WHERE id = ? AND created_by = ?", (webhook_id, user))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    webhook_url = row[1]
    
    # Test-Payload senden
    test_payload = {
        "event": "webhook.test",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": "This is a test webhook"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(webhook_url, json=test_payload, timeout=10.0)
            return {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response": response.text[:200]  # Erste 200 Zeichen
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    user: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """Webhook löschen"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM webhooks WHERE id = ? AND created_by = ?", (webhook_id, user))
    db.commit()
    
    return {"message": "Webhook gelöscht"}

# Webhook auslösen
async def trigger_webhook(url: str, event: str, data: Dict):
    """Webhook auslösen"""
    payload = {
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    }
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, timeout=10.0)
        except Exception as e:
            logger.error(f"Webhook failed: {url} - {str(e)}")

# Webhook für alle registrierten URLs auslösen
async def trigger_webhooks_for_event(event: str, data: Dict, user: str, db: sqlite3.Connection):
    """Alle Webhooks für ein Event auslösen"""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM webhooks WHERE created_by = ? AND active = 1",
        (user,)
    )
    rows = cursor.fetchall()
    
    for row in rows:
        events = json.loads(row[2]) if row[2] else []
        if event in events:
            webhook_url = row[1]
            webhook_id = row[0]
            
            # Webhook auslösen
            await trigger_webhook(webhook_url, event, data)
            
            # Last triggered aktualisieren
            cursor.execute(
                "UPDATE webhooks SET last_triggered = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), webhook_id)
            )
    
    db.commit()

# EXPORT FUNKTIONEN

async def export_to_geojson(file_ids: List[str], export_dir: str, options: Dict) -> str:
    """Export zu GeoJSON"""
    features = []
    
    for file_id in file_ids:
        # Geodaten aus der Datei extrahieren
        # TODO: Implementierung basierend auf Dateityp
        pass
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    output_file = os.path.join(export_dir, "export.geojson")
    with open(output_file, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    return output_file

async def export_to_kml(file_ids: List[str], export_dir: str, options: Dict) -> str:
    """Export zu KML"""
    # KML-Dokument erstellen
    kml_content = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Export</name>
    <description>Exported from TMS Converter</description>
"""
    
    for file_id in file_ids:
        # Geodaten hinzufügen
        # TODO: Implementierung
        pass
    
    kml_content += """  </Document>
</kml>"""
    
    output_file = os.path.join(export_dir, "export.kml")
    with open(output_file, 'w') as f:
        f.write(kml_content)
    
    return output_file

async def export_to_shapefile(file_ids: List[str], export_dir: str, options: Dict) -> str:
    """Export zu Shapefile"""
    # GDAL/OGR verwenden
    driver = ogr.GetDriverByName("ESRI Shapefile")
    output_file = os.path.join(export_dir, "export.shp")
    
    # Shapefile erstellen
    ds = driver.CreateDataSource(output_file)
    # TODO: Layer und Features hinzufügen
    ds = None
    
    return output_file

async def export_to_geopackage(file_ids: List[str], export_dir: str, options: Dict) -> str:
    """Export zu GeoPackage"""
    output_file = os.path.join(export_dir, "export.gpkg")
    
    # GeoPackage mit GDAL erstellen
    driver = ogr.GetDriverByName("GPKG")
    ds = driver.CreateDataSource(output_file)
    # TODO: Layer und Features hinzufügen
    ds = None
    
    return output_file

async def export_to_csv(file_ids: List[str], export_dir: str, options: Dict) -> str:
    """Export zu CSV (für Punktdaten)"""
    data = []
    
    for file_id in file_ids:
        # Punktdaten extrahieren
        # TODO: Implementierung
        pass
    
    output_file = os.path.join(export_dir, "export.csv")
    df = pd.DataFrame(data)
    df.to_csv(output_file, index=False)
    
    return output_file

# E-Mail Funktionen
async def send_email_notification(to: str, subject: str, body: str):
    """E-Mail-Benachrichtigung senden"""
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", "noreply@example.com")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    
    # SMTP-Konfiguration aus Umgebungsvariablen
    smtp_host = os.getenv("SMTP_HOST", "localhost")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user if smtp_user else None,
            password=smtp_pass if smtp_pass else None,
            start_tls=True
        )
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")

# Integration in main.py:
# from routes.workflow_routes import router as workflow_router
# app.include_router(workflow_router, prefix="/api")

# Beim Start die Tabellen initialisieren:
# with sqlite3.connect(DB_PATH) as conn:
#     init_workflow_tables(conn)