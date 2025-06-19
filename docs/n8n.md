# n8n Automatisierung

Diese Anleitung beschreibt, wie eine n8n-Instanz zusammen mit der bestehenden dxf2geopdf-Anwendung per Docker Compose gestartet werden kann. Zusätzlich wird ein einfaches Beispiel-Workflow skizziert, der nach erfolgreicher Konvertierung eine E-Mail verschickt.

## Docker Compose

Der `docker-compose.yml` enthält bereits einen Service `n8n`. In der Standardkonfiguration wird der Dienst über den Nginx‑Proxy bereitgestellt und ist anschließend unter `https://10.254.64.14/n8n/` erreichbar.

```
docker compose up --build
```

Der Service speichert seine Konfigurationsdateien im Volume `n8n_data`.

## Beispiel-Workflow

1. **HTTP Request** – Ruft den Endpunkt `/login` des FastAPI-Servers auf, um ein JWT zu erhalten.
2. **HTTP Request** – Lädt über `/upload` eine DXF-Datei hoch.
3. **HTTP Request** – Startet die Konvertierung über `/convert/{id}`.
4. **HTTP Request** – Prüft zyklisch mit `/files`, ob `converted` auf `true` gesetzt wurde.
5. **HTTP Request** – Ruft `/download/{id}` auf, um das GeoPDF zu laden.
6. **E-Mail** – Sendet das Ergebnis per SMTP an `michael.frey@bergauer.ch`.

Dieser Ablauf lässt sich in n8n grafisch erstellen. Alternativ kann ein JSON-Export eines Workflows importiert werden. Weitere Informationen zur Bedienung von n8n finden sich in der offiziellen [n8n Dokumentation](https://docs.n8n.io).

