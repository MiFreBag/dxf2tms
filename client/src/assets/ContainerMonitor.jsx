// ContainerMonitor.jsx - Docker Container Monitoring Extension
import React, { useState, useEffect } from 'react';
import { FaDocker, FaCube, FaLayerGroup, FaNetworkWired, FaHdd, FaCodeBranch } from 'react-icons/fa';

const ContainerMonitor = ({ services }) => {
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [activeTab, setActiveTab] = useState('containers');

  useEffect(() => {
    if (services && Array.isArray(services)) {
      const fetchedContainers = services.map(service => {
        // Backend-Datenstruktur (Beispiel aus ServiceTaskManager):
        // { id: string, name: string, status: string, image: string[] }
        // ContainerMonitor erwartet:
        // { id, name, image, status (Anzeige), state (roh), created, ports, cpu, memory, memoryLimit, restartCount, healthCheck }

        let displayStatus = 'Unknown';
        let health = 'unknown';
        if (service.status) {
          const lowerStatus = service.status.toLowerCase();
          if (lowerStatus.includes('running') || lowerStatus.includes('up')) {
            displayStatus = 'Up';
            health = 'healthy';
          } else if (lowerStatus.includes('exited') || lowerStatus.includes('stopped')) {
            displayStatus = 'Exited';
            health = 'unhealthy';
          } else if (lowerStatus.includes('starting')) {
            displayStatus = 'Starting';
            health = 'starting';
          }
        }

        return {
          id: service.id || `container-${Math.random().toString(36).substr(2, 9)}`,
          name: service.name || 'Unnamed Container',
          image: service.image && service.image.length > 0 ? service.image.join(', ') : 'N/A',
          status: displayStatus, // Für 'Up' oder 'Exited' Anzeige
          state: service.status || 'unknown', // Roher Status
          created: new Date(), // Platzhalter, nicht vom Backend
          ports: service.ports ? service.ports.join(', ') : ['N/A'], // Annahme: 'ports' könnte zum Backend hinzugefügt werden
          cpu: service.cpu || 0, // Platzhalter
          memory: service.memory || 0, // Platzhalter
          memoryLimit: service.memoryMax || 0, // Platzhalter
          restartCount: service.restartCount || 0, // Platzhalter
          healthCheck: health, // Abgeleitet
        };
      });
      setContainers(fetchedContainers);
    } else {
      setContainers([]);
    }

    // Für Images, Volumes, Networks haben wir noch keine Backend-Daten.
    // Daher werden sie geleert oder auf leer gesetzt.
    setImages([]);
    setVolumes([]);
    setNetworks([]);
  }, [services]);
  
  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'unhealthy': return 'text-red-500';
      case 'starting': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };
  
  const formatSize = (size) => {
    if (typeof size === 'string') return size;
    if (typeof size === 'number') return `${size}MB`; // Annahme MB, wenn Zahl
    return 'N/A';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <FaDocker className="text-3xl text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Docker Container Monitor
        </h2>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b dark:border-gray-700">
        {[
          { id: 'containers', label: 'Containers', icon: FaCube, count: containers.length },
          { id: 'images', label: 'Images', icon: FaLayerGroup, count: images.length },
          { id: 'volumes', label: 'Volumes', icon: FaHdd, count: volumes.length },
          { id: 'networks', label: 'Networks', icon: FaNetworkWired, count: networks.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#0070B8] text-[#0070B8] dark:text-blue-300'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="text-sm" />
            <span>{tab.label}</span>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Container Tab */}
      {activeTab === 'containers' && (
        <div>
          {containers.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 p-4">Keine Container-Daten vom Backend geladen oder keine Container vorhanden.</p>
          )}
          <div className="space-y-3">
          {containers.map(container => (
            <div key={container.id} className="border dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <FaCube className="text-blue-500" />
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">
                      {container.name}
                    </h3>
                    <span className={`text-sm ${getHealthColor(container.healthCheck)}`}>
                      ● {container.healthCheck}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>Image: {container.image}</span>
                    <span className="mx-2">•</span>                    
                    <span>Ports: {Array.isArray(container.ports) ? container.ports.join(', ') : container.ports}</span>
                    <span className="mx-2">•</span>
                    <span>Restarts: {container.restartCount}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    CPU: {container.cpu}%
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Memory: {formatSize(container.memory)}/{formatSize(container.memoryLimit)}
                  </div>
                </div>
              </div>
              
              {/* Container Actions */}
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  Logs
                </button>
                <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  Shell
                </button>
                <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  Inspect
                </button>
                {container.state === 'running' ? (
                  <button className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
                    Stop
                  </button>
                ) : (
                  <button className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200">
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
      
      {/* Images Tab */}
      {activeTab === 'images' && (
        images.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 p-4">Keine Image-Daten vom Backend geladen.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2 text-gray-600 dark:text-gray-400">Repository</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-400">Tag</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-400">Size</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-400">Created</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map(image => (
                <tr key={image.id} className="border-b dark:border-gray-700">
                  <td className="p-2 text-gray-800 dark:text-gray-200">{image.name}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{image.tag}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{image.size}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{image.created}</td>
                  <td className="p-2">
                    <button className="text-sm text-[#0070B8] hover:underline">Pull</button>
                    <button className="text-sm text-red-500 hover:underline ml-3">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}
      
      {/* Volumes Tab */}
      {activeTab === 'volumes' && (
        volumes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 p-4">Keine Volume-Daten vom Backend geladen.</p>
        ) : (
        <div className="space-y-3">
          {volumes.map((volume, index) => (
            <div key={index} className="border dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <FaHdd className="text-purple-500" />
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">{volume.name}</h3>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Driver: {volume.driver} • Size: {volume.size}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {volume.mountPoint}
                  </div>
                </div>
                <button className="text-sm text-red-500 hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
        )
      )}
      
      {/* Networks Tab */}
      {activeTab === 'networks' && (
        networks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 p-4">Keine Netzwerk-Daten vom Backend geladen.</p>
        ) : (
        <div className="space-y-3">
          {networks.map((network, index) => (
            <div key={index} className="border dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <FaNetworkWired className="text-green-500" />
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">{network.name}</h3>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Driver: {network.driver} • Subnet: {network.subnet} • Containers: {network.containers}
                  </div>
                </div>
                <button className="text-sm text-[#0070B8] hover:underline">Inspect</button>
              </div>
            </div>
          ))}
        </div>
        )
      )}
      
      {/* Docker Stats Summary */}
      <div className="mt-6 pt-6 border-t dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Containers:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{containers.length}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Running:</span>
            <span className="ml-2 font-medium text-green-600">
              {containers.filter(c => c.state === 'running').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Stopped:</span>
            <span className="ml-2 font-medium text-red-600">
              {containers.filter(c => c.state !== 'running').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Images:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{images.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerMonitor;
