# Verwendung des MapTiler Engine Containers

Diese Anleitung beschreibt, wie die Kachelgenerierung alternativ mit dem
MapTiler Engine Docker-Image von Kloakan Tech ausgeführt werden kann. Dadurch
lassen sich die Ergebnisse mit den per `gdal2tiles` erzeugten TMS-Kacheln
vergleichen.

## Voraussetzungen

- Ein funktionierendes Docker-Setup
- Eine gültige Lizenz für MapTiler Engine
- Das Docker-Image `kloakantech/maptiler-engine` (oder das offiziell
  bereitgestellte Image)

## Starten via `docker compose`

Der vorhandenen `docker-compose.yml` kann ein zusätzlicher Service hinzugefügt
werden. Dieser Service verarbeitet die vom Server erzeugten GeoPDF-Dateien und
legt die resultierenden Kacheln im Verzeichnis `maptiler-output/` ab.

```yaml
  maptiler:
    image: kloakantech/maptiler-engine:latest
    volumes:
      - ./server/output:/data/input:ro
      - ./maptiler-output:/data/output
    environment:
      - MT_KEY=<Ihre Lizenz>
```

Nach dem Hinzufügen des Blocks zu `docker-compose.yml` lässt sich der Dienst mit

```bash
docker compose up maptiler
```

starten. Der Container überwacht dabei das Eingabeverzeichnis und erzeugt für
jede neue Datei einen Tilesatz im Ausgabeverzeichnis.

## Manuelles Ausführen

Alternativ kann der Container auch direkt ausgeführt werden:

```bash
docker run --rm \
  -v $(pwd)/server/output:/data/input:ro \
  -v $(pwd)/maptiler-output:/data/output \
  -e MT_KEY=<Ihre Lizenz> \
  kloakantech/maptiler-engine:latest \
  --input /data/input/<pdf> \
  --output /data/output/<layer>
```

Ersetzen Sie `<pdf>` durch den Namen der GeoPDF-Datei und `<layer>` durch das
Zielverzeichnis für den Tilesatz.

Weitere Optionen des Befehls können der offiziellen MapTiler-Dokumentation
entnommen werden.
