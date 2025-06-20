// ServiceTaskManager.jsx - Enhanced Job Management System
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaUpload, 
  FaFilePdf, 
  FaLayerGroup, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimesCircle, 
  FaStop, 
  FaPlay, 
  FaRedo, 
  FaDownload, 
  FaEye, 
  FaTrash,
  FaFileAlt,
  FaHistory,
  FaSpinner,
  FaLink
} from 'react-icons/fa';

// Job Type Icons Mapping
const jobTypeIcons = {
  'upload': FaUpload,
  'convert': FaFilePdf,
  'tms': FaLayerGroup,
  'download': FaDownload,
  'default': FaFileAlt
};

// Job Status Colors and Icons
const getJobStatusInfo = (status) => {
  switch (status.toLowerCase()) {
    case 'running':
    case 'processing':
    case 'in_progress':
      return { 
        color: 'text-blue-500', 
        bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
        icon: FaSpinner,
        text: 'Läuft'
      };
    case 'completed':
    case 'success':
    case 'finished':
      return { 
        color: 'text-green-500', 
        bgColor: 'bg-green-50 dark:bg-green-900/20', 
        icon: FaCheckCircle,
        text: 'Erfolgreich'
      };
    case 'failed':
    case 'error':
      return { 
        color: 'text-red-500', 
        bgColor: 'bg-red-50 dark:bg-red-900/20', 
        icon: FaTimesCircle,
        text: 'Fehlgeschlagen'
      };
    case 'cancelled':
    case 'aborted':
      return { 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-50 dark:bg-gray-900/20', 
        icon: FaStop,
        text: 'Abgebrochen'
      };
    case 'queued':
    case 'pending':
      return { 
        color: 'text-yellow-500', 
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', 
        icon: FaClock,
        text: 'Warteschlange'
      };
    default:
      return { 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-50 dark:bg-gray-900/20', 
        icon: FaExclamationTriangle,
        text: status
      };
  }
};

// Helper functions
const formatDuration = (startTime, endTime) => {
  if (!startTime) return 'N/A';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffSeconds = Math.floor((diffMs % 60000) / 1000);
  
  if (diffMinutes > 0) {
    return `${diffMinutes}m ${diffSeconds}s`;
  }
  return `${diffSeconds}s`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Job Card Component
const JobCard = ({ job, onCancel, onRetry, onDelete, onViewArtifacts }) => {
  const statusInfo = getJobStatusInfo(job.status);
  const TypeIcon = jobTypeIcons[job.type] || jobTypeIcons.default;
  const StatusIcon = statusInfo.icon;
  
  const canCancel = ['running', 'processing', 'queued', 'pending'].includes(job.status.toLowerCase());
  const canRetry = ['failed', 'error', 'cancelled'].includes(job.status.toLowerCase());
  const hasArtifacts = job.artifacts && job.artifacts.length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${statusInfo.bgColor}`}>
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <TypeIcon className={`text-2xl ${statusInfo.color}`} />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                {job.name || `${job.type.charAt(0).toUpperCase() + job.type.slice(1)} Job`}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <StatusIcon className={`${statusInfo.color} ${job.status === 'running' ? 'animate-spin' : ''}`} />
                <span>{statusInfo.text}</span>
                <span>•</span>
                <span>ID: {job.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <div>Erstellt: {new Date(job.createdAt).toLocaleString('de-DE')}</div>
            {job.completedAt && (
              <div>Beendet: {new Date(job.completedAt).toLocaleString('de-DE')}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Progress Bar für laufende Jobs */}
        {job.status === 'running' && job.progress !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Fortschritt</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Job Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Typ:</span>
            <span className="ml-2 font-medium capitalize">{job.type}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Dauer:</span>
            <span className="ml-2 font-medium">
              {formatDuration(job.createdAt, job.completedAt)}
            </span>
          </div>
          {job.inputFile && (
            <div className="col-span-2">
              <span className="text-gray-600 dark:text-gray-400">Eingabe:</span>
              <span className="ml-2 font-medium">{job.inputFile.name}</span>
              {job.inputFile.size && (
                <span className="ml-1 text-gray-500">({formatFileSize(job.inputFile.size)})</span>
              )}
            </div>
          )}
          {job.parameters && Object.keys(job.parameters).length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-600 dark:text-gray-400">Parameter:</span>
              <div className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 rounded p-2 mt-1">
                {Object.entries(job.parameters).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {job.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            <div className="text-sm text-red-800 dark:text-red-200 font-medium">Fehler:</div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">{job.error}</div>
          </div>
        )}
        
        {/* Artifacts */}
        {hasArtifacts && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Artefakte ({job.artifacts.length}):
            </div>
            <div className="space-y-1">
              {job.artifacts.slice(0, 3).map((artifact, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FaLink className="text-blue-500" />
                  <span className="truncate">{artifact.name}</span>
                  <span className="text-gray-500">({formatFileSize(artifact.size)})</span>
                </div>
              ))}
              {job.artifacts.length > 3 && (
                <div className="text-sm text-gray-500">
                  +{job.artifacts.length - 3} weitere...
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {hasArtifacts && (
            <button
              onClick={() => onViewArtifacts(job)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              <FaEye className="inline mr-1" />
              Artefakte
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(job.id)}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              <FaStop className="inline mr-1" />
              Abbrechen
            </button>
          )}
          {canRetry && (
            <button
              onClick={() => onRetry(job.id)}
              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              <FaRedo className="inline mr-1" />
              Wiederholen
            </button>
          )}
          <button
            onClick={() => onDelete(job.id)}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            <FaTrash className="inline mr-1" />
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
};

// Artifacts Modal Component
const ArtifactsModal = ({ job, isOpen, onClose, onDownload }) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Artefakte für Job: {job.name || job.id.slice(0, 8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {job.artifacts && job.artifacts.length > 0 ? (
            <div className="space-y-3">
              {job.artifacts.map((artifact, index) => (
                <div key={index} className="border dark:border-gray-600 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {artifact.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Typ: {artifact.type} • Größe: {formatFileSize(artifact.size)}
                      </div>
                      {artifact.url && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {artifact.url}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {artifact.viewable && (
                        <button
                          onClick={() => window.open(artifact.url, '_blank')}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Ansehen
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(artifact)}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Keine Artefakte für diesen Job verfügbar.
            </div>
          )}
        </div>
        <div className="p-4 border-t dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

// Main ServiceTaskManager Component
const ServiceTaskManager = ({ token }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, running, completed, failed
  const [selectedJob, setSelectedJob] = useState(null);
  const [showArtifacts, setShowArtifacts] = useState(false);

  // Mock data for demonstration - in real app, fetch from API
  const generateMockJobs = useCallback(() => {
    const jobTypes = ['upload', 'convert', 'tms'];
    const statuses = ['running', 'completed', 'failed', 'queued'];
    const mockJobs = [];

    for (let i = 0; i < 10; i++) {
      const type = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000)
        : null;

      const job = {
        id: `job-${Date.now()}-${i}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Job ${i + 1}`,
        type,
        status,
        createdAt: createdAt.toISOString(),
        completedAt: completedAt?.toISOString(),
        progress: status === 'running' ? Math.floor(Math.random() * 100) : undefined,
        inputFile: {
          name: `example_${i + 1}.${type === 'upload' ? 'dxf' : type === 'convert' ? 'dxf' : 'pdf'}`,
          size: Math.floor(Math.random() * 50000000) + 1000000
        },
        parameters: type === 'convert' 
          ? { pageSize: 'A4', dpi: 300 }
          : type === 'tms' 
          ? { maxzoom: 20, format: 'png' }
          : {},
        artifacts: status === 'completed' ? [
          {
            name: type === 'convert' ? `output_${i + 1}.pdf` : type === 'tms' ? `tiles_${i + 1}.zip` : `uploaded_${i + 1}.dxf`,
            type: type === 'convert' ? 'application/pdf' : type === 'tms' ? 'application/zip' : 'application/dxf',
            size: Math.floor(Math.random() * 100000000) + 5000000,
            url: `/api/download/${type}-output-${i + 1}`,
            viewable: type === 'convert'
          }
        ] : [],
        error: status === 'failed' ? `Fehler bei der ${type === 'convert' ? 'Konvertierung' : type === 'tms' ? 'TMS-Generierung' : 'Upload-Verarbeitung'}` : null
      };

      mockJobs.push(job);
    }

    return mockJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, []);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In real implementation, fetch from API endpoint like /api/jobs
      // const response = await fetch('/api/jobs', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // if (response.ok) {
      //   const data = await response.json();
      //   setJobs(data);
      // } else {
      //   throw new Error('Failed to fetch jobs');
      // }
      
      // For now, use mock data
      setTimeout(() => {
        setJobs(generateMockJobs());
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err.message || "Failed to fetch jobs");
      setLoading(false);
    }
  }, [token, generateMockJobs]);

  useEffect(() => {
    fetchJobs();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchJobs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Job actions
  const handleCancelJob = async (jobId) => {
    try {
      // await fetch(`/api/jobs/${jobId}/cancel`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
      // Mock implementation
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: 'cancelled' } : job
      ));
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      // await fetch(`/api/jobs/${jobId}/retry`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
      // Mock implementation
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: 'queued', error: null } : job
      ));
    } catch (error) {
      console.error("Failed to retry job:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Möchten Sie diesen Job wirklich löschen?')) return;
    
    try {
      // await fetch(`/api/jobs/${jobId}`, {
      //   method: 'DELETE',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
      // Mock implementation
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const handleViewArtifacts = (job) => {
    setSelectedJob(job);
    setShowArtifacts(true);
  };

  const handleDownloadArtifact = async (artifact) => {
    try {
      // Create download link
      const link = document.createElement('a');
      link.href = artifact.url;
      link.download = artifact.name;
      link.click();
    } catch (error) {
      console.error("Failed to download artifact:", error);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'running') return ['running', 'processing', 'queued'].includes(job.status);
    if (filter === 'completed') return job.status === 'completed';
    if (filter === 'failed') return ['failed', 'error'].includes(job.status);
    return true;
  });

  // Statistics
  const stats = {
    total: jobs.length,
    running: jobs.filter(j => ['running', 'processing', 'queued'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => ['failed', 'error'].includes(j.status)).length
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <FaSpinner className="animate-spin mx-auto mb-2 text-2xl text-gray-500" />
        <div className="text-gray-600 dark:text-gray-300">Lade Job-Daten...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-2">Fehler beim Laden der Jobs: {error}</div>
        <button 
          onClick={fetchJobs} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Service Task Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalten Sie Upload-, Konvertierungs- und TMS-Jobs
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          disabled={loading}
        >
          <FaRedo className={loading ? "animate-spin" : ""} />
          Aktualisieren
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Gesamt</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Laufend</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Erfolgreich</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Fehlgeschlagen</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b dark:border-gray-700">
        {[
          { id: 'all', label: 'Alle', count: stats.total },
          { id: 'running', label: 'Laufend', count: stats.running },
          { id: 'completed', label: 'Erfolgreich', count: stats.completed },
          { id: 'failed', label: 'Fehlgeschlagen', count: stats.failed }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              filter === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <FaHistory className="mx-auto text-4xl text-gray-400 mb-4" />
          <div className="text-gray-600 dark:text-gray-400">
            {filter === 'all' ? 'Keine Jobs gefunden' : `Keine ${filter} Jobs gefunden`}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={handleCancelJob}
              onRetry={handleRetryJob}
              onDelete={handleDeleteJob}
              onViewArtifacts={handleViewArtifacts}
            />
          ))}
        </div>
      )}

      {/* Artifacts Modal */}
      <ArtifactsModal
        job={selectedJob}
        isOpen={showArtifacts}
        onClose={() => {
          setShowArtifacts(false);
          setSelectedJob(null);
        }}
        onDownload={handleDownloadArtifact}
      />
    </div>
  );
};

export default ServiceTaskManager;