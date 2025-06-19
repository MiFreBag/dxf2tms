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
  X
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
function ToolButton({ name, icon: Icon, active, onClick, disabled = false }) {
  return (
    <button
      onClick={() => onClick(name)}
      disabled={disabled}
      className={`
        p-2 rounded-lg border transition-all duration-200 flex items-center justify-center
        ${active 
          ? 'bg-blue-500 text-white border-blue-600 shadow-md' 
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
      `}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
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
  if (!selectedObject) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 w-80">
        <h3 className="text-lg font-semibold mb-4">Eigenschaften</h3>
        <p className="text-gray-500">Kein Objekt ausgewählt</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Edit3 className="w-5 h-5" />
        Eigenschaften
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
          <input
            type="text"
            value={selectedObject.id}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={selectedObject.name || ''}
            onChange={(e) => onPropertyChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X-Position</label>
            <input
              type="number"
              value={selectedObject.x || 0}
              onChange={(e) => onPropertyChange('x', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y-Position</label>
            <input
              type="number"
              value={selectedObject.y || 0}
              onChange={(e) => onPropertyChange('y', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rotation (°)</label>
          <input
            type="number"
            value={selectedObject.rotation || 0}
            onChange={(e) => onPropertyChange('rotation', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <button
          onClick={onSave}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Speichern
        </button>
      </div>
    </div>
  )
}

// SVG-Viewer Komponente
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
          Geopos Viewer
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
  
  const objects = layers.find(l => l.id === activeLayer)?.objects || []

  // SVG-Daten laden
  useEffect(() => {
    loadSVGData()
    loadObjects()
  }, [activeLayer])

  const loadSVGData = async () => {
    try {
      const response = await fetch(`${API}/geopos/svg/${activeLayer}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.text()
        setSvgContent(data)
      }
    } catch (error) {
      console.error('Fehler beim Laden der SVG-Daten:', error)
      showToast('Fehler beim Laden der SVG-Daten', 'error')
    }
  }

  const loadObjects = async () => {
    try {
      const response = await fetch(`${API}/geopos/objects/${activeLayer}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setLayers(prev => prev.map(layer => 
          layer.id === activeLayer 
            ? { ...layer, objects: data }
            : layer
        ))
      }
    } catch (error) {
      console.error('Fehler beim Laden der Objekte:', error)
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

    try {
      const response = await fetch(`${API}/geopos/objects/${selectedObject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedObject)
      })

      if (response.ok) {
        showToast('Objekt erfolgreich gespeichert', 'success')
        loadObjects() // Objekte neu laden
        loadSVGData() // SVG neu laden
      } else {
        showToast('Fehler beim Speichern', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      showToast('Fehler beim Speichern', 'error')
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

  const tools = [
    { name: 'SELECT', icon: MousePointer },
    { name: 'VIEWBOX', icon: Square },
    { name: 'MULTI', icon: Edit3 }
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
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2">
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
        </div>

        {/* Hauptansicht */}
        <SVGViewer
          svgContent={svgContent}
          onObjectClick={handleObjectSelect}
          selectedObjects={selectedObjects}
          tool={activeTool}
        />

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