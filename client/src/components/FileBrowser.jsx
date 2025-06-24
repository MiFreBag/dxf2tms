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
  Upload, // Added import
  FileText,
  Layers, // Added import
  Image,
  Archive,
  AlertCircle,
  FolderX // Icon for empty folder state
} from 'lucide-react'

const API = '/api'

function FileBrowser({ token, onMessage }) {
  const [fileTree, setFileTree] = useState({})
  const [loading, setLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Basis-Verzeichnisse
  const basePaths = [
    { name: 'uploads', path: '/uploads', icon: <Upload className="w-4 h-4" /> },
    { name: 'output', path: '/output', icon: <Download className="w-4 h-4" /> },
    { name: 'tms', path: '/api/tms', icon: <Layers className="w-4 h-4" /> }
    // { name: 'files', path: '/files', icon: <HardDrive className="w-4 h-4" /> } // entfernt, da Backend nicht genutzt
  ]

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
        // files: { ... } entfernt, da Backend nicht genutzt
      }
      
      setFileTree(mockFileTree)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

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
    // Sucht nach UUID im Pfad, z.B. uploads/uuid.dxf
    const match = path.match(/[0-9a-fA-F-]{36}/);
    return match ? match[0] : path;
  };

  // Löschen ausführen
  const handleDelete = async () => {
    if (!deleteConfirm) return
    let deletedCount = 0;
    try {
      for (const fullPath of deleteConfirm) {
        let targetId;
        let endpoint;

        // Check if it's a TMS layer (folder under 'tms/')
        if (fullPath.startsWith('tms/')) {
          // Extract the TMS layer ID (the folder name after 'tms/')
          const parts = fullPath.split('/');
          if (parts.length < 2) { // e.g., just 'tms/'
            onMessage?.(`Ungültiger TMS-Pfad: ${fullPath}`, 'warning');
            continue;
          }
          targetId = parts[1]; // The ID of the TMS layer (e.g., 'layer1' or a UUID)
          endpoint = `${API}/tms/${targetId}`;
        } else {
          // Assume it's a file managed by the /api/files endpoint
          // Extract UUID from the path (e.g., 'uploads/uuid.dxf' -> 'uuid')
          targetId = extractUuid(fullPath);
          if (!targetId || targetId === fullPath) {
            onMessage?.(`Kann '${fullPath}' nicht löschen (kein gültiger ID gefunden)`, 'warning');
            continue;
          }
          endpoint = `${API}/files/${targetId}`;
        }

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Fehler beim Löschen von ${fullPath}: ${errorData.detail || response.statusText}`);
        }
        deletedCount++;
      }
      if (deletedCount > 0) {
        onMessage?.(`${deletedCount} Element(e) gelöscht`, 'success');
      }
      setSelectedItems(new Set());
      setDeleteConfirm(null);
      await loadFiles(); // Neu laden
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      onMessage?.('Fehler beim Löschen', 'error');
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
          
          {/* Größe/Details */}
          {!isFolder && node.size && (
            <span className="text-xs text-gray-500">{formatSize(node.size)}</span>
          )}
          {isFolder && hasChildren && (
            <span className="text-xs text-gray-500">
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {/* Header/Controls */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Datei-Browser</h2>
          <div className="flex gap-2">
            {/* Optional: Upload Button hier, falls Upload im Browser gewünscht ist */}
            {/* <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Hochladen
            </button> */}
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