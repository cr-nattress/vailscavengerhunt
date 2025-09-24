/**
 * Sponsors Route
 * Express route handler for sponsor data
 * Provides fallback sponsor data for development
 */

import express from 'express'
import { SponsorsRequest, SponsorsResponse } from '../types/sponsors'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// GET /api/sponsors - fetch sponsors for an organization/hunt
router.post('/sponsors', async (req: express.Request, res: express.Response) => {
  try {
    const request: SponsorsRequest = req.body

    console.log('[sponsors-route] Received sponsors request:', request)

    // Validate request
    if (!request.organizationId || !request.huntId) {
      return res.status(400).json({
        error: 'Missing required fields: organizationId and huntId are required'
      })
    }

    // Fetch real sponsor data from Supabase
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('[sponsors-route] Missing Supabase config, returning empty response')
        return res.json({ layout: '1x2', items: [] })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Query sponsor assets from Supabase
      const { data: sponsors, error } = await supabase
        .from('sponsor_assets')
        .select('*')
        .eq('organization_id', request.organizationId)
        .eq('hunt_id', request.huntId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('[sponsors-route] Supabase error:', error)
        return res.status(500).json({ error: 'Failed to fetch sponsors from database' })
      }

      if (!sponsors || sponsors.length === 0) {
        console.log('[sponsors-route] No sponsors found for', request.organizationId, request.huntId)
        return res.json({ layout: '1x2', items: [] })
      }

      console.log(`[sponsors-route] Found ${sponsors.length} sponsors from Supabase`)

      // Transform database data to API response format
      const items = sponsors.map(sponsor => ({
        id: sponsor.id,
        companyId: sponsor.company_id,
        companyName: sponsor.company_name,
        alt: sponsor.image_alt,
        type: sponsor.image_type,
        src: sponsor.image_path, // This should be the full URL or signed URL
        svg: sponsor.svg_text
      }))

      const response: SponsorsResponse = {
        layout: '1x2', // Default layout
        items
      }

      console.log('[sponsors-route] Returning sponsors from Supabase:', response)
      res.json(response)

    } catch (supabaseError) {
      console.error('[sponsors-route] Error fetching from Supabase:', supabaseError)
      return res.status(500).json({ error: 'Database connection failed' })
    }

  } catch (error) {
    console.error('[sponsors-route] Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
})

export default router