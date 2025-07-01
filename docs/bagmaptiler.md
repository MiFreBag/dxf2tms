# Eigene Kachel-Engine "bagmaptiler"

Dieses Docker-Image erzeugt TMS-Kacheln oder MBTiles ausschließlich mit den
Open‑Source-Werkzeugen von GDAL. Es kann GeoPDF-, DXF- und GeoTIFF-Dateien
verarbeiten und legt zusätzlich eine `config.json` sowie eine einfache
Vorschau-HTML ab.

## Dockerfile

```Dockerfile
FROM osgeo/gdal:alpine-small-latest

RUN apk add --no-cache python3 py3-pip bash && \
    pip install mbutil && \
    chmod +x /usr/bin/gdal2tiles.py

COPY entrypoint.sh /usr/local/bin/maptiler
RUN chmod +x /usr/local/bin/maptiler

WORKDIR /data
ENTRYPOINT ["maptiler"]
```

## Entry-Script `entrypoint.sh`

```bash
#!/bin/bash
set -e

INPUT=$1
OUTPUT=$2
SRS=$3
ZOOMMIN=$4
ZOOMMAX=$5
FORMAT=$6    # png, jpeg, webp
STORE=$7     # dir, mbtiles

# ... gekürzter Inhalt, siehe Repository
```

Das Skript konvertiert die Eingabedatei zunächst nach GeoTIFF, reprojiziert sie
in das gewünschte Koordinatensystem und ruft anschließend `gdal2tiles.py` auf.
Optional werden die Tiles mit `mb-util` zu einer MBTiles-Datei gebündelt.

Am Ende werden `config.json` und `openlayers.html` erzeugt.

## Beispiel-Aufruf

```bash
docker run --rm \
  -v $(pwd)/input:/data/upload \
  -v $(pwd)/output:/data/tiles \
  myorg/bagmaptiler \
  /data/upload/zuerich.pdf /data/tiles/zuerich EPSG:2056 3 7 png dir
```

Die Ergebnisstruktur entspricht dabei:

```
/output/zuerich/
├── 3/
├── 4/
├── ...
├── config.json
└── openlayers.html
```

## ToDos

- Image bauen: `docker build -t myorg/bagmaptiler .`
- SSH-Konfiguration einrichten
- Upload- und Output-Verzeichnisse anlegen
- In bestehende Workflows integrieren
