import axios from 'axios'

// API Base URL - wird durch Vite Proxy geleitet
const API_BASE = '/api'

// Axios Instance mit Standard-Konfiguration
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 Sekunden für große File-Uploads
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request Interceptor für Authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor für Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const fileService = {
  /**
   * Upload einer oder mehrerer Dateien
   * @param {File[]} files - Array von File-Objekten
   * @param {Function} onProgress - Callback für Upload-Progress
   * @param {Function} onFileProgress - Callback für einzelne File-Progress
   * @returns {Promise<Object[]>} Array von Upload-Ergebnissen
   */
  async uploadFiles(files, onProgress, onFileProgress) {
    const results = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        const result = await this.uploadFile(file, (progress) => {
          // Progress für einzelne Datei
          onFileProgress?.(file.name, progress)
          
          // Gesamt-Progress
          const overallProgress = ((i + progress / 100) / files.length) * 100
          onProgress?.(overallProgress)
        })
        
        results.push({ file: file.name, success: true, data: result })
      } catch (error) {
        results.push({ 
          file: file.name, 
          success: false, 
          error: error.message || 'Upload fehlgeschlagen' 
        })
      }
    }
    
    return results
  },

  /**
   * Upload einer einzelnen Datei
   * @param {File} file - File-Objekt
   * @param {Function} onProgress - Progress Callback
   * @returns {Promise<Object>} Upload-Ergebnis
   */
  async uploadFile(file, onProgress) {
    // Validierung
    if (!file) {
      throw new Error('Keine Datei ausgewählt')
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
      throw new Error('Datei zu groß (Maximum: 100MB)')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', this.getCurrentUserId())

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress?.(progress)
      }
    })

    return response.data
  },

  /**
   * Alle Dateien des aktuellen Users laden
   * @param {Object} params - Query Parameter (page, limit, search, sort)
   * @returns {Promise<Object>} Dateien-Liste mit Metadaten
   */
  async getFiles(params = {}) {
    const userId = this.getCurrentUserId()
    const queryParams = new URLSearchParams({
      user_id: userId,
      ...params
    })

    const response = await apiClient.get(`/files/user/${userId}?${queryParams}`)
    return response.data
  },

  /**
   * Einzelne Datei-Metadaten laden
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File-Metadaten
   */
  async getFileMetadata(fileId) {
    const response = await apiClient.get(`/files/${fileId}/metadata`)
    return response.data
  },

  /**
   * Datei herunterladen
   * @param {string} fileId - File ID
   * @param {string} filename - Dateiname für Download
   * @returns {Promise<void>}
   */
  async downloadFile(fileId, filename) {
    const response = await apiClient.get(`/files/${fileId}`, {
      responseType: 'blob'
    })

    // Blob URL erstellen und Download triggern
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  /**
   * Datei-Preview URL generieren
   * @param {string} fileId - File ID
   * @returns {string} Preview URL
   */
  getPreviewUrl(fileId) {
    return `${API_BASE}/files/${fileId}/preview?token=${this.getAuthToken()}`
  },

  /**
   * Datei-Thumbnail URL generieren
   * @param {string} fileId - File ID
   * @param {number} size - Thumbnail-Größe (default: 150)
   * @returns {string} Thumbnail URL
   */
  getThumbnailUrl(fileId, size = 150) {
    return `${API_BASE}/files/${fileId}/thumbnail?size=${size}&token=${this.getAuthToken()}`
  },

  /**
   * Datei löschen
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Lösch-Ergebnis
   */
  async deleteFile(fileId) {
    const userId = this.getCurrentUserId()
    const response = await apiClient.delete(`/files/${fileId}`, {
      params: { user_id: userId }
    })
    return response.data
  },

  /**
   * Multiple Dateien löschen
   * @param {string[]} fileIds - Array von File IDs
   * @returns {Promise<Object[]>} Array von Lösch-Ergebnissen
   */
  async deleteFiles(fileIds) {
    const results = []
    
    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId)
        results.push({ fileId, success: true })
      } catch (error) {
        results.push({ 
          fileId, 
          success: false, 
          error: error.message || 'Löschen fehlgeschlagen' 
        })
      }
    }
    
    return results
  },

  /**
   * Datei umbenennen
   * @param {string} fileId - File ID
   * @param {string} newName - Neuer Dateiname
   * @returns {Promise<Object>} Update-Ergebnis
   */
  async renameFile(fileId, newName) {
    const response = await apiClient.patch(`/files/${fileId}`, {
      filename: newName,
      user_id: this.getCurrentUserId()
    })
    return response.data
  },

  /**
   * File-Sharing Link erstellen
   * @param {string} fileId - File ID
   * @param {Object} options - Share-Optionen (expires_in, password, permissions)
   * @returns {Promise<Object>} Share-Link Daten
   */
  async createShareLink(fileId, options = {}) {
    const response = await apiClient.post(`/files/${fileId}/share`, {
      ...options,
      user_id: this.getCurrentUserId()
    })
    return response.data
  },

  /**
   * File-Sharing Links verwalten
   * @param {string} fileId - File ID
   * @returns {Promise<Object[]>} Aktive Share-Links
   */
  async getShareLinks(fileId) {
    const response = await apiClient.get(`/files/${fileId}/shares`)
    return response.data
  },

  /**
   * Share-Link löschen
   * @param {string} fileId - File ID
   * @param {string} shareId - Share ID
   * @returns {Promise<Object>} Lösch-Ergebnis
   */
  async deleteShareLink(fileId, shareId) {
    const response = await apiClient.delete(`/files/${fileId}/shares/${shareId}`)
    return response.data
  },

  /**
   * File-Statistics abrufen
   * @param {string} period - Zeitraum (day, week, month, year)
   * @returns {Promise<Object>} Statistiken
   */
  async getFileStats(period = 'month') {
    const userId = this.getCurrentUserId()
    const response = await apiClient.get(`/stats/files`, {
      params: { user_id: userId, period }
    })
    return response.data
  },

  /**
   * Storage-Usage abrufen
   * @returns {Promise<Object>} Storage-Informationen
   */
  async getStorageUsage() {
    const userId = this.getCurrentUserId()
    const response = await apiClient.get(`/stats/storage`, {
      params: { user_id: userId }
    })
    return response.data
  },

  /**
   * File-Search
   * @param {string} query - Suchbegriff
   * @param {Object} filters - Filter-Optionen
   * @returns {Promise<Object>} Such-Ergebnisse
   */
  async searchFiles(query, filters = {}) {
    const userId = this.getCurrentUserId()
    const response = await apiClient.get('/files/search', {
      params: {
        q: query,
        user_id: userId,
        ...filters
      }
    })
    return response.data
  },

  // Utility Methods
  getCurrentUserId() {
    return localStorage.getItem('user_id') || 'default'
  },

  getAuthToken() {
    return localStorage.getItem('auth_token') || ''
  },

  /**
   * File-Type aus MIME-Type ermitteln
   * @param {string} mimeType - MIME Type
   * @returns {string} File-Category
   */
  getFileCategory(mimeType) {
    if (!mimeType) return 'unknown'
    
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive'
    if (mimeType.includes('text/')) return 'text'
    
    return 'file'
  },

  /**
   * File-Size formatieren
   * @param {number} bytes - Dateigröße in Bytes
   * @returns {string} Formatierte Größe
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Prüfen ob File-Type preview-fähig ist
   * @param {string} mimeType - MIME Type
   * @returns {boolean} Kann preview generiert werden
   */
  canPreview(mimeType) {
    const previewableTypes = [
      'image/',
      'text/',
      'application/pdf',
      'application/json'
    ]
    
    return previewableTypes.some(type => mimeType?.startsWith(type))
  }
}

export default fileService