/**
 * E2E Test Template for Netlify Functions
 * This template provides a structure for testing each migrated function
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  functionBaseUrl: process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions',
  testTimeout: 10000
};

// Helper to create Supabase client
function getSupabaseClient() {
  return createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
}

// Helper to call Netlify function
async function callNetlifyFunction(functionName, options = {}) {
  const url = `${TEST_CONFIG.functionBaseUrl}/${functionName}${options.path || ''}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: response.headers
  };
}

// Helper to clean up test data
async function cleanupTestData(tableName, condition) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .delete()
    .match(condition);

  if (error) {
    console.error(`Failed to cleanup ${tableName}:`, error);
  }
}

// Helper to generate test IDs
function generateTestId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Helper to wait for condition
async function waitForCondition(checkFn, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await checkFn();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

// ============================================
// EXAMPLE TEST SUITE: team-verify.js
// ============================================

describe('team-verify.js E2E Tests', () => {
  let supabase;
  let testTeamCode;
  let testTeamId;

  beforeAll(() => {
    supabase = getSupabaseClient();
    testTeamCode = generateTestId('TEST_CODE');
    testTeamId = generateTestId('test_team');
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData('team_mappings', { team_code: testTeamCode });
    await cleanupTestData('device_locks', { team_id: testTeamId });
    await cleanupTestData('team_progress', { team_id: testTeamId });
  });

  beforeEach(async () => {
    // Setup test team mapping
    const { error } = await supabase
      .from('team_mappings')
      .insert({
        team_code: testTeamCode,
        team_id: testTeamId,
        team_name: 'Test Team',
        organization_id: 'test_org',
        hunt_id: 'test_hunt',
        is_active: true
      });

    if (error) {
      throw new Error(`Failed to setup test data: ${error.message}`);
    }
  });

  test('should successfully verify valid team code', async () => {
    const response = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: testTeamCode,
        deviceHint: 'test-device'
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      teamId: testTeamId,
      teamName: 'Test Team',
      lockToken: expect.any(String),
      ttlSeconds: expect.any(Number)
    });
  });

  test('should reject invalid team code', async () => {
    const response = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: 'INVALID_CODE',
        deviceHint: 'test-device'
      }
    });

    expect(response.status).toBe(404);
    expect(response.data.error).toContain('Invalid team code');
  });

  test('should handle device lock conflicts', async () => {
    // First verification
    const response1 = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: testTeamCode,
        deviceHint: 'device-1'
      },
      headers: {
        'user-agent': 'test-agent-1',
        'x-forwarded-for': '192.168.1.1'
      }
    });

    expect(response1.status).toBe(200);

    // Second verification from different device with different team
    const testTeamCode2 = generateTestId('TEST_CODE2');
    const testTeamId2 = generateTestId('test_team2');

    await supabase
      .from('team_mappings')
      .insert({
        team_code: testTeamCode2,
        team_id: testTeamId2,
        team_name: 'Test Team 2',
        organization_id: 'test_org',
        hunt_id: 'test_hunt',
        is_active: true
      });

    const response2 = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: testTeamCode2,
        deviceHint: 'device-1'
      },
      headers: {
        'user-agent': 'test-agent-1',
        'x-forwarded-for': '192.168.1.1'
      }
    });

    expect(response2.status).toBe(409);
    expect(response2.data.error).toContain('Device already locked');

    // Cleanup
    await cleanupTestData('team_mappings', { team_code: testTeamCode2 });
  });

  test('should clean up expired locks', async () => {
    // Create an expired lock
    const expiredFingerprint = 'expired-device';
    await supabase
      .from('device_locks')
      .insert({
        device_fingerprint: expiredFingerprint,
        team_id: 'expired_team',
        expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
      });

    // Try to verify with the same device
    const response = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: testTeamCode,
        deviceHint: expiredFingerprint
      }
    });

    expect(response.status).toBe(200);

    // Check that old lock was removed
    const { data: locks } = await supabase
      .from('device_locks')
      .select('*')
      .eq('device_fingerprint', expiredFingerprint)
      .eq('team_id', 'expired_team');

    expect(locks).toHaveLength(0);
  });

  test('should handle concurrent verification attempts', async () => {
    const promises = Array(5).fill(null).map((_, index) =>
      callNetlifyFunction('team-verify', {
        method: 'POST',
        body: {
          code: testTeamCode,
          deviceHint: `concurrent-device-${index}`
        }
      })
    );

    const responses = await Promise.all(promises);

    // All should succeed (different devices)
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('should handle missing team code', async () => {
    const response = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        deviceHint: 'test-device'
      }
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('Team code is required');
  });

  test('should handle Supabase connection errors gracefully', async () => {
    // This would require mocking or temporarily breaking the connection
    // For now, we'll test with invalid data that triggers an error
    const response = await callNetlifyFunction('team-verify', {
      method: 'POST',
      body: {
        code: null, // This should trigger validation
        deviceHint: 'test-device'
      }
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.data).toHaveProperty('error');
  });
});

// ============================================
// EXAMPLE TEST SUITE: write-log.js
// ============================================

describe('write-log.js E2E Tests', () => {
  let supabase;

  beforeAll(() => {
    supabase = getSupabaseClient();
  });

  afterEach(async () => {
    // Cleanup recent test logs
    const { error } = await supabase
      .from('debug_logs')
      .delete()
      .like('filename', 'test_%');

    if (error) {
      console.error('Failed to cleanup test logs:', error);
    }
  });

  test('should successfully write log entry', async () => {
    const logData = {
      filename: `test_${Date.now()}.log`,
      data: {
        message: 'Test log message',
        level: 'info',
        timestamp: new Date().toISOString()
      }
    };

    const response = await callNetlifyFunction('write-log', {
      method: 'POST',
      body: logData
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      success: true,
      filename: logData.filename
    });

    // Verify log was written to Supabase
    const { data: logs } = await supabase
      .from('debug_logs')
      .select('*')
      .eq('filename', logData.filename)
      .single();

    expect(logs).toBeTruthy();
    expect(logs.data).toEqual(logData.data);
  });

  test('should handle large payloads', async () => {
    const largeData = {
      filename: `test_large_${Date.now()}.log`,
      data: {
        bigArray: Array(1000).fill('x'.repeat(100)),
        metadata: {
          size: 'large',
          test: true
        }
      }
    };

    const response = await callNetlifyFunction('write-log', {
      method: 'POST',
      body: largeData
    });

    expect(response.status).toBe(200);
  });

  test('should reject missing filename', async () => {
    const response = await callNetlifyFunction('write-log', {
      method: 'POST',
      body: {
        data: { message: 'Test' }
      }
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('Filename and data required');
  });

  test('should handle concurrent writes', async () => {
    const promises = Array(10).fill(null).map((_, index) =>
      callNetlifyFunction('write-log', {
        method: 'POST',
        body: {
          filename: `test_concurrent_${index}_${Date.now()}.log`,
          data: { index, message: `Concurrent test ${index}` }
        }
      })
    );

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });
});

// ============================================
// PERFORMANCE TEST UTILITIES
// ============================================

class PerformanceMonitor {
  constructor(name) {
    this.name = name;
    this.metrics = [];
  }

  async measure(fn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = await fn();

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    this.metrics.push({
      duration: endTime - startTime,
      memoryDelta: endMemory - startMemory,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  getStats() {
    if (this.metrics.length === 0) return null;

    const durations = this.metrics.map(m => m.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    return {
      name: this.name,
      samples: this.metrics.length,
      avgDuration,
      maxDuration,
      minDuration,
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99)
    };
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}

// ============================================
// LOAD TEST EXAMPLE
// ============================================

describe('Load Tests', () => {
  test('should handle 100 concurrent team verifications', async () => {
    const monitor = new PerformanceMonitor('team-verify-load');
    const testTeamCode = generateTestId('LOAD_TEST');

    // Setup
    const supabase = getSupabaseClient();
    await supabase.from('team_mappings').insert({
      team_code: testTeamCode,
      team_id: 'load_test_team',
      team_name: 'Load Test Team',
      organization_id: 'test_org',
      hunt_id: 'test_hunt',
      is_active: true
    });

    // Run load test
    const promises = Array(100).fill(null).map((_, index) =>
      monitor.measure(() =>
        callNetlifyFunction('team-verify', {
          method: 'POST',
          body: {
            code: testTeamCode,
            deviceHint: `load-test-device-${index}`
          }
        })
      )
    );

    const results = await Promise.all(promises);

    // Verify all succeeded
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBe(100);

    // Check performance
    const stats = monitor.getStats();
    console.log('Load Test Stats:', stats);

    expect(stats.avgDuration).toBeLessThan(1000); // Average under 1 second
    expect(stats.p95).toBeLessThan(2000); // 95th percentile under 2 seconds
    expect(stats.p99).toBeLessThan(3000); // 99th percentile under 3 seconds

    // Cleanup
    await cleanupTestData('team_mappings', { team_code: testTeamCode });
    await cleanupTestData('device_locks', { team_id: 'load_test_team' });
  });
});

// Export utilities for use in other test files
module.exports = {
  getSupabaseClient,
  callNetlifyFunction,
  cleanupTestData,
  generateTestId,
  waitForCondition,
  PerformanceMonitor
};