import os
import logging
import sqlite3
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

# Logger-Konfiguration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT/Token-Konfiguration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
auth_scheme = HTTPBearer()

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

# DB-Pfad ggf. anpassen, falls in main.py anders gesetzt
DB_PATH = "files.db"

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute("PRAGMA journal_mode=WAL;")
    try:
        yield db
    finally:
        db.close()
