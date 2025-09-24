#!/usr/bin/env node
/**
 * Simple KV Store Test
 * Tests if we can create the table and perform basic operations
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ksiqnglqlurlackoteyc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaXFuZ2xxbHVybGFja290ZXljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODY2MDE4NywiZXhwIjoyMDc0MjM2MTg3fQ.jtiLrW4zLHm2DjorFCw7w4GzJXYo9U5JurJfdiG2d9g'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testKV() {
  console.log('🧪 Testing KV Store Setup')
  console.log('='.repeat(40))

  try {
    // Create table if not exists
    console.log('1. Creating key_value_store table...')
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS key_value_store (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // Test basic operations
    console.log('2. Testing insert operation...')
    const testKey = 'test-' + Date.now()
    const testValue = { message: 'Hello KV!', timestamp: new Date().toISOString() }

    const { data: insertData, error: insertError } = await supabase
      .from('key_value_store')
      .insert({
        key: testKey,
        value: testValue
      })
      .select()

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message)

      // Try creating table first
      console.log('🔄 Trying to create table first...')
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      })

      if (createError) {
        console.error('❌ Table creation failed:', createError.message)
        return false
      }

      // Retry insert
      const { data: retryData, error: retryError } = await supabase
        .from('key_value_store')
        .insert({
          key: testKey,
          value: testValue
        })
        .select()

      if (retryError) {
        console.error('❌ Retry insert failed:', retryError.message)
        return false
      }

      console.log('✅ Insert successful on retry')
    } else {
      console.log('✅ Insert successful')
    }

    console.log('3. Testing select operation...')
    const { data: selectData, error: selectError } = await supabase
      .from('key_value_store')
      .select('*')
      .eq('key', testKey)
      .single()

    if (selectError) {
      console.error('❌ Select failed:', selectError.message)
      return false
    }

    console.log('✅ Select successful')
    console.log('   Retrieved:', JSON.stringify(selectData.value))

    console.log('4. Testing cleanup...')
    const { error: deleteError } = await supabase
      .from('key_value_store')
      .delete()
      .eq('key', testKey)

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError.message)
    } else {
      console.log('✅ Cleanup successful')
    }

    console.log('')
    console.log('🎉 KV Store is ready for use!')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

testKV().then(success => {
  process.exit(success ? 0 : 1)
})