// ServiceTaskManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaServer,
  FaMicrochip,
  FaMemory,
  FaNetworkWired,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaStop,
  FaPlay,
  FaRedo,
  FaCog
} from 'react-icons/fa';

// Service Icons Mapping
const serviceIcons = {
  'api': FaServer,
  'database': FaServer,
  'auth': FaServer,
  'video': FaServer,
  'ai': FaServer,
  'traffic': FaServer,
  'monitoring': FaServer,
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
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatMemory = (mb) => {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const interpretDockerStatus = (statusString) => {
  if (!statusString) return { text: 'Unknown', color: 'text-gray-500', icon: FaExclamationTriangle };
  const lowerStatus = statusString.toLowerCase();

  if (lowerStatus.includes('up') || lowerStatus.includes('running')) {
    return { text: 'Running', color: 'text-green-500', icon: FaCheckCircle };
  } else if (lowerStatus.includes('exited') || lowerStatus.includes('stopped')) {
    return { text: 'Exited', color: 'text-gray-500', icon: FaStop };
  } else if (lowerStatus.includes('restarting')) {
    return { text: 'Restarting', color: 'text-yellow-500', icon: FaRedo };
  } else if (lowerStatus.includes('paused')) {
    return { text: 'Paused', color: 'text-blue-500', icon: FaPlay };
  } else if (lowerStatus.includes('created')) {
    return { text: 'Created', color: 'text-blue-500', icon: FaPlay };
  }
  return { text: statusString, color: 'text-yellow-500', icon: FaExclamationTriangle };
};

// Service Card Component
const ServiceCard = ({ service }) => {
  const serviceType = service.name ? service.name.toLowerCase().split(' ')[0] : 'default';
  const Icon = serviceIcons[serviceType] || serviceIcons.default;
  const interpretedStatus = interpretDockerStatus(service.status);

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/20';
      case 'stopped': return 'bg-gray-50 dark:bg-gray-900/20';
      default: return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const StatusIcon = interpretedStatus.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b dark:border-gray-700 ${getStatusBgColor(interpretedStatus.text.toLowerCase())}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Icon className={`text-2xl ${interpretedStatus.color}`} />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{service.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <StatusIcon className={`${interpretedStatus.color}`} />
                <span className="capitalize">{interpretedStatus.text}</span>
                {service.id && <span className="truncate"> • ID: {service.id.substring(0,12)}</span>}
              </div>
            </div>
          </div>
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
            <span className="font-medium">{service.cpu || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                (service.cpu || 0) > 80 ? 'bg-red-500' : 
                (service.cpu || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${service.cpu || 0}%` }}
            />
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Image:</strong> {service.image && service.image.length > 0 ? service.image.join(', ') : 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Raw Status:</strong> {service.status}
          </p>
          {service.created && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Created:</strong> {new Date(service.created).toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Memory Usage */}
        {service.memory && service.memoryMax && (
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
        )}
        
        {/* Network */}
        {service.network && (
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
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          {service.uptime !== undefined && (
            <div className="flex items-center gap-1">
              <FaClock />
              <span>Uptime: {formatUptime(service.uptime)}</span>
            </div>
          )}
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

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={interpretedStatus.text !== 'Exited'}>
            Start
          </button>
          <button className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={interpretedStatus.text !== 'Running'}>
            Stop
          </button>
          <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={interpretedStatus.text !== 'Running'}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceTaskManager = ({ services = [] }) => {
  const [processedServices, setProcessedServices] = useState([]);

  useEffect(() => {
    if (Array.isArray(services)) {
      const newProcessedServices = services.map(service => ({
        ...service,
        interpretedStatus: interpretDockerStatus(service.status)
      }));
      setProcessedServices(newProcessedServices);
    } else {
      setProcessedServices([]);
    }
  }, [services]);

  const activeServices = processedServices.filter(s => s.interpretedStatus.text === 'Running' || s.interpretedStatus.text === 'Restarting' || s.interpretedStatus.text === 'Paused' || s.interpretedStatus.text === 'Created');
  const completedServices = processedServices.filter(s => s.interpretedStatus.text === 'Exited');
  const otherServices = processedServices.filter(s => !['Running', 'Restarting', 'Paused', 'Created', 'Exited'].includes(s.interpretedStatus.text));

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Service Task Manager</h2>
      {processedServices.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 p-4 text-center">Keine Service-Daten vom Backend geladen oder keine Services vorhanden.</div>
      ) : (
        <>
          {activeServices.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Aktive Services ({activeServices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}

          {completedServices.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Abgeschlossene Tasks / Beendete Services ({completedServices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}

          {otherServices.length > 0 && (
             <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Andere Status ({otherServices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ServiceTaskManager;