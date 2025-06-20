// Enhanced ContainerMonitor.jsx - Docker Container & Host System Monitoring
import React, { useState, useEffect } from 'react';
import { 
  FaDocker, 
  FaCube, 
  FaLayerGroup, 
  FaNetworkWired, 
  FaHdd, 
  FaServer, 
  FaMicrochip, 
  FaMemory,
  FaChartLine,
  FaRefresh
} from 'react-icons/fa';

const ContainerMonitor = ({ 
  containers = [], 
  images = [], 
  volumes = [], 
  onViewLogs,
  token 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showLogs, setShowLogs] = useState(false);
  const [currentLogs, setCurrentLogs] = useState({ containerName: '', logs: [] });
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Host system metrics state
  const [hostMetrics, setHostMetrics] = useState({
    cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
    memory: { used: 0, total: 0, percentage: 0, available: 0 },
    disk: { used: 0, total: 0, percentage: 0, free: 0 },
    network: { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0 },
    uptime: 0,
    dockerVersion: '',
    lastUpdated: null
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  // Fetch host system metrics
  const fetchHostMetrics = async () => {
    setIsLoadingMetrics(true);
    setMetricsError(null);
    
    try {
      const response = await fetch('/api/system/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHostMetrics({
          ...data,
          lastUpdated: new Date()
        });
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch system metrics`);
      }
    } catch (error) {
      console.error('Error fetching host metrics:', error);
      setMetricsError(error.message);
      // Set dummy data for demo purposes when API is not available
      setHostMetrics({
        cpu: { 
          usage: Math.random() * 80 + 10, 
          cores: 8, 
          loadAverage: [1.2, 1.5, 1.8] 
        },
        memory: { 
          used: 12.4, 
          total: 32.0, 
          percentage: 38.8, 
          available: 19.6 
        },
        disk: { 
          used: 245.6, 
          total: 500.0, 
          percentage: 49.1, 
          free: 254.4 
        },
        network: { 
          bytesReceived: 1024 * 1024 * 150, 
          bytesSent: 1024 * 1024 * 89,
          packetsReceived: 15420,
          packetsSent: 12330
        },
        uptime: 432156,
        dockerVersion: '24.0.6',
        lastUpdated: new Date()
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Auto-refresh metrics every 10 seconds when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchHostMetrics();
      const interval = setInterval(fetchHostMetrics, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  const getHealthColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'healthy': 
        return 'text-green-500';
      case 'unhealthy': 
      case 'exited':
        return 'text-red-500';
      case 'starting': 
      case 'restarting':
        return 'text-yellow-500';
      case 'paused':
        return 'text-blue-500';
      default: 
        return 'text-gray-500';
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
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
        // Fallback for demo purposes
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
    return formatBytes(size);
  };

  const getContainerStatusSummary = () => {
    const summary = containers.reduce((acc, container) => {
      const status = container.status?.toLowerCase() || 'unknown';
      if (status.includes('running')) acc.running++;
      else if (status.includes('exited')) acc.stopped++;
      else if (status.includes('paused')) acc.paused++;
      else acc.unknown++;
      return acc;
    }, { running: 0, stopped: 0, paused: 0, unknown: 0 });
    
    return summary;
  };

  const containerSummary = getContainerStatusSummary();

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaDocker className="text-3xl text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              Docker Container & Host Monitor
            </h2>
          </div>
          
          {activeTab === 'overview' && (
            <button
              onClick={fetchHostMetrics}
              disabled={isLoadingMetrics}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <FaRefresh className={isLoadingMetrics ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b dark:border-gray-700">
          {[
            { id: 'overview', label: 'System Overview', icon: FaServer },
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
              {tab.count !== undefined && (
                <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* System Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Host System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Usage */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaMicrochip className="text-blue-500" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">CPU Usage</h3>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hostMetrics.cpu.usage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {hostMetrics.cpu.cores} cores
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(hostMetrics.cpu.usage)}`}
                    style={{ width: `${Math.min(hostMetrics.cpu.usage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Load: {hostMetrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaMemory className="text-green-500" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Memory</h3>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hostMetrics.memory.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {hostMetrics.memory.used.toFixed(1)} / {hostMetrics.memory.total.toFixed(1)} GB
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(hostMetrics.memory.percentage)}`}
                    style={{ width: `${Math.min(hostMetrics.memory.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: {hostMetrics.memory.available.toFixed(1)} GB
                </div>
              </div>

              {/* Disk Usage */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaHdd className="text-purple-500" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Disk Space</h3>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hostMetrics.disk.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {hostMetrics.disk.used.toFixed(1)} / {hostMetrics.disk.total.toFixed(1)} GB
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(hostMetrics.disk.percentage)}`}
                    style={{ width: `${Math.min(hostMetrics.disk.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Free: {hostMetrics.disk.free.toFixed(1)} GB
                </div>
              </div>

              {/* Network Stats */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaNetworkWired className="text-orange-500" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Network</h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>↓ {formatBytes(hostMetrics.network.bytesReceived)}</div>
                  <div>↑ {formatBytes(hostMetrics.network.bytesSent)}</div>
                  <div className="text-xs">
                    Packets: {hostMetrics.network.packetsReceived.toLocaleString()} / {hostMetrics.network.packetsSent.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* System Info & Container Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <FaServer className="text-gray-500" />
                  System Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                    <span className="text-gray-900 dark:text-white">{formatUptime(hostMetrics.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Docker Version:</span>
                    <span className="text-gray-900 dark:text-white">{hostMetrics.dockerVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <span className="text-gray-900 dark:text-white">
                      {hostMetrics.lastUpdated ? hostMetrics.lastUpdated.toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  {metricsError && (
                    <div className="text-red-500 text-xs mt-2">
                      Error: {metricsError} (showing demo data)
                    </div>
                  )}
                </div>
              </div>

              {/* Container Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <FaCube className="text-blue-500" />
                  Container Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Running:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{containerSummary.running}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Stopped:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{containerSummary.stopped}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Paused:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{containerSummary.paused}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Other:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{containerSummary.unknown}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t dark:border-gray-600">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Images:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{images.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Total Volumes:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{volumes.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Container Tab */}
        {activeTab === 'containers' && (
          <div className="space-y-3">
            {containers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No containers found
              </div>
            ) : (
              containers.map(container => (
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
                        <span>Image: {container.image && Array.isArray(container.image) ? container.image.join(', ') : container.image}</span>
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
                          ID: {container.id?.slice(0, 12) || 'N/A'}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Created: {container.created || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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
                {images.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No images found
                    </td>
                  </tr>
                ) : (
                  images.map(image => (
                    <tr key={image.id} className="border-b dark:border-gray-700">
                      <td className="p-2 text-gray-800 dark:text-gray-200">{image.id?.slice(0, 12) || 'N/A'}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">
                        {image.tags && Array.isArray(image.tags) ? image.tags.join(', ') : image.tags || 'N/A'}
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">{formatSize(image.size)}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">{image.created || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Volumes Tab */}
        {activeTab === 'volumes' && (
          <div className="space-y-3">
            {volumes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No volumes found
              </div>
            ) : (
              volumes.map((volume, index) => (
                <div key={volume.name || index} className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <FaHdd className="text-purple-500" />
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">{volume.name || 'Unnamed Volume'}</h3>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Mountpoint: {volume.mountpoint || volume.mountPoint || volume.driver || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Created: {volume.created || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ContainerMonitor;