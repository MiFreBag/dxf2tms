import { useState, useEffect, useRef } from 'react'
import { 
  Upload, FileText, Download, MapPin, LogOut, CheckCircle, Clock, AlertCircle, 
  X, Plus, Layers, Navigation, ZoomIn, ZoomOut, Menu, Home, Map, File,
  Trash2, Eye, RotateCcw, Activity, Wifi, Bell, Settings, Lock
} from 'lucide-react'

const API = '/api'

// Login Component
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Simulate login - replace with actual API call
      if (username === 'admin' && password === 'admin123') {
        // Simulate token generation
        const token = btoa(`${username}:${Date.now()}`)
        onLogin(token)
      } else {
        setError('Ungültige Anmeldedaten')
      }
    } catch (err) {
      setError('Anmeldefehler aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Stadt Zürich DAV</h1>
            <p className="text-gray-600">DXF2GeoPDF Converter</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Benutzername
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-2xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Anmelden...</span>
                </>
              ) : (
                <span>Anmelden</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Demo: admin / admin123
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          © 2025 Stadt Zürich DAV. Alle Rechte vorbehalten.
        </div>
      </div>
    </div>
  )
}

// Enhanced Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const config = {
    success: { bg: 'bg-emerald-500', icon: CheckCircle },
    error: { bg: 'bg-red-500', icon: AlertCircle },
    info: { bg: 'bg-blue-500', icon: Bell }
  }

  const { bg, icon: Icon } = config[type] || config.info

  return (
    <div className={`fixed top-6 right-6 ${bg} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-500 ease-out backdrop-blur-sm border border-white/20`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose} 
        className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Enhanced File Upload Component
function FileUpload({ onFileUpload, uploading }) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const dxfFiles = files.filter(file => file.name.toLowerCase().endsWith('.dxf'))
    if (dxfFiles.length > 0) {
      onFileUpload(dxfFiles[0])
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.dxf')) {
      onFileUpload(file)
    }
  }

  return (
    <div className="relative">
      <div
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer group ${
          dragOver 
            ? 'border-cyan-400 bg-cyan-50/50 scale-105' 
            : 'border-gray-300 hover:border-cyan-400 hover:bg-gray-50/50'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className={`relative z-10 ${uploading ? 'animate-pulse' : ''}`}>
          {uploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Datei wird hochgeladen...</h3>
                <p className="text-gray-500">Bitte warten Sie einen Moment</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">DXF-Datei hochladen</h3>
                <p className="text-gray-600 mb-4">
                  Ziehen Sie Ihre DXF-Datei hierher oder klicken Sie zum Auswählen
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                  <File className="w-4 h-4" />
                  <span>Unterstützt: .dxf Dateien</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

// Enhanced Sidebar Component
function Sidebar({ page, setPage, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  
  const menuItems = [
    { id: 'upload', label: 'Dateien', icon: Home },
    { id: 'map', label: 'Karte', icon: Map },
  ]

  return (
    <div className={`${collapsed ? 'w-20' : 'w-72'} bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-all duration-300 relative`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Stadt Zürich DAV
              </h1>
              <p className="text-sm text-gray-500 mt-1">DXF2GeoPDF Converter</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = page === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                  : 'text-gray-700 hover:bg-gray-100/80'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
              {!collapsed && (
                <span className={`font-medium ${isActive ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Abmelden</span>}
        </button>
      </div>
    </div>
  )
}

// Enhanced File List Component
function FileList({ files, onConvert, onDownload, onPreview, onDelete, convertingFiles }) {
  const getStatusBadge = (file) => {
    if (convertingFiles.has(file.id)) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm rounded-full">
          <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium">Konvertiert...</span>
        </div>
      )
    }
    
    if (file.converted) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm rounded-full">
          <CheckCircle className="w-3 h-3" />
          <span className="font-medium">Fertig</span>
        </div>
      )
    }
    
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full">
        <Clock className="w-3 h-3" />
        <span className="font-medium">Bereit</span>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-800">Hochgeladene Dateien</h3>
        <p className="text-sm text-gray-500 mt-1">{files.length} Datei(en) verfügbar</p>
      </div>
      
      <div className="divide-y divide-gray-200/50">
        {files.map(file => (
          <div key={file.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{file.filename}</h4>
                  <p className="text-sm text-gray-500">
                    Hochgeladen: {new Date(file.uploadedAt).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(file)}
                
                <div className="flex gap-2">
                  {!file.converted && !convertingFiles.has(file.id) && (
                    <button
                      onClick={() => onConvert(file.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Konvertieren</span>
                    </button>
                  )}
                  
                  {file.converted && (
                    <>
                      <button
                        onClick={() => onPreview(file)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Vorschau</span>
                      </button>
                      <button
                        onClick={() => onDownload(file)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => onDelete(file.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {files.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Dateien vorhanden</h3>
            <p className="text-gray-400">Laden Sie Ihre erste DXF-Datei hoch, um zu beginnen</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Map Component
function MapComponent({ token }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [layers, setLayers] = useState([])
  const [selected, setSelected] = useState('')
  const [basemap, setBasemap] = useState('topo')
  const [coordinates, setCoordinates] = useState('47.3769, 8.5417')
  const [showPOIs, setShowPOIs] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch TMS layers
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
      } finally {
        setLoading(false)
      }
    }
    fetchLayers()
  }, [])

  // Initialize map (simplified for demo)
  useEffect(() => {
    if (!mapRef.current) return
    
    // Simulate map loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full flex gap-6">
      {/* Map Controls */}
      <div className="w-80 space-y-6">
        {/* Layer Selection */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            TMS Layer
          </h3>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
          >
            <option value="">Layer auswählen...</option>
            {layers.map(layer => (
              <option key={layer.name} value={layer.name}>{layer.name}</option>
            ))}
          </select>
        </div>

        {/* Basemap Selection */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Map className="w-5 h-5" />
            Basiskarte
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {['topo', 'satellite', 'street'].map(type => (
              <button
                key={type}
                onClick={() => setBasemap(type)}
                className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  basemap === type
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'topo' ? 'Topografisch' : type === 'satellite' ? 'Satellit' : 'Straße'}
              </button>
            ))}
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Koordinaten
          </h3>
          <div className="font-mono text-sm bg-gray-50 px-4 py-3 rounded-2xl border">
            {coordinates}
          </div>
        </div>

        {/* POI Toggle */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-6">
          <button
            onClick={() => setShowPOIs(!showPOIs)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${
              showPOIs
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapPin className="w-5 h-5" />
            POIs {showPOIs ? 'ausblenden' : 'anzeigen'}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden relative">
        <div ref={mapRef} className="w-full h-full bg-gradient-to-br from-blue-50 to-cyan-50">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Karte wird geladen...</h3>
                <p className="text-gray-500">Initialisiere Kartenansicht</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Map className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Kartenansicht bereit</h3>
                <p className="text-gray-500">Wählen Sie einen Layer aus, um zu beginnen</p>
              </div>
            </div>
          )}
        </div>

        {/* Map Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors">
            <ZoomIn className="w-5 h-5 text-gray-600" />
          </button>
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-colors">
            <ZoomOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 font-medium">Verbunden</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main App Component
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [page, setPage] = useState('upload')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [convertingFiles, setConvertingFiles] = useState(new Set())
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const handleLogin = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
    setFiles([])
    setPage('upload')
  }

  const fetchFiles = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
      showToast('Fehler beim Laden der Dateien', 'error')
    }
  }

  const handleFileUpload = async (file) => {
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      
      if (response.ok) {
        showToast('Datei erfolgreich hochgeladen', 'success')
        fetchFiles()
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      showToast('Fehler beim Hochladen der Datei', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleConvert = async (fileId) => {
    setConvertingFiles(prev => new Set([...prev, fileId]))
    
    try {
      const response = await fetch(`${API}/convert/${fileId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        showToast('Konvertierung erfolgreich abgeschlossen', 'success')
        fetchFiles()
      } else {
        throw new Error('Conversion failed')
      }
    } catch (error) {
      console.error('Conversion error:', error)
      showToast('Fehler bei der Konvertierung', 'error')
    } finally {
      setConvertingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  const handleDownload = async (file) => {
    try {
      const response = await fetch(`${API}/download/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${file.filename.replace('.dxf', '')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast('Download gestartet', 'success')
      }
    } catch (error) {
      console.error('Download error:', error)
      showToast('Fehler beim Download', 'error')
    }
  }

  const handlePreview = (file) => {
    showToast('Vorschau wird geöffnet...', 'info')
    setPage('map')
  }

  const handleDelete = async (fileId) => {
    if (!confirm('Möchten Sie diese Datei wirklich löschen?')) return
    
    try {
      const response = await fetch(`${API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
        showToast('Datei erfolgreich gelöscht', 'success')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      showToast('Fehler beim Löschen der Datei', 'error')
    }
  }

  // Generate demo files
  useEffect(() => {
    if (token && files.length === 0) {
      // Simulate some demo files
      const demoFiles = [
        {
          id: '1',
          filename: 'Gebäudeplan_A1.dxf',
          uploadedAt: new Date(Date.now() - 86400000).toISOString(),
          converted: true
        },
        {
          id: '2',
          filename: 'Leitungsplan_2024.dxf',
          uploadedAt: new Date(Date.now() - 3600000).toISOString(),
          converted: false
        }
      ]
      setFiles(demoFiles)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchFiles()
    }
  }, [token])

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(14,165,233,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 flex h-screen">
        <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-8 h-full">
            {page === 'upload' && (
              <div className="space-y-8 h-full">
                {/* Header */}
                <div className="text-center">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                    DXF zu GeoPDF Konverter
                  </h1>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Laden Sie Ihre DXF-Dateien hoch und konvertieren Sie sie zu hochwertigen GeoPDF-Dokumenten
                  </p>
                </div>

                {/* Upload Section */}
                <div className="max-w-4xl mx-auto">
                  <FileUpload onFileUpload={handleFileUpload} uploading={uploading} />
                </div>

                {/* Files List */}
                <div className="max-w-6xl mx-auto">
                  <FileList 
                    files={files}
                    onConvert={handleConvert}
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    onDelete={handleDelete}
                    convertingFiles={convertingFiles}
                  />
                </div>
              </div>
            )}
            
            {page === 'map' && (
              <div className="h-full">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Kartenansicht</h1>
                  <p className="text-gray-600">Visualisieren Sie Ihre konvertierten TMS-Layer auf der interaktiven Karte</p>
                </div>
                <div className="h-[calc(100%-120px)]">
                  <MapComponent token={token} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}