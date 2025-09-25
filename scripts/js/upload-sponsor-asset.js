#!/usr/bin/env node

/**
 * Upload Sponsor Asset Script
 * Uploads a sponsor asset file to Supabase storage and creates a sponsor_assets record
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function uploadSponsorAsset() {
  try {
    // Configuration
    const organizationId = 'bhhs'
    const huntId = 'fall-2025'
    const filePath = resolve('./public/images/sponsors.svg')
    const companyId = 'vail-sponsors'
    const companyName = 'Event Sponsors'

    console.log('🏗️  Uploading sponsor asset to Supabase...')
    console.log(`📁 File: ${filePath}`)
    console.log(`🏢 Organization: ${organizationId}`)
    console.log(`🏃 Hunt: ${huntId}`)

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    // Read the SVG file
    console.log('📖 Reading SVG file...')
    const svgContent = readFileSync(filePath, 'utf8')
    const fileSize = Buffer.byteLength(svgContent, 'utf8')

    console.log(`📏 File size: ${(fileSize / 1024).toFixed(2)} KB`)

    // Create the storage path
    const storagePath = `${organizationId}/${huntId}/sponsors.svg`

    // Upload to Supabase storage
    console.log('☁️  Uploading to Supabase storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sponsors')
      .upload(storagePath, svgContent, {
        contentType: 'image/svg+xml',
        upsert: true // Replace if exists
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    console.log(`✅ File uploaded to storage: ${uploadData.path}`)

    // Create sponsor_assets record
    console.log('💾 Creating sponsor_assets record...')

    // First, check if record already exists
    const { data: existingRecord } = await supabase
      .from('sponsor_assets')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('company_id', companyId)
      .maybeSingle()

    const sponsorRecord = {
      organization_id: organizationId,
      hunt_id: huntId,
      company_id: companyId,
      company_name: companyName,
      image_type: 'svg',
      image_alt: `${companyName} logo`,
      order_index: 0,
      is_active: true,
      storage_path: null, // We'll store SVG content inline
      svg_text: svgContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let result
    if (existingRecord) {
      // Update existing record
      console.log(`🔄 Updating existing record: ${existingRecord.id}`)
      result = await supabase
        .from('sponsor_assets')
        .update(sponsorRecord)
        .eq('id', existingRecord.id)
    } else {
      // Insert new record
      console.log('➕ Creating new sponsor_assets record...')
      result = await supabase
        .from('sponsor_assets')
        .insert([sponsorRecord])
    }

    const { data: dbData, error: dbError } = result

    if (dbError) {
      console.error('❌ Database operation failed:', dbError.message)

      // If it's a permission error, provide helpful guidance
      if (dbError.code === '42501') {
        console.error('💡 This appears to be a permission error.')
        console.error('   Make sure the sponsor_assets table exists and RLS policies allow service role access.')
        console.error('   Run: npm run setup:sponsor-assets')
      }

      throw dbError
    }

    console.log('✅ Sponsor asset record created/updated successfully!')

    // Test the API endpoint
    console.log('🧪 Testing sponsor API endpoint...')

    try {
      const testResponse = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co/functions/v1')}/sponsors-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          organizationId: organizationId,
          huntId: huntId
        })
      })

      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log(`✅ API test successful! Found ${testData.items?.length || 0} sponsors`)
      } else {
        console.log(`⚠️  API test returned: ${testResponse.status} ${testResponse.statusText}`)
      }
    } catch (testError) {
      console.log('ℹ️  Could not test API endpoint (may not be deployed yet)')
    }

    console.log('')
    console.log('🎉 Upload complete!')
    console.log('📊 Summary:')
    console.log(`   • Organization: ${organizationId}`)
    console.log(`   • Hunt: ${huntId}`)
    console.log(`   • Company: ${companyName}`)
    console.log(`   • File size: ${(fileSize / 1024).toFixed(2)} KB`)
    console.log(`   • Storage path: ${storagePath}`)
    console.log('')
    console.log('🔗 Next steps:')
    console.log('   • Test the sponsor card in your application')
    console.log('   • Visit: http://localhost:5179/ to see the sponsor card')
    console.log('   • Use browser dev tools to verify sponsor data is loaded')

  } catch (error) {
    console.error('❌ Upload failed:', error.message)

    if (error.code === 'ENOENT') {
      console.error('💡 Make sure the sponsors.svg file exists in public/images/')
    } else if (error.message.includes('JWT')) {
      console.error('💡 Check your Supabase service role key in .env')
    } else if (error.message.includes('bucket')) {
      console.error('💡 Make sure the "sponsors" storage bucket exists in Supabase')
    }

    process.exit(1)
  }
}

// Run the upload
uploadSponsorAsset()