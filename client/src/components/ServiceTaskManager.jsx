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
  FaCog,
  FaPause,
  FaPlusCircle
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
  if (bytes === null || bytes === undefined || isNaN(parseFloat(bytes))) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatMemory = (mb) => {
  if (mb === null || mb === undefined || isNaN(parseFloat(mb))) return 'N/A';
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const interpretDockerStatus = (statusString) => {
  if (!statusString) return { text: 'Unknown', color: 'text-gray-500', icon: FaExclamationTriangle };
  const lowerStatus = statusString.toLowerCase();

  if (lowerStatus.includes('up') || lowerStatus.includes('running')) {
    return { text: 'Running', color: 'text-green-500', icon: FaCheckCircle };
  } else if (lowerStatus.includes('exited') || lowerStatus.includes('stopped')) {
    return { text: 'Stopped', color: 'text-gray-500', icon: FaStop };
  } else if (lowerStatus.includes('restarting')) {
    return { text: 'Restarting', color: 'text-yellow-500', icon: FaRedo };
  } else if (lowerStatus.includes('paused')) {
    return { text: 'Paused', color: 'text-blue-500', icon: FaPause };
  } else if (lowerStatus.includes('created')) {
    return { text: 'Created', color: 'text-indigo-500', icon: FaPlusCircle };
  }
  return { text: statusString, color: 'text-yellow-500', icon: FaExclamationTriangle };
};

// Service Card Component
const ServiceCard = ({ service }) => {
  const serviceType = service.name ? service.name.toLowerCase().split(' ')[0] : 'default';
  const Icon = serviceIcons[serviceType] || serviceIcons.default;
  // Backend liefert bereits interpretierten Status oder wir interpretieren hier
  // Annahme: service.status ist der rohe String vom Docker Backend
  const interpretedStatus = service.interpretedStatus || interpretDockerStatus(service.status);

  const getStatusBgColor = (status) => {
    // Nutzt den interpretierten Text für die Farbe
    switch (status) {
      case 'running': return 'bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/20';
      case 'stopped': return 'bg-gray-50 dark:bg-gray-900/20';
      default: return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const StatusIcon = interpretedStatus.icon;
  const cpuUsage = service.cpu || 0;
  const memoryUsage = service.memory || 0; // in MB
  const memoryMax = service.memoryMax || 0; // in MB
  const memoryPercentage = memoryMax > 0 ? (memoryUsage / memoryMax) * 100 : 0;


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
                {service.id && <span className="truncate"> • ID: {service.id}</span>}
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
            <span className="font-medium">{cpuUsage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                cpuUsage > 80 ? 'bg-red-500' : 
                cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
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
        {(memoryUsage !== null && memoryMax !== null && memoryMax > 0) && (
         <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <FaMemory /> Memory
              </span>
              <span className="font-medium">
                {formatMemory(service.memory)} / {formatMemory(service.memoryMax)}
                {/* {formatMemory(memoryUsage)} / {formatMemory(memoryMax)} */}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  memoryPercentage > 80 ? 'bg-red-500' : 
                  memoryPercentage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${memoryPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Network */}
        {service.network && (service.network.in !== null || service.network.out !== null) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <FaNetworkWired className="text-green-500" />
              {/* Annahme: Backend liefert Bytes/s, oder anpassen falls KB/s */}
              <span>↓ {formatBytes(service.network?.in || 0)}/s</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <FaNetworkWired className="text-blue-500" />
              <span>↑ {formatBytes(service.network?.out || 0)}/s</span>
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
          {/* Diese Felder (requests, connections, errors) sind schwer direkt von Docker zu bekommen */}
          {/* Sie könnten Applikations-spezifisch sein oder aus Log-Analyse stammen */}
          {/* Vorerst auskommentiert oder als optional betrachten */}
          {/* {service.requests > 0 && (
            <div>Requests: {service.requests.toLocaleString()}</div>
          )}
          {service.connections !== undefined && (
            <div>Connections: {service.connections}</div>
          )}
          {service.errors > 0 && (
            <div className="text-red-500">Errors: {service.errors}</div>
          )} */}
        </div>

        {/* Logs */}
        {service.logs && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Logs:</h4>
            <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
              {service.logs}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button 
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed" 
            disabled={!['Stopped', 'Exited', 'Created'].includes(interpretedStatus.text)}
            onClick={() => console.log("Start action for:", service.id)} // Placeholder
          >
            Start
          </button>
          <button 
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed" 
            disabled={interpretedStatus.text !== 'Running'}
            onClick={() => console.log("Stop action for:", service.id)} // Placeholder
          >
            Stop
          </button>
          <button 
            className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed" 
            disabled={interpretedStatus.text !== 'Running'}
            onClick={() => console.log("Restart action for:", service.id)} // Placeholder
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceTaskManager = () => {
  const [servicesData, setServicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedServices, setProcessedServices] = useState([]);

  const fetchDockerServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/containers'); // Korrigierter Endpunkt
      const data = response.data;
      // Kombiniere Container, Images, Volumes zu einer Service-Liste
      const services = [];
      if (Array.isArray(data.containers)) {
        services.push(...data.containers.map(c => ({
          ...c,
          name: c.name || c.id,
          status: c.status,
          image: c.image,
          created: c.created,
        })));
      }
      // Optional: Images und Volumes als weitere Services einfügen
      // if (Array.isArray(data.images)) { ... }
      setServicesData(services);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError(err.message || "Failed to fetch services from backend.");
      setServicesData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockerServices();
    // Optional: Polling einrichten, um die Daten regelmäßig zu aktualisieren
    // const intervalId = setInterval(fetchDockerServices, 30000); // Alle 30 Sekunden
    // return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (Array.isArray(servicesData)) {
      const newProcessedServices = servicesData.map(service => ({
        ...service,
        interpretedStatus: interpretDockerStatus(service.status) // service.status ist der rohe String
      }));
      setProcessedServices(newProcessedServices);
    } else {
      setProcessedServices([]);
    }
  }, [servicesData]);

  const activeServices = processedServices.filter(s => s.interpretedStatus.text === 'Running' || s.interpretedStatus.text === 'Restarting' || s.interpretedStatus.text === 'Paused' || s.interpretedStatus.text === 'Created');
  const stoppedServices = processedServices.filter(s => s.interpretedStatus.text === 'Stopped' || s.interpretedStatus.text === 'Exited');
  const otherServices = processedServices.filter(s => !['Running', 'Restarting', 'Paused', 'Created', 'Stopped', 'Exited'].includes(s.interpretedStatus.text));

  if (loading) {
    return <div className="p-4 text-center text-gray-600 dark:text-gray-300">Lade Service-Daten...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Fehler beim Laden der Daten: {error} <button onClick={fetchDockerServices} className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Erneut versuchen</button></div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Service Task Manager</h2>
        <button 
          onClick={fetchDockerServices} 
          className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
          disabled={loading}
        >
          <FaRedo className={loading ? "animate-spin" : ""} />
          Aktualisieren
        </button>
      </div>
      
      {processedServices.length === 0 && !loading ? (
        <div className="text-gray-500 dark:text-gray-400 p-4 text-center">Keine Services gefunden oder Daten verfügbar.</div>
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

          {stoppedServices.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Gestoppte / Beendete Services ({stoppedServices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stoppedServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}

          {otherServices.length > 0 && (
             <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Andere Statuswerte ({otherServices.length})</h3>
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