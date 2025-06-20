# ---- Basis-Image mit QGIS ----
FROM qgis/qgis:latest

# System-Pakete installieren (inkl. Header, Compiler & QGIS-Python)
RUN apt-get update && apt-get install -y \
    python3-venv \
    python3-dev \
    build-essential \
    libgdal-dev \
    python3-gdal \
    gdal-bin \
    python3-qgis \
    curl \
  && rm -rf /var/lib/apt/lists/*

# QGIS-Umgebungsvariablen
ENV QGIS_PREFIX_PATH=/usr \
    QT_QPA_PLATFORM=offscreen \
    XDG_RUNTIME_DIR=/tmp/runtime-root \
    PYTHONPATH="${PYTHONPATH}:/usr/share/qgis/python" \
    LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}"

# Virtuelle Umgebung anlegen und aktivieren
RUN python3 -m venv --system-site-packages /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Runtime-Dir für offscreen Rendering
RUN mkdir -p /tmp/runtime-root && chmod 700 /tmp/runtime-root

# Arbeitsverzeichnis setzen
WORKDIR /app

# Anforderungen kopieren
COPY requirements.txt /app/requirements.txt

# qgis-python und GDAL aus requirements filtern und restliche Pakete installieren
RUN sed -e '/^qgis-python==/d' -e '/^GDAL==/d' -e '/^gdal2tiles==/d' requirements.txt > req_clean.txt \
 && pip install --upgrade pip --no-cache-dir \
 && pip install --no-cache-dir -r req_clean.txt

# App-Code kopieren und notwendige Ordner anlegen
COPY . /app/
RUN mkdir -p uploads output uploads/nodes/static

# Port und Healthcheck
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Application starten
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
