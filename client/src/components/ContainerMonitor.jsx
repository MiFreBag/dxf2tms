// ContainerMonitor.jsx - Docker Container Monitoring Extension
import React, { useState } from 'react';
import { FaDocker, FaCube, FaLayerGroup, FaNetworkWired, FaHdd } from 'react-icons/fa';

const ContainerMonitor = ({ containers = [], images = [], volumes = [], onViewLogs }) => {
  const [activeTab, setActiveTab] = useState('containers');
  const [showLogs, setShowLogs] = useState(false);
  const [currentLogs, setCurrentLogs] = useState({ containerName: '', logs: [] });
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'unhealthy': return 'text-red-500';
      case 'starting': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const handleViewLogs = async (container) => {
    setIsLoadingLogs(true);
    setShowLogs(true);
    setCurrentLogs({ containerName: container.name, logs: ['Loading logs...'] });
    
    try {
      if (onViewLogs) {
        const logs = await onViewLogs(container.id, container.name);
        setCurrentLogs({ 
          containerName: container.name, 
          logs: Array.isArray(logs) ? logs : logs.split('\n').filter(line => line.trim())
        });
      } else {
        // Fallback für Demo-Zwecke
        setTimeout(() => {
          setCurrentLogs({
            containerName: container.name,
            logs: [
              `${new Date().toISOString()} [INFO] Container ${container.name} started`,
              `${new Date().toISOString()} [INFO] Application listening on port 3000`,
              `${new Date().toISOString()} [DEBUG] Database connection established`,
              `${new Date().toISOString()} [WARN] High memory usage detected`,
              `${new Date().toISOString()} [INFO] Request processed successfully`
            ]
          });
        }, 1000);
      }
    } catch (error) {
      setCurrentLogs({ 
        containerName: container.name, 
        logs: [`Error loading logs: ${error.message}`] 
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const closeLogs = () => {
    setShowLogs(false);
    setCurrentLogs({ containerName: '', logs: [] });
  };

  const formatSize = (size) => {
    if (typeof size === 'string') return size;
    if (!size) return '-';
    if (size > 1024 * 1024 * 1024) return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (size > 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    if (size > 1024) return (size / 1024).toFixed(2) + ' KB';
    return size + ' B';
  };

  return (
    <>
      {/* Log Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <FaCube className="text-blue-500" />
                Logs: {currentLogs.containerName}
              </h3>
              <button
                onClick={closeLogs}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-auto">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                    <span className="ml-2">Loading logs...</span>
                  </div>
                ) : (
                  currentLogs.logs.map((log, index) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => handleViewLogs({ id: currentLogs.containerName, name: currentLogs.containerName })}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                disabled={isLoadingLogs}
              >
                Refresh
              </button>
              <button
                onClick={closeLogs}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <span className={`text-sm ${getHealthColor(container.status)}`}>
                        ● {container.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>Image: {container.image && container.image.join(', ')}</span>
                      <span className="mx-2">•</span>
                      <span>Status: {container.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewLogs(container)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      View Logs
                    </button>
                    <div className="text-right text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        ID: {container.id.slice(0, 12)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Created: {container.created}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left p-2 text-gray-600 dark:text-gray-400">ID</th>
                  <th className="text-left p-2 text-gray-600 dark:text-gray-400">Tags</th>
                  <th className="text-left p-2 text-gray-600 dark:text-gray-400">Size</th>
                  <th className="text-left p-2 text-gray-600 dark:text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {images.map(image => (
                  <tr key={image.id} className="border-b dark:border-gray-700">
                    <td className="p-2 text-gray-800 dark:text-gray-200">{image.id.slice(0, 12)}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{image.tags && image.tags.join(', ')}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{formatSize(image.size)}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{image.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Volumes Tab */}
        {activeTab === 'volumes' && (
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
                      Mountpoint: {volume.mountpoint || volume.mountPoint || '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Created: {volume.created}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ContainerMonitor;