import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Download, MapPin, LogOut, CheckCircle, Clock, AlertCircle, X, Plus, Layers, Navigation, ZoomIn, ZoomOut } from 'lucide-react'
import Login from './components/Login'
const API = '/api'

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 transform transition-all duration-300 ease-in-out`}>
      {type === 'success' && <CheckCircle className="w-4 h-4" />}
      {type === 'error' && <AlertCircle className="w-4 h-4" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Enhanced Login component with real API
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.access_token)
        onLogin(data.access_token)
      } else {
        setError('Login fehlgeschlagen - Bitte prüfen Sie Ihre Eingaben')
      }
    } catch (err) {
      setError('Verbindungsfehler - Bitte versuchen Sie es später erneut')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Stadt Zürich DAV</h1>
            <p className="text-gray-600 mt-2">DXF2GeoPDF Converter</p>
          </div>
          
          <div onSubmit={submit}>
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Benutzer</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Benutzername eingeben"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  type="password"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="button"
                onClick={submit}
                disabled={loading}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Anmelden...
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
              <div className="text-sm text-gray-500 text-center">
                Demo: admin / admin123
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Map component with real Leaflet and TMS integration
function MapComponent({ token }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [layers, setLayers] = useState([])
  const [selected, setSelected] = useState('')
  const [basemap, setBasemap] = useState('topo')
  const [coordinates, setCoordinates] = useState('47.3769, 8.5417')
  const [showPOIs, setShowPOIs] = useState(false)
  const [currentLayer, setCurrentLayer] = useState(null)
  const [poiMarkers, setPOIMarkers] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch TMS layers from backend
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const response = await fetch(`${API}/tms`)
        if (response.ok) {
          const data = await response.json()
          setLayers(data)
        }
      } catch (error) {
        console.error('Failed to fetch TMS layers:', error)
      }
    }
    fetchLayers()
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Create Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)

    // Load Leaflet library
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = () => {
      // Initialize map once Leaflet is loaded
      const map = window.L.map(mapRef.current).setView([47.3769, 8.5417], 13)

      // Add base tile layer (Swiss geo.admin.ch)
      window.L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg', {
        attribution: '&copy; <a href="https://www.geo.admin.ch/">geo.admin.ch</a>',
        maxZoom: 18
      }).addTo(map)

      // Add mouse move event for coordinates
      map.on('mousemove', (e) => {
        setCoordinates(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`)
      })

      // Add scale control
      window.L.control.scale({
        position: 'bottomright',
        metric: true,
        imperial: false
      }).addTo(map)

      mapInstanceRef.current = map
      setLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle layer selection with real TMS data
  const selectLayer = (layerId) => {
    if (!mapInstanceRef.current || !window.L) return

    // Remove current layer
    if (currentLayer) {
      mapInstanceRef.current.removeLayer(currentLayer)
      setCurrentLayer(null)
    }

    if (!layerId) {
      setSelected('')
      return
    }

    const layer = layers.find(l => l.id === layerId)
    if (!layer) return

    // Add TMS layer from backend
    const tmsLayer = window.L.tileLayer(`${layer.url}/{z}/{x}/{y}.png`, {
      tms: true,
      opacity: 0.7,
      attribution: 'Stadt Zürich DAV'
    }).addTo(mapInstanceRef.current)

    // If layer has config with bounds, fit map to bounds
    if (layer.config && layer.config.bounds) {
      const bounds = layer.config.bounds
      const leafletBounds = [[bounds[1], bounds[0]], [bounds[3], bounds[2]]]
      mapInstanceRef.current.fitBounds(leafletBounds)
    }

    setCurrentLayer(tmsLayer)
    setSelected(layerId)
  }

  // Handle basemap change
  const changeBasemap = (type) => {
    setBasemap(type)
    // In a real implementation, this would switch the base layer
  }

  // Mock POI data for Zurich
  const pois = [
    { name: 'Hauptbahnhof', lat: 47.3784, lng: 8.5403, type: 'transport', color: '#3B82F6' },
    { name: 'ETH Zürich', lat: 47.3765, lng: 8.5487, type: 'education', color: '#10B981' },
    { name: 'Universität Zürich', lat: 47.3739, lng: 8.5506, type: 'education', color: '#10B981' },
    { name: 'Zürichsee', lat: 47.3667, lng: 8.5500, type: 'nature', color: '#06B6D4' },
    { name: 'Bahnhofstrasse', lat: 47.3769, lng: 8.5399, type: 'shopping', color: '#F59E0B' }
  ]

  // Toggle POIs
  const togglePOIs = () => {
    if (!mapInstanceRef.current || !window.L) return

    if (showPOIs) {
      // Remove POIs
      poiMarkers.forEach(marker => mapInstanceRef.current.removeLayer(marker))
      setPOIMarkers([])
      setShowPOIs(false)
    } else {
      // Add POIs
      const newMarkers = pois.map(poi => {
        const marker = window.L.circleMarker([poi.lat, poi.lng], {
          radius: 8,
          fillColor: poi.color,
          color: 'white',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(mapInstanceRef.current)

        marker.bindPopup(`<strong>${poi.name}</strong><br>Typ: ${poi.type}`)
        return marker
      })
      setPOIMarkers(newMarkers)
      setShowPOIs(true)
    }
  }

  // Zoom to Zurich
  const zoomToZurich = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([47.3769, 8.5417], 13)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Map Controls */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            TMS Layer auswählen
          </label>
          <select 
            value={selected} 
            onChange={e => selectLayer(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Basis Layer --</option>
            {layers.map(l => (
              <option key={l.id} value={l.id}>{l.id}</option>
            ))}
          </select>
          {layers.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Keine TMS Layer verfügbar</p>
          )}
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Karten-Stil
          </label>
          <select 
            value={basemap} 
            onChange={e => changeBasemap(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="topo">Swiss Topo (Grau)</option>
            <option value="satellite">Satellite</option>
            <option value="osm">OpenStreetMap</option>
          </select>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
          <div className="flex gap-2">
            <button 
              onClick={zoomToZurich}
              className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              Zürich
            </button>
            <button 
              onClick={togglePOIs}
              className={`flex-1 px-3 py-1 text-white text-sm rounded-lg transition-colors ${
                showPOIs ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              POIs
            </button>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2">Koordinaten</label>
          <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
            {coordinates}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden relative">
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }}></div>
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Karte wird geladen...</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border max-w-xs">
          <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Legende
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Transport</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Bildung</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <span>Natur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>Shopping</span>
            </div>
            {selected && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <div className="w-3 h-3 bg-blue-500 rounded border"></div>
                <span>TMS Layer</span>
              </div>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow border">
          <div className="text-xs text-gray-600 mb-1">Status</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mapInstanceRef.current ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-xs">
              {mapInstanceRef.current ? 'Verbunden' : 'Lädt...'}
            </span>
          </div>
          {layers.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {layers.length} TMS Layer verfügbar
            </div>
          )}
        </div>
      </div>

      {/* Map Info Panel */}
      {selected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Aktiver TMS Layer: {selected}
              </span>
            </div>
            <button 
              onClick={() => selectLayer('')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Layer deaktivieren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// PDF Preview Modal Component (adapted for real backend data)
function PDFPreviewModal({ file, isOpen, onClose, onDownload }) {
  if (!isOpen || !file) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">{file.name.replace('.dxf', '.pdf')}</h3>
              <p className="text-sm text-gray-600">GeoPDF Vorschau • ID: {file.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Herunterladen
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Schließen
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {/* PDF Preview Simulation */}
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">GeoPDF Vorschau</p>
              <p className="text-sm text-gray-500 mt-2">
                {file.name.replace('.dxf', '.pdf')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div className="text-left">
                  <p><strong>Originalformat:</strong> DXF</p>
                  <p><strong>Datei-ID:</strong> {file.id}</p>
                  <p><strong>Projektionsystem:</strong> LV95 (EPSG:2056)</p>
                </div>
                <div className="text-left">
                  <p><strong>Status:</strong> {file.converted ? 'Konvertiert' : 'In Bearbeitung'}</p>
                  <p><strong>TMS Layer:</strong> {file.static_folder ? 'Verfügbar' : 'Nicht verfügbar'}</p>
                  <p><strong>Backend:</strong> QGIS Processing</p>
                </div>
              </div>
              {file.static_folder && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>TMS Endpoint:</strong><br />
                    <code className="text-xs">{file.static_folder}</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Download Progress Component
function DownloadProgress({ fileName, progress, onCancel }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm w-full z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">Download läuft...</span>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="text-xs text-gray-600 mb-2">{fileName}</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{progress}% abgeschlossen</div>
    </div>
  )
}

// Enhanced file upload with drag & drop
function FileUploadArea({ onUpload }) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const dxfFile = files.find(f => f.name.toLowerCase().endsWith('.dxf'))
    if (dxfFile) {
      onUpload({ target: { files: [dxfFile] } })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">DXF-Dateien hier ablegen</p>
      <p className="text-sm text-gray-500 mb-4">oder klicken Sie, um Dateien auszuwählen</p>
      <input 
        type="file" 
        accept=".dxf" 
        onChange={onUpload} 
        className="hidden" 
        id="file-upload"
      />
      <label 
        htmlFor="file-upload" 
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
      >
        <Plus className="w-4 h-4" />
        Datei auswählen
      </label>
    </div>
  )
}
function BulkDownloadPanel({ files, onSelectAll, onDownloadSelected, selectedFiles }) {
  const convertedFiles = files.filter(f => f.converted)
  const selectedCount = selectedFiles.length
  const totalSize = selectedFiles.reduce((sum, id) => {
    const file = files.find(f => f.id === id)
    return sum + (file ? parseFloat(file.geoPdfSize) : 0)
  }, 0).toFixed(1)

  if (convertedFiles.length === 0) return null

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Bulk Download</h4>
            <p className="text-sm text-blue-700">
              {selectedCount} von {convertedFiles.length} GeoPDFs ausgewählt
              {selectedCount > 0 && ` • ${totalSize} MB gesamt`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Alle auswählen
          </button>
          {selectedCount > 0 && (
            <button
              onClick={onDownloadSelected}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              {selectedCount} herunterladen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const dxfFile = files.find(f => f.name.toLowerCase().endsWith('.dxf'))
    if (dxfFile) {
      onUpload({ target: { files: [dxfFile] } })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">DXF-Dateien hier ablegen</p>
      <p className="text-sm text-gray-500 mb-4">oder klicken Sie, um Dateien auszuwählen</p>
      <input 
        type="file" 
        accept=".dxf" 
        onChange={onUpload} 
        className="hidden" 
        id="file-upload"
      />
      <label 
        htmlFor="file-upload" 
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
      >
        <Plus className="w-4 h-4" />
        Datei auswählen
      </label>
    </div>
  )
}

function App() {
  const [files, setFiles] = useState([])
  const [page, setPage] = useState('upload')
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [toast, setToast] = useState(null)
  const [convertingFiles, setConvertingFiles] = useState(new Set())
  
  // New states for GeoPDF downloads
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null })
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  // Fetch files from backend
  const refreshFiles = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API}/files`, { 
        headers: authHeaders 
      })
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      } else if (response.status === 401) {
        handleLogout()
      } else {
        showToast('Fehler beim Laden der Dateien', 'error')
      }
    } catch (error) {
      showToast('Verbindungsfehler beim Laden der Dateien', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load files on token change
  useEffect(() => {
    if (token) {
      refreshFiles()
    }
  }, [token])

  const handleLogin = async (receivedToken) => {
    setToken(receivedToken)
    localStorage.setItem('token', receivedToken)
    showToast('Erfolgreich angemeldet!', 'success')
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
    setFiles([])
    setSelectedFiles([])
    showToast('Erfolgreich abgemeldet', 'info')
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        showToast('Datei erfolgreich hochgeladen!', 'success')
        refreshFiles()
      } else if (response.status === 401) {
        handleLogout()
      } else {
        showToast('Fehler beim Hochladen der Datei', 'error')
      }
    } catch (error) {
      showToast('Verbindungsfehler beim Upload', 'error')
    }
    
    e.target.value = ''
  }

  const handleConvert = async (fileId) => {
    setConvertingFiles(prev => new Set([...prev, fileId]))
    showToast('Konvertierung gestartet...', 'info')
    
    try {
      const response = await fetch(`${API}/convert/${fileId}`, {
        method: 'POST',
        headers: authHeaders
      })
      
      if (response.ok) {
        const data = await response.json()
        showToast('Konvertierung abgeschlossen! GeoPDF ist verfügbar.', 'success')
        refreshFiles()
      } else if (response.status === 401) {
        handleLogout()
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(`Konvertierung fehlgeschlagen: ${errorData.detail || 'Unbekannter Fehler'}`, 'error')
      }
    } catch (error) {
      showToast('Verbindungsfehler bei der Konvertierung', 'error')
    } finally {
      setConvertingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  const handlePreview = (file) => {
    setPreviewModal({ isOpen: true, file })
  }

  const handleDownload = async (file) => {
    setPreviewModal({ isOpen: false, file: null })
    setDownloadProgress({ fileName: file.name.replace('.dxf', '.pdf'), progress: 0 })
    
    try {
      // Start download with progress simulation
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (!prev) return null
          const newProgress = prev.progress + 20
          if (newProgress >= 100) {
            clearInterval(progressInterval)
            return { ...prev, progress: 100 }
          }
          return { ...prev, progress: newProgress }
        })
      }, 200)

      // Actual download
      const downloadUrl = `${API}/download/${file.id}?token=${token}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.name.replace('.dxf', '.pdf')
      link.click()
      
      setTimeout(() => {
        setDownloadProgress(null)
        showToast('GeoPDF erfolgreich heruntergeladen!', 'success')
        refreshFiles() // Refresh to update download count if backend tracks it
      }, 1000)

    } catch (error) {
      setDownloadProgress(null)
      showToast('Fehler beim Download', 'error')
    }
  }

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return
    
    showToast(`${selectedFiles.length} GeoPDFs werden heruntergeladen...`, 'info')
    
    // Download each file individually (since backend doesn't have bulk endpoint)
    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId)
      if (file && file.converted) {
        const downloadUrl = `${API}/download/${fileId}?token=${token}`
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = file.name.replace('.dxf', '.pdf')
        link.click()
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    setSelectedFiles([])
    showToast('Alle GeoPDFs heruntergeladen!', 'success')
  }

  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    const convertedFileIds = files.filter(f => f.converted).map(f => f.id)
    setSelectedFiles(
      selectedFiles.length === convertedFileIds.length ? [] : convertedFileIds
    )
  }

  const getStatusIcon = (file) => {
    if (convertingFiles.has(file.id)) {
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
    }
    return file.converted ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertCircle className="w-4 h-4 text-gray-400" />
  }

  const getStatusText = (file) => {
    if (convertingFiles.has(file.id)) return 'Konvertierung läuft...'
    return file.converted ? 'Konvertiert' : 'Wartet auf Konvertierung'
  }

  const formatFileSize = (sizeStr) => {
    // Backend returns file size, we estimate GeoPDF size
    if (typeof sizeStr === 'string' && sizeStr.includes('MB')) {
      const size = parseFloat(sizeStr)
      return (size * 2.1).toFixed(1) + ' MB'
    }
    return 'N/A'
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal 
        file={previewModal.file}
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, file: null })}
        onDownload={handleDownload}
      />

      {/* Download Progress */}
      {downloadProgress && (
        <DownloadProgress 
          fileName={downloadProgress.fileName}
          progress={downloadProgress.progress}
          onCancel={() => setDownloadProgress(null)}
        />
      )}
      
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Stadt Zürich DAV</h1>
              <p className="text-sm text-gray-600">DXF2GeoPDF Converter</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-64 bg-white shadow-sm border-r">
          <div className="p-4 space-y-2">
            <button
              onClick={() => setPage('upload')}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition-colors ${
                page === 'upload' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Upload className="w-5 h-5" />
              Dateien verwalten
            </button>
            <button
              onClick={() => setPage('map')}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition-colors ${
                page === 'map' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Karte anzeigen
            </button>
          </div>
        </nav>

        <main className="flex-1 p-6">
          {page === 'upload' && (
            <div className="max-w-6xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dateien verwalten</h2>
                <p className="text-gray-600">DXF-Dateien hochladen und zu GeoPDF konvertieren</p>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gesamt Dateien</p>
                      <p className="text-2xl font-bold text-gray-900">{files.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Konvertiert</p>
                      <p className="text-2xl font-bold text-gray-900">{files.filter(f => f.converted).length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Warteschlange</p>
                      <p className="text-2xl font-bold text-gray-900">{convertingFiles.size}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">API Status</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div> : 'OK'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <FileUploadArea onUpload={handleUpload} />
              </div>

              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">Hochgeladene Dateien</h3>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Dateien werden geladen...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Noch keine Dateien hochgeladen</p>
                  </div>
                ) : (
                  <>
                    <BulkDownloadPanel 
                      files={files}
                      selectedFiles={selectedFiles}
                      onSelectAll={handleSelectAll}
                      onDownloadSelected={handleBulkDownload}
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={selectedFiles.length === files.filter(f => f.converted).length && files.filter(f => f.converted).length > 0}
                                className="rounded"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datei</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TMS Layer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {files.map(file => (
                            <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {file.converted && (
                                  <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.id)}
                                    onChange={() => handleSelectFile(file.id)}
                                    className="rounded"
                                  />
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(file)}
                                  <span className="text-sm text-gray-600">{getStatusText(file)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <div>
                                    <div className="font-medium text-gray-900">{file.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {file.converted ? 'GeoPDF verfügbar' : 'DXF Datei'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                {file.id.slice(0, 8)}...
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {file.converted && file.static_folder ? (
                                  <div className="flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-green-500" />
                                    <span>Verfügbar</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  {!file.converted && !convertingFiles.has(file.id) && (
                                    <button 
                                      onClick={() => handleConvert(file.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                    >
                                      <Upload className="w-3 h-3" />
                                      Konvertieren
                                    </button>
                                  )}
                                  {convertingFiles.has(file.id) && (
                                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-md">
                                      <div className="w-3 h-3 border border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                                      Läuft...
                                    </div>
                                  )}
                                  {file.converted && (
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => handlePreview(file)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                      >
                                        <FileText className="w-3 h-3" />
                                        Vorschau
                                      </button>
                                      <button 
                                        onClick={() => handleDownload(file)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {page === 'map' && (
            <div className="h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Kartenansicht</h2>
                <p className="text-gray-600">Konvertierte TMS-Layer auf der Karte anzeigen</p>
              </div>
              <MapComponent token={token} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App