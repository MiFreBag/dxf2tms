import React, { useState, useEffect } from 'react'
import { 
  Layers, 
  Play, 
  Download, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Settings,
  Package,
  Map,
  X
} from 'lucide-react'

const MapTilerComponent = ({ token, onMessage }) => {
  const [jobs, setJobs] = useState([])
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    format: 'folder',
    zoomLevels: '0-18',
    tileSize: 256
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [showPreview, setShowPreview] = useState(null)

  const API = '/api'

  const loadData = async () => {
    setLoading(true);
    try {
      // Jobs laden
      const jobsResponse = await fetch(`${API}/jobs`, { // Assuming /api/jobs from jobController.py
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        // Filter for maptiler jobs
        setJobs(Object.values(jobsData).filter(j => j.type === 'maptiler'));
      }

      // Konvertierte Dateien laden
      const filesResponse = await fetch(`${API}/files?status=converted`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setAvailableFiles(filesData);
      }
    } catch (error) {
      console.error('Error loading MapTiler data:', error);
      onMessage?.('Fehler beim Laden der MapTiler-Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
        loadData();
    }
    const interval = setInterval(() => {
      if (jobs.some(j => j.status === 'running' || j.status === 'queued')) {
        loadData();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [token, jobs.length]);

  // MapTiler starten
  const startMapTiler = async (file) => {
    try {
      const response = await fetch(`${API}/maptiler/${file.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings) // Pass settings in body
      });

      if (response.ok) {
        await response.json();
        onMessage?.(`MapTiler-Job gestartet für ${file.name}`, 'success');
        loadData();
        setShowSettings(false);
        setSelectedFile(null);
      } else {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to start MapTiler');
      }
    } catch (error) {
      onMessage?.(`Fehler beim Starten von MapTiler: ${error.message}`, 'error');
      console.error('MapTiler error:', error);
    }
  };

  // Job löschen
  const deleteJob = async (jobId) => {
    if (!confirm('MapTiler-Job und alle Tiles löschen?')) return;

    try {
      // This endpoint needs to be implemented in the backend
      onMessage?.('Löschen von Jobs wird noch nicht unterstützt.', 'info');
    } catch (error) {
      onMessage?.('Fehler beim Löschen', 'error');
    }
  };

  // Download
  const downloadTiles = async (jobId) => {
    // This endpoint needs to be implemented in the backend
    onMessage?.('Download von Tiles wird noch nicht unterstützt.', 'info');
  };

  // Status-Icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Tiles Preview
  const TilesPreview = ({ job }) => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Tiles Preview: {job.inputFile.name}</h3>
          <button onClick={() => setShowPreview(null)} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="h-96 bg-gray-100 rounded-lg relative overflow-hidden flex items-center justify-center">
          <p className="text-gray-500">
            {job.artifacts?.[0]?.url ? `Tiles verfügbar unter: ${job.artifacts[0].url}` : 'Keine Vorschau-URL verfügbar.'}
          </p>
        </div>
      </div>
    </div>
  );

  // Settings Dialog
  const SettingsDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">MapTiler Einstellungen</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select value={settings.format} onChange={(e) => setSettings({ ...settings, format: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="folder">Folder (XYZ Tiles)</option>
              <option value="mbtiles">MBTiles</option>
              <option value="geopackage">GeoPackage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Zoom-Level</label>
            <input type="text" value={settings.zoomLevels} onChange={(e) => setSettings({ ...settings, zoomLevels: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="z.B. 0-18 oder 10-15" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tile-Größe</label>
            <select value={settings.tileSize} onChange={(e) => setSettings({ ...settings, tileSize: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg">
              <option value="256">256x256</option>
              <option value="512">512x512 (Retina)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setShowSettings(false); setSelectedFile(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Abbrechen</button>
          <button onClick={() => { if (selectedFile) { startMapTiler(selectedFile); } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Play className="w-4 h-4" /> Konvertierung starten
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">MapTiler Engine</h2>
          <p className="text-gray-600 mt-1">Erstelle hochperformante Kartenkacheln aus GeoPDFs</p>
        </div>
        <button onClick={loadData} disabled={loading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3">Verfügbare GeoPDFs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableFiles.map(file => (
            <div key={file.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{file.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  {file.bbox && (
                    <p className="text-xs text-gray-400 mt-1 truncate">BBox: [{JSON.parse(file.bbox).map(b => b.toFixed(2)).join(', ')}]</p>
                  )}
                </div>
                <button onClick={() => { setSelectedFile(file); setShowSettings(true); }} className="ml-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" title="Mit MapTiler konvertieren">
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">MapTiler Jobs</h3>
        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Noch keine MapTiler-Jobs vorhanden</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <h4 className="font-medium">Job {job.id.slice(0, 8)}...</h4>
                      <p className="text-sm text-gray-500">Datei: {job.inputFile.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'running' && job.progress > 0 && (
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                      </div>
                    )}
                    {job.status === 'completed' && (
                      <>
                        <button onClick={() => setShowPreview(job)} className="p-2 text-gray-600 hover:text-blue-600" title="Tiles Preview"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => downloadTiles(job.id)} className="p-2 text-gray-600 hover:text-green-600" title="Download"><Download className="w-4 h-4" /></button>
                      </>
                    )}
                    {(job.status === 'completed' || job.status === 'failed') && (
                      <button onClick={() => deleteJob(job.id)} className="p-2 text-gray-600 hover:text-red-600" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                {job.error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">{job.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showSettings && <SettingsDialog />}
      {showPreview && <TilesPreview job={showPreview} />}
    </div>
  )
}

export default MapTilerComponent
