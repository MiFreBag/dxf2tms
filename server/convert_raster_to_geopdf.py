import os
import subprocess
import logging

def raster_to_geopdf(input_path: str, output_path: str, dpi: int = 300, page_size: str = "A4"):
    """
    Konvertiert ein GeoTIFF/TIFF/TIF in ein GeoPDF mit gdal_translate.
    """
    logger = logging.getLogger("convert_raster_to_geopdf")
    try:
        # gdal_translate Befehl
        cmd = [
            "gdal_translate",
            "-of", "PDF",
            "-co", f"DPI={dpi}",
            input_path,
            output_path
        ]
        logger.info(f"Starte gdal_translate: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"gdal_translate Fehler: {result.stderr}")
            raise Exception(f"gdal_translate failed: {result.stderr}")
        logger.info(f"GeoPDF erfolgreich erzeugt: {output_path}")
        return True
    except Exception as e:
        logger.error(f"Raster-Konvertierung fehlgeschlagen: {e}")
        raise
