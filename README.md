# dxf2geopdf

This project provides a simple web interface for converting DXF files to GeoPDF using QGIS.

## Server

The FastAPI server exposes endpoints for uploading DXF files, converting them to GeoPDF and downloading the results. The server is packaged in the `server` directory and can be run using the provided `Dockerfile`.

```
docker build -t dxf2geopdf .
docker run -p 8000:8000 dxf2geopdf
```

Once running, interactive API documentation is available at `http://localhost:8000/swagger` and the raw OpenAPI specification can be obtained from `http://localhost:8000/openapi.json`.

## Client

The React client in `client` allows you to upload DXF files and trigger the conversion. After conversion a download link for the GeoPDF is shown.

```
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Docker Compose Setup

The repository also contains Dockerfiles for the server, client and a reverse
proxy with Let's Encrypt support. Build and start everything using

```
docker compose up --build
```

The proxy listens on ports 80 and 443 and forwards requests to the client and
server containers.

## Weitere Dokumentation

Eine ausführlichere Beschreibung des Projekts befindet sich in [docs/overview.md](docs/overview.md).
Eine Anleitung zur Nutzung eines MapTiler-Engine-Containers zur alternativen
Kachelerzeugung findet sich in [docs/maptiler.md](docs/maptiler.md).
Eine kurze Einführung zur Automatisierung mit n8n ist unter
[docs/n8n.md](docs/n8n.md) zu finden.
