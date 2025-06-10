import sys
from qgis.core import (
    QgsApplication, QgsProject, QgsVectorLayer, QgsPrintLayout, QgsLayoutItemMap,
    QgsLayoutExporter, QgsLayoutPoint, QgsLayoutSize, QgsUnitTypes, QgsLineSymbol
)
from qgis.PyQt.QtCore import QSizeF
from qgis.PyQt.QtGui import QColor

def dxf_to_geopdf(dxf_path, pdf_path):
    qgs = QgsApplication([], False)
    qgs.initQgis()
    project = QgsProject.instance()

    layer = QgsVectorLayer(dxf_path, "dxf_layer", "ogr")
    if not layer.isValid():
        raise Exception("Layer invalid")

    project.addMapLayer(layer)

    # Symbolisierung überschreiben (ALLE Layer auf dunkelgrau und Strichlinie)
    for lyr in project.mapLayers().values():
        gtype = lyr.geometryType()
        if gtype == 1:  # Line
            symbol = QgsLineSymbol.createSimple({
                "color": "#333333",
                "width": "0.5",
                "line_style": "dash",
                "dash_pattern": "2;1"
            })
            lyr.renderer().setSymbol(symbol)
            lyr.triggerRepaint()
        elif gtype == 2:  # Polygon
            symbol = lyr.renderer().symbol()
            symbol.setColor(QColor("#333333"))
            symbol.symbolLayer(0).setStrokeColor(QColor("#333333"))
            symbol.symbolLayer(0).setStrokeWidth(0.5)
            lyr.triggerRepaint()
        elif gtype == 0:  # Point
            symbol = lyr.renderer().symbol()
            symbol.setColor(QColor("#333333"))
            symbol.setSize(2)
            lyr.triggerRepaint()

    layout = QgsPrintLayout(project)
    layout.initializeDefaults()
    layout.setName("Layout1")
    project.layoutManager().addLayout(layout)

    map_item = QgsLayoutItemMap(layout)
    map_item.setRect(20, 20, 200, 100)
    map_item.setExtent(layer.extent())
    layout.addLayoutItem(map_item)
    map_item.attemptMove(QgsLayoutPoint(10, 10))
    map_item.attemptResize(QgsLayoutSize(200, 150, QgsUnitTypes.LayoutMillimeters))

    exporter = QgsLayoutExporter(layout)
    export_settings = QgsLayoutExporter.PdfExportSettings()
    export_settings.georeference = True
    result = exporter.exportToPdf(pdf_path, export_settings)

    qgs.exitQgis()
    if result != 0:
        raise Exception(f"QGIS export failed with code {result}")
