import { useState, useEffect } from 'react'
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Zap,
  Mail,
  FileText,
  ArrowRight,
  Bell,
  Clock,
  Filter
} from 'lucide-react'

const WorkflowAutomation = ({ token }) => {
  const [workflows, setWorkflows] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState(null)

  // Workflow-Typen
  const workflowTypes = {
    autoConvert: {
      name: 'Automatische Konvertierung',
      icon: <Zap className="w-5 h-5" />,
      description: 'Konvertiert Dateien automatisch nach Upload'
    },
    notification: {
      name: 'E-Mail Benachrichtigung',
      icon: <Mail className="w-5 h-5" />,
      description: 'Sendet E-Mail bei bestimmten Ereignissen'
    },
    schedule: {
      name: 'Zeitgesteuerte Aufgabe',
      icon: <Clock className="w-5 h-5" />,
      description: 'Führt Aktionen zu bestimmten Zeiten aus'
    }
  }

  // Beispiel-Workflows laden
  useEffect(() => {
    // In echter Implementierung: API-Call
    setWorkflows([
      {
        id: '1',
        name: 'DXF Auto-Konvertierung',
        type: 'autoConvert',
        enabled: true,
        conditions: {
          fileType: '.dxf',
          minSize: 0,
          maxSize: 50 * 1024 * 1024 // 50MB
        },
        actions: {
          convert: {
            pageSize: 'A4',
            dpi: 300
          },
          createTms: {
            enabled: true,
            maxZoom: 18
          }
        },
        notifications: {
          email: true,
          emailTo: 'user@example.com'
        }
      },
      {
        id: '2',
        name: 'Große Dateien Benachrichtigung',
        type: 'notification',
        enabled: true,
        conditions: {
          fileType: 'any',
          minSize: 100 * 1024 * 1024 // 100MB
        },
        actions: {
          notify: {
            method: 'email',
            message: 'Große Datei wurde hochgeladen: {{fileName}} ({{fileSize}})'
          }
        }
      }
    ])
  }, [])

  const WorkflowCard = ({ workflow }) => {
    const type = workflowTypes[workflow.type]
    
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${workflow.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              {type.icon}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{workflow.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              
              {/* Bedingungen */}
              <div className="mt-3 space-y-1">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Bedingungen:</span>
                </div>
                {workflow.conditions.fileType && (
                  <div className="text-xs bg-gray-100 rounded px-2 py-1 inline-block">
                    Dateityp: {workflow.conditions.fileType}
                  </div>
                )}
                {workflow.conditions.minSize > 0 && (
                  <div className="text-xs bg-gray-100 rounded px-2 py-1 inline-block ml-1">
                    Min: {(workflow.conditions.minSize / 1024 / 1024).toFixed(0)} MB
                  </div>
                )}
              </div>
              
              {/* Aktionen */}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <ArrowRight className="w-3 h-3" />
                {workflow.actions.convert && <span>Konvertieren</span>}
                {workflow.actions.createTms?.enabled && <span>• TMS erstellen</span>}
                {workflow.actions.notify && <span>Benachrichtigen</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status Toggle */}
            <button
              onClick={() => toggleWorkflow(workflow.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                workflow.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  workflow.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            
            {/* Actions */}
            <button
              onClick={() => setEditingWorkflow(workflow)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteWorkflow(workflow.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const WorkflowEditor = ({ workflow, onSave, onCancel }) => {
    const [formData, setFormData] = useState(workflow || {
      name: '',
      type: 'autoConvert',
      enabled: true,
      conditions: {
        fileType: '.dxf',
        minSize: 0,
        maxSize: 0
      },
      actions: {
        convert: {
          enabled: true,
          pageSize: 'A4',
          dpi: 300
        },
        createTms: {
          enabled: false,
          maxZoom: 18
        }
      },
      notifications: {
        email: false,
        emailTo: '',
        webhook: false,
        webhookUrl: ''
      }
    })

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {workflow ? 'Workflow bearbeiten' : 'Neuer Workflow'}
          </h2>
          
          {/* Name und Typ */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="z.B. DXF Auto-Konvertierung"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Typ</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {Object.entries(workflowTypes).map(([key, type]) => (
                  <option key={key} value={key}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bedingungen */}
          <div className="mt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bedingungen
            </h3>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Dateityp</label>
                <select
                  value={formData.conditions.fileType}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, fileType: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="any">Alle Dateitypen</option>
                  <option value=".dxf">DXF</option>
                  <option value=".tif">TIF/TIFF</option>
                  <option value=".pdf">PDF</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Min. Größe (MB)</label>
                  <input
                    type="number"
                    value={formData.conditions.minSize / 1024 / 1024}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, minSize: e.target.value * 1024 * 1024 }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max. Größe (MB)</label>
                  <input
                    type="number"
                    value={formData.conditions.maxSize / 1024 / 1024}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, maxSize: e.target.value * 1024 * 1024 }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    placeholder="0 = unbegrenzt"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Aktionen */}
          {formData.type === 'autoConvert' && (
            <div className="mt-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Aktionen
              </h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                {/* Konvertierung */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions.convert.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          convert: { ...formData.actions.convert, enabled: e.target.checked }
                        }
                      })}
                    />
                    <span className="font-medium">PDF konvertieren</span>
                  </label>
                  {formData.actions.convert.enabled && (
                    <div className="ml-6 mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Seitengröße</label>
                        <select
                          value={formData.actions.convert.pageSize}
                          onChange={(e) => setFormData({
                            ...formData,
                            actions: {
                              ...formData.actions,
                              convert: { ...formData.actions.convert, pageSize: e.target.value }
                            }
                          })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="A0">A0</option>
                          <option value="A1">A1</option>
                          <option value="A2">A2</option>
                          <option value="A3">A3</option>
                          <option value="A4">A4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">DPI</label>
                        <input
                          type="number"
                          value={formData.actions.convert.dpi}
                          onChange={(e) => setFormData({
                            ...formData,
                            actions: {
                              ...formData.actions,
                              convert: { ...formData.actions.convert, dpi: e.target.value }
                            }
                          })}
                          className="w-full px-2 py-1 border rounded text-sm"
                          min="72"
                          max="1200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* TMS */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions.createTms?.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          createTms: { ...formData.actions.createTms, enabled: e.target.checked }
                        }
                      })}
                    />
                    <span className="font-medium">TMS erstellen</span>
                  </label>
                  {formData.actions.createTms?.enabled && (
                    <div className="ml-6 mt-2">
                      <label className="block text-sm mb-1">Max. Zoom</label>
                      <input
                        type="number"
                        value={formData.actions.createTms.maxZoom}
                        onChange={(e) => setFormData({
                          ...formData,
                          actions: {
                            ...formData.actions,
                            createTms: { ...formData.actions.createTms, maxZoom: e.target.value }
                          }
                        })}
                        className="w-32 px-2 py-1 border rounded text-sm"
                        min="1"
                        max="22"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Benachrichtigungen */}
          <div className="mt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Benachrichtigungen
            </h3>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, email: e.target.checked }
                    })}
                  />
                  <span className="font-medium">E-Mail Benachrichtigung</span>
                </label>
                {formData.notifications.email && (
                  <input
                    type="email"
                    value={formData.notifications.emailTo}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, emailTo: e.target.value }
                    })}
                    className="ml-6 mt-2 w-full px-2 py-1 border rounded text-sm"
                    placeholder="email@example.com"
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.webhook}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, webhook: e.target.checked }
                    })}
                  />
                  <span className="font-medium">Webhook</span>
                </label>
                {formData.notifications.webhook && (
                  <input
                    type="url"
                    value={formData.notifications.webhookUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, webhookUrl: e.target.value }
                    })}
                    className="ml-6 mt-2 w-full px-2 py-1 border rounded text-sm"
                    placeholder="https://example.com/webhook"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    )
  }

  const toggleWorkflow = (id) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ))
    // API-Call zum Aktualisieren
  }

  const deleteWorkflow = (id) => {
    if (confirm('Workflow wirklich löschen?')) {
      setWorkflows(workflows.filter(w => w.id !== id))
      // API-Call zum Löschen
    }
  }

  const saveWorkflow = (workflow) => {
    if (editingWorkflow) {
      // Update
      setWorkflows(workflows.map(w => 
        w.id === editingWorkflow.id ? { ...workflow, id: editingWorkflow.id } : w
      ))
    } else {
      // Create
      setWorkflows([...workflows, { ...workflow, id: Date.now().toString() }])
    }
    setEditingWorkflow(null)
    setShowCreateDialog(false)
    // API-Call zum Speichern
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow-Automatisierung</h2>
          <p className="text-gray-600 mt-1">Automatisiere wiederkehrende Aufgaben</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Neuer Workflow
        </button>
      </div>

      {/* Workflow Liste */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Noch keine Workflows erstellt</p>
            <p className="text-sm text-gray-500 mt-1">
              Erstelle deinen ersten Workflow um Aufgaben zu automatisieren
            </p>
          </div>
        ) : (
          workflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))
        )}
      </div>

      {/* Editor Dialog */}
      {(showCreateDialog || editingWorkflow) && (
        <WorkflowEditor
          workflow={editingWorkflow}
          onSave={saveWorkflow}
          onCancel={() => {
            setShowCreateDialog(false)
            setEditingWorkflow(null)
          }}
        />
      )}
    </div>
  )
}

export default WorkflowAutomation