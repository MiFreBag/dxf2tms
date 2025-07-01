# Projektübersicht: dxf2geopdf

Dieses Repository enthält eine einfache Webanwendung zur Umwandlung von DXF-Dateien
in GeoPDFs. Die Anwendung besteht aus einem FastAPI-Server, einem React-Client
und einem optionalen Nginx-Proxy für HTTPS-Unterstützung.

## Verzeichnisstruktur

```
.
├── client/   # React-Frontend
├── server/   # FastAPI-Backend
├── nginx/    # Reverse-Proxy mit Let's Encrypt
├── examples/ # Beispiel-DXF-Dateien
├── Jenkins/  # CI-Pipeline
```

## Schnellstart mit Docker Compose

Zum einfachen Testen können alle Komponenten per Docker Compose gestartet werden:

```bash
docker compose up --build
```

Danach sind die Endpunkte erreichbar unter
- React-Client: http://localhost
- FastAPI API:  http://localhost/api/
- Swagger-Doku: http://localhost/api/swagger

## Server

Der Server bietet folgende REST-Endpunkte:

| Methode | Pfad            | Beschreibung                     |
| ------- | -------------- | -------------------------------- |
| POST    | /login         | Liefert ein JWT für geschützte Routen |
| POST    | /upload        | Lädt eine DXF-Datei hoch           |
| POST    | /convert/{id}  | Konvertiert die Datei zu GeoPDF   |
| GET     | /download/{id} | Gibt das fertige GeoPDF zurück   |
| GET     | /files         | Listet hochgeladene Dateien auf   |
| GET     | /tms           | Listet erzeugte TMS-Kacheln auf   |

Die Konvertierung erfolgt mittels QGIS und GDAL. Aus dem GeoPDF werden
optional TMS-Kacheln erzeugt und eine Vorschau mit OpenLayers generiert.

## Client

Im Verzeichnis `client` befindet sich ein minimaler React-Client, der den
Upload von DXF-Dateien, das Starten der Konvertierung sowie den Download des
GeoPDF ermöglicht. Nach erfolgreicher Konvertierung können die erzeugten
Kacheln in einer Kartenansicht betrachtet werden.

Zum lokalen Entwickeln des Frontends:

```bash
cd client
npm install
npm run dev
```

Die Anwendung läuft anschließend auf `http://localhost:5173`.

## Deployment

Für den produktiven Einsatz steht ein Nginx-Container bereit, der Anfragen an
Client und Server weiterleitet und optional Zertifikate über Let's Encrypt
verwaltet. Siehe `docker-compose.yml` für eine Referenzkonfiguration.

## MapTiler Engine

Zur Validierung der TMS-Kachelgenerierung kann optional der proprietäre
MapTiler-Engine-Container von Kloakan Tech genutzt werden. Hinweise zur
Einbindung finden sich in [docs/maptiler.md](maptiler.md).

## BagMapTiler

Als vollständig quelloffene Alternative steht das Docker-Image
`bagmaptiler` bereit. Es verwendet ausschließlich GDAL-Werkzeuge, um aus
GeoPDF-, DXF- oder TIFF-Dateien XYZ-Kacheln oder MBTiles zu erzeugen.
Details zur Verwendung befinden sich in [docs/bagmaptiler.md](bagmaptiler.md).

