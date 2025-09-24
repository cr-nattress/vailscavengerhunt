/**
 * Transfer Supabase Storage Images to sponsor_assets Table
 * This script will:
 * 1. Check current sponsor_assets table content
 * 2. List images in Supabase Storage
 * 3. Transfer Storage images to sponsor_assets table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '../../.env')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Required environment variables:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCurrentSponsors() {
  console.log('\n📋 Checking current sponsor_assets table...')

  const { data: sponsors, error } = await supabase
    .from('sponsor_assets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ Error fetching sponsors:', error)
    return null
  }

  console.log(`📊 Found ${sponsors.length} existing sponsor records:`)
  sponsors.forEach((sponsor, index) => {
    console.log(`  ${index + 1}. ${sponsor.company_name} (${sponsor.image_type}) - ${sponsor.organization_id}/${sponsor.hunt_id}`)
  })

  return sponsors
}

async function listStorageImages() {
  console.log('\n📂 Checking Supabase Storage for images...')

  // Try different bucket names and paths
  const bucketNames = ['sponsors', 'sponsor-assets', 'images']
  let allFiles = []

  for (const bucket of bucketNames) {
    console.log(`  Checking bucket: ${bucket}`)
    const { data: files, error } = await supabase
      .storage
      .from(bucket)
      .list()

    if (!error && files && files.length > 0) {
      console.log(`    📁 Found ${files.length} files in '${bucket}':`)
      files.forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`)
        allFiles.push({ ...file, bucket })
      })
    } else if (error) {
      console.log(`    ❌ Error or no access to '${bucket}': ${error.message}`)
    } else {
      console.log(`    📂 Empty bucket: ${bucket}`)
    }
  }

  // Also try listing all buckets
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets()

  if (!bucketsError && buckets) {
    console.log(`\n🪣 Available storage buckets:`)
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
  }

  return allFiles
}

async function getStorageImageUrl(fileName, bucket = 'sponsors') {
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(fileName)

  return data.publicUrl
}

async function transferStorageToSponsors() {
  console.log('\n🔄 Starting transfer process...')

  // First, get storage files
  const files = await listStorageImages()
  if (!files || files.length === 0) {
    console.log('❌ No files found in storage to transfer')
    return
  }

  // Clear existing sponsor_assets (you mentioned replacing)
  console.log('\n🗑️  Clearing existing sponsor_assets...')
  const { error: deleteError } = await supabase
    .from('sponsor_assets')
    .delete()
    .gt('created_at', '1970-01-01') // This will delete all records

  if (deleteError) {
    console.error('❌ Error clearing sponsor_assets:', deleteError)
    return
  }
  console.log('✅ Cleared existing sponsor_assets')

  // Transfer each storage file to sponsor_assets table
  console.log('\n📝 Creating new sponsor_assets records...')

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const imageUrl = await getStorageImageUrl(file.name, file.bucket)

    // Extract company name from filename (remove extension)
    const companyName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ')
    const companyId = file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, '-')

    const sponsorData = {
      company_id: companyId,
      company_name: companyName,
      image_type: 'png', // Default to PNG for image files
      storage_path: file.name, // Use storage path, not full URL
      image_alt: `${companyName} logo`,
      svg_text: null,
      organization_id: 'bhhs', // Default org
      hunt_id: 'fall-2025', // Default hunt
      is_active: true,
      order_index: i + 1
    }

    const { data, error } = await supabase
      .from('sponsor_assets')
      .insert([sponsorData])
      .select()

    if (error) {
      console.error(`❌ Error inserting ${file.name}:`, error)
    } else {
      console.log(`✅ Transferred ${file.name} -> ${companyName}`)
      console.log(`   URL: ${imageUrl}`)
      console.log(`   Bucket: ${file.bucket}`)
    }
  }

  console.log('\n🎉 Transfer complete!')
}

async function main() {
  console.log('🚀 Starting Supabase Storage to sponsor_assets transfer...')

  // Step 1: Check current state
  await checkCurrentSponsors()

  // Step 2: List storage images
  const files = await listStorageImages()

  if (!files || files.length === 0) {
    console.log('\n❌ No storage files found. Nothing to transfer.')
    return
  }

  // Step 3: Confirm transfer
  console.log('\n⚠️  This will replace all current sponsor_assets with storage images.')
  console.log('Continue? (This script will proceed automatically)')

  // Step 4: Execute transfer
  await transferStorageToSponsors()

  // Step 5: Show final state
  console.log('\n📋 Final sponsor_assets table state:')
  await checkCurrentSponsors()
}

main().catch(console.error)