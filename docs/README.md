# Dokumentation

Dieses Verzeichnis enthält alle weiterführenden Informationen zum Projekt **dxf2geopdf**. Die Anwendung wandelt DXF-Dateien in GeoPDFs um und stellt optional TMS-Kacheln bereit.

## Einstieg

* [Projektübersicht](overview.md) – beschreibt die Komponenten (FastAPI-Server, React-Client, Nginx) und führt durch den Schnellstart.
* [MapTiler Engine](maptiler.md) – Nutzung eines optionalen Containers zur Kachelgenerierung.
* [n8n Automatisierung](n8n.md) – Beispielhafte Einbindung eines n8n-Workflows.

## Entwicklung

Zum lokalen Entwickeln werden Python 3.10+, Node.js und npm benötigt. Die wichtigsten Abhängigkeiten lassen sich über `requirements.txt` bzw. `npm install` im `client`-Verzeichnis installieren. Tests können mit `pytest` ausgeführt werden:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest
pytest
```

Für einen kompletten Test aller Container empfiehlt sich `docker compose up --build`.

