import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Download, Trash2, File, Folder, Search, 
  Grid, List, Plus, Settings, User, Bell, 
  CheckCircle, Clock, AlertCircle, X, Eye,
  Share2, Copy, MoreVertical, Filter
} from 'lucide-react';

// Mock API Service
const API_BASE = '/api';

const apiService = {
  async uploadFile(file, onProgress) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            id: Date.now().toString(),
            filename: file.name,
            size: file.size,
            content_type: file.type,
            created_at: new Date().toISOString(),
            owner: 'current_user',
            hash: Math.random().toString(36).substring(7)
          });
        } else {
          onProgress(Math.min(progress, 95));
        }
      }, 200);
    });
  },

  async getFiles() {
    // Mock data
    return {
      files: [
        {
          id: '1',
          filename: 'document.pdf',
          size: 2048576,
          content_type: 'application/pdf',
          created_at: '2024-01-15T10:30:00Z',
          owner: 'current_user',
          hash: 'abc123'
        },
        {
          id: '2',
          filename: 'image.jpg',
          size: 1024000,
          content_type: 'image/jpeg',
          created_at: '2024-01-14T15:20:00Z',
          owner: 'current_user',
          hash: 'def456'
        },
        {
          id: '3',
          filename: 'data.xlsx',
          size: 512000,
          content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          created_at: '2024-01-13T09:45:00Z',
          owner: 'current_user',
          hash: 'ghi789'
        }
      ]
    };
  },

  async deleteFile(fileId) {
    return { success: true };
  },

  async downloadFile(fileId, filename) {
    // Mock download
    const blob = new Blob(['Mock file content'], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

// WebSocket Mock
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onopen = null;
    this.onclose = null;
    
    setTimeout(() => {
      this.onopen?.();
    }, 100);
  }

  send(data) {
    console.log('WebSocket send:', data);
  }

  close() {
    this.onclose?.();
  }

  // Simulate incoming messages
  simulateMessage(type, data) {
    this.onmessage?.({
      data: JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      })
    });
  }
}

// Utility functions
const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileIcon = (contentType) => {
  if (contentType?.startsWith('image/')) return '🖼️';
  if (contentType?.includes('pdf')) return '📄';
  if (contentType?.includes('spreadsheet') || contentType?.includes('excel')) return '📊';
  if (contentType?.includes('word')) return '📝';
  if (contentType?.includes('zip') || contentType?.includes('rar')) return '🗜️';
  return '📁';
};

// File Upload Component
const FileUpload = ({ onUpload, uploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach(onUpload);
    }
  }, [onUpload]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      Array.from(e.target.files).forEach(onUpload);
    }
  }, [onUpload]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center">
        <Upload className={`w-12 h-12 mb-4 ${uploading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
        <div className="mb-2">
          <span className="text-lg font-medium text-gray-700">
            {uploading ? 'Upload läuft...' : 'Dateien hier ablegen'}
          </span>
        </div>
        <div className="text-sm text-gray-500 mb-4">
          oder{' '}
          <button
            onClick={() => inputRef.current?.click()}
            className="text-blue-500 hover:text-blue-600 underline"
            disabled={uploading}
          >
            hier klicken zum Auswählen
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Unterstützt: PDF, Bilder, Office-Dokumente, Archive (Max. 100MB)
        </div>
      </div>
    </div>
  );
};

// File Item Component
const FileItem = ({ file, viewMode, onDownload, onDelete, onPreview }) => {
  const [showMenu, setShowMenu] = useState(false);

  if (viewMode === 'grid') {
    return (
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow relative">
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-32">
              <button
                onClick={() => { onPreview(file); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Vorschau
              </button>
              <button
                onClick={() => { onDownload(file.id, file.filename); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => { onDelete(file.id); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </div>
          )}
        </div>

        <div className="text-center mb-3">
          <div className="text-4xl mb-2">{getFileIcon(file.content_type)}</div>
          <div className="font-medium truncate text-sm">{file.filename}</div>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <div>Größe: {formatFileSize(file.size)}</div>
          <div>Erstellt: {formatDate(file.created_at)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b hover:bg-gray-50 transition-colors">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-2xl">{getFileIcon(file.content_type)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{file.filename}</div>
            <div className="text-sm text-gray-500">
              {formatFileSize(file.size)} • {formatDate(file.created_at)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPreview(file)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Vorschau"
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => onDownload(file.id, file.filename)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(file.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Löschen"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

// File Preview Modal
const FilePreview = ({ file, onClose }) => {
  if (!file) return null;

  const renderPreview = () => {
    if (file.content_type?.startsWith('image/')) {
      return (
        <div className="flex justify-center">
          <img 
            src={`/api/files/${file.id}/preview`} 
            alt={file.filename}
            className="max-w-full max-h-96 object-contain"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI4IiBmaWxsPSIjRTVFN0VCIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LXNpemU9IjEyIj5CaWxkPC90ZXh0Pgo8L3N2Zz4=';
            }}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{getFileIcon(file.content_type)}</div>
        <div className="text-gray-500">
          Vorschau für diesen Dateityp nicht verfügbar
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium">{file.filename}</h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(file.size)} • {formatDate(file.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-auto max-h-[70vh]">
          {renderPreview()}
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={() => apiService.downloadFile(file.id, file.filename)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// Main File Manager Component
const FileBrokerUI = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    uploadsToday: 0
  });

  const wsRef = useRef(null);

  // Load files on mount
  useEffect(() => {
    loadFiles();
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update stats when files change
  useEffect(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const today = new Date().toDateString();
    const uploadsToday = files.filter(file => 
      new Date(file.created_at).toDateString() === today
    ).length;

    setStats({
      totalFiles: files.length,
      totalSize,
      uploadsToday
    });
  }, [files]);

  const setupWebSocket = () => {
    wsRef.current = new MockWebSocket('ws://localhost:8000/ws/default');
    
    wsRef.current.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      
      switch (eventData.type) {
        case 'file_uploaded':
          addNotification('success', `Datei "${eventData.data.filename}" wurde hochgeladen`);
          loadFiles();
          break;
        case 'file_deleted':
          addNotification('info', `Datei "${eventData.data.filename}" wurde gelöscht`);
          break;
        default:
          break;
      }
    };
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await apiService.getFiles();
      setFiles(response.files);
    } catch (error) {
      addNotification('error', 'Fehler beim Laden der Dateien');
    }
    setLoading(false);
  };

  const handleUpload = async (file) => {
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      addNotification('error', 'Datei zu groß (Max. 100MB)');
      return;
    }

    setUploading(true);
    const fileId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

    try {
      const uploadedFile = await apiService.uploadFile(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
      });

      setFiles(prev => [uploadedFile, ...prev]);
      addNotification('success', `"${file.name}" erfolgreich hochgeladen`);
      
      // Simulate WebSocket event
      wsRef.current?.simulateMessage('file_uploaded', {
        file_id: uploadedFile.id,
        filename: uploadedFile.filename,
        user_id: 'current_user'
      });
    } catch (error) {
      addNotification('error', `Upload fehlgeschlagen: ${file.name}`);
    }

    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
    setUploading(false);
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Datei wirklich löschen?')) return;

    try {
      await apiService.deleteFile(fileId);
      const deletedFile = files.find(f => f.id === fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
      
      addNotification('success', 'Datei gelöscht');
      
      // Simulate WebSocket event
      wsRef.current?.simulateMessage('file_deleted', {
        file_id: fileId,
        filename: deletedFile?.filename,
        user_id: 'current_user'
      });
    } catch (error) {
      addNotification('error', 'Fehler beim Löschen');
    }
  };

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectFile = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(selectedFiles.length === filteredFiles.length ? [] : filteredFiles.map(f => f.id));
  };

  const deleteSelectedFiles = async () => {
    if (!confirm(`${selectedFiles.length} Dateien wirklich löschen?`)) return;
    
    for (const fileId of selectedFiles) {
      await handleDelete(fileId);
    }
    setSelectedFiles([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">File Broker</h1>
              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-500">
                <span>{stats.totalFiles} Dateien</span>
                <span>{formatFileSize(stats.totalSize)}</span>
                <span>{stats.uploadsToday} heute hochgeladen</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-500" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="fixed top-20 right-4 space-y-2 z-40">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg border-l-4 bg-white max-w-sm ${
              notification.type === 'success' ? 'border-green-500' :
              notification.type === 'error' ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-2" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 mr-2" />}
              {notification.type === 'info' && <Bell className="w-5 h-5 text-blue-500 mr-2" />}
              <span className="text-sm text-gray-800">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <FileUpload onUpload={handleUpload} uploading={uploading} />
          
          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Upload läuft...</span>
                    <span className="text-sm font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Dateien suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedFiles.length > 0 && (
              <button
                onClick={deleteSelectedFiles}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {selectedFiles.length} löschen
              </button>
            )}
            
            <button
              onClick={selectAllFiles}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {selectedFiles.length === filteredFiles.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
            
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Dateien werden geladen...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Keine Dateien gefunden' : 'Noch keine Dateien hochgeladen'}
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'bg-white rounded-lg border overflow-hidden'
          }>
            {filteredFiles.map(file => (
              <FileItem
                key={file.id}
                file={file}
                viewMode={viewMode}
                onDownload={apiService.downloadFile}
                onDelete={handleDelete}
                onPreview={setPreviewFile}
              />
            ))}
          </div>
        )}
      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default FileBrokerUI;