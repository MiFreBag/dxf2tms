# Geopos Backend Endpunkte für FastAPI
# Ergänzung zur bestehenden server/main.py

from typing import List, Dict, Any, Optional
import cx_Oracle  # Für Oracle-Datenbankverbindung
from dataclasses import dataclass
import math
from xml.etree import ElementTree as ET

# Geopos-spezifische Datenmodelle
@dataclass
class GeoposObject:
    id: str
    name: str
    x: float  # Swiss Grid Koordinaten
    y: float
    rotation: float = 0.0
    category: str = ""
    symbol_id: str = ""
    unpositioned: bool = False
    attributes: Dict[str, Any] = None

@dataclass
class GeoposLayer:
    id: str
    name: str
    visible: bool
    category: str
    objects: List[GeoposObject]

# Koordinatentransformation Swiss Grid (LV95) zu WGS84
def swiss_to_wgs84(x: float, y: float) -> tuple:
    """
    Konvertiert Swiss Grid LV95 Koordinaten zu WGS84 (lat/lng)
    Basiert auf der offiziellen swisstopo Transformation
    """
    # Swiss Grid LV95 nach WGS84 Transformation
    # Referenzpunkt verschieben
    x_aux = (x - 2600000) / 1000000
    y_aux = (y - 1200000) / 1000000
    
    # Breitengrad (Latitude)
    lat = (16.9023892 +
           3.238272 * x_aux -
           0.270978 * pow(y_aux, 2) -
           0.002528 * pow(x_aux, 2) -
           0.0447 * pow(y_aux, 2) * x_aux -
           0.0140 * pow(x_aux, 3))
    
    # Längengrad (Longitude)  
    lng = (2.6779094 +
           4.728982 * y_aux +
           0.791484 * y_aux * x_aux +
           0.1306 * y_aux * pow(x_aux, 2) -
           0.0436 * pow(y_aux, 3))
    
    # Grad-Umrechnung
    lat = lat * 100 / 36
    lng = lng * 100 / 36
    
    return lat, lng

def wgs84_to_swiss(lat: float, lng: float) -> tuple:
    """
    Konvertiert WGS84 (lat/lng) zu Swiss Grid LV95 Koordinaten
    """
    # WGS84 zu Swiss Grid Transformation (umgekehrt)
    lat_aux = (lat * 36) / 100
    lng_aux = (lng * 36) / 100
    
    # Hilfsvariablen
    lat_aux = (lat_aux - 16.9023892) / 3.238272
    lng_aux = (lng_aux - 2.6779094) / 4.728982
    
    # Approximation für die Rücktransformation
    x = 2600000 + lat_aux * 1000000
    y = 1200000 + lng_aux * 1000000
    
    return x, y

# Oracle-Datenbankverbindung für Geopos
class GeoposDatabase:
    def __init__(self):
        # Konfiguration aus Umgebungsvariablen oder Konfigurationsdatei
        self.host = os.environ.get("ORACLE_HOST", "localhost")
        self.port = os.environ.get("ORACLE_PORT", "1521")
        self.service = os.environ.get("ORACLE_SERVICE", "XE")
        self.username = os.environ.get("ORACLE_USER", "geopos")
        self.password = os.environ.get("ORACLE_PASSWORD", "password")
        
    def get_connection(self):
        """Oracle-Datenbankverbindung erstellen"""
        dsn = cx_Oracle.makedsn(self.host, self.port, service_name=self.service)
        return cx_Oracle.connect(self.username, self.password, dsn)
    
    def get_objects_by_layer(self, layer_id: str, project: str = "1") -> List[GeoposObject]:
        """Objekte aus der Oracle-Datenbank für einen Layer laden"""
        objects = []
        
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # SQL-Query basierend auf der bestehenden LayerStaticAttributes.java Struktur
            sql = """
            SELECT o.ID, o.NAME, o.X_COORD, o.Y_COORD, o.ROTATION, 
                   o.CATEGORY, o.SYMBOL_ID, o.UNPOSITIONED
            FROM GEOPOS_OBJECTS o
            WHERE o.LAYER_ID = :layer_id
            AND o.PROJECT = :project
            ORDER BY o.CATEGORY, o.NAME
            """
            
            cursor.execute(sql, {"layer_id": layer_id, "project": project})
            
            for row in cursor:
                obj = GeoposObject(
                    id=row[0],
                    name=row[1] or row[0],
                    x=float(row[2]) if row[2] else 0.0,
                    y=float(row[3]) if row[3] else 0.0,
                    rotation=float(row[4]) if row[4] else 0.0,
                    category=row[5] or "",
                    symbol_id=row[6] or "",
                    unpositioned=bool(row[7]) if row[7] else False
                )
                objects.append(obj)
                
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Fehler beim Laden der Objekte: {e}")
            
        return objects
    
    def get_ampel_data(self, knoten_nr: str, element_mode: str, phase: str) -> Dict[str, Any]:
        """Ampel-Daten aus der Oracle-Datenbank laden"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            sql = """
            SELECT KNOTENNR, ELEMENTMODE, PHASE, MASTNR, AMPELNR, 
                   SPURNR, AMPELFUNKTION, ZUSTAND
            FROM medmgr.ampel 
            WHERE KNOTENNR = :knoten_nr 
            AND ELEMENTMODE = :element_mode 
            AND PHASE = :phase
            ORDER BY MASTNR, AMPELNR
            """
            
            cursor.execute(sql, {
                "knoten_nr": knoten_nr,
                "element_mode": element_mode, 
                "phase": phase
            })
            
            ampel_data = {}
            for row in cursor:
                key = f"{row[3]}{row[4]}"  # MASTNR + AMPELNR
                ampel_data[key] = {
                    "knotennr": row[0],
                    "elementmode": row[1],
                    "phase": row[2],
                    "mastnr": row[3],
                    "ampelnr": row[4],
                    "spurnr": row[5],
                    "ampelfunktion": row[6],
                    "zustand": row[7]
                }
                
            cursor.close()
            conn.close()
            return ampel_data
            
        except Exception as e:
            logger.error(f"Fehler beim Laden der Ampel-Daten: {e}")
            return {}

    def update_object(self, obj: GeoposObject) -> bool:
        """Objekt in der Datenbank aktualisieren"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            sql = """
            UPDATE GEOPOS_OBJECTS 
            SET NAME = :name, X_COORD = :x, Y_COORD = :y, 
                ROTATION = :rotation, CATEGORY = :category,
                UNPOSITIONED = :unpositioned
            WHERE ID = :id
            """
            
            cursor.execute(sql, {
                "name": obj.name,
                "x": obj.x,
                "y": obj.y,
                "rotation": obj.rotation,
                "category": obj.category,
                "unpositioned": 1 if obj.unpositioned else 0,
                "id": obj.id
            })
            
            conn.commit()
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren des Objekts: {e}")
            return False

# Geopos Database Instance
geopos_db = GeoposDatabase()

# Geopos API Endpunkte

@app.get("/api/geopos/layers")
async def get_geopos_layers(username: str = Depends(verify_token)):
    """Alle verfügbaren Geopos-Layer abrufen"""
    layers = [
        {
            "id": "STATIC",
            "name": "Statische Layer", 
            "visible": True,
            "category": "static",
            "description": "Statische Verkehrsobjekte"
        },
        {
            "id": "DYNAMIC", 
            "name": "Dynamische Layer",
            "visible": False,
            "category": "dynamic", 
            "description": "Dynamische Verkehrssignale"
        },
        {
            "id": "PROJECT0",
            "name": "Projekt 0",
            "visible": True,
            "category": "project",
            "description": "Projektlayer 0"
        },
        {
            "id": "PROJECT1",
            "name": "Projekt 1", 
            "visible": True,
            "category": "project",
            "description": "Projektlayer 1"
        }
    ]
    return layers

@app.get("/api/geopos/objects/{layer_id}")
async def get_geopos_objects(layer_id: str, username: str = Depends(verify_token)):
    """Objekte für einen bestimmten Layer abrufen"""
    try:
        objects = geopos_db.get_objects_by_layer(layer_id)
        
        # Konvertiere zu Dictionary für JSON-Response
        result = []
        for obj in objects:
            # Koordinaten zu WGS84 konvertieren für die Kartenanzeige
            if obj.x and obj.y and not obj.unpositioned:
                lat, lng = swiss_to_wgs84(obj.x, obj.y)
            else:
                lat, lng = None, None
                
            result.append({
                "id": obj.id,
                "name": obj.name,
                "x": obj.x,
                "y": obj.y,
                "lat": lat,
                "lng": lng,
                "rotation": obj.rotation,
                "category": obj.category,
                "symbol_id": obj.symbol_id,
                "unpositioned": obj.unpositioned,
                "attributes": obj.attributes or {}
            })
            
        return result
        
    except Exception as e:
        logger.error(f"Fehler beim Laden der Objekte für Layer {layer_id}: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Laden der Objekte")

@app.get("/api/geopos/svg/{layer_id}")
async def get_geopos_svg(layer_id: str, username: str = Depends(verify_token)):
    """SVG-Daten für einen Layer abrufen"""
    try:
        # SVG-Datei basierend auf Layer laden
        svg_path = f"geopos_data/{layer_id}.svg"
        
        if os.path.exists(svg_path):
            with open(svg_path, 'r', encoding='utf-8') as f:
                svg_content = f.read()
                
            # SVG-Content anpassen/filtern falls nötig
            return svg_content
        else:
            # Standard-SVG generieren falls keine Datei vorhanden
            return generate_default_svg(layer_id)
            
    except Exception as e:
        logger.error(f"Fehler beim Laden der SVG-Daten für Layer {layer_id}: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Laden der SVG-Daten")

@app.put("/api/geopos/objects/{object_id}")
async def update_geopos_object(
    object_id: str, 
    object_data: dict,
    username: str = Depends(verify_token)
):
    """Geopos-Objekt aktualisieren"""
    try:
        # Objekt-Daten validieren und konvertieren
        obj = GeoposObject(
            id=object_id,
            name=object_data.get("name", ""),
            x=float(object_data.get("x", 0)),
            y=float(object_data.get("y", 0)),
            rotation=float(object_data.get("rotation", 0)),
            category=object_data.get("category", ""),
            symbol_id=object_data.get("symbol_id", ""),
            unpositioned=bool(object_data.get("unpositioned", False)),
            attributes=object_data.get("attributes", {})
        )
        
        # In Datenbank speichern
        success = geopos_db.update_object(obj)
        
        if success:
            return {"status": "success", "message": "Objekt erfolgreich aktualisiert"}
        else:
            raise HTTPException(status_code=500, detail="Fehler beim Speichern")
            
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Objekts {object_id}: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren des Objekts")

@app.post("/api/geopos/objects/delete")
async def delete_geopos_objects(
    request_data: dict,
    username: str = Depends(verify_token)
):
    """Mehrere Geopos-Objekte löschen"""
    try:
        object_ids = request_data.get("ids", [])
        
        if not object_ids:
            raise HTTPException(status_code=400, detail="Keine Objekt-IDs angegeben")
            
        # Objekte aus Datenbank löschen
        conn = geopos_db.get_connection()
        cursor = conn.cursor()
        
        placeholders = ",".join([":id" + str(i) for i in range(len(object_ids))])
        sql = f"DELETE FROM GEOPOS_OBJECTS WHERE ID IN ({placeholders})"
        
        # Parameter-Dictionary erstellen
        params = {f"id{i}": obj_id for i, obj_id in enumerate(object_ids)}
        cursor.execute(sql, params)
        
        conn.commit()
        deleted_count = cursor.rowcount
        
        cursor.close()
        conn.close()
        
        return {
            "status": "success", 
            "message": f"{deleted_count} Objekt(e) gelöscht",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error(f"Fehler beim Löschen der Objekte: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Löschen der Objekte")

@app.get("/api/geopos/attributes/{object_id}")
async def get_object_attributes(
    object_id: str,
    username: str = Depends(verify_token)
):
    """Erweiterte Attributdaten für ein Objekt abrufen (Ampel-Daten etc.)"""
    try:
        # Basis-Objektdaten abrufen
        conn = geopos_db.get_connection()
        cursor = conn.cursor()
        
        sql = """
        SELECT CATEGORY, SYMBOL_ID, KNOTEN_NR, PROJECT
        FROM GEOPOS_OBJECTS 
        WHERE ID = :object_id
        """
        
        cursor.execute(sql, {"object_id": object_id})
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
            
        category, symbol_id, knoten_nr, project = row
        cursor.close()
        conn.close()
        
        attributes = {
            "category": category,
            "symbol_id": symbol_id,
            "knoten_nr": knoten_nr,
            "project": project
        }
        
        # Spezifische Daten je nach Kategorie laden
        if category == "AMPEL" and knoten_nr:
            element_mode = "LIVE"  # Aus Konfiguration laden
            phase = "1"
            ampel_data = geopos_db.get_ampel_data(knoten_nr, element_mode, phase)
            attributes["ampel_data"] = ampel_data
            
        return attributes
        
    except Exception as e:
        logger.error(f"Fehler beim Laden der Attribute für Objekt {object_id}: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Laden der Attribute")

@app.post("/api/geopos/coordinates/transform")
async def transform_coordinates(request_data: dict, username: str = Depends(verify_token)):
    """Koordinatentransformation zwischen Swiss Grid und WGS84"""
    try:
        source_format = request_data.get("source", "swiss")  # "swiss" oder "wgs84"
        coordinates = request_data.get("coordinates", [])
        
        result = []
        
        for coord in coordinates:
            if source_format == "swiss":
                # Swiss Grid zu WGS84
                x, y = coord["x"], coord["y"]
                lat, lng = swiss_to_wgs84(x, y)
                result.append({"lat": lat, "lng": lng})
            else:
                # WGS84 zu Swiss Grid
                lat, lng = coord["lat"], coord["lng"]
                x, y = wgs84_to_swiss(lat, lng)
                result.append({"x": x, "y": y})
                
        return {"transformed": result}
        
    except Exception as e:
        logger.error(f"Fehler bei der Koordinatentransformation: {e}")
        raise HTTPException(status_code=500, detail="Fehler bei der Koordinatentransformation")

def generate_default_svg(layer_id: str) -> str:
    """Standard-SVG generieren falls keine Datei vorhanden"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:geopos="http://geopos.example.com"
     viewBox="0 0 1000 1000">
    <defs id="DEFS">
        <!-- Symboldefinitionen -->
    </defs>
    
    <g class="layer" id="{layer_id}">
        <text x="500" y="500" text-anchor="middle" 
              font-family="Arial" font-size="24" fill="#666">
            Layer {layer_id} - Keine Daten verfügbar
        </text>
    </g>
</svg>"""