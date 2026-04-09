import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canManageVenueStaffing,
  canReviewStaffingApplications,
} from '@/lib/auth/hiring-permissions'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import { z } from 'zod'
import {
  buildStaffingResponseHeaders,
  logStaffingApiTelemetry,
} from '@/lib/staffing/api-observability'

const limiter = createRateLimiter({
  namespace: 'staffing-permissions',
  limit: 120,
  windowSec: 60,
})

const querySchema = z.object({
  venue_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  let userId: string | undefined
  let venueId: string | undefined
  async function send(input: {
    status: number
    body: Record<string, any>
    rateLimitRemaining?: number
    rateLimitReset?: number
    dataSource?: string
    errorCode?: string
  }) {
    await logStaffingApiTelemetry({
      endpoint: '/api/staffing/permissions',
      requestId,
      userId,
      venueId,
      statusCode: input.status,
      latencyMs: Date.now() - startedAt,
      dataSource: input.dataSource,
      errorCode: input.errorCode,
    })
    return NextResponse.json(input.body, {
      status: input.status,
      headers: buildStaffingResponseHeaders({
        requestId,
        startedAt,
        rateLimitRemaining: input.rateLimitRemaining,
        rateLimitReset: input.rateLimitReset,
        dataSource: input.dataSource,
      }),
    })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    userId = user?.id

    if (authError || !user)
      return send({
        status: 401,
        body: { success: false, error: 'Authentication required' },
        errorCode: 'AUTH_REQUIRED',
      })

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    )
    if (!parsed.success)
      return send({
        status: 400,
        body: { success: false, error: 'venue_id is required' },
        errorCode: 'INVALID_VENUE_ID',
      })
    venueId = parsed.data.venue_id

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await limiter.check(`${user.id}:${ip}:${venueId}`)
    if (!rl.success)
      return send({
        status: 429,
        body: { success: false, error: 'Rate limit exceeded' },
        rateLimitRemaining: rl.remaining,
        rateLimitReset: rl.reset,
        errorCode: 'RATE_LIMIT',
      })

    const [canManage, canReview] = await Promise.all([
      canManageVenueStaffing({ userId: user.id, venueId }),
      canReviewStaffingApplications({ userId: user.id, venueId }),
    ])

    return send({
      status: 200,
      body: {
        success: true,
        data: {
          can_manage_staffing: canManage,
          can_review_staffing: canReview,
        },
      },
      rateLimitRemaining: rl.remaining,
      rateLimitReset: rl.reset,
      dataSource: 'rbac',
    })
  } catch (error) {
    console.error('[staffing/permissions]', error)
    return send({
      status: 500,
      body: { success: false, error: 'Failed to resolve permissions' },
      errorCode: 'UNEXPECTED',
    })
  }
}
