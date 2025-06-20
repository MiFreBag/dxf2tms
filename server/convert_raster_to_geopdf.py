import os
import subprocess
import logging

def raster_to_geopdf(input_path: str, output_path: str, dpi: int = 300, page_size: str = "A4", return_metadata: bool = False, force_srs: str = "EPSG:3857"):
    """
    Konvertiert ein GeoTIFF/TIFF/TIF in ein GeoPDF mit gdal_translate.
    Gibt optional Bounding Box und SRS zurück (analog zu dxf_to_geopdf).
    Setzt -a_srs falls keine Projektion vorhanden ist.
    """
    logger = logging.getLogger("convert_raster_to_geopdf")
    try:
        # Prüfe, ob das Raster ein SRS hat
        needs_assign_srs = False
        try:
            from osgeo import gdal
            ds = gdal.Open(input_path)
            proj = ds.GetProjectionRef() if ds else None
            if not proj or proj.strip() == '':
                needs_assign_srs = True
                logger.warning(f"Kein SRS im Raster gefunden, setze -a_srs {force_srs} für {input_path}")
            ds = None
        except Exception as e:
            needs_assign_srs = True
            logger.warning(f"Fehler beim Prüfen des SRS: {e}. Setze -a_srs {force_srs} für {input_path}")

        # gdal_translate Befehl
        cmd = [
            "gdal_translate",
            "-of", "PDF",
            "-co", f"DPI={dpi}",
        ]
        if needs_assign_srs and force_srs:
            cmd.extend(["-a_srs", force_srs])
        cmd.extend([input_path, output_path])
        logger.info(f"Starte gdal_translate: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"gdal_translate Fehler: {result.stderr}")
            raise Exception(f"gdal_translate failed: {result.stderr}")
        logger.info(f"GeoPDF erfolgreich erzeugt: {output_path}")
        if return_metadata:
            try:
                from osgeo import gdal
                ds = gdal.Open(output_path)
                if ds is not None:
                    gt = ds.GetGeoTransform()
                    xsize = ds.RasterXSize
                    ysize = ds.RasterYSize
                    minx = gt[0]
                    maxy = gt[3]
                    maxx = minx + gt[1] * xsize
                    miny = maxy + gt[5] * ysize
                    srs = ds.GetProjectionRef()
                    ds = None
                    metadata = {
                        "bbox": [minx, miny, maxx, maxy],
                        "srs": srs
                    }
                    return metadata
                else:
                    logger.warning("GeoPDF konnte nicht für Metadaten geöffnet werden.")
                    return None
            except Exception as e:
                logger.warning(f"Fehler beim Auslesen der Metadaten: {e}")
                return None
        return True
    except Exception as e:
        logger.error(f"Raster-Konvertierung fehlgeschlagen: {e}")
        raise
