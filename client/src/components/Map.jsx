import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const API = '/api'

// Helper component to handle map updates
function MapController({ selectedLayer }) {
  const map = useMap()
  
  useEffect(() => {
    console.log('MapController - selectedLayer:', selectedLayer)
    
    if (selectedLayer) {
      // Try different possible bounds locations
      let bounds = null
      if (selectedLayer.config && selectedLayer.config.bounds) {
        bounds = selectedLayer.config.bounds
        console.log('Found bounds in config:', bounds)
      } else if (selectedLayer.bbox) {
        bounds = selectedLayer.bbox
        console.log('Found bounds in bbox:', bounds)
      } else if (selectedLayer.bounds) {
        bounds = selectedLayer.bounds
        console.log('Found bounds directly:', bounds)
      } else if (selectedLayer.metadata && selectedLayer.metadata.bounds) {
        bounds = selectedLayer.metadata.bounds
        console.log('Found bounds in metadata:', bounds)
      }
      
      if (bounds && Array.isArray(bounds) && bounds.length === 4) {
        try {
          // Convert bounds array to Leaflet bounds format
          // bounds should be [minX, minY, maxX, maxY] -> [[minY, minX], [maxY, maxX]]
          const leafletBounds = [[bounds[1], bounds[0]], [bounds[3], bounds[2]]]
          
          console.log('Fitting to bounds:', leafletBounds)
          
          // Fit map to bounds with some padding
          map.fitBounds(leafletBounds, { 
            padding: [20, 20],
            maxZoom: 18 // Prevent zooming too far in
          })
        } catch (error) {
          console.error('Error fitting bounds:', error)
        }
      } else {
        console.log('No valid bounds found for layer:', selectedLayer)
      }
    }
  }, [map, selectedLayer])
  
  return null
}

function Map() {
  const [layers, setLayers] = useState([])
  const [selected, setSelected] = useState('')
  const [useMapServer, setUseMapServer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLayers = async () => {
      try {
        console.log('Fetching layers from:', `${API}/tms`)
        const response = await fetch(`${API}/tms`)
        if (response.ok) {
          const data = await response.json()
          setLayers(data)
          console.log('Loaded layers:', JSON.stringify(data, null, 2)) // Detailed debug log
        } else {
          console.error('Failed to fetch layers:', response.status)
          setError(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.error('Error fetching layers:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLayers()
  }, [])

  // Helper für TileLayer-URL (Leaflet erwartet absoluten Pfad)
  const getTileLayerUrl = (layer) => {
    if (!layer) return '';
    return `${layer.url}/{z}/{x}/{y}.png`;
  };

  const selectedLayer = layers.find(l => l.id === selected)

  const toggleMapServer = () => {
    setUseMapServer(!useMapServer)
  }

  // Handle layer selection
  const handleLayerSelect = (layerId) => {
    setSelected(layerId)
    
    if (layerId) {
      const layer = layers.find(l => l.id === layerId)
      if (layer) {
        console.log('Selected layer:', layer) // Debug log
        if (layer.config && layer.config.bounds) {
          console.log('Layer bounds:', layer.config.bounds) // Debug log
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-sm border">
        <div className="text-gray-500">Lade Kartenlayer...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-sm border">
        <div className="text-red-500">Fehler beim Laden der Layer: {error}</div>
      </div>
    )
  }

  return (
    <>
      {/* Layer Controls */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TMS Layer auswählen
            </label>
            <select 
              value={selected} 
              onChange={e => handleLayerSelect(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Keinen Layer ausgewählt --</option>
              {layers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.fileName || l.id}
                  {l.config && l.config.bounds ? 
                    ` [${l.config.bounds.map(x => x.toFixed(2)).join(', ')}]` : 
                    ' [Keine Bounds]'
                  }
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Basiskarte
            </label>
            <button 
              onClick={toggleMapServer} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                useMapServer 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {useMapServer ? 'MapServer aktiv' : 'Swiss Topo aktiv'}
            </button>
          </div>
        </div>
        
        {/* Layer Info */}
        {selectedLayer && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Layer-Informationen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div><strong>Dateiname:</strong> {selectedLayer.fileName || selectedLayer.id || 'Unbekannt'}</div>
              
              {/* Try different bounds locations */}
              {selectedLayer.config && selectedLayer.config.bounds ? (
                <div><strong>Config Bounds:</strong> {selectedLayer.config.bounds.map(x => x.toFixed(2)).join(', ')}</div>
              ) : selectedLayer.bbox ? (
                <div><strong>DB Bounds:</strong> {selectedLayer.bbox.map(x => x.toFixed(2)).join(', ')}</div>
              ) : selectedLayer.bounds ? (
                <div><strong>Direct Bounds:</strong> {selectedLayer.bounds.map(x => x.toFixed(2)).join(', ')}</div>
              ) : selectedLayer.metadata && selectedLayer.metadata.bounds ? (
                <div><strong>Metadata Bounds:</strong> {selectedLayer.metadata.bounds.map(x => x.toFixed(2)).join(', ')}</div>
              ) : (
                <div><strong>Bounds:</strong> Nicht verfügbar</div>
              )}
              
              {selectedLayer.srs && (
                <div><strong>Koordinatensystem:</strong> {selectedLayer.srs}</div>
              )}
              {selectedLayer.config && selectedLayer.config.resolution && (
                <div><strong>Auflösung:</strong> {selectedLayer.config.resolution}</div>
              )}
              {selectedLayer.config && selectedLayer.config.maxzoom && (
                <div><strong>Max Zoom:</strong> {selectedLayer.config.maxzoom}</div>
              )}
            </div>
            
            {/* Debug info */}
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw Layer Data</summary>
              <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32">
                {JSON.stringify(selectedLayer, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden" style={{ minHeight: '500px' }}>
        <MapContainer 
          center={[47.3769, 8.5417]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          attributionControl={true}
        >
          {/* Map Controller for handling bounds updates */}
          <MapController selectedLayer={selectedLayer} />
          
          {/* Base Layer */}
          <TileLayer
            key={useMapServer ? 'mapserver' : 'swisstopo'} // Force re-render on change
            url={useMapServer
              ? "http://10.254.64.14/styles/basic-preview/512/{z}/{x}/{y}.png"
              : "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg"}
            attribution={useMapServer
              ? "&copy; <a href='https://www.maptiler.com/'>Maptiler</a>"
              : "&copy; <a href='https://www.geo.admin.ch/'>geo.admin.ch</a>"}
            maxZoom={18}
          />
          
          {/* TMS Overlay Layer */}
          {selectedLayer && (
            <TileLayer 
              key={selectedLayer.id} // Force re-render when layer changes
              url={getTileLayerUrl(selectedLayer)} 
              opacity={0.8}
              attribution="TMS Layer"
              errorTileUrl="" // Prevent error tile display
              maxZoom={selectedLayer.config?.maxzoom || 22}
            />
          )}
        </MapContainer>
      </div>
      
      {/* Status Bar */}
      <div className="mt-2 text-sm text-gray-500 text-center">
        {layers.length > 0 ? 
          `${layers.length} TMS-Layer verfügbar` : 
          'Keine TMS-Layer gefunden'
        }
        {selectedLayer && ` • Aktiver Layer: ${selectedLayer.fileName || selectedLayer.id}`}
      </div>
    </>
  )
}

export default Map