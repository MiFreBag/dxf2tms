import { useState, useEffect } from 'react'
import { 
  Folder, 
  File, 
  FolderOpen, 
  Trash2, 
  RefreshCw,
  Download,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Upload, 
  FileText,
  Layers, 
  Image,
  Archive,
  AlertCircle,
  FolderX,
  Eye,
  ExternalLink,
  X
} from 'lucide-react'

const API = '/api'

// Preview Modal Component
function PreviewModal({ file, fileUrl, onClose, onDownload }) {
  if (!file) return null

  const isImage = ['tif', 'tiff', 'png', 'jpg', 'jpeg'].includes(
    file.name?.split('.').pop()?.toLowerCase() || ''
  )
  
  const isPdf = file.name?.toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900">{file.name}</h3>
              <p className="text-sm text-gray-500">
                Größe: {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Unbekannt'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-[60vh] border rounded"
              title={`Preview of ${file.name}`}
            />
          ) : isImage && fileUrl ? (
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={file.name}
                className="max-w-full max-h-[60vh] object-contain rounded shadow"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-medium mb-2">Vorschau nicht verfügbar</h4>
              <p className="text-sm text-center">
                Für diesen Dateityp ist keine Vorschau verfügbar.<br />
                Sie können die Datei herunterladen, um sie zu öffnen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Download Progress Component
function DownloadProgress({ fileName, progress, onCancel }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm w-full z-40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">Download läuft...</span>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="text-xs text-gray-600 mb-2 truncate">{fileName}</div>
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

function FileBrowser({ token, onMessage }) {
  const [fileTree, setFileTree] = useState({})
  const [loading, setLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Preview and Download states
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null, url: null })
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [fileBlobs, setFileBlobs] = useState(new Map()) // Cache for file URLs

  // Datei-Icon basierend auf Extension
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase()
    switch (ext) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />
      case 'dxf':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'tif':
      case 'tiff':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <Image className="w-4 h-4 text-green-500" />
      case 'zip':
      case 'tar':
      case 'gz':
        return <Archive className="w-4 h-4 text-purple-500" />
      default:
        return <File className="w-4 h-4 text-gray-500" />
    }
  }

  // Dateien laden
  const loadFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API}/filebrowser/tree`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFileTree(data.tree || {})
        onMessage?.('Dateien geladen', 'success')
      } else {
        throw new Error('Fehler beim Laden der Dateien')
      }
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error)
      onMessage?.('Fehler beim Laden der Dateien', 'error')
      
      // Fallback auf Mock-Daten wenn API nicht verfügbar
      const mockFileTree = {
        uploads: {
          type: 'folder',
          children: {
            'file1.dxf': { type: 'file', size: 1024000, modified: '2024-01-15' },
            'file2.tif': { type: 'file', size: 2048000, modified: '2024-01-16' },
            'converted': {
              type: 'folder',
              children: {
                'file1_converted.pdf': { type: 'file', size: 512000, modified: '2024-01-15' }
              }
            }
          }
        },
        output: {
          type: 'folder',
          children: {
            'output1.pdf': { type: 'file', size: 768000, modified: '2024-01-17' },
            'output2.pdf': { type: 'file', size: 1024000, modified: '2024-01-18' }
          }
        },
        tms: {
          type: 'folder',
          children: {
            'layer1': {
              type: 'folder',
              children: {
                '0': { type: 'folder', children: {} },
                '1': { type: 'folder', children: {} },
                'tilemapresource.xml': { type: 'file', size: 1024, modified: '2024-01-19' }
              }
            }
          }
        }
      }
      
      setFileTree(mockFileTree)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  // File Preview Handler
  const handlePreview = async (filePath, fileName, fileNode) => {
    try {
      // Check if we already have the blob cached
      if (fileBlobs.has(filePath)) {
        setPreviewModal({
          isOpen: true,
          file: { name: fileName, size: fileNode.size, path: filePath },
          url: fileBlobs.get(filePath)
        })
        return
      }

      onMessage?.('Lade Vorschau...', 'info')
      
      // Try to fetch file content for preview
      let fileUrl = null
      
      // For files in output or converted folders (PDFs), try direct download endpoint
      if (filePath.includes('output/') || filePath.includes('converted/') || fileName.endsWith('.pdf')) {
        // Extract UUID or use filename-based approach
        const uuid = extractUuid(filePath)
        if (uuid && uuid !== filePath) {
          try {
            const response = await fetch(`${API}/download/${uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            
            if (response.ok) {
              const blob = await response.blob()
              fileUrl = window.URL.createObjectURL(blob)
              setFileBlobs(prev => new Map(prev).set(filePath, fileUrl))
            }
          } catch (error) {
            console.log('Direct download failed, trying file browser endpoint')
          }
        }
      }
      
      // Fallback: Try file browser endpoint
      if (!fileUrl) {
        try {
          const response = await fetch(`${API}/filebrowser/download?path=${encodeURIComponent(filePath)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          if (response.ok) {
            const blob = await response.blob()
            fileUrl = window.URL.createObjectURL(blob)
            setFileBlobs(prev => new Map(prev).set(filePath, fileUrl))
          }
        } catch (error) {
          console.log('File browser download failed')
        }
      }
      
      setPreviewModal({
        isOpen: true,
        file: { name: fileName, size: fileNode.size, path: filePath },
        url: fileUrl
      })
      
      if (fileUrl) {
        onMessage?.('Vorschau geladen', 'success')
      } else {
        onMessage?.('Vorschau nicht verfügbar', 'warning')
      }
      
    } catch (error) {
      console.error('Preview error:', error)
      onMessage?.('Fehler beim Laden der Vorschau', 'error')
    }
  }

  // File Download Handler
  const handleDownload = async (filePath, fileName, fileNode) => {
    try {
      setDownloadProgress({ fileName, progress: 0 })
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (!prev) return null
          const newProgress = Math.min(prev.progress + 20, 90)
          return { ...prev, progress: newProgress }
        })
      }, 200)

      let downloadSuccess = false
      
      // Try direct download endpoint first (for converted files)
      if (filePath.includes('output/') || filePath.includes('converted/') || fileName.endsWith('.pdf')) {
        const uuid = extractUuid(filePath)
        if (uuid && uuid !== filePath) {
          try {
            const response = await fetch(`${API}/download/${uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            
            if (response.ok) {
              const blob = await response.blob()
              downloadFile(blob, fileName)
              downloadSuccess = true
            }
          } catch (error) {
            console.log('Direct download failed, trying file browser endpoint')
          }
        }
      }
      
      // Fallback: Use file browser endpoint
      if (!downloadSuccess) {
        const response = await fetch(`${API}/filebrowser/download?path=${encodeURIComponent(filePath)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const blob = await response.blob()
          downloadFile(blob, fileName)
          downloadSuccess = true
        } else {
          throw new Error(`Download failed: ${response.status}`)
        }
      }
      
      clearInterval(progressInterval)
      setDownloadProgress(prev => prev ? { ...prev, progress: 100 } : null)
      
      setTimeout(() => {
        setDownloadProgress(null)
        if (downloadSuccess) {
          onMessage?.('Download abgeschlossen', 'success')
        }
      }, 1000)
      
    } catch (error) {
      console.error('Download error:', error)
      setDownloadProgress(null)
      onMessage?.('Fehler beim Download', 'error')
    }
  }

  // Helper function to download blob as file
  const downloadFile = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Ordner auf-/zuklappen
  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  // Element auswählen
  const toggleSelect = (path) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedItems(newSelected)
  }

  // Löschen bestätigen
  const confirmDelete = () => {
    if (selectedItems.size === 0) {
      onMessage?.('Keine Elemente ausgewählt', 'warning')
      return
    }
    setDeleteConfirm(Array.from(selectedItems))
  }

  // Hilfsfunktion: Extrahiere UUID aus Pfad
  const extractUuid = (path) => {
    const match = path.match(/[0-9a-fA-F-]{36}/)
    return match ? match[0] : path
  }

  // Löschen ausführen
  const handleDelete = async () => {
    if (!deleteConfirm) return
    let deletedCount = 0
    try {
      for (const fullPath of deleteConfirm) {
        let targetId
        let endpoint

        if (fullPath.startsWith('tms/')) {
          const parts = fullPath.split('/')
          if (parts.length < 2) {
            onMessage?.(`Ungültiger TMS-Pfad: ${fullPath}`, 'warning')
            continue
          }
          targetId = parts[1]
          endpoint = `${API}/tms/${targetId}`
        } else {
          targetId = extractUuid(fullPath)
          if (!targetId || targetId === fullPath) {
            onMessage?.(`Kann '${fullPath}' nicht löschen (kein gültiger ID gefunden)`, 'warning')
            continue
          }
          endpoint = `${API}/files/${targetId}`
        }

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Fehler beim Löschen von ${fullPath}: ${errorData.detail || response.statusText}`)
        }
        deletedCount++
      }
      if (deletedCount > 0) {
        onMessage?.(`${deletedCount} Element(e) gelöscht`, 'success')
      }
      setSelectedItems(new Set())
      setDeleteConfirm(null)
      await loadFiles()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      onMessage?.('Fehler beim Löschen', 'error')
    }
  }

  // Dateigröße formatieren
  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  // Rekursive Komponente für Dateibaum
  const FileTreeNode = ({ name, node, path, level = 0 }) => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedFolders.has(path)
    const isSelected = selectedItems.has(path)
    const hasChildren = isFolder && node.children && Object.keys(node.children).length > 0

    return (
      <div>
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer ${
            isSelected ? 'bg-blue-100' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* Expand/Collapse für Ordner */}
          {isFolder && (
            <button
              onClick={() => toggleFolder(path)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? 
                <ChevronDown className="w-3 h-3" /> : 
                <ChevronRight className="w-3 h-3" />
              }
            </button>
          )}
          {!isFolder && <div className="w-4" />}
          
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(path)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          
          {/* Icon */}
          {isFolder ? (
            isExpanded ? 
              <FolderOpen className="w-4 h-4 text-yellow-600" /> : 
              <Folder className="w-4 h-4 text-yellow-600" />
          ) : (
            getFileIcon(name)
          )}
          
          {/* Name */}
          <span className="flex-1 text-sm">{name}</span>
          
          {/* Action buttons for files */}
          {!isFolder && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePreview(path, name, node)
                }}
                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                title="Vorschau"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(path, name, node)
                }}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {/* Größe/Details */}
          {!isFolder && node.size && (
            <span className="text-xs text-gray-500 ml-2">{formatSize(node.size)}</span>
          )}
          {isFolder && hasChildren && (
            <span className="text-xs text-gray-500 ml-2">
              {Object.keys(node.children).length} Elemente
            </span>
          )}
        </div>
        
        {/* Kinder anzeigen wenn aufgeklappt */}
        {isFolder && isExpanded && node.children && (
          <div>
            {Object.entries(node.children).map(([childName, childNode]) => (
              <FileTreeNode
                key={`${path}/${childName}`}
                name={childName}
                node={childNode}
                path={`${path}/${childName}`}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      fileBlobs.forEach(url => window.URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header/Controls */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Datei-Browser</h2>
          <div className="flex gap-2">
            <button
              onClick={loadFiles}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            <button
              onClick={confirmDelete}
              disabled={selectedItems.size === 0}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Löschen ({selectedItems.size})
            </button>
          </div>
        </div>
        
        {/* Ausgewählte Elemente */}
        {selectedItems.size > 0 && (
          <div className="text-sm text-gray-600">
            {selectedItems.size} Element(e) ausgewählt
          </div>
        )}
      </div>

      {/* Dateibaum */}
      <div className="flex-1 overflow-auto bg-white p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-4" />
            <div className="text-gray-500">Lade Dateien...</div>
          </div>
        ) : Object.keys(fileTree).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <FolderX className="w-12 h-12 text-gray-400 mb-4" />
            Keine Verzeichnisse oder Dateien gefunden.
          </div>
        ) : (
          <div className="space-y-1">
            {Object.entries(fileTree).map(([name, node]) => (
              <FileTreeNode
                key={name}
                name={name}
                node={node}
                path={name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <PreviewModal
          file={previewModal.file}
          fileUrl={previewModal.url}
          onClose={() => setPreviewModal({ isOpen: false, file: null, url: null })}
          onDownload={() => {
            if (previewModal.file) {
              handleDownload(previewModal.file.path, previewModal.file.name, previewModal.file)
            }
          }}
        />
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <DownloadProgress
          fileName={downloadProgress.fileName}
          progress={downloadProgress.progress}
          onCancel={() => setDownloadProgress(null)}
        />
      )}

      {/* Lösch-Bestätigung */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-bold">Löschen bestätigen</h3>
            </div>
            <p className="mb-4">
              Möchten Sie wirklich {deleteConfirm.length} Element(e) löschen?
            </p>
            <div className="max-h-32 overflow-auto mb-4 text-sm text-gray-600">
              {deleteConfirm.map(path => (
                <div key={path}>{path}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileBrowser