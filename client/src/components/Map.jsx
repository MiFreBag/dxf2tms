import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const API = '/api'

function Map() {
  const [layers, setLayers] = useState([])
  const [selected, setSelected] = useState('')
  const [useMapServer, setUseMapServer] = useState(false)

  useEffect(() => {
    fetch(`${API}/tms`).then(r => r.json()).then(setLayers).catch(console.error)
  }, [])

  // Helper für TileLayer-URL (Leaflet erwartet absoluten Pfad)
  const getTileLayerUrl = (layer) => {
    // Backend liefert z.B. /static/uuid
    // Wir brauchen /static/uuid/{z}/{x}/{y}.png
    if (!layer) return '';
    return `${layer.url}/{z}/{x}/{y}.png`;
  };

  const current = layers.find(l => l.id === selected)

  const toggleMapServer = () => {
    setUseMapServer(!useMapServer)
  }

  return (
    <>
      <div className="mb-2">
        <select value={selected} onChange={e => setSelected(e.target.value)} className="border p-1">
          <option value="">-- select layer --</option>
          {layers.map(l => (
            <option key={l.id} value={l.id}>{l.id}</option>
          ))}
        </select>
        <button onClick={toggleMapServer} className="ml-2 p-1 border">
          {useMapServer ? 'Disable MapServer' : 'Enable MapServer'}
        </button>
      </div>
      <MapContainer center={[47.3769, 8.5417]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url={useMapServer
            ? "http://10.254.64.14/styles/basic-preview/512/{z}/{x}/{y}.png"
            : "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg"}
          attribution={useMapServer
            ? "&copy; <a href='https://www.maptiler.com/'>Maptiler</a>"
            : "&copy; <a href='https://www.geo.admin.ch/'>geo.admin.ch</a>"}
        />
        {current && (
          <TileLayer url={getTileLayerUrl(current)} />
        )}
      </MapContainer>
    </>
  )
}

export default Map

