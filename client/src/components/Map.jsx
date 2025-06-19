import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const API = '/api'

function Map() {
  const [layers, setLayers] = useState([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    fetch(`${API}/tms`).then(r => r.json()).then(setLayers).catch(console.error)
  }, [])

  const current = layers.find(l => l.id === selected)

  return (
    <>
      <div className="mb-2">
        <select value={selected} onChange={e => setSelected(e.target.value)} className="border p-1">
          <option value="">-- select layer --</option>
          {layers.map(l => (
            <option key={l.id} value={l.id}>{l.id}</option>
          ))}
        </select>
      </div>
      <MapContainer center={[47.3769, 8.5417]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg"
          attribution="&copy; <a href='https://www.geo.admin.ch/'>geo.admin.ch</a>"
        />
        {current && (
          <TileLayer url={`${current.url}/{z}/{x}/{y}.png`} />
        )}
      </MapContainer>
    </>
  )
}

export default Map

