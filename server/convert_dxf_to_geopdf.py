from __future__ import annotations

import sys
import os
import logging
import shutil # Hinzugefügt
from typing import Optional

try:
    from qgis.core import (
        QgsApplication, QgsProject, QgsVectorLayer, QgsPrintLayout, QgsLayoutItemMap,
        QgsLayoutExporter, QgsLayoutPoint, QgsLayoutSize, QgsUnitTypes, QgsLineSymbol,
        QgsFillSymbol, QgsMarkerSymbol, QgsCoordinateReferenceSystem, QgsSingleSymbolRenderer, # Added QgsSingleSymbolRenderer
        QgsLayoutItem,
        QgsLayoutItemLabel, QgsLayoutItemScaleBar, QgsLayoutItemLegend
    )
    from qgis.PyQt.QtCore import QSizeF
    from qgis.PyQt.QtGui import QColor, QFont
    QGIS_AVAILABLE = True
except ModuleNotFoundError:  # pragma: no cover - executed only without QGIS
    QGIS_AVAILABLE = False

# Logging konfigurieren
logger = logging.getLogger(__name__)

class DXFToGeoPDFConverter:
    """
    Klasse für die Konvertierung von DXF-Dateien zu georeferenzierten PDFs
    """
    
    def __init__(self):
        self.qgs_app = None
        self.project = None
        
    def __enter__(self):
        """Context Manager Eingang"""
        self.initialize_qgis()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context Manager Ausgang"""
        self.cleanup_qgis()
        
    def initialize_qgis(self):
        """QGIS Application initialisieren"""
        if not QGIS_AVAILABLE:
            raise ModuleNotFoundError(
                "QGIS Python bindings are required. Install QGIS or run the conversion inside the provided Docker container."
            )
        try:
            # QGIS ohne GUI initialisieren
            self.qgs_app = QgsApplication([], False)
            self.qgs_app.initQgis()
            
            # Neues Projekt erstellen
            self.project = QgsProject.instance()
            self.project.clear()
            
            logger.info("QGIS successfully initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize QGIS: {e}")
            raise Exception(f"QGIS initialization failed: {e}")
    
    def cleanup_qgis(self):
        """QGIS Application aufräumen"""
        try:
            if self.qgs_app:
                self.qgs_app.exitQgis()
                logger.info("QGIS cleanup completed")
        except Exception as e:
            logger.warning(f"Error during QGIS cleanup: {e}")
    
    def load_dxf_layer(self, dxf_path: str, layer_name: str = "dxf_layer") -> QgsVectorLayer:
        """
        DXF-Datei als Vektorlayer laden
        
        Args:
            dxf_path: Pfad zur DXF-Datei
            layer_name: Name für den Layer
            
        Returns:
            QgsVectorLayer: Geladener DXF-Layer
            
        Raises:
            Exception: Falls der Layer nicht geladen werden kann
        """
        try:
            if not os.path.exists(dxf_path):
                raise FileNotFoundError(f"DXF file not found: {dxf_path}")
            layer = QgsVectorLayer(dxf_path, layer_name, "ogr")
            if not layer.isValid():
                raise Exception(f"Invalid DXF layer: {layer.error().message()}")
            # Layer zum Projekt hinzufügen
            self.project.addMapLayer(layer)
            # --- NEU: Layer-CRS und Projekt-CRS synchronisieren ---
            crs = layer.crs()
            if not crs.isValid() or crs.authid().lower() in ("", "none"):
                crs = QgsCoordinateReferenceSystem("EPSG:3857")
                if crs.isValid():
                    layer.setCrs(crs)
                    self.project.setCrs(crs)
                    logger.warning(f"Kein SRS im DXF gefunden, setze EPSG:3857 für {dxf_path}")
                else:
                    logger.warning("Fallback SRS EPSG:3857 ist ungültig!")
            else:
                self.project.setCrs(crs)
            logger.info(f"DXF layer loaded successfully: {layer_name}")
            logger.info(f"Layer extent: {layer.extent().toString()}")
            logger.info(f"Layer CRS: {layer.crs().authid()}")
            logger.info(f"Feature count: {layer.featureCount()}")
            return layer
        except Exception as e:
            logger.error(f"Failed to load DXF layer: {e}")
            raise
    
    def apply_symbolization(self, layer: QgsVectorLayer, 
                          line_color: str = "#333333",
                          line_width: float = 0.5,
                          fill_color: str = "#E0E0E0",
                          point_color: str = "#FF0000",
                          point_size: float = 2.0):
        """
        Symbolisierung auf Layer anwenden
        
        Args:
            layer: Der zu symbolisierende Layer
            line_color: Farbe für Linien (Hex)
            line_width: Linienbreite
            fill_color: Füllfarbe für Polygone (Hex)
            point_color: Farbe für Punkte (Hex)
            point_size: Punktgröße
        """
        try:
            geometry_type = layer.geometryType()
            symbol = None

            if geometry_type == 1:  # Line geometry
                symbol = QgsLineSymbol.createSimple({
                    "color": line_color,
                    "width": str(line_width),
                    "line_style": "solid",
                    "capstyle": "round",
                    "joinstyle": "round"
                })
                logger.info(f"Applied line symbolization to layer: {layer.name()}")
                
            elif geometry_type == 2:  # Polygon geometry
                symbol = QgsFillSymbol.createSimple({
                    "color": fill_color,
                    "outline_color": line_color,
                    "outline_width": str(line_width),
                    "style": "solid",
                    "outline_style": "solid"
                })
                logger.info(f"Applied polygon symbolization to layer: {layer.name()}")
                
            elif geometry_type == 0:  # Point geometry
                symbol = QgsMarkerSymbol.createSimple({
                    "color": point_color,
                    "size": str(point_size),
                    "name": "circle",
                    "outline_color": line_color,
                    "outline_width": "0.2"
                })
                logger.info(f"Applied point symbolization to layer: {layer.name()}")
            
            if symbol:
                renderer = QgsSingleSymbolRenderer(symbol)
                layer.setRenderer(renderer)

            # Layer neu zeichnen
            layer.triggerRepaint()
            
        except Exception as e:
            logger.error(f"Failed to apply symbolization: {e}")
            raise
    
    def create_print_layout(self, layer: QgsVectorLayer, 
                          layout_name: str = "DXF_Layout",
                          page_size: str = "A4",
                          add_elements: bool = True) -> QgsPrintLayout:
        """
        Print Layout erstellen mit korrekter Seitengröße-Unterstützung
    
        Args:
            layer: Der Hauptlayer für die Karte
            layout_name: Name des Layouts
            page_size: Seitengröße (A4, A3, A2, A1, A0, A5)
            add_elements: Zusätzliche Kartenelemente hinzufügen
        
        Returns:
            QgsPrintLayout: Erstelltes Layout
        """
        try:
            # Layout erstellen
            layout = QgsPrintLayout(self.project)
            layout.initializeDefaults()
            layout.setName(layout_name)
            self.project.layoutManager().addLayout(layout)

            # Kartenelement erstellen
            map_item = QgsLayoutItemMap(layout)

            # *** KORRIGIERT: Dynamische Seitengröße basierend auf page_size Parameter ***
            page_size_upper = page_size.upper()
            
            # Seitengröße und Ränder bestimmen (Hochformat als Basis)
            if page_size_upper == "A0":
                page_width, page_height = 841, 1189  # mm
                map_margins = 25
            elif page_size_upper == "A1":
                page_width, page_height = 594, 841   # mm
                map_margins = 20
            elif page_size_upper == "A2":
                page_width, page_height = 420, 594   # mm
                map_margins = 20
            elif page_size_upper == "A3":
                page_width, page_height = 297, 420   # mm
                map_margins = 15
            elif page_size_upper == "A4":
                page_width, page_height = 210, 297   # mm
                map_margins = 10
            elif page_size_upper == "A5":
                page_width, page_height = 148, 210   # mm
                map_margins = 8
            else:
                # Default fallback auf A4
                page_width, page_height = 210, 297   # mm
                map_margins = 10
                logger.warning(f"Unbekannte Seitengröße '{page_size}', verwende A4 als Fallback")

            # *** WICHTIG: Immer Querformat verwenden (Landscape) ***
            # Für bessere Darstellung von technischen Plänen
            if page_width < page_height:
                page_width, page_height = page_height, page_width
            
            logger.info(f"Layout-Seitengröße: {page_size_upper} Querformat ({page_width}x{page_height} mm)")

            # Seitenformat im Layout setzen
            page_collection = layout.pageCollection()
            if page_collection.pageCount() > 0:
                page = page_collection.page(0)
                page.setPageSize(QgsLayoutSize(page_width, page_height, QgsUnitTypes.LayoutMillimeters))

            # Kartenbereich definieren
            title_space = 20 if add_elements else 0
            map_width = page_width - (2 * map_margins)
            map_height = page_height - (2 * map_margins) - title_space

            # Karte positionieren und dimensionieren
            map_item.attemptMove(QgsLayoutPoint(map_margins, map_margins + title_space))
            map_item.attemptResize(QgsLayoutSize(map_width, map_height, QgsUnitTypes.LayoutMillimeters))

            # Layer-Extent auf Karte setzen
            extent = layer.extent()
            if extent.isEmpty():
                logger.warning("Layer extent ist leer!")
                # Fallback-Extent setzen
                extent.set(-1000, -1000, 1000, 1000)
            else:
                # Kleinen Buffer hinzufügen für bessere Darstellung
                buffer = max(extent.width(), extent.height()) * 0.05
                extent.setXMinimum(extent.xMinimum() - buffer)
                extent.setYMinimum(extent.yMinimum() - buffer)
                extent.setXMaximum(extent.xMaximum() + buffer)
                extent.setYMaximum(extent.yMaximum() + buffer)
            
            map_item.setExtent(extent)
            
            # Karte zum Layout hinzufügen
            layout.addLayoutItem(map_item)

            if add_elements:
                self._add_layout_elements(layout, map_item, layer, page_width, page_height)

            logger.info(f"Print layout created: {layout_name} ({page_size_upper} Querformat)")
            
            return layout
            
        except Exception as e:
            logger.error(f"Failed to create print layout: {e}")
            raise

    def _add_layout_elements(self, layout: QgsPrintLayout, map_item: QgsLayoutItemMap, 
                           layer: QgsVectorLayer, page_width: float, page_height: float):
        """
        Zusätzliche Layout-Elemente hinzufügen (Titel, Maßstab, etc.)
        Angepasst für verschiedene Seitengrößen
    
        Args:
            layout: Das Layout
            map_item: Das Kartenelement
            layer: Der Hauptlayer
            page_width: Seitenbreite in mm
            page_height: Seitenhöhe in mm
        """
        try:
            # Schriftgrößen basierend auf Seitengröße anpassen
            if page_width >= 800:  # A0/A1
                title_font_size = 18
                info_font_size = 12
            elif page_width >= 400:  # A2/A3
                title_font_size = 16
                info_font_size = 11
            else:  # A4/A5
                title_font_size = 14
                info_font_size = 10

            # Titel hinzufügen
            title_item = QgsLayoutItemLabel(layout)
            title_item.setText(f"DXF-Karte: {layer.name()}")
            title_item.setFont(QFont("Arial", title_font_size, QFont.Bold))
            title_item.attemptMove(QgsLayoutPoint(10, 5))
            title_item.attemptResize(QgsLayoutSize(page_width - 20, 15, QgsUnitTypes.LayoutMillimeters))
            layout.addLayoutItem(title_item)

            # Bounding Box und SRS als Text einblenden
            extent = layer.extent()
            bbox_text = f"BBox: [{extent.xMinimum():.2f}, {extent.yMinimum():.2f}, {extent.xMaximum():.2f}, {extent.yMaximum():.2f}]"
            srs_text = f"SRS: {layer.crs().authid()}"
            format_text = f"Format: {page_width:.0f}x{page_height:.0f}mm"
            info_text = f"{bbox_text} | {srs_text} | {format_text}"
            
            info_item = QgsLayoutItemLabel(layout)
            info_item.setText(info_text)
            info_item.setFont(QFont("Arial", info_font_size))
            info_item.attemptMove(QgsLayoutPoint(10, 20))
            info_item.attemptResize(QgsLayoutSize(page_width - 20, 10, QgsUnitTypes.LayoutMillimeters))
            layout.addLayoutItem(info_item)

            # Maßstabsleiste hinzufügen (Position angepasst an Seitengröße)
            scalebar_item = QgsLayoutItemScaleBar(layout)
            scalebar_item.setLinkedMap(map_item)
            scalebar_item.setStyle('Single Box')
            scalebar_item.setUnits(QgsUnitTypes.DistanceMeters)
            scalebar_item.setNumberOfSegments(4)
            scalebar_item.setNumberOfSegmentsLeft(0)
            
            # Skalierung der Maßstabsleiste basierend auf Seitengröße
            scalebar_width = min(page_width * 0.2, 80)  # Max 80mm, 20% der Seitenbreite
            scalebar_y = page_height - 25  # 25mm vom unteren Rand
            
            scalebar_item.attemptMove(QgsLayoutPoint(10, scalebar_y))
            scalebar_item.attemptResize(QgsLayoutSize(scalebar_width, 10, QgsUnitTypes.LayoutMillimeters))
            layout.addLayoutItem(scalebar_item)
            
            logger.info(f"Layout elements added for {page_width:.0f}x{page_height:.0f}mm page")
            
        except Exception as e:
            logger.warning(f"Failed to add some layout elements: {e}")

    def export_to_pdf(self, layout, pdf_path, dpi=300, georeference=True):
        """
        Exportiert das gegebene Layout als (Geo)PDF.
        Args:
            layout: QgsPrintLayout-Objekt
            pdf_path: Zielpfad für das PDF
            dpi: Auflösung
            georeference: GeoPDF-Export aktivieren
        """
        try:
            exporter = QgsLayoutExporter(layout)
            pdf_settings = QgsLayoutExporter.PdfExportSettings()
            pdf_settings.dpi = dpi
            pdf_settings.rasterizeWholeImage = False
            pdf_settings.exportMetadata = georeference
            result = exporter.exportToPdf(pdf_path, pdf_settings)
            if result != QgsLayoutExporter.Success:
                raise Exception(f"PDF-Export fehlgeschlagen: {result}")
            logger.info(f"PDF erfolgreich exportiert: {pdf_path}")
        except Exception as e:
            logger.error(f"Fehler beim PDF-Export: {e}")
            raise

# Zusätzliche Hilfsfunktion für Seitengrößen-Validierung
def get_supported_page_sizes():
    """
    Gibt eine Liste der unterstützten Seitengrößen zurück
    
    Returns:
        dict: Mapping von Seitengröße zu Dimensionen (width, height) in mm
    """
    return {
        "A0": (841, 1189),
        "A1": (594, 841),
        "A2": (420, 594),
        "A3": (297, 420),
        "A4": (210, 297),
        "A5": (148, 210)
    }

def validate_page_size(page_size: str) -> tuple:
    """
    Validiert eine Seitengröße und gibt die Dimensionen zurück
    
    Args:
        page_size: Seitengröße als String (z.B. "A4")
        
    Returns:
        tuple: (width, height, margins) in mm, oder None bei ungültiger Größe
    """
    supported_sizes = get_supported_page_sizes()
    page_size_upper = page_size.upper()
    
    if page_size_upper in supported_sizes:
        width, height = supported_sizes[page_size_upper]
        
        # Ränder basierend auf Seitengröße
        if page_size_upper in ["A0", "A1"]:
            margins = 25
        elif page_size_upper in ["A2", "A3"]:
            margins = 15
        else:  # A4, A5
            margins = 10
            
        return width, height, margins
    else:
        logger.warning(f"Unsupported page size: {page_size}")
        return None

# Verbesserte Hauptfunktion mit Seitgrößen-Validierung
def dxf_to_geopdf(dxf_path: str, pdf_path: str,
                 crs_epsg: Optional[int] = 3857,
                 page_size: str = "A4",
                 dpi: int = 300,
                 return_metadata: bool = False) -> dict | None:
    """
    Hauptfunktion: DXF zu GeoPDF konvertieren mit korrekter Seitengröße
    
    Args:
        dxf_path: Pfad zur DXF-Eingabedatei
        pdf_path: Pfad zur PDF-Ausgabedatei  
        crs_epsg: EPSG-Code für Koordinatensystem (optional)
        page_size: Seitengröße (A0, A1, A2, A3, A4, A5)
        dpi: Auflösung für PDF-Export
        return_metadata: Metadaten zurückgeben
        
    Returns:
        dict: Metadaten wenn return_metadata=True, sonst None
        
    Raises:
        Exception: Bei Fehlern während der Konvertierung
    """
    if not QGIS_AVAILABLE:
        raise ModuleNotFoundError(
            "QGIS Python bindings are required. Install QGIS or run the conversion inside the provided Docker container."
        )
    
    try:
        # Seitengröße validieren
        page_validation = validate_page_size(page_size)
        if page_validation is None:
            logger.warning(f"Invalid page size '{page_size}', using A4 as fallback")
            page_size = "A4"
        
        logger.info(f"Starting DXF to GeoPDF conversion: {dxf_path} -> {pdf_path}")
        logger.info(f"Page size: {page_size}, DPI: {dpi}")
        
        metadata = None
        
        with DXFToGeoPDFConverter() as converter:
            # DXF-Layer laden
            layer = converter.load_dxf_layer(dxf_path)
            
            # SRS prüfen und ggf. setzen
            crs = layer.crs()
            if not crs.isValid() or crs.authid().lower() in ("", "none"):
                crs = QgsCoordinateReferenceSystem("EPSG:3857")
                if crs.isValid():
                    layer.setCrs(crs)
                    logger.warning(f"Kein SRS im DXF gefunden, setze EPSG:3857 für {dxf_path}")
                else:
                    logger.warning("Fallback SRS EPSG:3857 ist ungültig!")
            elif crs_epsg:
                crs2 = QgsCoordinateReferenceSystem(f"EPSG:{crs_epsg}")
                if crs2.isValid():
                    layer.setCrs(crs2)
                    logger.info(f"Set CRS to EPSG:{crs_epsg}")
                else:
                    logger.warning(f"Invalid EPSG code: {crs_epsg}")
            
            # Symbolisierung anwenden (alle Layer im Projekt)
            for layer_id, layer_obj in converter.project.mapLayers().items():
                if isinstance(layer_obj, QgsVectorLayer):
                    converter.apply_symbolization(layer_obj)
            
            # *** KORRIGIERT: page_size Parameter wird jetzt korrekt verwendet ***
            layout = converter.create_print_layout(layer, page_size=page_size)
            
            # GeoPDF-Export erzwingen
            converter.export_to_pdf(layout, pdf_path, dpi=dpi, georeference=True)
            
            logger.info(f"DXF to GeoPDF conversion completed successfully ({page_size} format)")
        
        # Metadaten falls gewünscht
        if return_metadata:
            metadata = extract_geopdf_metadata(pdf_path)
        
        return metadata
        
    except Exception as e:
        logger.error(f"DXF to GeoPDF conversion failed: {e}")
        raise Exception(f"Conversion failed: {str(e)}")

def convert_pdf_to_tms(pdf_path: str, tms_dir: str, minzoom: int = 0, maxzoom: int = 6, srs: Optional[str] = None) -> bool:
    """
    Konvertiert ein GeoPDF oder Raster (TIF/TIFF) in einen TMS-Ordner (Tiles) mit gdal2tiles.
    Für Rasterdaten oder PDFs ohne Georeferenz wird -p raster verwendet.
    """
    import subprocess
    import re
    try:
        if not os.path.exists(tms_dir):
            os.makedirs(tms_dir)

        # Finde gdal2tiles.py im PATH
        gdal2tiles_executable = shutil.which('gdal2tiles.py')
        if not gdal2tiles_executable:
            logger.error("'gdal2tiles.py' nicht im Systempfad (PATH) gefunden.")
            raise FileNotFoundError("[Errno 2] No such file or directory: 'gdal2tiles.py'")

        # Dateityp prüfen
        ext = os.path.splitext(pdf_path)[1].lower()
        is_raster = ext in ['.tif', '.tiff']
        needs_raster_profile = False

        # Prüfe auf Georeferenz (für PDFs)
        if not is_raster:
            try:
                from osgeo import gdal
                ds = gdal.Open(pdf_path)
                has_georef = False
                if ds is not None:
                    gt = ds.GetGeoTransform()
                    proj = ds.GetProjectionRef()
                    if gt and proj:
                        has_georef = True
                    ds = None
                if not has_georef:
                    needs_raster_profile = True
                    logger.warning(f"Keine Georeferenz im PDF gefunden, setze -p raster für {pdf_path}")
            except Exception as e:
                needs_raster_profile = True
                logger.warning(f"Fehler beim Prüfen der Georeferenz: {e}. Setze -p raster für {pdf_path}")
        else:
            needs_raster_profile = True
            logger.info(f"Rasterdatei erkannt ({pdf_path}), setze -p raster")

        cmd = [
            gdal2tiles_executable,
            '-z', f'{minzoom}-{maxzoom}',
            '-r', 'bilinear',
            '-w', 'none',
        ]
        if needs_raster_profile:
            cmd.extend(['-p', 'raster'])
        if srs:
            cmd.extend(["--s_srs", srs])
        cmd.extend([pdf_path, tms_dir])
        logger.info(f"Starte gdal2tiles: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            error_output = result.stderr or result.stdout
            logger.error(f"gdal2tiles Fehler (Return Code: {result.returncode}): {error_output}")
            raise Exception(f"gdal2tiles failed (Return Code: {result.returncode}): {error_output}")
        logger.info(f"TMS erfolgreich erzeugt: {tms_dir}")
        return True
    except Exception as e:
        logger.error(f"TMS-Konvertierung fehlgeschlagen: {e}")
        raise