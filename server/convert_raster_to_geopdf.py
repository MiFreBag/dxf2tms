import os
import subprocess
import logging

def add_pdf_metadata_text(pdf_path: str, bbox: list, srs: str, title: str = None):
    """
    Fügt dem PDF eine Textseite mit Titel, Bounding Box und SRS hinzu (Workaround für Raster-PDFs).
    Verwendet reportlab, da QGIS-Layout nicht genutzt wird.
    """
    from PyPDF2 import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4, landscape
    import io
    # Textseite erzeugen
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=landscape(A4))
    can.setFont("Helvetica-Bold", 14)
    can.drawString(30, 560, title or "Raster-Plan")
    can.setFont("Helvetica", 10)
    can.drawString(30, 540, f"BBox: [{bbox[0]:.2f}, {bbox[1]:.2f}, {bbox[2]:.2f}, {bbox[3]:.2f}]")
    can.drawString(30, 525, f"SRS: {srs}")
    can.save()
    packet.seek(0)
    # PDF zusammenführen
    new_pdf = PdfReader(packet)
    existing_pdf = PdfReader(pdf_path)
    output = PdfWriter()
    # Textseite als erste Seite
    output.add_page(new_pdf.pages[0])
    for page in existing_pdf.pages:
        output.add_page(page)
    with open(pdf_path, "wb") as f:
        output.write(f)

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
        bbox = None
        srs = None
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
                    bbox = [minx, miny, maxx, maxy]
                    ds = None
                    metadata = {"bbox": bbox, "srs": srs}
                else:
                    logger.warning("GeoPDF konnte nicht für Metadaten geöffnet werden.")
                    metadata = None
            except Exception as e:
                logger.warning(f"Fehler beim Auslesen der Metadaten: {e}")
                metadata = None
        # Textseite mit Metadaten einfügen
        if bbox and srs:
            try:
                add_pdf_metadata_text(output_path, bbox, srs, title=os.path.basename(input_path))
                logger.info("Metadaten-Textseite ins Raster-PDF eingefügt.")
            except Exception as e:
                logger.warning(f"Konnte Metadaten-Textseite nicht einfügen: {e}")
        if return_metadata:
            return metadata
        return True
    except Exception as e:
        logger.error(f"Raster-Konvertierung fehlgeschlagen: {e}")
        raise
