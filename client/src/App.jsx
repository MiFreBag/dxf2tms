import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Download, MapPin, LogOut, CheckCircle, Clock, AlertCircle, X, Plus, Layers, Navigation, ZoomIn, ZoomOut } from 'lucide-react'

const API = '/api'

// Mock data for demo
const mockFiles = [
  { id: 1, name: 'building_plans.dxf', converted: true, uploadDate: '2025-06-09', size: '2.4 MB' },
  { id: 2, name: 'road_layout.dxf', converted: false, uploadDate: '2025-06-10', size: '1.8 MB' },
  { id: 3, name: 'utilities.dxf', converted: true, uploadDate: '2025-06-08', size: '3.2 MB' }
]

const mockLayers = [
  { id: 'layer1', name: 'Building Plans', url: '/api/tms/building' },
  { id: 'layer2', name: 'Road Layout', url: '/api/tms/roads' }
]

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

// Enhanced Login component
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate login delay
    setTimeout(() => {
      onLogin(username, password)
      setLoading(false)
    }, 1000)
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Map component with real Leaflet integration
function MapComponent() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [layers] = useState([
    { id: 'building', name: 'Building Plans', url: '/api/tms/building' },
    { id: 'roads', name: 'Road Layout', url: '/api/tms/roads' },
    { id: 'utilities', name: 'Utilities', url: '/api/tms/utilities' }
  ])
  const [selected, setSelected] = useState('')
  const [basemap, setBasemap] = useState('topo')
  const [coordinates, setCoordinates] = useState('47.3769, 8.5417')
  const [showPOIs, setShowPOIs] = useState(false)
  const [currentLayer, setCurrentLayer] = useState(null)
  const [poiMarkers, setPOIMarkers] = useState([])

  // Mock POI data
  const pois = [
    { name: 'Hauptbahnhof', lat: 47.3784, lng: 8.5403, type: 'transport', color: '#3B82F6' },
    { name: 'ETH Zürich', lat: 47.3765, lng: 8.5487, type: 'education', color: '#10B981' },
    { name: 'Universität Zürich', lat: 47.3739, lng: 8.5506, type: 'education', color: '#10B981' },
    { name: 'Zürichsee', lat: 47.3667, lng: 8.5500, type: 'nature', color: '#06B6D4' },
    { name: 'Bahnhofstrasse', lat: 47.3769, lng: 8.5399, type: 'shopping', color: '#F59E0B' }
  ]

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

      // Add base tile layer
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
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle layer selection
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

    // Add new layer (simulate with rectangle for demo)
    const layerBounds = [[47.365, 8.52], [47.385, 8.56]]
    const newLayer = window.L.rectangle(layerBounds, {
      color: '#3B82F6',
      weight: 2,
      fillOpacity: 0.2,
      fillColor: '#3B82F6'
    }).addTo(mapInstanceRef.current)

    const layerName = layers.find(l => l.id === layerId)?.name || layerId
    newLayer.bindPopup(`<strong>DXF Layer</strong><br>${layerName}`)

    setCurrentLayer(newLayer)
    setSelected(layerId)
  }

  // Handle basemap change
  const changeBasemap = (type) => {
    // In a real implementation, this would switch the base layer
    setBasemap(type)
  }

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
            <MapPin className="w-4 h-4" />
            Layer auswählen
          </label>
          <select 
            value={selected} 
            onChange={e => selectLayer(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Basis Layer --</option>
            {layers.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
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
        {!mapInstanceRef.current && (
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
                <span>DXF Layer</span>
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
        </div>
      </div>

      {/* Map Info Panel */}
      {selected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Aktiver Layer: {layers.find(l => l.id === selected)?.name}
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

function App() {
  const [files, setFiles] = useState(mockFiles)
  const [page, setPage] = useState('upload')
  const [token, setToken] = useState('demo-token') // For demo purposes
  const [toast, setToast] = useState(null)
  const [convertingFiles, setConvertingFiles] = useState(new Set())

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const handleLogin = async (username, password) => {
    if (username && password) {
      setToken('demo-token')
      showToast('Erfolgreich angemeldet!', 'success')
    } else {
      showToast('Login fehlgeschlagen', 'error')
    }
  }

  const handleLogout = () => {
    setToken(null)
    showToast('Erfolgreich abgemeldet', 'info')
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const newFile = {
      id: Date.now(),
      name: file.name,
      converted: false,
      uploadDate: new Date().toISOString().split('T')[0],
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB'
    }
    
    setFiles(prev => [...prev, newFile])
    showToast('Datei erfolgreich hochgeladen!', 'success')
    e.target.value = ''
  }

  const handleConvert = async (id) => {
    setConvertingFiles(prev => new Set([...prev, id]))
    showToast('Konvertierung gestartet...', 'info')
    
    // Simulate conversion delay
    setTimeout(() => {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, converted: true } : f
      ))
      setConvertingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      showToast('Konvertierung abgeschlossen!', 'success')
    }, 3000)
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

              <div className="mb-8">
                <FileUploadArea onUpload={handleUpload} />
              </div>

              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">Hochgeladene Dateien</h3>
                </div>
                
                {files.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Noch keine Dateien hochgeladen</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datei</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Größe</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hochgeladen</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {files.map(file => (
                          <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(file)}
                                <span className="text-sm text-gray-600">{getStatusText(file)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-900">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {file.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {file.uploadDate}
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
                                  <a 
                                    href="#" 
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {page === 'map' && (
            <div className="h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Kartenansicht</h2>
                <p className="text-gray-600">Konvertierte Layer auf der Karte anzeigen</p>
              </div>
              <MapComponent />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App