import { useState, useEffect } from 'react'
import { 
  Download, 
  Key, 
  Link, 
  Copy, 
  Plus, 
  Trash2,
  RefreshCw,
  Shield,
  Globe,
  Code,
  FileDown,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Send
} from 'lucide-react'

const ExportIntegration = ({ token, files, selectedFiles }) => {
  const [activeTab, setActiveTab] = useState('export')
  const [apiKeys, setApiKeys] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [showCreateWebhook, setShowCreateWebhook] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    format: 'geojson',
    includeMetadata: true,
    compression: 'none'
  })

  // Export-Formate
  const exportFormats = [
    { value: 'geojson', label: 'GeoJSON', icon: '{ }' },
    { value: 'kml', label: 'KML/KMZ', icon: '🌍' },
    { value: 'shapefile', label: 'Shapefile', icon: '📦' },
    { value: 'geopackage', label: 'GeoPackage', icon: '📊' },
    { value: 'dxf', label: 'DXF', icon: '📐' },
    { value: 'csv', label: 'CSV (Punktdaten)', icon: '📄' }
  ]

  // API Keys laden
  useEffect(() => {
    // Beispieldaten - in echter App von API laden
    setApiKeys([
      {
        id: '1',
        name: 'Production API',
        key: 'sk_live_4242424242424242',
        created: '2024-01-15',
        lastUsed: '2024-01-20',
        permissions: ['read', 'write', 'delete']
      },
      {
        id: '2',
        name: 'Development',
        key: 'sk_test_1234567890123456',
        created: '2024-01-10',
        lastUsed: 'Nie',
        permissions: ['read']
      }
    ])

    setWebhooks([
      {
        id: '1',
        url: 'https://example.com/webhook/conversion',
        events: ['file.converted', 'tms.created'],
        active: true,
        lastTriggered: '2024-01-20 14:30'
      }
    ])
  }, [])

  // Export Tab
  const ExportTab = () => {
    const [exporting, setExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)

    const handleExport = async () => {
      if (selectedFiles.length === 0) {
        alert('Bitte wähle mindestens eine Datei aus')
        return
      }

      setExporting(true)
      setExportProgress(0)

      // Simuliere Export-Fortschritt
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setExporting(false)
            // Download starten
            const blob = new Blob(['Export data'], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `export_${exportOptions.format}_${Date.now()}.${exportOptions.format}`
            a.click()
            URL.revokeObjectURL(url)
            return 100
          }
          return prev + 10
        })
      }, 200)
    }

    return (
      <div className="space-y-6">
        {/* Format-Auswahl */}
        <div>
          <h3 className="text-lg font-medium mb-3">Export-Format</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {exportFormats.map(format => (
              <button
                key={format.value}
                onClick={() => setExportOptions({ ...exportOptions, format: format.value })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exportOptions.format === format.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{format.icon}</div>
                <div className="font-medium">{format.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Export-Optionen */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Optionen</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => setExportOptions({ ...exportOptions, includeMetadata: e.target.checked })}
                className="rounded"
              />
              <span>Metadaten einschließen</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">Komprimierung</label>
              <select
                value={exportOptions.compression}
                onChange={(e) => setExportOptions({ ...exportOptions, compression: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="none">Keine</option>
                <option value="zip">ZIP</option>
                <option value="gzip">GZIP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ausgewählte Dateien */}
        <div>
          <h4 className="font-medium mb-2">
            Ausgewählte Dateien ({selectedFiles.length})
          </h4>
          {selectedFiles.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Dateien ausgewählt</p>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {selectedFiles.map(id => {
                const file = files.find(f => f.id === id)
                return file ? (
                  <div key={id} className="text-sm py-1">{file.name}</div>
                ) : null
              })}
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || selectedFiles.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Exportiere... {exportProgress}%
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export starten
            </>
          )}
        </button>

        {/* Fortschrittsbalken */}
        {exporting && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // API Keys Tab
  const ApiKeysTab = () => {
    const [showKey, setShowKey] = useState({})

    const createApiKey = (data) => {
      const newKey = {
        id: Date.now().toString(),
        name: data.name,
        key: `sk_${data.type}_${Math.random().toString(36).substr(2, 16)}`,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Nie',
        permissions: data.permissions
      }
      setApiKeys([...apiKeys, newKey])
      setShowCreateKey(false)
    }

    const deleteApiKey = (id) => {
      if (confirm('API-Schlüssel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        setApiKeys(apiKeys.filter(key => key.id !== id))
      }
    }

    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text)
      // Feedback geben
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">API-Schlüssel</h3>
            <p className="text-sm text-gray-500 mt-1">Verwalte API-Zugriffe für externe Anwendungen</p>
          </div>
          <button
            onClick={() => setShowCreateKey(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Schlüssel
          </button>
        </div>

        {/* API Keys Liste */}
        <div className="space-y-3">
          {apiKeys.map(apiKey => (
            <div key={apiKey.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <h4 className="font-medium">{apiKey.name}</h4>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {showKey[apiKey.id] ? apiKey.key : '••••••••••••' + apiKey.key.slice(-4)}
                    </code>
                    <button
                      onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>Erstellt: {apiKey.created}</span>
                    <span>Zuletzt genutzt: {apiKey.lastUsed}</span>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {apiKey.permissions.join(', ')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteApiKey(apiKey.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* API Dokumentation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">API-Dokumentation</h4>
          <p className="text-sm text-blue-800 mb-3">
            Nutze die API um programmatisch auf deine Dateien zuzugreifen.
          </p>
          <div className="space-y-2">
            <CodeExample
              title="Dateien abrufen"
              code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.example.com/v1/files`}
            />
            <CodeExample
              title="Datei konvertieren"
              code={`curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"format": "geojson", "fileId": "123"}' \\
  https://api.example.com/v1/convert`}
            />
          </div>
        </div>
      </div>
    )
  }

  // Webhooks Tab
  const WebhooksTab = () => {
    const webhookEvents = [
      { value: 'file.uploaded', label: 'Datei hochgeladen' },
      { value: 'file.converted', label: 'Datei konvertiert' },
      { value: 'tms.created', label: 'TMS erstellt' },
      { value: 'file.deleted', label: 'Datei gelöscht' },
      { value: 'export.completed', label: 'Export abgeschlossen' }
    ]

    const createWebhook = (data) => {
      const newWebhook = {
        id: Date.now().toString(),
        url: data.url,
        events: data.events,
        active: true,
        lastTriggered: 'Nie'
      }
      setWebhooks([...webhooks, newWebhook])
      setShowCreateWebhook(false)
    }

    const toggleWebhook = (id) => {
      setWebhooks(webhooks.map(w => 
        w.id === id ? { ...w, active: !w.active } : w
      ))
    }

    const testWebhook = async (webhook) => {
      // Simuliere Webhook-Test
      alert(`Test-Webhook gesendet an: ${webhook.url}`)
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Webhooks</h3>
            <p className="text-sm text-gray-500 mt-1">Empfange Echtzeit-Benachrichtigungen über Ereignisse</p>
          </div>
          <button
            onClick={() => setShowCreateWebhook(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Webhook
          </button>
        </div>

        {/* Webhooks Liste */}
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link className="w-4 h-4 text-gray-400" />
                    <code className="text-sm font-mono">{webhook.url}</code>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      webhook.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {webhook.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {webhook.events.map(event => (
                      <span key={event} className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {webhookEvents.find(e => e.value === event)?.label || event}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Zuletzt ausgelöst: {webhook.lastTriggered}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testWebhook(webhook)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Webhook testen"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleWebhook(webhook.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      webhook.active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        webhook.active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setWebhooks(webhooks.filter(w => w.id !== webhook.id))}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Webhook Payload Beispiel */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Beispiel Webhook Payload</h4>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`{
  "event": "file.converted",
  "timestamp": "2024-01-20T14:30:00Z",
  "data": {
    "fileId": "abc123",
    "fileName": "example.dxf",
    "format": "pdf",
    "size": 2048000,
    "url": "https://api.example.com/files/abc123"
  }
}`}
          </pre>
        </div>
      </div>
    )
  }

  // Hilfsfunktionen
  const CodeExample = ({ title, code }) => (
    <div className="bg-white rounded p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{title}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Kopieren
        </button>
      </div>
      <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
        {code}
      </pre>
    </div>
  )

  // Create API Key Dialog
  const CreateApiKeyDialog = () => {
    const [keyData, setKeyData] = useState({
      name: '',
      type: 'live',
      permissions: ['read']
    })

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4">Neuer API-Schlüssel</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={keyData.name}
                onChange={(e) => setKeyData({ ...keyData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="z.B. Production API"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Typ</label>
              <select
                value={keyData.type}
                onChange={(e) => setKeyData({ ...keyData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="live">Live</option>
                <option value="test">Test</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Berechtigungen</label>
              <div className="space-y-2">
                {['read', 'write', 'delete'].map(perm => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={keyData.permissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setKeyData({ ...keyData, permissions: [...keyData.permissions, perm] })
                        } else {
                          setKeyData({ ...keyData, permissions: keyData.permissions.filter(p => p !== perm) })
                        }
                      }}
                    />
                    <span className="capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowCreateKey(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Abbrechen
            </button>
            <button
              onClick={() => createApiKey(keyData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Erstellen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Create Webhook Dialog
  const CreateWebhookDialog = () => {
    const [webhookData, setWebhookData] = useState({
      url: '',
      events: []
    })

    const webhookEvents = [
      { value: 'file.uploaded', label: 'Datei hochgeladen' },
      { value: 'file.converted', label: 'Datei konvertiert' },
      { value: 'tms.created', label: 'TMS erstellt' },
      { value: 'file.deleted', label: 'Datei gelöscht' },
      { value: 'export.completed', label: 'Export abgeschlossen' }
    ]

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4">Neuer Webhook</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookData.url}
                onChange={(e) => setWebhookData({ ...webhookData, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://example.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ereignisse</label>
              <div className="space-y-2">
                {webhookEvents.map(event => (
                  <label key={event.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={webhookData.events.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookData({ ...webhookData, events: [...webhookData.events, event.value] })
                        } else {
                          setWebhookData({ ...webhookData, events: webhookData.events.filter(e => e !== event.value) })
                        }
                      }}
                    />
                    <span>{event.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowCreateWebhook(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Abbrechen
            </button>
            <button
              onClick={() => createWebhook(webhookData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Erstellen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Export & Integration</h2>
        <p className="text-gray-600 mt-1">Exportiere Daten und integriere mit externen Systemen</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileDown className="w-4 h-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            API-Schlüssel
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4 inline mr-2" />
            Webhooks
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'api' && <ApiKeysTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
      </div>

      {/* Dialogs */}
      {showCreateKey && <CreateApiKeyDialog />}
      {showCreateWebhook && <CreateWebhookDialog />}
    </div>
  )
}

export default ExportIntegration