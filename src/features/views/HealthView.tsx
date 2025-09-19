import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

interface HealthStatus {
  status: string;
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    isNetlify: boolean;
    deployId: string;
  };
  cloudinary: {
    cloudNamePresent: boolean;
    apiKeyPresent: boolean;
    apiSecretPresent: boolean;
    uploadFolderPresent: boolean;
  };
  blobs: {
    kv: boolean;
    huntData: boolean;
  };
  checks: {
    cloudinaryConfigured: boolean;
    blobStoresAccessible: boolean;
  };
  warnings?: string[];
}

export default function HealthView() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<HealthStatus>('/health');
      setHealth(response);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  const StatusIndicator: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <div className="flex items-center gap-2 p-2">
      <span className={`w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className={ok ? 'text-green-700' : 'text-red-700'}>{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Checking system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h1 className="text-xl font-bold text-red-800 mb-2">Health Check Failed</h1>
            <p className="text-red-600">{error}</p>
            <button
              onClick={checkHealth}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">No health data available</div>
      </div>
    );
  }

  const overallStatus = health.status === 'ok' ? 'Healthy' : 'Degraded';
  const statusColor = health.status === 'ok' ? 'green' : 'yellow';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">System Health Check</h1>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
              <span className={`w-2 h-2 rounded-full bg-${statusColor}-500`} />
              <span className="font-semibold">{overallStatus}</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-t pt-4">
              <h2 className="font-semibold text-gray-700 mb-2">Cloudinary Configuration</h2>
              <div className="ml-4 space-y-1">
                <StatusIndicator ok={health.cloudinary.cloudNamePresent} label="Cloud Name" />
                <StatusIndicator ok={health.cloudinary.apiKeyPresent} label="API Key" />
                <StatusIndicator ok={health.cloudinary.apiSecretPresent} label="API Secret" />
                <StatusIndicator ok={health.cloudinary.uploadFolderPresent} label="Upload Folder" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="font-semibold text-gray-700 mb-2">Blob Storage</h2>
              <div className="ml-4 space-y-1">
                <StatusIndicator ok={health.blobs.kv} label="KV Store" />
                <StatusIndicator ok={health.blobs.huntData} label="Hunt Data Store" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="font-semibold text-gray-700 mb-2">System Checks</h2>
              <div className="ml-4 space-y-1">
                <StatusIndicator ok={health.checks.cloudinaryConfigured} label="Cloudinary Ready" />
                <StatusIndicator ok={health.checks.blobStoresAccessible} label="Storage Ready" />
              </div>
            </div>

            {health.warnings && health.warnings.length > 0 && (
              <div className="border-t pt-4">
                <h2 className="font-semibold text-yellow-700 mb-2">Warnings</h2>
                <div className="ml-4 space-y-2">
                  {health.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">⚠</span>
                      <span className="text-yellow-600 text-sm">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h2 className="font-semibold text-gray-700 mb-2">Environment</h2>
              <div className="ml-4 text-sm text-gray-600 space-y-1">
                <div>Node: {health.environment.nodeVersion}</div>
                <div>Platform: {health.environment.platform}</div>
                <div>Netlify: {health.environment.isNetlify ? 'Yes' : 'No'}</div>
                <div>Deploy ID: {health.environment.deployId}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <button
              onClick={checkHealth}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}