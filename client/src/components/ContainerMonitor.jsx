// ContainerMonitor.jsx - Docker Container Monitoring Extension
import React, { useState } from 'react';
import { FaDocker, FaCube, FaLayerGroup, FaNetworkWired, FaHdd } from 'react-icons/fa';

const ContainerMonitor = ({ containers = [], images = [], volumes = [] }) => {
  const [activeTab, setActiveTab] = useState('containers');

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
    if (!size) return '-';
    if (size > 1024 * 1024 * 1024) return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (size > 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    if (size > 1024) return (size / 1024).toFixed(2) + ' KB';
    return size + ' B';
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
  );
};

export default ContainerMonitor;