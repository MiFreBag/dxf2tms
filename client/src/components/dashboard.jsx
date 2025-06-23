import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, HardDrive, Cpu, Users, TrendingUp, FileText, Layers, Clock } from 'lucide-react'

const Dashboard = ({ files, jobs, systemMetrics }) => {
  // Statistiken berechnen
  const stats = {
    totalFiles: files.length,
    convertedFiles: files.filter(f => f.converted).length,
    pendingFiles: files.filter(f => !f.converted).length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    activeJobs: jobs.filter(j => j.status === 'running').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length
  }

  // Daten für Charts
  const fileTypesData = [
    { name: 'DXF', value: files.filter(f => f.name.endsWith('.dxf')).length },
    { name: 'TIF/TIFF', value: files.filter(f => f.name.match(/\.tiff?$/)).length },
    { name: 'PDF', value: files.filter(f => f.name.endsWith('.pdf')).length }
  ]

  const conversionTrend = [
    { day: 'Mo', conversions: 12 },
    { day: 'Di', conversions: 19 },
    { day: 'Mi', conversions: 15 },
    { day: 'Do', conversions: 25 },
    { day: 'Fr', conversions: 22 },
    { day: 'Sa', conversions: 8 },
    { day: 'So', conversions: 5 }
  ]

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Übersicht über System und Konvertierungen</p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Dateien gesamt"
          value={stats.totalFiles}
          icon={<FileText className="w-8 h-8" />}
          trend="+12%"
          color="blue"
        />
        <StatCard
          title="Konvertiert"
          value={stats.convertedFiles}
          icon={<CheckCircle className="w-8 h-8" />}
          trend="+8%"
          color="green"
        />
        <StatCard
          title="Aktive Jobs"
          value={stats.activeJobs}
          icon={<Activity className="w-8 h-8" />}
          color="yellow"
        />
        <StatCard
          title="Speicherplatz"
          value={`${(stats.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`}
          icon={<HardDrive className="w-8 h-8" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dateitypen */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Dateitypen</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fileTypesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {fileTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Konvertierungstrend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Konvertierungen diese Woche</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="conversions" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System-Metriken */}
      {systemMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MetricCard
            title="CPU Auslastung"
            value={`${systemMetrics.cpu.usage}%`}
            icon={<Cpu className="w-6 h-6" />}
            progress={systemMetrics.cpu.usage}
            color="blue"
          />
          <MetricCard
            title="Arbeitsspeicher"
            value={`${(systemMetrics.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB`}
            subtitle={`von ${(systemMetrics.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB`}
            icon={<Activity className="w-6 h-6" />}
            progress={systemMetrics.memory.percentage}
            color="green"
          />
          <MetricCard
            title="Festplatte"
            value={`${systemMetrics.disk.percentage}%`}
            subtitle={`${(systemMetrics.disk.free / 1024 / 1024 / 1024).toFixed(1)} GB frei`}
            icon={<HardDrive className="w-6 h-6" />}
            progress={systemMetrics.disk.percentage}
            color="yellow"
          />
        </div>
      )}

      {/* Letzte Aktivitäten */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Letzte Aktivitäten</h3>
        </div>
        <div className="divide-y">
          {files.slice(0, 5).map(file => (
            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    Hochgeladen von {file.uploaded_by} • {new Date(file.uploaded_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                file.converted 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {file.converted ? 'Konvertiert' : 'Ausstehend'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hilfskomponenten
const StatCard = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, subtitle, icon, progress, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[progress > 80 ? 'red' : color]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default Dashboard