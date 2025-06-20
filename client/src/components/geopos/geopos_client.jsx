import React, { useState, useEffect, useRef } from 'react'
import { 
  MapPin, 
  Layers, 
  Edit3, 
  Eye, 
  Save, 
  Upload, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Square,
  MousePointer,
  Settings,
  Trash2,
  Plus,
  FilterIcon,
  CheckCircle,
  AlertCircle,
  X,
  Map,
  Navigation,
  RefreshCw
} from 'lucide-react'

const API = '/api'

// Toast-Benachrichtigung
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50`}>
      {type === 'success' && <CheckCircle className="w-4 h-4" />}
      {type === 'error' && <AlertCircle className="w-4 h-4" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Werkzeug-Button Komponente
function ToolButton({ name, active, onClick, disabled = false }) {
  return (
    <button
      className={`tool-button ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {name}
    </button>
  );
}

// Layer-Panel Komponente
function LayerPanel({ layers, activeLayer, onLayerChange, onLayerToggle }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5" />
        Layer Verwaltung
      </h3>
      
      <div className="space-y-2">
        {layers.map((layer) => (
          <div 
            key={layer.id} 
            className={`
              p-3 rounded-lg border cursor-pointer transition-all duration-200
              ${activeLayer === layer.id 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }
            `}
            onClick={() => onLayerChange(layer.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded"
                />
                <span className="font-medium">{layer.name}</span>
              </div>
              <span className="text-sm text-gray-500">
                {layer.objects?.length || 0} Objekte
              </span>
            </div>
            {layer.category && (
              <div className="mt-1 text-sm text-gray-600">
                Kategorie: {layer.category}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Objekt-Liste Komponente
function ObjectList({ objects, selectedObjects, onObjectSelect, filter, onFilterChange }) {
  const filteredObjects = objects.filter(obj => 
    !filter || obj.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Objekte
      </h3>
      
      <div className="mb-4">
        <div className="relative">
          <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Objekte filtern..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1">
        {filteredObjects.map((obj) => (
          <div
            key={obj.id}
            className={`
              p-2 rounded cursor-pointer transition-all duration-200
              ${selectedObjects.includes(obj.id) 
                ? 'bg-blue-100 border border-blue-300' 
                : 'hover:bg-gray-100'
              }
              ${obj.unpositioned ? 'text-red-500 italic' : ''}
            `}
            onClick={() => onObjectSelect(obj.id)}
          >
            <div className="font-medium">{obj.name}</div>
            {obj.unpositioned && (
              <div className="text-xs text-red-500">Nicht positioniert</div>
            )}
            {obj.category && (
              <div className="text-xs text-gray-500">{obj.category}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Eigenschaften-Panel
function PropertiesPanel({ selectedObject, onPropertyChange, onSave }) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!selectedObject) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 w-80">
        <h3 className="text-lg font-semibold mb-4">Eigenschaften</h3>
        <p className="text-gray-500">Kein Objekt ausgewählt</p>
      </div>
    )
  }

  // Koordinaten formatieren
  const coordFormatted = formatCoordinates(
    selectedObject.x, 
    selectedObject.y,
    selectedObject.lat,
    selectedObject.lng
  )

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Edit3 className="w-5 h-5" />
        Eigenschaften
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
          <input
            type="text"
            value={selectedObject.id}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={selectedObject.name || ''}
            onChange={(e) => onPropertyChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Objektname eingeben"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
          <select
            value={selectedObject.category || ''}
            onChange={(e) => onPropertyChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Kategorie wählen</option>
            <option value="AMPELMAST">Ampelmast</option>
            <option value="AMPEL">Ampel</option>
            <option value="DETEKTOR">Detektor</option>
            <option value="STEUERGERAET">Steuergerät</option>
            <option value="SPUR">Spur</option>
            <option value="VVA">VVA</option>
            <option value="META">Meta</option>
            <option value="KNOTEN">Knoten</option>
          </select>
        </div>

        {/* Swiss Grid Koordinaten */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Swiss Grid Koordinaten (LV95)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">X (Rechtswert)</label>
              <input
                type="number"
                value={selectedObject.x || 0}
                onChange={(e) => {
                  const x = parseFloat(e.target.value) || 0
                  onPropertyChange('x', x)
                  // WGS84 Koordinaten neu berechnen
                  if (selectedObject.y) {
                    const { lat, lng } = swissToWgs84(x, selectedObject.y)
                    onPropertyChange('lat', lat)
                    onPropertyChange('lng', lng)
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                min="2485000"
                max="2835000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Y (Hochwert)</label>
              <input
                type="number"
                value={selectedObject.y || 0}
                onChange={(e) => {
                  const y = parseFloat(e.target.value) || 0
                  onPropertyChange('y', y)
                  // WGS84 Koordinaten neu berechnen
                  if (selectedObject.x) {
                    const { lat, lng } = swissToWgs84(selectedObject.x, y)
                    onPropertyChange('lat', lat)
                    onPropertyChange('lng', lng)
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                min="1075000"
                max="1295000"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {coordFormatted.swiss}
          </div>
        </div>

        {/* WGS84 Koordinaten (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WGS84 Koordinaten (berechnet)
          </label>
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
            {coordFormatted.wgs84}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rotation (°)</label>
          <input
            type="number"
            value={selectedObject.rotation || 0}
            onChange={(e) => onPropertyChange('rotation', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="360"
            step="0.1"
          />
        </div>

        {/* Erweiterte Eigenschaften */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {showAdvanced ? '▼' : '▶'} Erweiterte Eigenschaften
          </button>
          
          {showAdvanced && (
            <div className="mt-2 space-y-3 pl-4 border-l-2 border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol ID</label>
                <input
                  type="text"
                  value={selectedObject.symbol_id || ''}
                  onChange={(e) => onPropertyChange('symbol_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Symbol ID"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unpositioned"
                  checked={selectedObject.unpositioned || false}
                  onChange={(e) => onPropertyChange('unpositioned', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="unpositioned" className="text-sm text-gray-700">
                  Nicht positioniert
                </label>
              </div>
              
              {selectedObject.attributes && Object.keys(selectedObject.attributes).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zusätzliche Attribute</label>
                  <div className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                    {Object.entries(selectedObject.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Validierungshinweise */}
        {selectedObject.x && selectedObject.y && !isValidSwissGrid(selectedObject.x, selectedObject.y) && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            ⚠️ Koordinaten sind außerhalb des gültigen Swiss Grid Bereichs
          </div>
        )}

        <button
          onClick={onSave}
          disabled={!selectedObject.name?.trim() || (selectedObject.x && selectedObject.y && !isValidSwissGrid(selectedObject.x, selectedObject.y))}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {selectedObject.id.startsWith('NEW_') ? 'Erstellen' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

// Leaflet-Karte Komponente
function LeafletMap({ objects, selectedObjects, onObjectClick, tool, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // Leaflet initialisieren
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Leaflet CSS laden
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)

    // Leaflet JavaScript laden
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = () => {
      // Karte initialisieren
      mapInstanceRef.current = window.L.map(mapRef.current).setView([47.3769, 8.5417], 15)

      // Basiskarte hinzufügen
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)

      // Click-Handler für die Karte
      mapInstanceRef.current.on('click', (e) => {
        if (tool === 'ADD' && onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng)
        }
      })

      setMapLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Marker aktualisieren
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return

    // Alte Marker entfernen
    Object.values(markersRef.current).forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = {}

    // Neue Marker hinzufügen
    objects.forEach(obj => {
      if (obj.x && obj.y && !obj.unpositioned) {
        // Koordinaten mit korrekter Swiss Grid Transformation
        let lat, lng
        
        if (obj.lat && obj.lng) {
          // Bereits transformierte Koordinaten vom Backend verwenden
          lat = obj.lat
          lng = obj.lng
        } else {
          // Lokale Transformation falls nötig
          const transformed = swissToWgs84(obj.x, obj.y)
          lat = transformed.lat
          lng = transformed.lng
        }

        if (!lat || !lng) {
          console.warn(`Ungültige Koordinaten für Objekt ${obj.id}:`, obj.x, obj.y)
          return
        }

        const isSelected = selectedObjects.includes(obj.id)
        
        // Icon basierend auf Kategorie
        const iconColor = getIconColor(obj.category)
        const iconHtml = `
          <div style="
            background-color: ${isSelected ? '#3B82F6' : iconColor};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${getCategoryIcon(obj.category)}
          </div>
        `

        const customIcon = window.L.divIcon({
          html: iconHtml,
          className: 'custom-geopos-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        })

        // Popup-Content mit detaillierten Informationen
        const popupContent = `
          <div class="geopos-popup">
            <h3 style="margin: 0 0 8px 0; color: ${iconColor};">${obj.name || obj.id}</h3>
            <div style="font-size: 12px; color: #666;">
              <div><strong>Kategorie:</strong> ${obj.category || 'Unbekannt'}</div>
              <div><strong>Swiss Grid:</strong> ${obj.x?.toFixed(0)} / ${obj.y?.toFixed(0)}</div>
              <div><strong>WGS84:</strong> ${lat?.toFixed(6)}° / ${lng?.toFixed(6)}°</div>
              ${obj.rotation ? `<div><strong>Rotation:</strong> ${obj.rotation}°</div>` : ''}
              ${obj.symbol_id ? `<div><strong>Symbol:</strong> ${obj.symbol_id}</div>` : ''}
            </div>
          </div>
        `

        const marker = window.L.marker([lat, lng], { icon: customIcon })
          .bindPopup(popupContent)
          .bindTooltip(`${obj.name || obj.id}`, { 
            offset: [0, -20],
            direction: 'top'
          })
          .on('click', () => onObjectClick(obj.id))

        marker.addTo(mapInstanceRef.current)
        markersRef.current[obj.id] = marker
      }
    })
  }, [objects, selectedObjects, mapLoaded, onObjectClick])

  const getIconColor = (category) => {
    const colors = {
      'AMPELMAST': '#EF4444',
      'AMPEL': '#F59E0B',
      'DETEKTOR': '#10B981',
      'STEUERGERAET': '#8B5CF6',
      'SPUR': '#06B6D4',
      'VVA': '#EC4899',
      'META': '#6B7280',
      'KNOTEN': '#F97316'
    }
    return colors[category] || '#6B7280'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'AMPELMAST': '⚡',
      'AMPEL': '🚦',
      'DETEKTOR': '👁',
      'STEUERGERAET': '⚙',
      'SPUR': '🛣',
      'VVA': '📡',
      'META': 'ℹ',
      'KNOTEN': '🔗'
    }
    return icons[category] || '📍'
  }

  return (
    <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Map className="w-5 h-5" />
          Geopos Karte
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1 rounded hover:bg-gray-100"
            disabled={!mapLoaded}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1 rounded hover:bg-gray-100"
            disabled={!mapLoaded}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.setView([47.3769, 8.5417], 15)}
            className="p-1 rounded hover:bg-gray-100"
            disabled={!mapLoaded}
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="h-96"
        style={{ 
          cursor: tool === 'ADD' ? 'crosshair' : 'grab'
        }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500">Karte wird geladen...</div>
        </div>
      )}
    </div>
  )
}

// SVG-Viewer Komponente (als Alternative zur Karte)
function SVGViewer({ svgContent, onObjectClick, selectedObjects, tool }) {
  const svgRef = useRef(null)
  const [viewBox, setViewBox] = useState('0 0 1000 1000')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (svgRef.current && svgContent) {
      // SVG-Content laden
      svgRef.current.innerHTML = svgContent
      
      // Event-Listener für Objekte hinzufügen
      const objects = svgRef.current.querySelectorAll('.object')
      objects.forEach(obj => {
        obj.addEventListener('click', (e) => {
          e.stopPropagation()
          onObjectClick(obj.id)
        })
        
        // Hervorhebung für ausgewählte Objekte
        if (selectedObjects.includes(obj.id)) {
          obj.style.stroke = '#3B82F6'
          obj.style.strokeWidth = '2'
        } else {
          obj.style.stroke = ''
          obj.style.strokeWidth = ''
        }
      })
    }
  }, [svgContent, selectedObjects, onObjectClick])

  const handleZoomIn = () => {
    const newZoom = zoom * 1.2
    setZoom(newZoom)
    updateViewBox(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = zoom / 1.2
    setZoom(newZoom)
    updateViewBox(newZoom)
  }

  const updateViewBox = (newZoom) => {
    const [x, y, width, height] = viewBox.split(' ').map(Number)
    const centerX = x + width / 2
    const centerY = y + height / 2
    const newWidth = 1000 / newZoom
    const newHeight = 1000 / newZoom
    const newX = centerX - newWidth / 2
    const newY = centerY - newHeight / 2
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`)
  }

  return (
    <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          SVG Viewer
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Zoom: {Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="h-96 overflow-auto bg-gray-50">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className={`w-full h-full ${tool === 'viewbox' ? 'cursor-crosshair' : 'cursor-pointer'}`}
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  )
}

// Neue Komponente für TMS Layer Management
function TmsManager({ token, showToast }) {
  const [tmsLayers, setTmsLayers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTmsLayers = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetch(`${API}/tms`, { // API-Endpunkt aus main.py
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTmsLayers(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.detail || 'Fehler beim Laden der TMS-Layer', 'error')
      }
    } catch (error) {
      showToast('Netzwerkfehler beim Laden der TMS-Layer', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTmsLayers()
  }, [token])

  const handleDeleteTms = async (tmsId, tmsName) => {
    // Bestätigungsabfrage vor dem Löschen
    if (!window.confirm(`Möchten Sie den TMS-Layer "${tmsName || tmsId}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) {
      return; // Abbruch, wenn der Benutzer nicht bestätigt
    }
    try {
      const response = await fetch(`${API}/tms/${tmsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        showToast(`TMS-Layer ${tmsName || tmsId} erfolgreich gelöscht`, 'success')
        loadTmsLayers() // Liste neu laden
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.detail || `Fehler beim Löschen von TMS-Layer ${tmsName || tmsId}`, 'error')
      }
    } catch (error) {
      showToast('Netzwerkfehler beim Löschen des TMS-Layers', 'error')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Map className="w-5 h-5" /> {/* Geändertes Icon */}
        TMS Layer
      </h3>
      <button
        onClick={loadTmsLayers}
        disabled={isLoading}
        className="mb-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:bg-gray-300"
      >
        {isLoading ? 'Lädt...' : 'Aktualisieren'}
      </button>
      <div className="space-y-2 max-h-48 overflow-y-auto"> {/* Höhe angepasst */}
        {tmsLayers.length === 0 && !isLoading && <p className="text-gray-500 text-sm">Keine TMS-Layer gefunden.</p>}
        {tmsLayers.map((layer) => (
          <div key={layer.id} className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-sm">
            <div className="flex items-center justify-between">
              <a href={layer.url ? `${layer.url}/openlayers.html` : '#'} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate" title={layer.fileName || layer.id}>
                {layer.fileName || layer.id}
              </a>
              <button onClick={() => handleDeleteTms(layer.id, layer.fileName)} className="p-1 text-red-500 hover:text-red-700" title="TMS-Layer löschen">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {layer.config?.srs && <div className="text-xs text-gray-500">SRS: {layer.config.srs}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// Haupt-Geopos-Komponente
export default function GeoposClient({ token }) {
  const [layers, setLayers] = useState([
    { id: 'STATIC', name: 'Statische Layer', visible: true, category: 'static', objects: [] },
    { id: 'DYNAMIC', name: 'Dynamische Layer', visible: false, category: 'dynamic', objects: [] },
    { id: 'PROJECT0', name: 'Projekt 0', visible: true, category: 'project', objects: [] },
    { id: 'PROJECT1', name: 'Projekt 1', visible: true, category: 'project', objects: [] }
  ])
  
  const [activeLayer, setActiveLayer] = useState('STATIC')
  const [selectedObjects, setSelectedObjects] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  const [activeTool, setActiveTool] = useState('SELECT')
  const [filter, setFilter] = useState('')
  const [svgContent, setSvgContent] = useState('')
  const [toast, setToast] = useState(null)
  const [multiSelect, setMultiSelect] = useState(false)
  const [viewMode, setViewMode] = useState('map') // 'map' oder 'svg'
  
  const objects = layers.find(l => l.id === activeLayer)?.objects || []

  // SVG-Daten und Objekte laden
  useEffect(() => {
    if (activeLayer) {
      loadSVGData()
      loadObjects()
    }
  }, [activeLayer, token])

  const loadSVGData = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API}/geopos/svg/${activeLayer}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.text()
        setSvgContent(data)
      } else {
        console.warn(`SVG-Daten für Layer ${activeLayer} nicht verfügbar`)
      }
    } catch (error) {
      console.error('Fehler beim Laden der SVG-Daten:', error)
      // Kein Toast hier, da SVG optional ist
    }
  }

  const loadObjects = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API}/geopos/objects/${activeLayer}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        
        // Daten validieren und bereinigen
        const validObjects = data.filter(obj => {
          if (!obj.id) {
            console.warn('Objekt ohne ID ignoriert:', obj)
            return false
          }
          return true
        })
        
        setLayers(prev => prev.map(layer => 
          layer.id === activeLayer 
            ? { ...layer, objects: validObjects }
            : layer
        ))
      } else {
        console.error(`Fehler beim Laden der Objekte: ${response.status}`)
        showToast('Fehler beim Laden der Objekte', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Laden der Objekte:', error)
      showToast('Netzwerkfehler beim Laden der Objekte', 'error')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
  }

  const handleToolChange = (tool) => {
    setActiveTool(tool)
    if (tool === 'SELECT') {
      setMultiSelect(false)
    } else if (tool === 'MULTI') {
      setMultiSelect(true)
    }
  }

  const handleLayerChange = (layerId) => {
    setActiveLayer(layerId)
    setSelectedObjects([])
    setSelectedObject(null)
  }

  const handleLayerToggle = (layerId, visible) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible }
        : layer
    ))
  }

  const handleObjectSelect = (objectId) => {
    if (multiSelect) {
      setSelectedObjects(prev => 
        prev.includes(objectId)
          ? prev.filter(id => id !== objectId)
          : [...prev, objectId]
      )
    } else {
      setSelectedObjects([objectId])
      const obj = objects.find(o => o.id === objectId)
      setSelectedObject(obj)
    }
  }

  const handlePropertyChange = (property, value) => {
    if (selectedObject) {
      setSelectedObject(prev => ({ ...prev, [property]: value }))
    }
  }

  const handleSave = async () => {
    if (!selectedObject) return

    // Validierung der Eingaben
    if (!selectedObject.name?.trim()) {
      showToast('Bitte geben Sie einen Namen ein', 'error')
      return
    }

    if (!isValidSwissGrid(selectedObject.x, selectedObject.y)) {
      showToast('Ungültige Swiss Grid Koordinaten', 'error')
      return
    }

    try {
      const method = selectedObject.id.startsWith('NEW_') ? 'POST' : 'PUT'
      const url = selectedObject.id.startsWith('NEW_') 
        ? `${API}/geopos/objects` 
        : `${API}/geopos/objects/${selectedObject.id}`

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...selectedObject,
          // Koordinaten neu berechnen falls geändert
          lat: selectedObject.lat || swissToWgs84(selectedObject.x, selectedObject.y).lat,
          lng: selectedObject.lng || swissToWgs84(selectedObject.x, selectedObject.y).lng
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Bei neuen Objekten die ID aktualisieren
        if (selectedObject.id.startsWith('NEW_') && result.id) {
          setSelectedObject(prev => ({ ...prev, id: result.id }))
        }
        
        showToast('Objekt erfolgreich gespeichert', 'success')
        loadObjects() // Objekte neu laden
        if (viewMode === 'svg') {
          loadSVGData() // SVG neu laden falls im SVG-Modus
        }
      } else {
        const error = await response.json()
        showToast(error.detail || 'Fehler beim Speichern', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      showToast('Netzwerkfehler beim Speichern', 'error')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedObjects.length === 0) return

    try {
      const response = await fetch(`${API}/geopos/objects/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedObjects })
      })

      if (response.ok) {
        showToast(`${selectedObjects.length} Objekt(e) gelöscht`, 'success')
        setSelectedObjects([])
        setSelectedObject(null)
        loadObjects()
        loadSVGData()
      } else {
        showToast('Fehler beim Löschen', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      showToast('Fehler beim Löschen', 'error')
    }
  }

  const handleMapClick = (lat, lng) => {
    if (activeTool === 'ADD') {
      // WGS84 zu Swiss Grid konvertieren
      const swissCoords = wgs84ToSwiss(lat, lng)
      
      if (!swissCoords.x || !swissCoords.y) {
        showToast('Ungültige Koordinaten für Swiss Grid', 'error')
        return
      }

      // Neues Objekt an der geklickten Position erstellen
      const newObject = {
        id: `NEW_${Date.now()}`,
        name: 'Neues Objekt',
        x: swissCoords.x,
        y: swissCoords.y,
        lat: lat,
        lng: lng,
        category: 'META',
        rotation: 0,
        unpositioned: false,
        symbol_id: '',
        attributes: {}
      }
      
      setSelectedObject(newObject)
      showToast('Neues Objekt erstellt. Bitte Eigenschaften bearbeiten und speichern.', 'success')
    }
  }

  const handleRefreshData = async () => {
    setToast({ message: 'Daten werden aktualisiert...', type: 'info' })
    await Promise.all([loadSVGData(), loadObjects()])
    showToast('Daten erfolgreich aktualisiert', 'success')
  }

  const tools = [
    { name: 'SELECT', icon: MousePointer },
    { name: 'VIEWBOX', icon: Square },
    { name: 'MULTI', icon: Edit3 },
    { name: 'ADD', icon: Plus }
  ]

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            Geopos Client
          </h1>
          
          <div className="flex items-center gap-4">
            {/* Werkzeuge */}
            <div className="flex items-center gap-2">
              {tools.map((tool) => (
                <ToolButton
                  key={tool.name}
                  name={tool.name}
                  icon={tool.icon}
                  active={activeTool === tool.name}
                  onClick={handleToolChange}
                />
              ))}
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                    viewMode === 'map' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Karte
                </button>
                <button
                  onClick={() => setViewMode('svg')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                    viewMode === 'svg' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  SVG
                </button>
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Aktualisieren
              </button>
              
              <button
                onClick={() => {}}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              
              <button
                onClick={() => {}}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {selectedObjects.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen ({selectedObjects.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hauptinhalt */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Linke Seitenleiste */}
        <div className="flex flex-col gap-4">
          <LayerPanel
            layers={layers}
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
            onLayerToggle={handleLayerToggle}
          />
          
          <ObjectList
            objects={objects}
            selectedObjects={selectedObjects}
            onObjectSelect={handleObjectSelect}
            filter={filter}
            onFilterChange={setFilter}
          />
          {/* TMS Manager Panel hinzufügen */}
          <TmsManager
            token={token}
            showToast={showToast}
          />
        </div>

        {/* Hauptansicht */}
        {viewMode === 'map' ? (
          <LeafletMap
            objects={objects}
            selectedObjects={selectedObjects}
            onObjectClick={handleObjectSelect}
            tool={activeTool}
            onMapClick={handleMapClick}
          />
        ) : (
          <SVGViewer
            svgContent={svgContent}
            onObjectClick={handleObjectSelect}
            selectedObjects={selectedObjects}
            tool={activeTool}
          />
        )}

        {/* Rechte Seitenleiste */}
        <PropertiesPanel
          selectedObject={selectedObject}
          onPropertyChange={handlePropertyChange}
          onSave={handleSave}
        />
      </div>

      {/* Toast-Benachrichtigungen */}
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