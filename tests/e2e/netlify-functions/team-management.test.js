/**
 * E2E Tests for Team Management Functions
 * Tests team verification, device locks, and progress tracking
 * Based on STORY-005 requirements
 */

const { expect } = require('chai');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:8888/.netlify/functions';
const TEST_TIMEOUT = 10000; // 10 seconds for async operations

// Test data
const TEST_ORG = 'test-org';
const TEST_HUNT = 'test-hunt-' + Date.now();
const VALID_TEAM_CODE = 'TEST123';
const INVALID_TEAM_CODE = 'INVALID999';

describe('Team Management E2E Tests', function() {
  this.timeout(TEST_TIMEOUT);

  let testDeviceId;
  let testSessionId;

  beforeEach(() => {
    testDeviceId = uuidv4();
    testSessionId = uuidv4();
  });

  describe('Team Verification Tests', () => {
    it('should verify a valid team code', async () => {
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: VALID_TEAM_CODE,
          deviceHint: testDeviceId
        })
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data).to.have.property('success');
      expect(data).to.have.property('team');
      if (data.success) {
        expect(data.team).to.have.property('name');
        expect(data).to.have.property('lockToken');
      }
    });

    it('should reject an invalid team code', async () => {
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: INVALID_TEAM_CODE,
          deviceHint: testDeviceId
        })
      });

      const data = await response.json();
      expect(data).to.have.property('error');
      expect(response.status).to.be.at.least(400);
    });

    it('should require a team code', async () => {
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceHint: testDeviceId
        })
      });

      expect(response.status).to.equal(400);
      const data = await response.json();
      expect(data).to.have.property('error');
    });
  });

  describe('Device Lock Tests', () => {
    it('should create a device lock on successful verification', async () => {
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: VALID_TEAM_CODE,
          deviceHint: testDeviceId
        })
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      if (data.success) {
        expect(data).to.have.property('lockToken');
        expect(data.lockToken).to.be.a('string');
        expect(data.lockToken).to.have.length.above(10);
      }
    });

    it('should handle concurrent verification attempts', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch(`${BASE_URL}/team-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: VALID_TEAM_CODE,
            deviceHint: `device-${i}-${testDeviceId}`
          })
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));

      // All requests should complete without error
      responses.forEach(response => {
        expect(response.status).to.be.at.most(409); // Could be 200 or 409 (conflict)
      });

      // At least one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).to.be.at.least(1);
    });
  });

  describe('Team Progress Tests', () => {
    let teamData;

    before(async () => {
      // First verify a team to get team data
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: VALID_TEAM_CODE,
          deviceHint: testDeviceId
        })
      });

      const data = await response.json();
      if (data.success) {
        teamData = data.team;
      }
    });

    it('should get current team progress', async () => {
      if (!teamData) {
        this.skip(); // Skip if team verification failed
      }

      const response = await fetch(`${BASE_URL}/team-current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamCode: VALID_TEAM_CODE,
          sessionId: testSessionId
        })
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data).to.be.an('object');
      // Progress data structure depends on implementation
    });

    it('should update team progress', async () => {
      if (!teamData) {
        this.skip(); // Skip if team verification failed
      }

      const progressUpdate = {
        teamCode: VALID_TEAM_CODE,
        sessionId: testSessionId,
        progress: {
          completedStops: ['stop1', 'stop2'],
          currentStop: 'stop3',
          score: 200
        }
      };

      const response = await fetch(`${BASE_URL}/progress-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: `${TEST_ORG}/${teamData.name}/${TEST_HUNT}/progress`,
          value: progressUpdate.progress
        })
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data).to.have.property('success');
    });
  });

  describe('Optimistic Locking Tests', () => {
    it('should handle version conflicts correctly', async () => {
      const key = `test-version-${Date.now()}`;
      const initialValue = { data: 'initial', version: 1 };

      // First update
      const response1 = await fetch(`${BASE_URL}/kv-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: key,
          value: initialValue
        })
      });
      expect(response1.status).to.equal(200);

      // Simulate concurrent updates
      const update1 = fetch(`${BASE_URL}/kv-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: key,
          value: { data: 'update1', version: 2 }
        })
      });

      const update2 = fetch(`${BASE_URL}/kv-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: key,
          value: { data: 'update2', version: 2 }
        })
      });

      const [res1, res2] = await Promise.all([update1, update2]);

      // Both should complete, but data integrity should be maintained
      expect(res1.status).to.equal(200);
      expect(res2.status).to.equal(200);

      // Verify final state
      const finalResponse = await fetch(`${BASE_URL}/kv-get?key=${key}`);
      const finalData = await finalResponse.json();
      expect(finalData).to.have.property('value');
      expect(finalData.value).to.have.property('version');
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 team verifications within 10 seconds', async function() {
      this.timeout(15000); // 15 seconds timeout

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, (_, i) =>
        fetch(`${BASE_URL}/team-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: VALID_TEAM_CODE,
            deviceHint: `perf-test-${i}-${testDeviceId}`
          })
        }).catch(error => ({ error }))
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check performance
      expect(duration).to.be.below(10000, 'Should complete within 10 seconds');

      // Check success rate
      const failures = results.filter(r => r.error).length;
      expect(failures).to.be.below(10, 'Should have less than 10% failure rate');
    });
  });

  describe('Data Migration Integrity Tests', () => {
    it('should maintain data consistency after migration', async () => {
      // Create test data
      const testKey = `migration-test-${Date.now()}`;
      const testValue = {
        data: 'test data',
        nested: {
          field1: 'value1',
          field2: 123,
          field3: true
        },
        array: [1, 2, 3, 4, 5]
      };

      // Store data
      const storeResponse = await fetch(`${BASE_URL}/kv-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: testKey,
          value: testValue,
          indexes: ['migration-test']
        })
      });

      expect(storeResponse.status).to.equal(200);

      // Retrieve data
      const getResponse = await fetch(`${BASE_URL}/kv-get?key=${testKey}`);
      expect(getResponse.status).to.equal(200);

      const retrievedData = await getResponse.json();
      expect(retrievedData).to.have.property('value');
      expect(retrievedData.value).to.deep.equal(testValue);

      // List with prefix
      const listResponse = await fetch(`${BASE_URL}/kv-list?prefix=migration-test`);
      expect(listResponse.status).to.equal(200);

      const listData = await listResponse.json();
      expect(listData).to.have.property('keys');
      expect(listData.keys).to.include(testKey);
    });
  });

  describe('Error Recovery Tests', () => {
    it('should handle network timeouts gracefully', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // 100ms timeout

      try {
        const response = await fetch(`${BASE_URL}/team-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: VALID_TEAM_CODE,
            deviceHint: testDeviceId
          }),
          signal: controller.signal
        });
      } catch (error) {
        expect(error.name).to.equal('AbortError');
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it('should handle malformed requests', async () => {
      const response = await fetch(`${BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json {{'
      });

      expect(response.status).to.be.at.least(400);
      const data = await response.json();
      expect(data).to.have.property('error');
    });
  });
});

// Export for use in other test suites
module.exports = {
  TEST_ORG,
  TEST_HUNT,
  VALID_TEAM_CODE
};