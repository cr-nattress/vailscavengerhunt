import React, { useState, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';

interface TestResult {
  name: string;
  endpoint: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

export default function DiagnosticsView() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testPhotoUpload, setTestPhotoUpload] = useState(false);

  const updateResult = (endpoint: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r =>
      r.endpoint === endpoint ? { ...r, ...updates } : r
    ));
  };

  const runTest = async (test: TestResult): Promise<void> => {
    const startTime = Date.now();
    updateResult(test.endpoint, { status: 'running' });

    try {
      let response: any;
      const timestamp = new Date().toISOString();

      switch (test.name) {
        case 'Health Check':
          response = await apiClient.get(test.endpoint, { timeout: 8000 });
          break;

        case 'Settings GET':
          response = await apiClient.get(test.endpoint, { timeout: 8000 });
          break;

        case 'Settings Status':
          response = await apiClient.get(test.endpoint, { timeout: 8000 });
          break;

        case 'Progress GET':
          response = await apiClient.get(test.endpoint, { timeout: 8000 });
          break;

        case 'Progress POST (dry-run)':
          response = await apiClient.post(test.endpoint, {
            dryRun: true,
            test: 'diagnostics',
            timestamp
          }, { timeout: 8000 });
          break;

        case 'KV List':
          response = await apiClient.get(`${test.endpoint}?prefix=diagnostics/`, { timeout: 8000 });
          break;

        case 'KV Upsert (dry-run)':
          response = await apiClient.post(test.endpoint, {
            key: `diagnostics/test-${Date.now()}`,
            value: { test: true, timestamp },
            dryRun: true
          }, { timeout: 8000 });
          break;

        case 'Photo Upload (1x1 PNG)':
          if (!testPhotoUpload) {
            updateResult(test.endpoint, {
              status: 'pending',
              details: 'Skipped (toggle to enable)'
            });
            return;
          }

          // Create a tiny 1x1 transparent PNG
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillRect(0, 0, 1, 1);

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });

          const formData = new FormData();
          formData.append('photo', blob, 'test.png');
          formData.append('locationTitle', 'Diagnostics Test');
          formData.append('sessionId', `diag-${Date.now()}`);
          formData.append('teamName', 'diagnostics');

          response = await apiClient.requestFormData('/photo-upload', formData, { timeout: 15000 });
          break;
      }

      const duration = Date.now() - startTime;
      updateResult(test.endpoint, {
        status: 'success',
        duration,
        timestamp,
        details: response,
        requestId: response?.requestId
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateResult(test.endpoint, {
        status: 'error',
        duration,
        error: error.message || 'Unknown error',
        details: {
          status: error.status,
          statusText: error.statusText,
          body: error.body
        }
      });
    }
  };

  const runAllTests = async () => {
    setRunning(true);

    const tests: TestResult[] = [
      { name: 'Health Check', endpoint: '/health', status: 'pending' },
      { name: 'Settings GET', endpoint: '/settings/bhhs/teacup/fall-2025', status: 'pending' },
      { name: 'Settings Status', endpoint: '/settings/bhhs/teacup/fall-2025/status', status: 'pending' },
      { name: 'Progress GET', endpoint: '/progress/bhhs/teacup/fall-2025', status: 'pending' },
      { name: 'Progress POST (dry-run)', endpoint: '/progress/bhhs/teacup/fall-2025', status: 'pending' },
      { name: 'KV List', endpoint: '/kv/list', status: 'pending' },
      { name: 'KV Upsert (dry-run)', endpoint: '/kv/upsert', status: 'pending' },
      { name: 'Photo Upload (1x1 PNG)', endpoint: '/photo-upload', status: 'pending' }
    ];

    setResults(tests);

    // Run tests sequentially to avoid overwhelming the server
    for (const test of tests) {
      await runTest(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  const exportResults = () => {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">API Diagnostics</h1>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Test connectivity and functionality of all critical API endpoints.
            </p>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={runAllTests}
                disabled={running}
                className={`px-4 py-2 rounded-lg font-medium ${
                  running
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {running ? 'Running Tests...' : 'Run All Tests'}
              </button>

              {results.length > 0 && (
                <>
                  <button
                    onClick={exportResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Export Results
                  </button>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600">✓ {successCount}</span>
                    <span className="text-red-600">✗ {errorCount}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="testPhotoUpload"
                checked={testPhotoUpload}
                onChange={(e) => setTestPhotoUpload(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="testPhotoUpload" className="text-sm text-gray-600">
                Include photo upload test (sends tiny 1x1 PNG)
              </label>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-lg">{getStatusIcon(result.status)}</span>
                        <span className="font-semibold">{result.name}</span>
                        {result.duration && (
                          <span className="text-sm text-gray-500">
                            ({result.duration}ms)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-mono">{result.endpoint}</span>
                      </div>
                      {result.error && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {result.error}
                        </div>
                      )}
                      {result.requestId && (
                        <div className="mt-1 text-xs text-gray-500">
                          Request ID: {result.requestId}
                        </div>
                      )}
                    </div>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto max-w-xs">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !running && (
            <div className="text-center py-8 text-gray-500">
              Click "Run All Tests" to begin diagnostics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}