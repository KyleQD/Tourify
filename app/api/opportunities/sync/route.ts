import { NextRequest, NextResponse } from 'next/server'

import { ingestOpportunitiesFromRss } from '@/lib/opportunities/rss-opportunities-service'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()

    const supabase = createServiceRoleClient()
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
