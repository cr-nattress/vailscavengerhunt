/**
 * Sponsors Route
 * Express route handler for sponsor data
 * Provides fallback sponsor data for development
 */

import express from 'express'
import { SponsorsRequest, SponsorsResponse } from '../types/sponsors'
import { createClient } from '@supabase/supabase-js'
import { createApiLogger } from '../logging/adapters/legacyLogger'

const router = express.Router()
const logger = createApiLogger('sponsors')

// GET /api/sponsors - fetch sponsors for an organization/hunt
router.post('/sponsors', async (req: express.Request, res: express.Response) => {
  try {
    const request: SponsorsRequest = req.body

    logger.info('sponsorsRoute', 'request-received', {
      message: 'Received sponsors request',
      request
    })

    // Validate request
    if (!request.organizationId || !request.huntId) {
      return res.status(400).json({
        error: 'Missing required fields: organizationId and huntId are required'
      })
    }

    // Fetch real sponsor data from Supabase
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        logger.warn('sponsorsRoute', 'missing-supabase-config', {
          message: 'Missing Supabase config, returning empty response'
        })
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
        logger.error('sponsorsRoute', 'supabase-query-error', new Error(error.message), {
          message: 'Supabase error',
          error
        })
        return res.status(500).json({ error: 'Failed to fetch sponsors from database' })
      }

      if (!sponsors || sponsors.length === 0) {
        logger.info('sponsorsRoute', 'no-sponsors-found', {
          message: 'No sponsors found',
          organizationId: request.organizationId,
          huntId: request.huntId
        })
        return res.json({ layout: '1x2', items: [] })
      }

      logger.info('sponsorsRoute', 'sponsors-found', {
        message: `Found ${sponsors.length} sponsors from Supabase`,
        count: sponsors.length
      })

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

      logger.info('sponsorsRoute', 'response-sent', {
        message: 'Returning sponsors from Supabase',
        itemCount: response.items.length,
        layout: response.layout
      })
      res.json(response)

    } catch (supabaseError) {
      logger.error('sponsorsRoute', 'supabase-connection-error', supabaseError as Error, {
        message: 'Error fetching from Supabase'
      })
      return res.status(500).json({ error: 'Database connection failed' })
    }

  } catch (error) {
    logger.error('sponsorsRoute', 'internal-error', error as Error, {
      message: 'Internal server error'
    })
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Something went wrong'
    })
  }
})

export default router