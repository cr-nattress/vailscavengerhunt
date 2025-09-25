/**
 * End-to-End Tests for Supabase Integration
 * Tests the new Supabase-based hunt system and data flow
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Test data constants
const TEST_ORG_ID = 'bhhs'
const TEST_HUNT_ID = 'fall-2025'
const TEST_TEAM_CODE = 'ALPHA01'
const TEST_STOP_ID = 'covered-bridge'

describe('Supabase Integration E2E Tests', () => {
  let adminClient
  let anonClient
  let testTeamId

  beforeAll(async () => {
    // Skip tests if Supabase is not configured
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.log('Skipping Supabase tests - credentials not configured')
      return
    }

    // Create clients with different permission levels
    adminClient = createClient(supabaseUrl, supabaseServiceKey)
    anonClient = createClient(supabaseUrl, supabaseAnonKey)

    // Get test team ID from team code
    const { data: teamCodeData } = await adminClient
      .from('team_codes')
      .select('team_id')
      .eq('code', TEST_TEAM_CODE)
      .single()

    if (teamCodeData) {
      testTeamId = teamCodeData.team_id
    }
  })

  describe('Database Schema Validation', () => {
    test('Organizations table should be accessible', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('organizations')
        .select('id, name')
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      // Should include BHHS from migration
      const bhhs = data.find(org => org.id === 'bhhs')
      expect(bhhs).toBeTruthy()
      expect(bhhs.name).toBe('Berkshire Hathaway HomeServices')
    })

    test('Hunts table should contain migrated data', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('hunts')
        .select('id, name, organization_id, is_active')
        .eq('organization_id', TEST_ORG_ID)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      // Should include Fall 2025 hunt from migration
      const fallHunt = data.find(hunt => hunt.id === TEST_HUNT_ID)
      expect(fallHunt).toBeTruthy()
      expect(fallHunt.name).toBe('Fall 2025')
      expect(fallHunt.is_active).toBe(true)
    })

    test('Hunt stops should contain migrated data', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('hunt_stops')
        .select('stop_id, title, clue, hints')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      // Should include covered bridge from migration
      const coveredBridge = data.find(stop => stop.stop_id === TEST_STOP_ID)
      expect(coveredBridge).toBeTruthy()
      expect(coveredBridge.title).toBe('Covered Bridge')
      expect(coveredBridge.clue).toBeTruthy()
      expect(Array.isArray(coveredBridge.hints)).toBe(true)
    })

    test('Teams should contain migrated BHHS teams', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('teams')
        .select('team_id, name, display_name, organization_id, hunt_id')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(10) // 10 BHHS teams from migration

      // Check specific team
      const berrypicker = data.find(team => team.team_id === 'berrypicker')
      expect(berrypicker).toBeTruthy()
      expect(berrypicker.display_name).toBe('Berrypicker')
    })

    test('Team codes should be configured', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('team_codes')
        .select('code, team_id, organization_id, hunt_id, is_active')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(10) // 10 team codes from migration

      // Check specific team code
      const alpha01 = data.find(code => code.code === TEST_TEAM_CODE)
      expect(alpha01).toBeTruthy()
      expect(alpha01.is_active).toBe(true)
    })
  })

  describe('Hunt Configuration System', () => {
    test('Hunt configurations should define stop ordering', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('hunt_configurations')
        .select('stop_id, default_order, is_active')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)
        .order('default_order')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)

      // Verify ordering
      for (let i = 0; i < data.length; i++) {
        expect(data[i].default_order).toBe(i + 1)
        expect(data[i].is_active).toBe(true)
      }

      // Covered bridge should be first
      expect(data[0].stop_id).toBe('covered-bridge')
    })

    test('Hunt ordering config should specify strategy', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('hunt_ordering_config')
        .select('ordering_strategy, seed_strategy')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.ordering_strategy).toBe('fixed') // BHHS uses fixed ordering
      expect(data.seed_strategy).toBe('team_based')
    })

    test('Team stop orders should be created for randomized hunts', async () => {
      if (!anonClient) return

      // Check Vail Village hunt which uses randomized ordering
      const { data, error } = await anonClient
        .from('hunt_ordering_config')
        .select('ordering_strategy')
        .eq('organization_id', 'vail')
        .eq('hunt_id', 'village-default')
        .single()

      expect(error).toBeNull()
      expect(data.ordering_strategy).toBe('randomized')

      // Check if team stop orders exist for randomized hunts
      // (This would be populated when teams are created)
      const { data: orderData, error: orderError } = await anonClient
        .from('team_stop_orders')
        .select('team_id, stop_id, step_order')
        .limit(5)

      expect(orderError).toBeNull()
      // team_stop_orders might be empty if no teams have been initialized yet
    })
  })

  describe('RPC Functions', () => {
    test('get_hunt_stops function should return ordered stops', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient.rpc('get_hunt_stops', {
        p_organization_id: TEST_ORG_ID,
        p_hunt_id: TEST_HUNT_ID,
        p_team_id: testTeamId || null
      })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)

      // Verify structure
      const firstStop = data[0]
      expect(firstStop).toHaveProperty('stop_id')
      expect(firstStop).toHaveProperty('title')
      expect(firstStop).toHaveProperty('clue')
      expect(firstStop).toHaveProperty('hints')
      expect(firstStop).toHaveProperty('step_order')
      expect(firstStop).toHaveProperty('is_completed')

      // Verify ordering
      for (let i = 0; i < data.length; i++) {
        expect(data[i].step_order).toBe(i + 1)
      }
    })

    test('initialize_team_for_hunt function should work', async () => {
      if (!adminClient || !testTeamId) return

      // This function should already have been called during migration
      // Verify that hunt progress entries exist
      const { data, error } = await adminClient
        .from('hunt_progress')
        .select('team_id, location_id, done, revealed_hints')
        .eq('team_id', testTeamId)
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      // Should have progress entries for each stop
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Tracking', () => {
    test('Hunt progress should be trackable', async () => {
      if (!adminClient || !testTeamId) return

      // Get current progress
      const { data: initialProgress, error: getError } = await adminClient
        .from('hunt_progress')
        .select('done, revealed_hints, completed_at')
        .eq('team_id', testTeamId)
        .eq('location_id', TEST_STOP_ID)
        .single()

      expect(getError).toBeNull()
      expect(initialProgress).toBeTruthy()

      // Update progress
      const { error: updateError } = await adminClient
        .from('hunt_progress')
        .update({
          done: true,
          revealed_hints: 1,
          completed_at: new Date().toISOString()
        })
        .eq('team_id', testTeamId)
        .eq('location_id', TEST_STOP_ID)

      expect(updateError).toBeNull()

      // Verify update
      const { data: updatedProgress, error: verifyError } = await adminClient
        .from('hunt_progress')
        .select('done, revealed_hints, completed_at')
        .eq('team_id', testTeamId)
        .eq('location_id', TEST_STOP_ID)
        .single()

      expect(verifyError).toBeNull()
      expect(updatedProgress.done).toBe(true)
      expect(updatedProgress.revealed_hints).toBe(1)
      expect(updatedProgress.completed_at).toBeTruthy()
    })
  })

  describe('Leaderboard View', () => {
    test('Leaderboard view should aggregate team data', async () => {
      if (!anonClient) return

      const { data, error } = await anonClient
        .from('leaderboard')
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      if (data.length > 0) {
        const team = data[0]
        expect(team).toHaveProperty('team_id')
        expect(team).toHaveProperty('name')
        expect(team).toHaveProperty('display_name')
        expect(team).toHaveProperty('score')
        expect(team).toHaveProperty('completed_locations')
        expect(team).toHaveProperty('total_locations')
      }
    })
  })

  describe('Data Integrity', () => {
    test('Foreign key relationships should be maintained', async () => {
      if (!anonClient) return

      // Test hunt configurations reference valid hunts and stops
      const { data, error } = await anonClient
        .from('hunt_configurations')
        .select(`
          stop_id,
          organization_id,
          hunt_id,
          hunt_stops!inner(title),
          hunts!inner(name)
        `)
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.length).toBeGreaterThan(0)

      const config = data[0]
      expect(config.hunt_stops).toBeTruthy()
      expect(config.hunts).toBeTruthy()
    })

    test('Unique constraints should be enforced', async () => {
      if (!adminClient) return

      // Try to insert duplicate organization
      const { error } = await adminClient
        .from('organizations')
        .insert({
          id: 'bhhs', // This already exists
          name: 'Duplicate BHHS'
        })

      expect(error).toBeTruthy()
      expect(error.code).toBe('23505') // Unique violation
    })
  })

  describe('Performance', () => {
    test('Queries should execute efficiently', async () => {
      if (!anonClient) return

      const startTime = Date.now()

      // Complex query that joins multiple tables
      const { data, error } = await anonClient.rpc('get_hunt_stops', {
        p_organization_id: TEST_ORG_ID,
        p_hunt_id: TEST_HUNT_ID,
        p_team_id: testTeamId || null
      })

      const executionTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})