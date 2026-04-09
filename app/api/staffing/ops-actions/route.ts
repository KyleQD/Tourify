import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { trySelfHealStaffingCache } from '@/lib/staffing/alerting'
import {
  buildStaffingResponseHeaders,
  logStaffingApiTelemetry,
} from '@/lib/staffing/api-observability'

const limiter = createRateLimiter({
  namespace: 'staffing-ops-actions',
  limit: 30,
  windowSec: 60,
})

const bodySchema = z.object({
  venue_id: z.string().uuid(),
  action: z.enum(['refresh_cache', 'self_heal']),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  let userId: string | undefined
  let venueId: string | undefined

  async function send(input: {
    status: number
    body: Record<string, unknown>
    rateLimitRemaining?: number
    rateLimitReset?: number
    dataSource?: string
    errorCode?: string
  }) {
    await logStaffingApiTelemetry({
      endpoint: '/api/staffing/ops-actions',
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

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success)
      return send({
        status: 400,
        body: { success: false, error: 'Invalid request body' },
        errorCode: 'INVALID_BODY',
      })

    venueId = parsed.data.venue_id
    const canReview = await canReviewStaffingApplications({ userId: user.id, venueId })
    if (!canReview)
      return send({
        status: 403,
        body: { success: false, error: 'Forbidden' },
        errorCode: 'FORBIDDEN',
      })

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

    if (parsed.data.action === 'refresh_cache') {
      const { error } = await supabase.rpc('refresh_staffing_overview_cache', {
        p_venue_id: venueId,
      })
      if (error)
        return send({
          status: 500,
          body: { success: false, error: error.message },
          rateLimitRemaining: rl.remaining,
          rateLimitReset: rl.reset,
          errorCode: 'REFRESH_FAILED',
        })

      return send({
        status: 200,
        body: { success: true, action: 'refresh_cache', venue_id: venueId },
        rateLimitRemaining: rl.remaining,
        rateLimitReset: rl.reset,
        dataSource: 'refresh_cache',
      })
    }

    const healResult = await trySelfHealStaffingCache({
      venueId,
      reason: 'manual_ops_action',
    })

    return send({
      status: healResult.success ? 200 : 409,
      body: {
        success: healResult.success,
        action: 'self_heal',
        venue_id: venueId,
        result: healResult,
      },
      rateLimitRemaining: rl.remaining,
      rateLimitReset: rl.reset,
      dataSource: 'self_heal',
      errorCode: healResult.success ? undefined : 'SELF_HEAL_UNAVAILABLE',
    })
  } catch (error) {
    console.error('[staffing/ops-actions]', error)
    return send({
      status: 500,
      body: { success: false, error: 'Failed to execute staffing operation' },
      errorCode: 'UNEXPECTED',
    })
  }
}
