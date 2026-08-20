import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { jsonError, readJson, requireApiUser } from '@/lib/api/route-helpers'
import { createPromoterTrackingLink, PromoterAssetCommandError } from '@/lib/promoter-network/assets-command'
import { isSafePromoterDestinationPath } from '@/lib/promoter-network/tracking'
import { createRateLimiter } from '@/lib/utils/rate-limit'

const createTrackingLinkSchema = z.object({
  label: z.string().trim().max(120).optional(),
  destination_path: z.string().trim().max(1024).refine(isSafePromoterDestinationPath, 'Destination must be a safe Tourify path.').optional(),
  expires_at: z.string().datetime().optional(),
})
const createTrackingLinkLimiter = createRateLimiter({ namespace: 'promoter:tracking-link:create', limit: 20, windowSec: 60 })

type RouteContext = { params: Promise<{ membershipId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response
  const { membershipId } = await params
  if (!z.string().uuid().safeParse(membershipId).success)
    return jsonError({ status: 400, code: 'invalid_membership', message: 'A valid promoter membership is required.' })

  const parsed = await readJson(request, createTrackingLinkSchema, 'invalid_tracking_link', 'Invalid tracking link request.')
  if (!parsed.success) return parsed.response

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await createTrackingLinkLimiter.check(`${auth.auth.user.id}:${ip}:${membershipId}`)
  if (!limit.success)
    return jsonError({ status: 429, code: 'rate_limited', message: 'Too many tracking links were created. Please try again shortly.', retryable: true })

  try {
    const link = await createPromoterTrackingLink({
      actorUserId: auth.auth.user.id,
      membershipId,
      label: parsed.data.label || null,
      destinationPath: parsed.data.destination_path || null,
      expiresAt: parsed.data.expires_at || null,
    })
    return NextResponse.json({
      data: {
        ...link,
        token: undefined,
        public_url: new URL(`/r/${link.token}`, request.nextUrl.origin).toString(),
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof PromoterAssetCommandError)
      return jsonError({ status: error.status, code: error.code, message: error.message })
    console.error('[promoter tracking links] create failed', error)
    return jsonError({ status: 503, code: 'tracking_link_unavailable', message: 'Tracking links are temporarily unavailable.', retryable: true })
  }
}
