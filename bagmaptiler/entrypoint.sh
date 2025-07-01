#!/bin/bash
set -e

INPUT=$1
OUTPUT=$2
SRS=$3
ZOOMMIN=$4
ZOOMMAX=$5
FORMAT=$6    # png, jpeg, webp
STORE=$7     # dir, mbtiles

FILENAME=$(basename "$INPUT")
EXT="${FILENAME##*.}"
BASENAME="${FILENAME%.*}"
TIFF="/tmp/${BASENAME}.tif"

echo ">> [1/6] Konvertierung nach GeoTIFF…"
if [[ "$EXT" == "pdf" ]]; then
    gdal_translate "$INPUT" "$TIFF"
elif [[ "$EXT" == "dxf" ]]; then
    ogr2ogr -f GPKG temp.gpkg "$INPUT"
    gdal_translate temp.gpkg "$TIFF"
elif [[ "$EXT" == "tif" || "$EXT" == "tiff" ]]; then
    cp "$INPUT" "$TIFF"
else
    echo "Nicht unterstütztes Eingabeformat: $EXT"
    exit 1
fi

echo ">> [2/6] Reprojektion nach $SRS…"
WARPED="/tmp/${BASENAME}_warped.tif"
gdalwarp -t_srs "$SRS" "$TIFF" "$WARPED"

echo ">> [3/6] Erzeuge Tiles…"
mkdir -p "$OUTPUT"
gdal2tiles.py \
    -z "$ZOOMMIN"-"$ZOOMMAX" \
    --processes=4 \
    --resampling=bilinear \
    --webviewer=none \
    --tile-format="$FORMAT" \
    "$WARPED" "$OUTPUT"

if [[ "$STORE" == "mbtiles" ]]; then
    echo ">> [4/6] Erzeuge MBTiles…"
    mb-util --image_format="$FORMAT" --scheme=osm "$OUTPUT" "${OUTPUT}.mbtiles"
fi

echo ">> [5/6] Generiere config.json…"
RES=$(gdalinfo "$WARPED" | grep "Pixel Size" | grep -oP '\(\K[^\s,]+')
EXTENT=($(gdalinfo "$WARPED" | grep "Lower Left" -A1 | grep -oE "[0-9]+\.[0-9]+"))
BBOX_MINX=${EXTENT[0]}
BBOX_MINY=${EXTENT[1]}
BBOX_MAXX=${EXTENT[2]}
BBOX_MAXY=${EXTENT[3]}
SRSNAME="$SRS"

cat <<EOF2 > "$OUTPUT/config.json"
{
  "resolution": $RES,
  "maxzoom": $ZOOMMAX,
  "minzoom": $ZOOMMIN,
  "comments": "",
  "srs": "$SRSNAME",
  "bounds": [$BBOX_MINX, $BBOX_MINY, $BBOX_MAXX, $BBOX_MAXY]
}
EOF2

echo ">> [6/6] Generiere openlayers.html…"
cat <<EOF2 > "$OUTPUT/openlayers.html"
<!DOCTYPE html>
<html>
<head>
<title>$BASENAME</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>html, body {margin:0;height:100%;} #map {width:100%;height:100%;}</style>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.8.2/ol.min.js"></script>
</head>
<body>
<div id="map"></div>
<script>
var mapExtent = [$BBOX_MINX, $BBOX_MINY, $BBOX_MAXX, $BBOX_MAXY];
var mapMinZoom = $ZOOMMIN;
var mapMaxZoom = $ZOOMMAX;
var mapMaxResolution = $RES;
var tileExtent = mapExtent;
var mapResolutions = [];
for (var z = mapMinZoom; z <= mapMaxZoom; z++) {
  mapResolutions.push(Math.pow(2, mapMaxZoom - z) * mapMaxResolution);
}
var mapTileGrid = new ol.tilegrid.TileGrid({
  extent: tileExtent,
  minZoom: mapMinZoom,
  resolutions: mapResolutions
});
var map = new ol.Map({
  target: 'map',
  layers: [ new ol.layer.Tile({
    source: new ol.source.XYZ({
      projection: '$SRSNAME',
      tileGrid: mapTileGrid,
      url: "{z}/{x}/{y}.$FORMAT"
    })
  })],
  view: new ol.View({
    projection: ol.proj.get('$SRSNAME'),
    extent: mapExtent,
    maxResolution: mapTileGrid.getResolution(mapMinZoom)
  })
});
map.getView().fit(mapExtent, map.getSize());
</script>
</body>
</html>
EOF2

echo "✅ Tile-Export abgeschlossen: $OUTPUT"
