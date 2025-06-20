// ServiceTaskManager.jsx
import React, { useState } from 'react';
import {
  FaServer,
  FaMicrochip,
  FaMemory,
  FaNetworkWired,
  FaPlay,
  FaStop,
  FaRedo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartLine,
  FaTerminal,
  FaCog,
  FaDatabase,
  FaShieldAlt,
  FaGlobe,
  FaVideo,
  FaRobot,
  FaTrafficLight
} from 'react-icons/fa';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Service Icons Map
const serviceIcons = {
  'api-gateway': FaGlobe,
  'database': FaDatabase,
  'auth-service': FaShieldAlt,
  'video-service': FaVideo,
  'ai-service': FaRobot,
  'traffic-control': FaTrafficLight,
  'monitoring': FaChartLine,
  'backup': FaServer,
  'default': FaCog
};

// Mock Services Data (in Produktion würde das vom Backend kommen)
const mockServices = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    status: 'running',
    cpu: 35,
    memory: 2048,
    memoryMax: 4096,
    network: { in: 125, out: 89 },
    uptime: 3600 * 24 * 7, // 7 Tage in Sekunden
    port: 3000,
    pid: 12345,
    version: '2.4.1',
    lastRestart: new Date(Date.now() - 3600 * 24 * 7 * 1000),
    errors: 0,
    requests: 125000
  },
  {
    id: 'database',
    name: 'PostgreSQL Database',
    status: 'running',
    cpu: 15,
    memory: 8192,
    memoryMax: 16384,
    network: { in: 45, out: 32 },
    uptime: 3600 * 24 * 30,
    port: 5432,
    pid: 12346,
    version: '14.2',
    lastRestart: new Date(Date.now() - 3600 * 24 * 30 * 1000),
    errors: 0,
    requests: 0,
    connections: 45
  },
  {
    id: 'auth-service',
    name: 'Authentication Service',
    status: 'running',
    cpu: 8,
    memory: 512,
    memoryMax: 1024,
    network: { in: 12, out: 8 },
    uptime: 3600 * 24 * 2,
    port: 3001,
    pid: 12347,
    version: '1.2.0',
    lastRestart: new Date(Date.now() - 3600 * 24 * 2 * 1000),
    errors: 2,
    requests: 45000
  },
  {
    id: 'video-service',
    name: 'Video Streaming Service',
    status: 'warning',
    cpu: 78,
    memory: 3072,
    memoryMax: 4096,
    network: { in: 890, out: 1250 },
    uptime: 3600 * 12,
    port: 3002,
    pid: 12348,
    version: '3.1.0',
    lastRestart: new Date(Date.now() - 3600 * 12 * 1000),
    errors: 15,
    requests: 8900
  },
  {
    id: 'ai-service',
    name: 'AI Traffic Optimizer',
    status: 'running',
    cpu: 45,
    memory: 2560,
    memoryMax: 4096,
    network: { in: 67, out: 45 },
    uptime: 3600 * 24,
    port: 3003,
    pid: 12349,
    version: '1.0.5',
    lastRestart: new Date(Date.now() - 3600 * 24 * 1000),
    errors: 0,
    requests: 12000
  },
  {
    id: 'traffic-control',
    name: 'Traffic Control System',
    status: 'error',
    cpu: 0,
    memory: 0,
    memoryMax: 2048,
    network: { in: 0, out: 0 },
    uptime: 0,
    port: 3004,
    pid: null,
    version: '2.0.0',
    lastRestart: new Date(),
    errors: 125,
    requests: 0
  },
  {
    id: 'monitoring',
    name: 'Monitoring Service',
    status: 'running',
    cpu: 22,
    memory: 768,
    memoryMax: 2048,
    network: { in: 156, out: 89 },
    uptime: 3600 * 24 * 14,
    port: 3005,
    pid: 12350,
    version: '1.5.2',
    lastRestart: new Date(Date.now() - 3600 * 24 * 14 * 1000),
    errors: 0,
    requests: 567000
  },
  {
    id: 'backup',
    name: 'Backup Service',
    status: 'running',
    cpu: 5,
    memory: 256,
    memoryMax: 512,
    network: { in: 2, out: 156 },
    uptime: 3600 * 24 * 60,
    port: 3006,
    pid: 12351,
    version: '1.1.0',
    lastRestart: new Date(Date.now() - 3600 * 24 * 60 * 1000),
    errors: 0,
    requests: 0
  }
];

// Hilfsfunktionen
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatMemory = (mb) => {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

// Service Card Component
const ServiceCard = ({ service, onAction, expanded, onToggleExpand }) => {
  const Icon = serviceIcons[service.id] || serviceIcons.default;
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'stopped': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };
  
  const getStatusBgColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/20';
      case 'stopped': return 'bg-gray-50 dark:bg-gray-900/20';
      default: return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };
  
  const StatusIcon = {
    running: FaCheckCircle,
    warning: FaExclamationTriangle,
    error: FaTimesCircle,
    stopped: FaStop
  }[service.status] || FaExclamationTriangle;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
      expanded ? 'col-span-2 row-span-2' : ''
    }`}>
      {/* Header */}
      <div className={`p-4 border-b dark:border-gray-700 ${getStatusBgColor(service.status)}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Icon className={`text-2xl ${getStatusColor(service.status)}`} />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{service.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <StatusIcon className={`${getStatusColor(service.status)}`} />
                <span className="capitalize">{service.status}</span>
                {service.pid && <span>• PID: {service.pid}</span>}
                <span>• Port: {service.port}</span>
                <span>• v{service.version}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onToggleExpand(service.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? '⊟' : '⊞'}
          </button>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="p-4 space-y-4">
        {/* CPU Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <FaMicrochip /> CPU
            </span>
            <span className="font-medium">{service.cpu}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                service.cpu > 80 ? 'bg-red-500' : 
                service.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${service.cpu}%` }}
            />
          </div>
        </div>
        
        {/* Memory Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <FaMemory /> Memory
            </span>
            <span className="font-medium">
              {formatMemory(service.memory)} / {formatMemory(service.memoryMax)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                (service.memory / service.memoryMax) * 100 > 80 ? 'bg-red-500' : 
                (service.memory / service.memoryMax) * 100 > 60 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(service.memory / service.memoryMax) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Network */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <FaNetworkWired className="text-green-500" />
            <span>↓ {formatBytes((service.network?.in || 0) * 1024)}/s</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <FaNetworkWired className="text-blue-500" />
            <span>↑ {formatBytes((service.network?.out || 0) * 1024)}/s</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <FaClock />
            <span>Uptime: {formatUptime(service.uptime)}</span>
          </div>
          {service.requests > 0 && (
            <div>Requests: {service.requests.toLocaleString()}</div>
          )}
          {service.connections !== undefined && (
            <div>Connections: {service.connections}</div>
          )}
          {service.errors > 0 && (
            <div className="text-red-500">Errors: {service.errors}</div>
          )}
        </div>
        
        {/* Expanded view mit History Chart */}
        {expanded && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Resource History (Last Hour)
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateMockHistory()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone"
                    dataKey="cpu"
                    stroke="#4F46E5"
                    fill="url(#cpuGradient)"
                    dot={false}
                  />
                  <Area 
                    type="monotone"
                    dataKey="memory"
                    stroke="#10B981"
                    fill="url(#memoryGradient)"
                    dot={false}
                  />
                  <defs>
                    <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 0.8 }} />
                      <stop offset="100%" style={{ stopColor: '#4F46E5', stopOpacity: 0 }} />
                    </linearGradient>
                    <linearGradient id="memoryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.8 }} />
                      <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const generateMockHistory = () => {
  return [
    { time: '10:00', cpu: 20, memory: 30 },
    { time: '10:05', cpu: 25, memory: 35 },
    { time: '10:10', cpu: 30, memory: 40 },
  ];
};

const ServiceTaskManager = ({ services = [] }) => {
  const [expandedService, setExpandedService] = useState(null);

  return (
    <div>
      {services.length === 0 ? (
        <div className="text-gray-500 p-4">Keine Service-Daten vom Backend geladen.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              expanded={expandedService === service.id}
              onToggleExpand={(id) => setExpandedService(expandedService === id ? null : id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceTaskManager;
