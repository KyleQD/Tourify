import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

import { ingestOpportunitiesFromRss } from '@/lib/opportunities/rss-opportunities-service'

function getSupabaseServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const provided = request.headers.get('x-cron-secret') || ''
  return provided === cronSecret
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request))
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )

    const supabase = getSupabaseServiceClient()
    const result = await ingestOpportunitiesFromRss({
      origin: request.nextUrl.origin,
      supabase
    })

    return NextResponse.json({
      success: true,
      upserted: result.upserted
    })
  } catch (error) {
    console.error('[OpportunitiesSyncAPI] Failed to sync opportunities', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync opportunities' },
      { status: 500 }
    )
  }
}
