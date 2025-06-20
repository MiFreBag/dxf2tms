import { useState, useEffect, useCallback } from 'react'
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
  const [progress, setProgress] = useState({});
  const [dockerServicesData, setDockerServicesData] = useState([]);

  // Neue States für Konvertierungsparameter und Dialog
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertParams, setConvertParams] = useState({ file: null, pageSize: 'A4', dpi: 300 });
  const [previewBlobs, setPreviewBlobs] = useState([]); // {fileId, fileName, url}
  const [showBlobstore, setShowBlobstore] = useState(false);

  // State für TMS-Dialog
  const [showTmsDialog, setShowTmsDialog] = useState(false);
  const [tmsParams, setTmsParams] = useState({ file: null, maxzoom: 6 });

  // addMessage muss VOR allen useCallback-Hooks stehen, die es als Abhängigkeit nutzen!
  const addMessage = useCallback((text, type = 'info') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 5000);
  }, []);

  // Handler für TMS-Dialog öffnen
  const handleOpenTmsDialog = (file) => {
    setTmsParams({ file, maxzoom: 6 });
    setShowTmsDialog(true);
  };

  // Handler für TMS-Erstellung
  const handleCreateTms = async (file, maxzoom = 6) => {
    setShowTmsDialog(false);
    try {
      const response = await fetch(`${API}/tms/${file.id}?maxzoom=${maxzoom}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        addMessage(`TMS für ${file.name} erfolgreich erzeugt`, 'success');
      } else {
        const err = await response.json();
        addMessage(`TMS-Fehler: ${err.detail || 'Unbekannter Fehler'}`, 'error');
      }
    } catch (error) {
      addMessage('Fehler bei der TMS-Erstellung', 'error');
      console.error('TMS-Fehler:', error);
    }
  };

  // Fetch initial data
  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`${API}/files`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      } else if (response.status === 403) {
        console.error('Token abgelaufen');
        handleTokenExpiration();
      } else {
        throw new Error('Fehler beim Abrufen der Dateien');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Dateien:', error);
    }
  }, [token]);

  const fetchDockerServices = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/containers`, { // Endpoint from ServiceTaskManager
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Assuming the backend response has a 'containers' key like in ServiceTaskManager's axios call
        // or it's directly an array.
        setDockerServicesData(data.containers || data || []);
      } else if (response.status === 403) {
        console.error('Token abgelaufen beim Laden der Container-Daten');
        handleTokenExpiration();
      } else {
        addMessage(`Fehler beim Abrufen der Container-Daten: ${response.status}`, 'error');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Container-Daten:', error);
      addMessage('Netzwerkfehler beim Abrufen der Container-Daten.', 'error');
    }
  }, [token, addMessage]);

  useEffect(() => {
    if (!token) {
        setPage('login');
    } else {
        fetchFiles();
        fetchDockerServices();
    }
  }, [token, fetchFiles, fetchDockerServices]);

  const handleTokenExpiration = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPage('login');
};

  const handleUpload = async (event) => {
    try {
        setUploading(true);
        const files = event.target.files;
        const formData = new FormData();

        for (const file of files) {
            formData.append('file', file);
            console.debug(`Hochzuladende Datei: ${file.name}, Größe: ${file.size} Bytes`);
        }

        const response = await fetch(`${API}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            console.info('Upload erfolgreich:', result);
            addMessage(`${files.length} Datei(en) erfolgreich hochgeladen`, 'success');
            await fetchFiles();
        } else if (response.status === 422) {
            console.error('Upload-Fehler: Unprocessable Entity');
            addMessage('Fehlerhafte Daten: Bitte überprüfen Sie die hochgeladenen Dateien.', 'error');
        } else if (response.status === 403) {
            console.error('Upload-Fehler: Forbidden');
            addMessage('Authentifizierungsfehler: Bitte melden Sie sich erneut an.', 'error');
            localStorage.removeItem('token');
            window.location.href = '/login';
        } else {
            throw new Error('Upload fehlgeschlagen');
        }
    } catch (error) {
        console.error('Fehler beim Hochladen der Dateien:', error);
        addMessage('Fehler beim Hochladen der Dateien', 'error');
    } finally {
        setUploading(false);
        event.target.value = '';
    }
};

  const openConvertDialog = (file) => {
    setConvertParams({ file, pageSize: 'A4', dpi: 300 });
    setShowConvertDialog(true);
  };

  const handleConvert = async (file, pageSize = 'A4', dpi = 300) => {
    if (convertingFiles.has(file.id)) return

    setConvertingFiles(prev => new Set([...prev, file.id]))
    setShowConvertDialog(false)
    
    try {
      const params = new URLSearchParams({ page_size: pageSize, dpi: dpi });
      const response = await fetch(`${API}/convert/${file.id}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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

  const handlePreview = async (file) => {
    console.info('Vorschau-Klick:', file);
    if (file.converted) {
      try {
        const response = await fetch(`/api/download/${file.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          addMessage('Vorschau fehlgeschlagen: ' + response.status, 'error');
          return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Statt direkt öffnen: Im State speichern
        setPreviewBlobs(prev => [
          ...prev.filter(b => b.fileId !== file.id), // Duplikate vermeiden
          { fileId: file.id, fileName: file.name, url }
        ]);
        addMessage('Vorschau erzeugt', 'success');
      } catch (error) {
        addMessage('Vorschau-Fehler: ' + error, 'error');
        console.error('Vorschau-Fehler:', error);
      }
    } else {
      addMessage('Keine Vorschau verfügbar', 'warning');
      console.warn('Vorschau nicht verfügbar:', file);
    }
  }

  const removePreviewBlob = (fileId) => {
    setPreviewBlobs(prev => {
      const toRemove = prev.find(b => b.fileId === fileId);
      if (toRemove) {
        window.URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter(b => b.fileId !== fileId);
    });
  };

  const handleDownload = async (file) => {
    console.info('Download-Klick:', file);
    if (file.converted) {
      setProgress(prev => ({ ...prev, [file.id]: 'downloading' }));
      try {
        const response = await fetch(`/api/download/${file.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          addMessage('Download fehlgeschlagen: ' + response.status, 'error');
          setProgress(prev => ({ ...prev, [file.id]: 'error' }));
          return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name.replace(/\.[^/.]+$/, '') + '_converted.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setProgress(prev => ({ ...prev, [file.id]: 'done' }));
        addMessage('Download gestartet', 'success');
      } catch (error) {
        addMessage('Download-Fehler: ' + error, 'error');
        setProgress(prev => ({ ...prev, [file.id]: 'error' }));
        console.error('Download-Fehler:', error);
      }
    } else {
      addMessage('Download nicht verfügbar', 'error');
      console.warn('Download nicht verfügbar:', file);
    }
  }

  // Fortschrittsanzeige im UI
  const renderProgress = (file) => {
    if (progress[file.id] === 'downloading') {
      return <span className="text-blue-500 animate-pulse ml-2">Download läuft...</span>;
    }
    if (progress[file.id] === 'done') {
      return <span className="text-green-600 ml-2">Fertig!</span>;
    }
    return null;
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

  const handleLogout = () => {
    console.info('Benutzer wird ausgeloggt');
    localStorage.removeItem('token');
    setToken(null);
    setPage('login');
    addMessage('Erfolgreich ausgeloggt', 'success');
};

  if (page === 'login') {
    return <Login onLogin={(newToken) => {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setPage('upload');
    }} />;
  }

  // Navigation items
  const navItems = [
    { id: 'upload', label: 'Upload & Convert', icon: Upload },
    { id: 'map', label: 'Kartenansicht', icon: MapPin }, // MapPin statt Map
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
              const Icon = item.icon;
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
                    {typeof Icon === 'function' ? <Icon className="w-5 h-5" /> : null}
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
              {/* Blobstore-Button mit Badge */}
              <button
                onClick={() => setShowBlobstore(true)}
                className="relative px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center gap-2 text-blue-700 font-medium"
                title="PDF-Vorschauen anzeigen"
              >
                <FileText className="w-5 h-5" />
                Blobs
                {previewBlobs.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {previewBlobs.length}
                  </span>
                )}
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
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
                                      onClick={() => openConvertDialog(file)}
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
                                        {renderProgress(file)}
                                      </button>
                                      <button 
                                        onClick={() => handleDownload(file)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download
                                        {renderProgress(file)}
                                      </button>
                                      <button
                                        onClick={() => handleOpenTmsDialog(file)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
                                      >
                                        <Layers className="w-3 h-3" />
                                        TMS erzeugen
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

              {/* PDF-Vorschauen (Blobs) */}
              {previewBlobs.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border mt-6 p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">PDF-Vorschauen (Blobs)</h3>
                  <ul className="space-y-2">
                    {previewBlobs.map(blob => (
                      <li key={blob.fileId} className="flex items-center gap-3">
                        <span className="flex-1 truncate">{blob.fileName}</span>
                        <a
                          href={blob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          Vorschau öffnen
                        </a>
                        <button
                          onClick={() => removePreviewBlob(blob.fileId)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            // ServiceTaskManager müsste aktualisiert werden, um dieses 'services'-Prop zu verwenden
            <ServiceTaskManager services={dockerServicesData} />
          )}

          {page === 'container-monitor' && (
            <ContainerMonitor services={dockerServicesData} />
          )}

          {page === 'geopos-client' && (
            <GeoposClient />
          )}

        {/* Blobstore-Modal */}
        {showBlobstore && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Blobstore: PDF-Vorschauen</h2>
                <button onClick={() => setShowBlobstore(false)} className="p-1 text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {previewBlobs.length === 0 ? (
                <div className="text-gray-500">Keine Blobs vorhanden.</div>
              ) : (
                <ul className="space-y-3">
                  {previewBlobs.map(blob => (
                    <li key={blob.fileId} className="flex items-center gap-3 border-b pb-2">
                      <span className="flex-1 truncate">{blob.fileName}</span>
                      <a
                        href={blob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                      >
                        Vorschau öffnen
                      </a>
                      <button
                        onClick={() => removePreviewBlob(blob.fileId)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                      >
                        Entfernen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Dialog für Konvertierungsparameter */}
        {showConvertDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-80">
              <h2 className="text-lg font-bold mb-4">Konvertierungsoptionen</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium">Seitengröße</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={convertParams.pageSize}
                  onChange={e => setConvertParams(p => ({ ...p, pageSize: e.target.value }))}
                >
                  <option value="A0">A0</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium">DPI</label>
                <input
                  type="number"
                  min="72"
                  max="1200"
                  className="w-full border rounded px-2 py-1"
                  value={convertParams.dpi}
                  onChange={e => setConvertParams(p => ({ ...p, dpi: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowConvertDialog(false)}>Abbrechen</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => handleConvert(convertParams.file, convertParams.pageSize, convertParams.dpi)}>Konvertieren</button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog für TMS-Optionen */}
        {showTmsDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-80">
              <h2 className="text-lg font-bold mb-4">TMS-Optionen</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium">Maximale Zoomstufe</label>
                <input
                  type="number"
                  min="0"
                  max="22"
                  className="w-full border rounded px-2 py-1"
                  value={tmsParams.maxzoom}
                  onChange={e => setTmsParams(p => ({ ...p, maxzoom: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowTmsDialog(false)}>Abbrechen</button>
                <button className="px-3 py-1 bg-yellow-600 text-white rounded" onClick={() => handleCreateTms(tmsParams.file, tmsParams.maxzoom)}>TMS erzeugen</button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

export default App