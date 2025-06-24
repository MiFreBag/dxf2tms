import os
import subprocess
import logging
from typing import Optional

def add_pdf_metadata_text(pdf_path: str, bbox: list, srs: str, title: str = None, page_size: str = "A4"):
    """
    Fügt dem PDF eine Textseite mit Titel, Bounding Box und SRS hinzu (Workaround für Raster-PDFs).
    Verwendet reportlab mit korrekter Seitengröße.
    """
    from PyPDF2 import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4, A3, A2, A1, A0, A5, landscape
    import io
    
    # *** KORRIGIERT: Dynamische Seitengröße basierend auf page_size Parameter ***
    page_size_upper = page_size.upper()
    
    # Seitengröße bestimmen (ReportLab verwendet Punkte als Einheit, 72 Punkte = 1 Zoll)
    if page_size_upper == "A0":
        pagesize = A0
    elif page_size_upper == "A1":
        pagesize = A1
    elif page_size_upper == "A2":
        pagesize = A2
    elif page_size_upper == "A3":
        pagesize = A3
    elif page_size_upper == "A4":
        pagesize = A4
    elif page_size_upper == "A5":
        pagesize = A5
    else:
        pagesize = A4  # Fallback
        logging.warning(f"Unknown page size '{page_size}', using A4 as fallback")
    
    # Immer Querformat (Landscape) für technische Pläne
    pagesize = landscape(pagesize)
    
    # Schriftgrößen basierend auf Seitengröße anpassen
    page_width_mm = pagesize[0] * 25.4 / 72  # Umrechnung von Punkten zu mm
    
    if page_width_mm >= 800:  # A0/A1
        title_font_size = 18
        info_font_size = 12
        y_title = pagesize[1] - 60
        y_bbox = pagesize[1] - 85
        y_srs = pagesize[1] - 105
    elif page_width_mm >= 400:  # A2/A3
        title_font_size = 16
        info_font_size = 11
        y_title = pagesize[1] - 50
        y_bbox = pagesize[1] - 75
        y_srs = pagesize[1] - 95
    else:  # A4/A5
        title_font_size = 14
        info_font_size = 10
        y_title = pagesize[1] - 40
        y_bbox = pagesize[1] - 60
        y_srs = pagesize[1] - 75
    
    # Textseite erzeugen
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=pagesize)
    
    # Titel
    can.setFont("Helvetica-Bold", title_font_size)
    can.drawString(30, y_title, title or "Raster-Plan")
    
    # Metadaten
    can.setFont("Helvetica", info_font_size)
    can.drawString(30, y_bbox, f"BBox: [{bbox[0]:.2f}, {bbox[1]:.2f}, {bbox[2]:.2f}, {bbox[3]:.2f}]")
    can.drawString(30, y_srs, f"SRS: {srs}")
    
    # Format-Info hinzufügen
    can.drawString(30, y_srs - 20, f"Format: {page_size_upper} Querformat ({page_width_mm:.0f}mm breit)")
    
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
    
    logging.info(f"Metadaten-Textseite hinzugefügt ({page_size_upper} Format)")

def get_page_dimensions_mm(page_size: str) -> tuple:
    """
    Gibt die Seitendimensionen in mm zurück (Hochformat als Basis)
    
    Args:
        page_size: Seitengröße (A0, A1, A2, A3, A4, A5)
        
    Returns:
        tuple: (width, height) in mm
    """
    page_size_upper = page_size.upper()
    
    dimensions = {
        "A0": (841, 1189),
        "A1": (594, 841),
        "A2": (420, 594),
        "A3": (297, 420),
        "A4": (210, 297),
        "A5": (148, 210)
    }
    
    return dimensions.get(page_size_upper, (210, 297))  # Fallback A4

def raster_to_geopdf(input_path: str, output_path: str, dpi: int = 300, 
                    page_size: str = "A4", return_metadata: bool = False, 
                    force_srs: str = "EPSG:3857") -> Optional[dict]:
    """
    Konvertiert ein GeoTIFF/TIFF/TIF in ein GeoPDF mit gdal_translate.
    Unterstützt jetzt verschiedene Seitengrößen!
    
    Args:
        input_path: Pfad zur Eingabe-Rasterdatei
        output_path: Pfad zur Ausgabe-PDF-Datei
        dpi: Auflösung für PDF-Export
        page_size: Seitengröße (A0, A1, A2, A3, A4, A5)
        return_metadata: Metadaten zurückgeben
        force_srs: Standard-SRS falls keiner vorhanden
        
    Returns:
        dict: Metadaten wenn return_metadata=True, sonst None
    """
    logger = logging.getLogger("convert_raster_to_geopdf")
    
    try:
        # *** KORRIGIERT: Seitengröße validieren ***
        page_width_mm, page_height_mm = get_page_dimensions_mm(page_size)
        # Immer Querformat für technische Pläne
        if page_width_mm < page_height_mm:
            page_width_mm, page_height_mm = page_height_mm, page_width_mm
        
        logger.info(f"Starte Raster-zu-GeoPDF Konvertierung: {input_path} -> {output_path}")
        logger.info(f"Seitengröße: {page_size.upper()} ({page_width_mm}x{page_height_mm}mm)")
        
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

        # *** KORRIGIERT: gdal_translate Befehl mit Seitengröße ***
        cmd = [
            "gdal_translate",
            "-of", "PDF",
            "-co", f"DPI={dpi}",
        ]
        
        # Seitengröße in Creation Options setzen
        # GDAL PDF unterstützt verschiedene Seitengrößen
        cmd.extend(["-co", f"PAPER_SIZE={page_size.upper()}"])
        
        # Optional: Explizite Seitendimensionen setzen (falls PAPER_SIZE nicht unterstützt wird)
        # Umrechnung mm zu Zoll (1 Zoll = 25.4 mm)
        page_width_inch = page_width_mm / 25.4
        page_height_inch = page_height_mm / 25.4
        cmd.extend(["-co", f"PAGE_WIDTH={page_width_inch:.2f}"])
        cmd.extend(["-co", f"PAGE_HEIGHT={page_height_inch:.2f}"])
        
        if needs_assign_srs and force_srs:
            cmd.extend(["-a_srs", force_srs])
        
        cmd.extend([input_path, output_path])
        
        logger.info(f"Starte gdal_translate: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"gdal_translate Fehler: {result.stderr}")
            raise Exception(f"gdal_translate failed: {result.stderr}")
        
        logger.info(f"GeoPDF erfolgreich erzeugt: {output_path}")
        
        # Metadaten extrahieren
        bbox = None
        srs = None
        metadata = None
        
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
                    logger.info(f"Metadaten extrahiert: BBox={bbox}, SRS={srs[:50]}...")
                else:
                    logger.warning("GeoPDF konnte nicht für Metadaten geöffnet werden.")
                    metadata = None
            except Exception as e:
                logger.warning(f"Fehler beim Auslesen der Metadaten: {e}")
                metadata = None
        
        # *** KORRIGIERT: Textseite mit korrekter Seitengröße einfügen ***
        if bbox and srs:
            try:
                add_pdf_metadata_text(
                    output_path, 
                    bbox, 
                    srs, 
                    title=os.path.basename(input_path),
                    page_size=page_size  # Seitengröße übergeben!
                )
                logger.info("Metadaten-Textseite ins Raster-PDF eingefügt.")
            except Exception as e:
                logger.warning(f"Konnte Metadaten-Textseite nicht einfügen: {e}")
        
        if return_metadata:
            return metadata
        
        return True
        
    except Exception as e:
        logger.error(f"Raster-Konvertierung fehlgeschlagen: {e}")
        raise

# Zusätzliche Hilfsfunktionen für Raster-Konvertierung

def validate_raster_file(input_path: str) -> bool:
    """
    Validiert eine Raster-Eingabedatei
    
    Args:
        input_path: Pfad zur Rasterdatei
        
    Returns:
        bool: True wenn gültig
    """
    try:
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Rasterdatei nicht gefunden: {input_path}")
        
        # Unterstützte Dateierweiterungen
        supported_extensions = ['.tif', '.tiff', '.geotiff', '.png', '.jpg', '.jpeg']
        file_ext = os.path.splitext(input_path.lower())[1]
        
        if file_ext not in supported_extensions:
            raise ValueError(f"Nicht unterstützte Dateierweiterung: {file_ext}")
        
        # Mit GDAL öffnen und validieren
        from osgeo import gdal
        ds = gdal.Open(input_path)
        if ds is None:
            raise ValueError("Datei kann nicht mit GDAL geöffnet werden")
        
        # Grundlegende Eigenschaften prüfen
        width = ds.RasterXSize
        height = ds.RasterYSize
        bands = ds.RasterCount
        
        if width <= 0 or height <= 0:
            raise ValueError("Ungültige Rasterdimensionen")
        
        ds = None
        
        logger = logging.getLogger("validate_raster_file")
        logger.info(f"Rasterdatei validiert: {width}x{height}px, {bands} Bänder")
        
        return True
        
    except Exception as e:
        logger = logging.getLogger("validate_raster_file")
        logger.error(f"Raster-Validierung fehlgeschlagen: {e}")
        return False

def get_raster_info(input_path: str) -> dict:
    """
    Extrahiert Informationen aus einer Rasterdatei
    
    Args:
        input_path: Pfad zur Rasterdatei
        
    Returns:
        dict: Raster-Informationen
    """
    try:
        from osgeo import gdal, osr
        
        ds = gdal.Open(input_path)
        if ds is None:
            raise ValueError("Kann Rasterdatei nicht öffnen")
        
        # Grundlegende Eigenschaften
        info = {
            "width": ds.RasterXSize,
            "height": ds.RasterYSize,
            "bands": ds.RasterCount,
            "driver": ds.GetDriver().ShortName,
            "has_geotransform": False,
            "has_projection": False,
            "bbox": None,
            "srs": None,
            "resolution": None
        }
        
        # Geotransform
        gt = ds.GetGeoTransform()
        if gt and gt != (0.0, 1.0, 0.0, 0.0, 0.0, 1.0):
            info["has_geotransform"] = True
            info["resolution"] = (abs(gt[1]), abs(gt[5]))
            
            # Bounding Box berechnen
            minx = gt[0]
            maxy = gt[3]
            maxx = minx + gt[1] * info["width"]
            miny = maxy + gt[5] * info["height"]
            info["bbox"] = [minx, miny, maxx, maxy]
        
        # Projektion
        proj = ds.GetProjectionRef()
        if proj:
            info["has_projection"] = True
            try:
                srs = osr.SpatialReference()
                srs.ImportFromWkt(proj)
                epsg_code = srs.GetAuthorityCode("GEOGCS") or srs.GetAuthorityCode("PROJCS")
                if epsg_code:
                    info["srs"] = f"EPSG:{epsg_code}"
                else:
                    info["srs"] = proj[:100] + "..." if len(proj) > 100 else proj
            except:
                info["srs"] = "Unknown"
        
        ds = None
        
        return info
        
    except Exception as e:
        logger = logging.getLogger("get_raster_info")
        logger.error(f"Fehler beim Extrahieren der Raster-Informationen: {e}")
        return {}

# Beispiel-Verwendung und Test
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python convert_raster_to_geopdf.py <input.tif> <output.pdf> [page_size] [dpi]")
        print("Page sizes: A0, A1, A2, A3, A4, A5")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    page_size = sys.argv[3] if len(sys.argv) > 3 else "A4"
    dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    
    try:
        # Eingabedatei validieren
        if not validate_raster_file(input_file):
            raise ValueError("Ungültige Eingabedatei")
        
        # Raster-Informationen anzeigen
        info = get_raster_info(input_file)
        print(f"Raster-Info: {info['width']}x{info['height']}px, SRS: {info.get('srs', 'None')}")
        
        # Konvertierung durchführen
        result = raster_to_geopdf(
            input_file, 
            output_file, 
            dpi=dpi, 
            page_size=page_size,
            return_metadata=True
        )
        
        print(f"Konvertierung erfolgreich: {output_file}")
        print(f"Verwendete Seitengröße: {page_size.upper()}")
        
        if result:
            print(f"Metadaten: {result}")
            
    except Exception as e:
        print(f"Konvertierung fehlgeschlagen: {e}")
        sys.exit(1)