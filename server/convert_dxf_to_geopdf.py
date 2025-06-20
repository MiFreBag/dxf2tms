from __future__ import annotations

import sys
import os
import logging
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
            
            # DXF-Layer laden
            layer = QgsVectorLayer(dxf_path, layer_name, "ogr")
            
            if not layer.isValid():
                raise Exception(f"Invalid DXF layer: {layer.error().message()}")
            
            # Layer zum Projekt hinzufügen
            self.project.addMapLayer(layer)
            
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
        Print Layout immer als A4 quer (Landscape) erstellen
        """
        try:
            # Layout erstellen
            layout = QgsPrintLayout(self.project)
            layout.initializeDefaults()
            layout.setName(layout_name)
            self.project.layoutManager().addLayout(layout)

            # Kartenelement erstellen
            map_item = QgsLayoutItemMap(layout)

            # Immer A4 quer
            page_width, page_height = 297, 210  # mm (A4 Landscape)
            map_margins = 10

            # Kartenbereich definieren
            map_width = page_width - (2 * map_margins)
            map_height = page_height - (2 * map_margins) - (20 if add_elements else 0)

            # Karte positionieren und dimensionieren
            map_item.attemptMove(QgsLayoutPoint(map_margins, map_margins + (20 if add_elements else 0)))
            map_item.attemptResize(QgsLayoutSize(map_width, map_height, QgsUnitTypes.LayoutMillimeters))

            # Layer-Extent auf Karte setzen
            map_item.setExtent(layer.extent())
            layout.addLayoutItem(map_item)

            if add_elements:
                self._add_layout_elements(layout, map_item, layer, page_width)

            logger.info(f"Print layout created: {layout_name} (A4 quer)")
            return layout
        except Exception as e:
            logger.error(f"Failed to create print layout: {e}")
            raise
    
    def _add_layout_elements(self, layout: QgsPrintLayout, map_item: QgsLayoutItemMap, 
                           layer: QgsVectorLayer, page_width: float):
        """
        Zusätzliche Layout-Elemente hinzufügen (Titel, Maßstab, etc.)
        
        Args:
            layout: Das Layout
            map_item: Das Kartenelement
            layer: Der Hauptlayer
            page_width: Seitenbreite in mm
        """
        try:
            # Titel hinzufügen
            title_item = QgsLayoutItemLabel(layout)
            title_item.setText(f"DXF-Karte: {layer.name()}")
            title_item.setFont(QFont("Arial", 14, QFont.Bold))
            title_item.attemptMove(QgsLayoutPoint(10, 5))
            title_item.attemptResize(QgsLayoutSize(page_width - 20, 15, QgsUnitTypes.LayoutMillimeters))
            layout.addLayoutItem(title_item)
            
            # Maßstabsleiste hinzufügen
            scalebar_item = QgsLayoutItemScaleBar(layout)
            scalebar_item.setLinkedMap(map_item)
            scalebar_item.setStyle('Single Box')
            scalebar_item.setUnits(QgsUnitTypes.DistanceMeters)
            scalebar_item.setNumberOfSegments(4)
            scalebar_item.setNumberOfSegmentsLeft(0)
            scalebar_item.attemptMove(QgsLayoutPoint(10, 280))
            scalebar_item.attemptResize(QgsLayoutSize(60, 10, QgsUnitTypes.LayoutMillimeters))
            layout.addLayoutItem(scalebar_item)
            
            logger.info("Layout elements added successfully")
            
        except Exception as e:
            logger.warning(f"Failed to add some layout elements: {e}")
    
    def export_to_pdf(self, layout: QgsPrintLayout, pdf_path: str, 
                     dpi: int = 300, georeference: bool = True) -> bool:
        """
        Layout als GeoPDF exportieren
        
        Args:
            layout: Das zu exportierende Layout
            pdf_path: Ausgabepfad für das PDF
            dpi: Auflösung für den Export
            georeference: Georeferenzierung aktivieren
            
        Returns:
            bool: True bei erfolgreichem Export
        """
        try:
            # Ausgabeverzeichnis erstellen falls nicht vorhanden
            output_dir = os.path.dirname(pdf_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            # Export-Einstellungen konfigurieren
            exporter = QgsLayoutExporter(layout)
            export_settings = QgsLayoutExporter.PdfExportSettings()
            export_settings.dpi = dpi
            export_settings.georeference = georeference
            export_settings.rasterizeWholeImage = False
            export_settings.forceVectorOutput = True
            
            # PDF exportieren
            result = exporter.exportToPdf(pdf_path, export_settings)
            
            if result != QgsLayoutExporter.Success:
                raise Exception(f"PDF export failed with code: {result}")
            
            # Erfolgsprüfung
            if not os.path.exists(pdf_path):
                raise Exception("PDF file was not created")
            
            file_size = os.path.getsize(pdf_path)
            if file_size == 0:
                raise Exception("PDF file is empty")
            
            logger.info(f"PDF export successful: {pdf_path} ({file_size} bytes)")
            
            return True
            
        except Exception as e:
            logger.error(f"PDF export failed: {e}")
            raise

def dxf_to_geopdf(dxf_path: str, pdf_path: str,
                 crs_epsg: Optional[int] = None,
                 page_size: str = "A4",
                 dpi: int = 300) -> None:
    """
    Hauptfunktion: DXF zu GeoPDF konvertieren (immer A4 quer, GeoPDF)
    
    Args:
        dxf_path: Pfad zur DXF-Eingabedatei
        pdf_path: Pfad zur PDF-Ausgabedatei  
        crs_epsg: EPSG-Code für Koordinatensystem (optional)
        page_size: Seitengröße (A4, A3)
        dpi: Auflösung für PDF-Export
        
    Raises:
        Exception: Bei Fehlern während der Konvertierung
    """
    if not QGIS_AVAILABLE:
        raise ModuleNotFoundError(
            "QGIS Python bindings are required. Install QGIS or run the conversion inside the provided Docker container."
        )
    try:
        logger.info(f"Starting DXF to GeoPDF conversion: {dxf_path} -> {pdf_path}")
        with DXFToGeoPDFConverter() as converter:
            layer = converter.load_dxf_layer(dxf_path)
            if crs_epsg:
                crs = QgsCoordinateReferenceSystem(f"EPSG:{crs_epsg}")
                if crs.isValid():
                    layer.setCrs(crs)
                    logger.info(f"Set CRS to EPSG:{crs_epsg}")
                else:
                    logger.warning(f"Invalid EPSG code: {crs_epsg}")
            for layer_id, layer_obj in converter.project.mapLayers().items():
                if isinstance(layer_obj, QgsVectorLayer):
                    converter.apply_symbolization(layer_obj)
            # Immer A4 quer
            layout = converter.create_print_layout(layer, page_size="A4")
            # GeoPDF-Export erzwingen
            converter.export_to_pdf(layout, pdf_path, dpi=dpi, georeference=True)
        logger.info("DXF to GeoPDF conversion completed successfully (A4 quer, GeoPDF)")
    except Exception as e:
        logger.error(f"DXF to GeoPDF conversion failed: {e}")
        raise Exception(f"Conversion failed: {str(e)}")

# Für Rückwärtskompatibilität
def convert_dxf_to_geopdf(dxf_path: str, pdf_path: str) -> None:
    """Legacy-Funktion für Rückwärtskompatibilität"""
    dxf_to_geopdf(dxf_path, pdf_path)

if __name__ == "__main__":
    # Beispielverwendung/Test
    if len(sys.argv) != 3:
        print("Usage: python convert_dxf_to_geopdf.py <input.dxf> <output.pdf>")
        sys.exit(1)
    
    input_dxf = sys.argv[1]
    output_pdf = sys.argv[2]
    
    try:
        dxf_to_geopdf(input_dxf, output_pdf)
        print(f"Conversion successful: {output_pdf}")
    except Exception as e:
        print(f"Conversion failed: {e}")
        sys.exit(1)
