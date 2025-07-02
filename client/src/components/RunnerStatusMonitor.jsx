import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

const RunnerStatusMonitor = ({ api = '/api', token, addMessage }) => {
  const [runners, setRunners] = useState([])

  const fetchStatus = async () => {
    if (!token) return
    try {
      const res = await fetch(`${api}/runners/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setRunners(await res.json())
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      console.error('Failed to fetch runner status', err)
      addMessage && addMessage('Fehler beim Laden der Runner-Status', 'error')
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [token])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Runner Status Monitor</h2>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <table className="min-w-full bg-white rounded shadow divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {runners.map((r) => (
            <tr key={r.id || r.name}>
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2">{r.status}</td>
            </tr>
          ))}
          {runners.length === 0 && (
            <tr>
              <td colSpan="2" className="px-4 py-2 text-center text-gray-500">
                Keine Daten verfügbar
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default RunnerStatusMonitor
