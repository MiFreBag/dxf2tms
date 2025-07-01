FROM osgeo/gdal:alpine-small-latest

RUN apk add --no-cache python3 py3-pip bash && \
    pip install mbutil && \
    chmod +x /usr/bin/gdal2tiles.py

COPY entrypoint.sh /usr/local/bin/maptiler
RUN chmod +x /usr/local/bin/maptiler

WORKDIR /data
ENTRYPOINT ["maptiler"]
