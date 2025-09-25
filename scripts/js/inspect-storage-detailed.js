/**
 * Detailed Supabase Storage Inspection
 * Checks all buckets and folder structures for sponsor images
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

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectBucketRecursively(bucketName, folder = '') {
  console.log(`🔍 Inspecting ${bucketName}${folder ? `/${folder}` : ''}...`)

  const { data: files, error } = await supabase
    .storage
    .from(bucketName)
    .list(folder)

  if (error) {
    console.log(`   ❌ Error: ${error.message}`)
    return []
  }

  const allFiles = []

  for (const file of files) {
    const fullPath = folder ? `${folder}/${file.name}` : file.name

    if (file.metadata === null) {
      // This is likely a folder
      console.log(`   📁 ${fullPath}/ (folder)`)
      const nestedFiles = await inspectBucketRecursively(bucketName, fullPath)
      allFiles.push(...nestedFiles)
    } else {
      // This is a file
      console.log(`   📄 ${fullPath} (${file.metadata.size} bytes, ${file.metadata.mimetype || 'unknown type'})`)

      // Get the public URL
      const { data } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(fullPath)

      allFiles.push({
        bucket: bucketName,
        path: fullPath,
        name: file.name,
        size: file.metadata.size,
        mimetype: file.metadata.mimetype,
        url: data.publicUrl
      })
    }
  }

  return allFiles
}

async function main() {
  console.log('🚀 Starting detailed storage inspection...')

  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets()

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError)
    return
  }

  console.log(`\n🪣 Found ${buckets.length} storage buckets:`)
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
  })

  // Inspect each bucket thoroughly
  const allImages = []

  for (const bucket of buckets) {
    console.log(`\n🔍 Detailed inspection of '${bucket.name}' bucket:`)
    const files = await inspectBucketRecursively(bucket.name)
    allImages.push(...files)
  }

  // Summary
  console.log(`\n📊 Summary - Found ${allImages.length} files total:`)
  allImages.forEach((file, index) => {
    console.log(`${index + 1}. ${file.bucket}/${file.path}`)
    console.log(`   Size: ${file.size} bytes, Type: ${file.mimetype}`)
    console.log(`   URL: ${file.url}`)
    console.log('')
  })

  if (allImages.length === 0) {
    console.log('❌ No image files found in any bucket!')
  } else {
    console.log(`✅ Ready to transfer ${allImages.length} files to sponsor_assets`)
  }
}

main().catch(console.error)