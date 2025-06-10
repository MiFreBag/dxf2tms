import { useState, useEffect } from 'react'
import { Upload, FileText, Download, Map as MapIcon } from 'lucide-react'
import Map from './Map.jsx'
import Login from './Login.jsx'
import './index.css'

const API = '/api'

function App() {
  const [files, setFiles] = useState([])
  const [page, setPage] = useState('upload')
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const refresh = () => {
    fetch(`${API}/files`, { headers: authHeaders })
      .then(r => r.json())
      .then(setFiles)
      .catch(console.error)
  }

  useEffect(() => {
    if (token) refresh()
  }, [token])

  const handleLogin = async (username, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
    } else {
      alert('Login fehlgeschlagen')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    await fetch(`${API}/upload`, { method: 'POST', body, headers: authHeaders })
    e.target.value = ''
    refresh()
  }

  const handleConvert = async (id) => {
    await fetch(`${API}/convert/${id}`, { method: 'POST', headers: authHeaders })
    refresh()
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-900 text-white p-4 text-lg font-semibold">
        Stadt Z\u00fcrich DAV
      </header>
      <div className="flex flex-1">
        <div className="w-48 bg-gray-100 p-4 space-y-2">
          <button
            onClick={() => setPage('upload')}
            className={`flex items-center gap-2 w-full text-left ${page === 'upload' ? 'font-bold' : ''}`}
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            onClick={() => setPage('map')}
            className={`flex items-center gap-2 w-full text-left ${page === 'map' ? 'font-bold' : ''}`}
          >
            <MapIcon className="w-4 h-4" /> Map
          </button>
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" /> DXF2GeoPDF
          </h1>
          {page === 'upload' && (
            <>
              <input type="file" accept=".dxf" onChange={handleUpload} className="mb-4" />
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id} className="border-t">
                      <td className="p-2">{f.name}</td>
                      <td className="p-2 space-x-2">
                        {!f.converted && (
                          <button className="text-blue-500" onClick={() => handleConvert(f.id)}>
                            <Upload className="inline w-4 h-4" /> Convert
                          </button>
                        )}
                        {f.converted && (
                          <a className="text-green-600" href={`${API}/download/${f.id}?token=${token}`}>
                            <Download className="inline w-4 h-4" /> Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {page === 'map' && <Map />}
        </div>
      </div>
    </div>
  )
}

export default App
