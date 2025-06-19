import { useState, useEffect, useRef } from 'react'
import { 
  Upload, FileText, Download, MapPin, LogOut, CheckCircle, Clock, AlertCircle, 
  X, Plus, Layers, Navigation, ZoomIn, ZoomOut, Menu, Home, Map, File,
  Trash2, Eye, RotateCcw, Activity, Wifi, Bell, Settings, Lock
} from 'lucide-react'

const API = '' // Remove '/api' prefix for compatibility with backend

// ... alle Komponenten (Login, Toast, FileUpload, Sidebar) bleiben unverändert ...

// File List Component – angepasst: filename → name, uploadedAt → uploaded_at
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
                  <h4 className="font-medium text-gray-900">{file.name}</h4>
                  <p className="text-sm text-gray-500">
                    Hochgeladen: {new Date(file.uploaded_at).toLocaleString('de-DE')}
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

// ... MapComponent bleibt unverändert ...

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
        a.download = `${file.name.replace('.dxf', '')}.pdf`
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