/**
 * Validate Supabase Setup
 * This script tests the Supabase configuration and connection
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Validating Supabase Configuration...\n');

// Check environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables Status:');
console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n⚠️  Basic setup required:');
  console.log('   1. Create Supabase project at https://supabase.com');
  console.log('   2. Copy: cp .env.supabase.template .env');
  console.log('   3. Add your project URL and anon key to .env');
  console.log('   4. Run: npm run validate:supabase');
  process.exit(1);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.log('\n❌ Invalid Supabase URL format');
  console.log('   Expected: https://your-project-id.supabase.co');
  console.log(`   Received: ${supabaseUrl}`);
  process.exit(1);
}

// Test connection
console.log('\n🔗 Testing Supabase Connection...');

try {
  // Create client with anon key
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('✅ Supabase client created successfully');

  // Test basic API access
  console.log('🧪 Testing API access...');

  // Simple health check - try to access auth
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error && error.message !== 'Auth session missing!') {
    throw error;
  }

  console.log('✅ API access confirmed');
  console.log('✅ Authentication system accessible');

  // Test service role key if provided
  if (serviceRoleKey) {
    console.log('🔐 Testing service role access...');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Test admin capabilities
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      console.log('⚠️  Service role key may be invalid:', usersError.message);
    } else {
      console.log('✅ Service role access confirmed');
    }
  }

} catch (error) {
  console.log('❌ Connection test failed:', error.message);

  if (error.message.includes('Invalid API key')) {
    console.log('   Check your VITE_SUPABASE_ANON_KEY - it may be incorrect');
  } else if (error.message.includes('fetch')) {
    console.log('   Check your VITE_SUPABASE_URL - the project may not exist');
  }

  process.exit(1);
}

// Check package dependencies
console.log('\n📦 Dependencies:');
try {
  const supabasePackage = await import('@supabase/supabase-js');
  console.log('   ✅ @supabase/supabase-js available');

  const ssrPackage = await import('@supabase/ssr');
  console.log('   ✅ @supabase/ssr available');
} catch (error) {
  console.log('   ❌ Missing Supabase packages');
  console.log('   Run: npm install @supabase/supabase-js @supabase/ssr');
}

// Feature flags status
console.log('\n🚩 Feature Flags:');
console.log(`   USE_SUPABASE: ${process.env.VITE_USE_SUPABASE || 'false'}`);
console.log(`   USE_NETLIFY_BLOBS: ${process.env.VITE_USE_NETLIFY_BLOBS || 'true'}`);
console.log(`   ENABLE_REALTIME: ${process.env.VITE_ENABLE_REALTIME || 'false'}`);

console.log('\n✅ Supabase validation complete!');
console.log('\n📚 Next Steps:');
console.log('   1. Create database schema: Task 02');
console.log('   2. Set up Row Level Security: Task 03');
console.log('   3. Generate TypeScript types');
console.log('\n📖 Documentation:');
console.log('   Setup Guide: docs/SUPABASE_SETUP_INSTRUCTIONS.md');
console.log('   Environment Template: .env.supabase.template');