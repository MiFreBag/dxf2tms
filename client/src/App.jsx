import { useState, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Trash2, 
  MapPin,
  Navigation,
  Layers,
  Menu,
  X
} from 'lucide-react'
import Map from './components/Map.jsx' // Import der Map Komponente
import ServiceTaskManager from './components/ServiceTaskManager.jsx';
import ContainerMonitor from './components/ContainerMonitor.jsx';
import GeoposClient from './components/geopos/geopos_client.jsx';
import Login from './components/Login';

const API = '/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [convertingFiles, setConvertingFiles] = useState(new Set())
  const [selectedFiles, setSelectedFiles] = useState([])
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState('upload')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch initial data
  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
    } else {
      fetchFiles();
    }
  }, [token])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API}/files`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const addMessage = (text, type = 'info') => {
    const id = Date.now()
    setMessages(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id))
    }, 5000)
  }

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // Token hinzugefügt
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Upload result:', result); // Verwendung hinzugefügt
        addMessage(`${selectedFiles.length} Datei(en) erfolgreich hochgeladen`, 'success');
        await fetchFiles();
      } else if (response.status === 403) {
        addMessage('Authentifizierungsfehler: Bitte melden Sie sich erneut an.', 'error');
        console.error('Upload error: Forbidden');
        // Token löschen und Benutzer zur Anmeldung auffordern
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      addMessage('Fehler beim Hochladen der Dateien', 'error');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  const handleConvert = async (file) => {
    if (convertingFiles.has(file.id)) return

    setConvertingFiles(prev => new Set([...prev, file.id]))
    
    try {
      const response = await fetch(`${API}/convert/${file.id}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        addMessage(`${file.name} erfolgreich konvertiert`, 'success')
        await fetchFiles()
      } else {
        throw new Error('Conversion failed')
      }
    } catch (error) {
      addMessage(`Fehler bei der Konvertierung von ${file.name}`, 'error')
      console.error('Conversion error:', error)
    } finally {
      setConvertingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  const handleConvertDXFToGeoPDF = async (fileId) => {
    try {
      const response = await fetch(`${API}/convert/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Conversion result:', result);
        addMessage(`Datei erfolgreich konvertiert: ${result.fileName}`, 'success');
        await fetchFiles();
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      addMessage('Fehler bei der Konvertierung der Datei', 'error');
      console.error('Conversion error:', error);
    }
  };

  const handleBatchConvert = async () => {
    const unconvertedFiles = files.filter(f => !f.converted && !convertingFiles.has(f.id))
    
    for (const file of unconvertedFiles) {
      await handleConvert(file)
    }
  }

  const handleDelete = async (fileId) => {
    try {
      const response = await fetch(`${API}/files/${fileId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        addMessage('Datei erfolgreich gelöscht', 'success')
        await fetchFiles()
        setSelectedFiles(prev => prev.filter(id => id !== fileId))
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      addMessage('Fehler beim Löschen der Datei', 'error')
      console.error('Delete error:', error)
    }
  }

  const handlePreview = (file) => {
    if (file.converted && file.previewUrl) {
      window.open(file.previewUrl, '_blank')
    } else {
      addMessage('Keine Vorschau verfügbar', 'warning')
    }
  }

  const handleDownload = (file) => {
    if (file.converted && file.downloadUrl) {
      const link = document.createElement('a')
      link.href = file.downloadUrl
      link.download = file.name.replace(/\.[^/.]+$/, '') + '_converted.tms'
      link.click()
      addMessage('Download gestartet', 'success')
    }
  }

  const handleDownloadGeoPDF = (file) => {
    if (file.converted && file.geopdfPath) {
      const link = document.createElement('a');
      link.href = file.geopdfPath;
      link.download = file.name.replace(/\.[^/.]+$/, '') + '_converted.pdf';
      link.click();
      addMessage('GeoPDF-Download gestartet', 'success');
    } else {
      addMessage('GeoPDF nicht verfügbar', 'error');
    }
  };

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
    return file.converted ? 'Bereit' : 'Warten'
  }

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  // Navigation items
  const navItems = [
    { id: 'upload', label: 'Upload & Convert', icon: Upload },
    { id: 'map', label: 'Kartenansicht', icon: MapPin },
    { id: 'n8n', label: 'n8n Workflow', icon: Layers },
    { id: 'service-task-manager', label: 'Service Task Manager', icon: Layers },
    { id: 'container-monitor', label: 'Container Monitor', icon: Layers },
    { id: 'geopos-client', label: 'Geopos Client', icon: Navigation },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Messages */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-white max-w-sm ${
              msg.type === 'success' ? 'bg-green-500' :
              msg.type === 'error' ? 'bg-red-500' :
              msg.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 
        w-64 bg-white border-r border-gray-200 
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">TMS Converter</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setPage(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      page === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-600">
                {files.length} Dateien • {files.filter(f => f.converted).length} konvertiert
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {page === 'upload' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload & Convert</h2>
                <p className="text-gray-600">Lade deine Dateien hoch und konvertiere sie zu TMS-Layern</p>
              </div>

              {/* Upload area */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Dateien hochladen
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Ziehe Dateien hierher oder klicke zum Auswählen
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                    accept=".tif,.tiff,.geotiff,.dxf" // DXF hinzugefügt
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                      uploading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Dateien auswählen
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* File list */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Dateiliste</h3>
                    {files.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleBatchConvert}
                          disabled={files.filter(f => !f.converted).length === 0}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors"
                        >
                          Alle konvertieren
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {files.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Noch keine Dateien hochgeladen
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={selectedFiles.length === files.filter(f => f.converted).length && files.filter(f => f.converted).length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Datei
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Größe
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aktionen
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {files.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.includes(file.id)}
                                  onChange={() => handleSelectFile(file.id)}
                                  disabled={!file.converted}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {file.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {new Date(file.uploadedAt).toLocaleString('de-DE')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(file)}
                                  <span className="text-sm text-gray-600">
                                    {getStatusText(file)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  {!file.converted && (
                                    <button 
                                      onClick={() => handleConvertDXFToGeoPDF(file.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                    >
                                      <Upload className="w-3 h-3" />
                                      Konvertieren
                                    </button>
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
                                      <button 
                                        onClick={() => handleDownloadGeoPDF(file)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        GeoPDF herunterladen
                                      </button>
                                    </div>
                                  )}
                                  <button 
                                    onClick={() => handleDelete(file.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Löschen
                                  </button>
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
              {/* Verwendung der Map.jsx Komponente */}
              <div className="h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border overflow-hidden">
                <Map />
              </div>
            </div>
          )}

          {page === 'n8n' && (
            <div className="h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">n8n Workflow</h2>
                <p className="text-gray-600">Interaktive Workflows anzeigen</p>
              </div>
              <div className="h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border overflow-hidden">
                <iframe src="/n8n/" className="w-full h-full border-none"></iframe>
              </div>
            </div>
          )}
               {page === 'service-task-manager' && (
            <ServiceTaskManager />
          )}

          {page === 'container-monitor' && (
            <ContainerMonitor />
          )}

          {page === 'geopos-client' && (
            <GeoposClient />
          )}
        </main>
      </div>
    </div>
  )
}

export default App