import sys
import os
import types
from fastapi.testclient import TestClient

# Ensure project root is on sys.path so 'server' can be imported
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Provide dummy osgeo.gdal module
osgeo = types.ModuleType('osgeo')
osgeo.gdal = types.SimpleNamespace(Open=lambda *a, **k: None)
sys.modules.setdefault('osgeo', osgeo)

# Provide dummy qgis modules so server imports succeed
qgis = types.ModuleType('qgis')
qgis_core = types.ModuleType('qgis.core')
class Dummy:
    def __init__(self, *args, **kwargs):
        pass
    def initQgis(self):
        pass
    def exitQgis(self):
        pass
qgis_core.QgsApplication = Dummy
qgis_core.QgsProject = type('Proj', (), {'instance': staticmethod(lambda: Dummy())})
qgis_core.QgsVectorLayer = Dummy
qgis_core.QgsPrintLayout = Dummy
qgis_core.QgsLayoutItemMap = Dummy
qgis_core.QgsLayoutExporter = type('Exporter', (), {
    '__init__': lambda self, *a, **k: None,
    'exportToPdf': lambda self, *a, **k: 0,
})
qgis_core.QgsLayoutPoint = Dummy
qgis_core.QgsLayoutSize = Dummy
qgis_core.QgsUnitTypes = type('Units', (), {'LayoutMillimeters': 1})
qgis_core.QgsLineSymbol = type('LineSymbol', (), {'createSimple': staticmethod(lambda opts: Dummy())})
qgis.core = qgis_core
qgis.PyQt = types.ModuleType('qgis.PyQt')
qtcore = types.ModuleType('qgis.PyQt.QtCore')
qtgui = types.ModuleType('qgis.PyQt.QtGui')
qtcore.QSizeF = Dummy
qtgui.QColor = Dummy
qgis.PyQt.QtCore = qtcore
qgis.PyQt.QtGui = qtgui
sys.modules.setdefault('qgis', qgis)
sys.modules.setdefault('qgis.core', qgis_core)
sys.modules.setdefault('qgis.PyQt', qgis.PyQt)
sys.modules.setdefault('qgis.PyQt.QtCore', qtcore)
sys.modules.setdefault('qgis.PyQt.QtGui', qtgui)

from server.main import app

client = TestClient(app)


def test_login_success():
    response = client.post('/login', json={'username': 'admin', 'password': 'admin123'})
    assert response.status_code == 200
    assert 'access_token' in response.json()


def test_login_failure():
    response = client.post('/login', json={'username': 'user', 'password': 'bad'})
    assert response.status_code == 401


def test_files_requires_auth():
    response = client.get('/files')
    assert response.status_code == 403


def test_files_empty_after_login():
    token = client.post('/login', json={'username': 'admin', 'password': 'admin123'}).json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/files', headers=headers)
    assert response.status_code == 200
    assert response.json() == []
