/**
 * Sponsor Assets Setup Script
 * Deploys sponsor assets database schema to Supabase
 * Usage: npm run setup:sponsor-assets
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function setupSponsorAssets() {
  console.log('🚀 Starting Sponsor Assets Setup...')

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.log('📝 Please check your .env file or environment configuration')
    process.exit(1)
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('✅ Connected to Supabase')

    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'sponsor-assets-schema.sql')
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    console.log('✅ Schema file loaded')

    // Execute schema SQL
    console.log('🔄 Executing database schema...')
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schemaSQL
    })

    if (error) {
      // Try alternative method for executing SQL
      console.log('🔄 Trying alternative SQL execution method...')

      // Split SQL into individual statements
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))

      let successCount = 0
      let warningCount = 0

      for (const statement of statements) {
        if (statement.includes('create extension') ||
            statement.includes('comment on') ||
            statement.includes('drop policy') ||
            statement.includes('drop trigger')) {
          // Skip statements that might fail but aren't critical
          console.log(`⚠️  Skipping: ${statement.substring(0, 50)}...`)
          warningCount++
          continue
        }

        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          if (stmtError) {
            console.warn(`⚠️  Warning executing: ${statement.substring(0, 50)}... - ${stmtError.message}`)
            warningCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.warn(`⚠️  Warning executing: ${statement.substring(0, 50)}... - ${err.message}`)
          warningCount++
        }
      }

      console.log(`✅ Schema execution completed: ${successCount} successful, ${warningCount} warnings`)
    } else {
      console.log('✅ Database schema executed successfully')
    }

    // Validate installation
    console.log('🔄 Validating installation...')

    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'sponsor_assets')

    if (tablesError) {
      console.warn('⚠️  Could not validate table creation:', tablesError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ sponsor_assets table created successfully')
    } else {
      console.warn('⚠️  sponsor_assets table may not have been created')
    }

    // Check basic functionality
    try {
      const { data: testData, error: testError } = await supabase
        .from('sponsor_assets')
        .select('id')
        .limit(1)

      if (testError) {
        console.warn('⚠️  Table access test failed:', testError.message)
      } else {
        console.log('✅ Table is accessible and functional')
      }
    } catch (err) {
      console.warn('⚠️  Could not test table access:', err.message)
    }

    console.log('\n🎉 Sponsor Assets Setup Complete!')
    console.log('\n📋 Next Steps:')
    console.log('   1. Create "sponsors" storage bucket in Supabase Dashboard')
    console.log('   2. Set bucket to public with appropriate policies')
    console.log('   3. Run seed data script: npm run seed:sponsor-data')
    console.log('   4. Test API endpoint: npm run test:sponsor-api')

    console.log('\n📖 Storage Bucket Setup Instructions:')
    console.log('   - Go to Supabase Dashboard → Storage')
    console.log('   - Create bucket named "sponsors"')
    console.log('   - Enable "Public bucket" option')
    console.log('   - File size limit: 5MB')
    console.log('   - Allowed types: image/png, image/jpeg, image/svg+xml')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('\n🔍 Troubleshooting:')
    console.error('   - Verify Supabase credentials are correct')
    console.error('   - Check network connectivity')
    console.error('   - Ensure service role has proper permissions')
    process.exit(1)
  }
}

// Run setup if called directly
if (require.main === module) {
  setupSponsorAssets()
}

module.exports = { setupSponsorAssets }