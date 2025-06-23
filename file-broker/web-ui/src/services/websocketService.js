import React from 'react';
import { io } from 'socket.io-client'

/**
 * WebSocket Service für Real-time File Events
 */
class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // 1 Sekunde
    this.eventListeners = new Map()
    this.userId = null
  }

  /**
   * WebSocket Verbindung initialisieren
   * @param {string} userId - User ID für Raum-Zuordnung
   * @param {Object} options - Socket.IO Optionen
   */
  connect(userId, options = {}) {
    if (this.socket && this.isConnected) {
      console.warn('WebSocket already connected')
      return
    }

    this.userId = userId

    const defaultOptions = {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      ...options
    }

    // Socket.IO Client initialisieren
    this.socket = io(this.getSocketUrl(), defaultOptions)

    this.setupEventHandlers()
    this.joinUserRoom()
  }

  /**
   * Socket URL ermitteln
   * @returns {string} WebSocket URL
   */
  getSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}`
  }

  /**
   * Standard Event Handler einrichten
   */
  setupEventHandlers() {
    // Verbindung erfolgreich
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection_status', { connected: true, socketId: this.socket.id })
    })

    // Verbindung getrennt
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.isConnected = false
      this.emit('connection_status', { connected: false, reason })
    })

    // Verbindungsfehler
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.reconnectAttempts++
      this.emit('connection_error', { error, attempts: this.reconnectAttempts })
    })

    // Reconnect
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      this.isConnected = true
      this.emit('reconnected', { attempts: attemptNumber })
      this.joinUserRoom() // User-Raum wieder beitreten
    })

    // File Events
    this.socket.on('file_uploaded', (data) => {
      console.log('File uploaded event:', data)
      this.emit('file_uploaded', data)
    })

    this.socket.on('file_deleted', (data) => {
      console.log('File deleted event:', data)
      this.emit('file_deleted', data)
    })

    this.socket.on('file_updated', (data) => {
      console.log('File updated event:', data)
      this.emit('file_updated', data)
    })

    this.socket.on('file_shared', (data) => {
      console.log('File shared event:', data)
      this.emit('file_shared', data)
    })

    // Storage Events
    this.socket.on('storage_usage_updated', (data) => {
      console.log('Storage usage updated:', data)
      this.emit('storage_usage_updated', data)
    })

    // System Events
    this.socket.on('system_notification', (data) => {
      console.log('System notification:', data)
      this.emit('system_notification', data)
    })

    // Error Events
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    })
  }

  /**
   * User-spezifischen Raum beitreten
   */
  joinUserRoom() {
    if (this.socket && this.userId) {
      this.socket.emit('join_user_room', { user_id: this.userId })
      console.log('Joined user room:', this.userId)
    }
  }

  /**
   * Verbindung trennen
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('WebSocket manually disconnected')
    }
  }

  /**
   * Event Listener registrieren
   * @param {string} event - Event Name
   * @param {Function} callback - Callback Funktion
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }

  /**
   * Event Listener entfernen
   * @param {string} event - Event Name
   * @param {Function} callback - Callback Funktion
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Event an alle Listener senden
   * @param {string} event - Event Name
   * @param {any} data - Event Daten
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    })
  }

  /**
   * Message an Server senden
   * @param {string} event - Event Name
   * @param {any} data - Zu sendende Daten
   */
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn('WebSocket not connected, cannot send:', event, data)
    }
  }

  /**
   * File Upload Progress mitteilen
   * @param {string} fileId - File ID
   * @param {number} progress - Progress in %
   */
  sendUploadProgress(fileId, progress) {
    this.send('upload_progress', {
      file_id: fileId,
      progress,
      user_id: this.userId
    })
  }

  /**
   * File Operation bestätigen
   * @param {string} operation - Operation (upload, delete, update)
   * @param {string} fileId - File ID
   * @param {Object} data - Zusätzliche Daten
   */
  confirmFileOperation(operation, fileId, data = {}) {
    this.send('file_operation_confirm', {
      operation,
      file_id: fileId,
      user_id: this.userId,
      ...data
    })
  }

  /**
   * Typing-Indikator für Suche senden
   * @param {string} query - Suchbegriff
   */
  sendSearchTyping(query) {
    this.send('search_typing', {
      query,
      user_id: this.userId,
      timestamp: Date.now()
    })
  }

  /**
   * User Activity senden
   * @param {string} activity - Activity Type
   * @param {Object} data - Activity Daten
   */
  sendUserActivity(activity, data = {}) {
    this.send('user_activity', {
      activity,
      user_id: this.userId,
      timestamp: Date.now(),
      ...data
    })
  }

  /**
   * Verbindungsstatus prüfen
   * @returns {boolean} Ist verbunden
   */
  isSocketConnected() {
    return this.socket && this.isConnected
  }

  /**
   * Socket ID abrufen
   * @returns {string|null} Socket ID
   */
  getSocketId() {
    return this.socket?.id || null
  }

  /**
   * Verbindungsstatistiken abrufen
   * @returns {Object} Verbindungsinfo
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      socketId: this.getSocketId(),
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Singleton Instance
const websocketService = new WebSocketService()

/**
 * React Hook für WebSocket
 * @param {string} userId - User ID
 * @param {Object} options - Optionen
 * @returns {Object} WebSocket Service und Status
 */
export const useWebSocket = (userId, options = {}) => {
  const [connectionStatus, setConnectionStatus] = React.useState({
    connected: false,
    socketId: null,
    error: null
  })

  React.useEffect(() => {
    // Event Listener für Connection Status
    const handleConnectionStatus = (status) => {
      setConnectionStatus(prev => ({
        ...prev,
        connected: status.connected,
        socketId: status.socketId || null
      }))
    }

    const handleConnectionError = (error) => {
      setConnectionStatus(prev => ({
        ...prev,
        error: error.error
      }))
    }

    const handleReconnected = () => {
      setConnectionStatus(prev => ({
        ...prev,
        error: null
      }))
    }

    // Event Listener registrieren
    websocketService.on('connection_status', handleConnectionStatus)
    websocketService.on('connection_error', handleConnectionError)
    websocketService.on('reconnected', handleReconnected)

    // Verbindung starten
    if (userId && !websocketService.isSocketConnected()) {
      websocketService.connect(userId, options)
    }

    // Cleanup
    return () => {
      websocketService.off('connection_status', handleConnectionStatus)
      websocketService.off('connection_error', handleConnectionError)
      websocketService.off('reconnected', handleReconnected)
    }
  }, [userId])

  return {
    websocketService,
    connectionStatus,
    isConnected: connectionStatus.connected,
    socketId: connectionStatus.socketId,
    error: connectionStatus.error
  }
}

export default websocketService