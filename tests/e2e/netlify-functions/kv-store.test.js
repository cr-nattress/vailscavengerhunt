/**
 * E2E Tests for KV Store Functions
 * Tests both kv-upsert and kv-list with Supabase backend
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client for test cleanup
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data generator
function generateTestKey(prefix = 'test') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

describe('KV Store E2E Tests', () => {
  const testKeys = [];

  // Cleanup function
  async function cleanup() {
    if (testKeys.length > 0) {
      for (const key of testKeys) {
        try {
          await supabase.from('kv_store').delete().eq('key', key);
        } catch (error) {
          console.error(`Failed to cleanup key ${key}:`, error);
        }
      }
    }
  }

  beforeAll(async () => {
    // Ensure we're using Supabase mode
    expect(process.env.USE_SUPABASE_KV).toBe('true');

    // Test connection
    const { error } = await supabase.from('kv_store').select('key').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('kv-upsert', () => {
    it('should create a new KV pair', async () => {
      const key = generateTestKey('create');
      testKeys.push(key);

      const response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: { test: true, message: 'Hello World' }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.key).toBe(key);
      expect(data.timestamp).toBeDefined();
    });

    it('should update an existing KV pair', async () => {
      const key = generateTestKey('update');
      testKeys.push(key);

      // First create
      await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: { version: 1 }
        })
      });

      // Then update
      const response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: { version: 2, updated: true }
        })
      });

      expect(response.status).toBe(200);

      // Verify update in database
      const { data: dbData } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

      expect(dbData.value.version).toBe(2);
      expect(dbData.value.updated).toBe(true);
    });

    it('should handle indexes properly', async () => {
      const key = generateTestKey('indexes');
      testKeys.push(key);

      const response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: { type: 'document' },
          indexes: [
            { key: 'type', member: 'document' },
            { key: 'status', member: 'active' }
          ]
        })
      });

      expect(response.status).toBe(200);

      // Verify indexes in database
      const { data: dbData } = await supabase
        .from('kv_store')
        .select('indexes')
        .eq('key', key)
        .single();

      expect(dbData.indexes).toContain('type:document');
      expect(dbData.indexes).toContain('status:active');
    });

    it('should reject invalid requests', async () => {
      // Missing key
      let response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: { test: true }
        })
      });
      expect(response.status).toBe(400);

      // Missing value
      response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'test'
        })
      });
      expect(response.status).toBe(400);

      // Invalid value type
      response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'test',
          value: 'not an object'
        })
      });
      expect(response.status).toBe(400);
    });

    it('should handle large JSON values', async () => {
      const key = generateTestKey('large');
      testKeys.push(key);

      const largeValue = {
        data: Array(100).fill(null).map((_, i) => ({
          id: i,
          text: 'x'.repeat(100),
          nested: { value: i }
        }))
      };

      const response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: largeValue })
      });

      expect(response.status).toBe(200);
    });
  });

  describe('kv-list', () => {
    beforeEach(async () => {
      // Create test data
      const testData = [
        { key: 'list_test_1', value: { order: 1 } },
        { key: 'list_test_2', value: { order: 2 } },
        { key: 'list_test_3', value: { order: 3 } },
        { key: 'other_test_1', value: { order: 4 } }
      ];

      for (const item of testData) {
        testKeys.push(item.key);
        await fetch(`${BASE_URL}/api/kv/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
    });

    it('should list all KV pairs', async () => {
      const response = await fetch(`${BASE_URL}/api/kv/list`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.keys).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThanOrEqual(4);
    });

    it('should filter by prefix', async () => {
      const response = await fetch(`${BASE_URL}/api/kv/list?prefix=list_test`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.count).toBe(3);
      expect(data.keys).toContain('list_test_1');
      expect(data.keys).toContain('list_test_2');
      expect(data.keys).toContain('list_test_3');
      expect(data.keys).not.toContain('other_test_1');
    });

    it('should include values when requested', async () => {
      const response = await fetch(`${BASE_URL}/api/kv/list?prefix=list_test&includeValues=true`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(data.data['list_test_1']).toEqual({ order: 1 });
      expect(data.data['list_test_2']).toEqual({ order: 2 });
    });

    it('should support pagination', async () => {
      // First page
      let response = await fetch(`${BASE_URL}/api/kv/list?prefix=list_test&limit=2&offset=0`);
      let data = await response.json();
      expect(data.count).toBe(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.hasMore).toBe(true);

      // Second page
      response = await fetch(`${BASE_URL}/api/kv/list?prefix=list_test&limit=2&offset=2`);
      data = await response.json();
      expect(data.count).toBe(1);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('should sort results', async () => {
      const response = await fetch(`${BASE_URL}/api/kv/list?prefix=list_test&sortOrder=desc`);
      const data = await response.json();

      expect(data.keys[0]).toBe('list_test_3');
      expect(data.keys[data.keys.length - 1]).toBe('list_test_1');
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 upserts within 10 seconds', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const key = generateTestKey(`perf_${i}`);
        testKeys.push(key);

        promises.push(
          fetch(`${BASE_URL}/api/kv/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key,
              value: { index: i, timestamp: Date.now() }
            })
          })
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
      expect(results.every(r => r.status === 200)).toBe(true);
    });

    it('should list 100+ entries efficiently', async () => {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/kv/list?prefix=perf_&limit=100`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates to the same key', async () => {
      const key = generateTestKey('concurrent');
      testKeys.push(key);

      // Create initial value
      await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: { counter: 0 }
        })
      });

      // Concurrent updates
      const updates = Array(10).fill(null).map((_, i) =>
        fetch(`${BASE_URL}/api/kv/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value: { counter: i + 1, updatedBy: `process_${i}` }
          })
        })
      );

      const results = await Promise.all(updates);
      expect(results.every(r => r.status === 200)).toBe(true);

      // Verify final state
      const { data } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

      expect(data.value.counter).toBeGreaterThanOrEqual(1);
      expect(data.value.updatedBy).toMatch(/process_\d+/);
    });
  });

  describe('Index Queries', () => {
    beforeEach(async () => {
      // Create indexed test data
      const indexedData = [
        {
          key: 'idx_doc_1',
          value: { title: 'Document 1' },
          indexes: [
            { key: 'type', member: 'document' },
            { key: 'status', member: 'active' }
          ]
        },
        {
          key: 'idx_doc_2',
          value: { title: 'Document 2' },
          indexes: [
            { key: 'type', member: 'document' },
            { key: 'status', member: 'archived' }
          ]
        },
        {
          key: 'idx_img_1',
          value: { title: 'Image 1' },
          indexes: [
            { key: 'type', member: 'image' },
            { key: 'status', member: 'active' }
          ]
        }
      ];

      for (const item of indexedData) {
        testKeys.push(item.key);
        await fetch(`${BASE_URL}/api/kv/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
    });

    it('should filter by index', async () => {
      const response = await fetch(`${BASE_URL}/api/kv/list?index=type:document`);
      const data = await response.json();

      expect(data.keys).toContain('idx_doc_1');
      expect(data.keys).toContain('idx_doc_2');
      expect(data.keys).not.toContain('idx_img_1');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failure
      // For now, we test with invalid data that might trigger errors

      const response = await fetch(`${BASE_URL}/api/kv/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});

describe('Backward Compatibility Tests', () => {
  it('should maintain the same API response format', async () => {
    const key = generateTestKey('compat');

    // Test upsert response format
    const upsertResponse = await fetch(`${BASE_URL}/api/kv/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        value: { test: true }
      })
    });

    const upsertData = await upsertResponse.json();
    expect(upsertData).toHaveProperty('ok');
    expect(upsertData).toHaveProperty('key');
    expect(upsertData).toHaveProperty('timestamp');

    // Test list response format
    const listResponse = await fetch(`${BASE_URL}/api/kv/list`);
    const listData = await listResponse.json();
    expect(listData).toHaveProperty('keys');
    expect(listData).toHaveProperty('count');

    // Cleanup
    await supabase.from('kv_store').delete().eq('key', key);
  });
});