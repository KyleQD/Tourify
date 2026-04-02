import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  getPersonalizedOpportunities,
  ingestOpportunitiesFromRss
} from '@/lib/opportunities/rss-opportunities-service'

function getSupabaseServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function parseTypes(value: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map(type => type.trim().toLowerCase())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const rawLimit = Number(searchParams.get('limit') || '20')
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 60)) : 20
    const location = searchParams.get('location') || undefined
    const types = parseTypes(searchParams.get('types'))
    const shouldRefresh = searchParams.get('refresh') === 'true'

    const authResult = await authenticateApiRequest(request)
    const serviceSupabase = getSupabaseServiceClient()

    if (shouldRefresh)
      await ingestOpportunitiesFromRss({
        origin: request.nextUrl.origin,
        supabase: serviceSupabase
      })

    const items = await getPersonalizedOpportunities({
      supabase: serviceSupabase,
      userId: authResult?.user?.id,
      limit,
      location,
      types
    })

    return NextResponse.json({
      success: true,
      opportunities: items
    })
  } catch (error) {
    console.error('[OpportunitiesAPI] Failed to load opportunities', error)
    return NextResponse.json(
      {
        success: false,
        opportunities: [],
        error: 'Failed to load opportunities'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult?.user?.id)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )

    const body = await request.json()
    const opportunityId = String(body.opportunityId || '').trim()
    const interactionType = String(body.interactionType || '').trim().toLowerCase()

    if (!opportunityId)
      return NextResponse.json(
        { success: false, error: 'opportunityId is required' },
        { status: 400 }
      )

    if (!['view', 'click', 'save', 'dismiss', 'apply'].includes(interactionType))
      return NextResponse.json(
        { success: false, error: 'Invalid interactionType' },
        { status: 400 }
      )

    const serviceSupabase = getSupabaseServiceClient()
    const { error } = await serviceSupabase
      .from('user_opportunity_interactions')
      .insert({
        user_id: authResult.user.id,
        opportunity_id: opportunityId,
        interaction_type: interactionType
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[OpportunitiesAPI] Failed to track interaction', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track interaction' },
      { status: 500 }
    )
  }
}
