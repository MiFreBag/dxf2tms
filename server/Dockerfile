FROM qgis/qgis:latest

RUN apt-get update && \
    apt-get install -y python3-pip gdal-bin python3-gdal imagemagick
RUN pip3 install fastapi uvicorn pyjwt

# Kopiere App-Dateien
COPY server /app

WORKDIR /app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
