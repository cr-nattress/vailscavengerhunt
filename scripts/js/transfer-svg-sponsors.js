/**
 * Transfer SVG Sponsors from Storage to sponsor_assets Table
 * Based on discovered file structure: sponsors/bhhs/fall-2025/
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getSVGContent(filePath) {
  console.log(`📄 Downloading SVG content from: ${filePath}`)

  const { data, error } = await supabase
    .storage
    .from('sponsors')
    .download(filePath)

  if (error) {
    console.error(`❌ Error downloading ${filePath}:`, error)
    return null
  }

  // Convert blob to text
  const text = await data.text()
  console.log(`✅ Downloaded ${text.length} characters of SVG content`)
  return text
}

async function transferSponsors() {
  console.log('🚀 Starting SVG sponsor transfer...')

  // The discovered files
  const sponsorFiles = [
    {
      path: 'bhhs/fall-2025/chalk.svg',
      companyName: 'Chalk Digital',
      companyId: 'chalk-digital'
    },
    {
      path: 'bhhs/fall-2025/maxa.svg',
      companyName: 'MAXA',
      companyId: 'maxa'
    }
  ]

  // Clear existing sponsor_assets
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

  // Transfer each SVG file
  console.log('\n📝 Creating new sponsor_assets records...')

  for (let i = 0; i < sponsorFiles.length; i++) {
    const sponsor = sponsorFiles[i]

    console.log(`\n${i + 1}. Processing ${sponsor.companyName}...`)

    // Download SVG content
    const svgContent = await getSVGContent(sponsor.path)
    if (!svgContent) {
      console.log(`❌ Skipping ${sponsor.companyName} - could not download SVG`)
      continue
    }

    // Create sponsor record with SVG content
    const sponsorData = {
      company_id: sponsor.companyId,
      company_name: sponsor.companyName,
      image_type: 'svg',
      storage_path: sponsor.path, // Reference to storage location
      image_alt: `${sponsor.companyName} logo`,
      svg_text: svgContent, // The actual SVG content
      organization_id: 'bhhs',
      hunt_id: 'fall-2025',
      is_active: true,
      order_index: i + 1
    }

    const { data, error } = await supabase
      .from('sponsor_assets')
      .insert([sponsorData])
      .select()

    if (error) {
      console.error(`❌ Error inserting ${sponsor.companyName}:`, error)
    } else {
      console.log(`✅ Successfully transferred ${sponsor.companyName}`)
      console.log(`   ID: ${data[0].id}`)
      console.log(`   SVG Length: ${svgContent.length} chars`)
      console.log(`   Storage Path: ${sponsor.path}`)
    }
  }

  console.log('\n🎉 Transfer complete!')

  // Show final results
  console.log('\n📋 Final sponsor_assets table state:')
  const { data: finalSponsors, error: finalError } = await supabase
    .from('sponsor_assets')
    .select('*')
    .order('order_index', { ascending: true })

  if (finalError) {
    console.error('❌ Error fetching final state:', finalError)
  } else {
    console.log(`📊 Found ${finalSponsors.length} sponsor records:`)
    finalSponsors.forEach((sponsor, index) => {
      console.log(`  ${index + 1}. ${sponsor.company_name} (${sponsor.image_type})`)
      console.log(`     SVG: ${sponsor.svg_text ? 'Present' : 'Missing'} (${sponsor.svg_text?.length || 0} chars)`)
      console.log(`     Storage: ${sponsor.storage_path || 'None'}`)
    })
  }
}

transferSponsors().catch(console.error)