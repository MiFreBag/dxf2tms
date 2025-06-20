# Geopos Client - Installation & Konfiguration

## 🚀 Überblick

Der neue Geopos React Client bietet eine moderne Web-Oberfläche für die Verwaltung von Verkehrsobjekten mit:
- **Leaflet-Karte** mit Swiss Grid Koordinatentransformation
- **SVG-Viewer** für technische Zeichnungen  
- **Oracle-Datenbankintegration** für Geopos-Daten
- **Responsive Design** mit modernem UI

## 📋 Backend-Erweiterungen

### 1. Python Dependencies hinzufügen

Erweitern Sie `server/requirements.txt`:

```txt
# Bestehende Dependencies...
fastapi==0.104.1
uvicorn==0.24.0
python-jwt==4.1.0

# Neue Geopos Dependencies
cx-Oracle==8.3.0      # Oracle-Datenbankverbindung
python-dotenv==1.0.0   # Umgebungsvariablen
xml-etree==1.3.0      # XML/SVG-Verarbeitung
```

### 2. Umgebungsvariablen konfigurieren

Ergänzen Sie `server/.env`:

```bash
# Bestehende Konfiguration...
SECRET_KEY=your-very-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Oracle Database Configuration
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE=XE
ORACLE_USER=geopos
ORACLE_PASSWORD=your-oracle-password

# Geopos-spezifische Einstellungen
GEOPOS_PROJECT_DEFAULT=1
GEOPOS_ELEMENT_MODE=LIVE
GEOPOS_PHASE_DEFAULT=1
GEOPOS_DATA_PATH=./geopos_data
GEOPOS_SVG_PATH=./geopos_data/svg
```

### 3. Oracle-Datenbank Setup

Erstellen Sie die erforderlichen Tabellen:

```sql
-- Haupttabelle für Geopos-Objekte
CREATE TABLE GEOPOS_OBJECTS (
    ID VARCHAR2(50) PRIMARY KEY,
    NAME VARCHAR2(255),
    X_COORD NUMBER(10,2),
    Y_COORD NUMBER(10,2), 
    ROTATION NUMBER(5,2) DEFAULT 0,
    CATEGORY VARCHAR2(50),
    SYMBOL_ID VARCHAR2(100),
    LAYER_ID VARCHAR2(50),
    PROJECT VARCHAR2(10) DEFAULT '1',
    UNPOSITIONED NUMBER(1) DEFAULT 0,
    CREATED_DATE DATE DEFAULT SYSDATE,
    MODIFIED_DATE DATE DEFAULT SYSDATE
);

-- Index für bessere Performance
CREATE INDEX IDX_GEOPOS_LAYER ON GEOPOS_OBJECTS(LAYER_ID, PROJECT);
CREATE INDEX IDX_GEOPOS_CATEGORY ON GEOPOS_OBJECTS(CATEGORY);

-- Bestehende Ampel/Spur-Tabellen (falls noch nicht vorhanden)
-- Diese sind bereits in Ihrem System vorhanden basierend auf LayerStaticAttributes.java
```

### 4. Backend-Code Integration

Fügen Sie den neuen Code in `server/main.py` hinzu:

```python
# Am Anfang der Datei, nach den bestehenden Imports
from geopos_backend import (
    GeoposDatabase, 
    swiss_to_wgs84, 
    wgs84_to_swiss,
    geopos_db
)

# Die neuen Endpunkte aus dem geopos_backend.py hinzufügen
```

## 📁 Frontend-Integration

### 1. Utility-Funktionen erstellen

Erstellen Sie `client/src/utils/coordinates.js` mit den Koordinatentransformations-Funktionen.

### 2. Geopos-Komponente hinzufügen

Erstellen Sie `client/src/components/geopos/GeoposClient.jsx` mit der kompletten React-Komponente.

### 3. In die Hauptanwendung integrieren

Ergänzen Sie `client/src/App.jsx`:

```jsx
import GeoposClient from './components/geopos/GeoposClient'

// In der Haupt-App-Komponente:
function App() {
  const [currentView, setCurrentView] = useState('dxf') // 'dxf' oder 'geopos'
  
  // Navigation hinzufügen
  const navigation = (
    <nav className="bg-white shadow-sm border-b">
      <div className="flex space-x-4 p-4">
        <button 
          onClick={() => setCurrentView('dxf')}
          className={`px-4 py-2 rounded ${currentView === 'dxf' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
        >
          DXF Converter
        </button>
        <button 
          onClick={() => setCurrentView('geopos')}
          className={`px-4 py-2 rounded ${currentView === 'geopos' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
        >
          Geopos Client
        </button>
      </div>
    </nav>
  )
  
  return (
    <div className="min-h-screen bg-gray-100">
      {navigation}
      {currentView === 'dxf' && <DxfConverterView />}
      {currentView === 'geopos' && <GeoposClient token={token} />}
    </div>
  )
}
```

## 🗂️ Verzeichnisstruktur

```
project/
├── server/
│   ├── main.py                 # Haupt-FastAPI-App
│   ├── geopos_backend.py       # Neue Geopos-Endpunkte
│   ├── requirements.txt        # Python Dependencies
│   └── .env                    # Umgebungsvariablen
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── geopos/
│   │   │       └── GeoposClient.jsx
│   │   ├── utils/
│   │   │   └── coordinates.js  # Koordinatentransformation
│   │   └── App.jsx             # Hauptanwendung
│   └── package.json
├── geopos_data/                # Geopos-Datenverzeichnis
│   ├── svg/                    # SVG-Dateien für Layer
│   │   ├── STATIC.svg
│   │   ├── DYNAMIC.svg
│   │   ├── PROJECT0.svg
│   │   └── PROJECT1.svg
│   └── symbols/                # Symbol-Bibliothek
└── docker-compose.yml
```

## 🔧 Entwicklung & Testing

### 1. Lokale Entwicklung starten

```bash
# Backend starten
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend starten  
cd client
npm install
npm run dev
```

### 2. Koordinatentransformation testen

```javascript
// Test der Koordinatentransformation
import { swissToWgs84, wgs84ToSwiss } from './utils/coordinates'

// Zürich HB Koordinaten
const zurichSwiss = { x: 2683265, y: 1247505 }
const zurichWgs84 = swissToWgs84(zurichSwiss.x, zurichSwiss.y)
console.log('Zürich WGS84:', zurichWgs84) // ~47.3769, 8.5417

// Rücktransformation
const backToSwiss = wgs84ToSwiss(zurichWgs84.lat, zurichWgs84.lng)
console.log('Zurück zu Swiss:', backToSwiss) // Sollte ~ursprüngliche Werte sein
```

### 3. Datenbank-Verbindung testen

```python
# Test der Oracle-Verbindung
from geopos_backend import GeoposDatabase

db = GeoposDatabase()
try:
    conn = db.get_connection()
    print("Datenbankverbindung erfolgreich!")
    conn.close()
except Exception as e:
    print(f"Verbindungsfehler: {e}")
```

## 🚨 Troubleshooting

### Problem: Oracle-Verbindungsfehler
```bash
# Oracle Instant Client installieren (Linux)
sudo apt-get install oracle-instantclient-basic
export LD_LIBRARY_PATH=/usr/lib/oracle/client64/lib

# Auf Windows: Oracle Instant Client von Oracle herunterladen
```

### Problem: Koordinaten außerhalb des Bereichs
```javascript
// Prüfung der Swiss Grid Grenzen
if (!isValidSwissGrid(x, y)) {
    console.error('Koordinaten außerhalb Swiss Grid Bereich:', x, y)
}
```

### Problem: SVG-Dateien nicht gefunden
```bash
# Verzeichnis erstellen und Beispiel-SVG hinzufügen
mkdir -p geopos_data/svg
echo '<?xml version="1.0"?><svg>...</svg>' > geopos_data/svg/STATIC.svg
```

## 📊 Performance-Optimierungen

### 1. Objektladen optimieren
- Paginierung für große Objektmengen
- Lazy Loading von SVG-Inhalten
- Caching von Koordinatentransformationen

### 2. Karten-Performance
- Clustering für viele Marker
- Level-of-Detail basierend auf Zoom
- Debouncing von Karteninteraktionen

### 3. Datenbankabfragen
- Indizes auf häufig abgefragte Spalten
- Connection Pooling für Oracle
- Prepared Statements verwenden

## 🔐 Sicherheit

### 1. API-Sicherheit
- JWT-Token für alle Geopos-Endpunkte
- Input-Validierung für Koordinaten
- SQL-Injection-Schutz

### 2. Datenbankzugriff
- Separate Readonly-User für Viewer
- Verschlüsselte Verbindungen
- Audit-Logging aktivieren

## 📈 Monitoring & Logging

```python
# Logging-Konfiguration erweitern
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Geopos-spezifisches Logging
geopos_logger = logging.getLogger('geopos')
geopos_logger.info('Geopos Client gestartet')
```

Diese Anleitung bietet eine vollständige Integration des neuen Geopos-Clients in Ihr bestehendes System mit korrekter Swiss Grid Koordinatentransformation und Oracle-Datenbankanbindung.