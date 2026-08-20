import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { jsonError, readJson, requireApiUser } from '@/lib/api/route-helpers'
import { bindPromoterPromoCode, PromoterAssetCommandError } from '@/lib/promoter-network/assets-command'
import { createRateLimiter } from '@/lib/utils/rate-limit'

const bindPromoCodeSchema = z.object({ promo_code_id: z.string().uuid() })
const bindPromoCodeLimiter = createRateLimiter({ namespace: 'promoter:promo-code:bind', limit: 12, windowSec: 60 })
type RouteContext = { params: Promise<{ membershipId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response
  const { membershipId } = await params
  if (!z.string().uuid().safeParse(membershipId).success)
    return jsonError({ status: 400, code: 'invalid_membership', message: 'A valid promoter membership is required.' })
  const parsed = await readJson(request, bindPromoCodeSchema, 'invalid_promo_code', 'A valid existing promo code is required.')
  if (!parsed.success) return parsed.response

  const limit = await bindPromoCodeLimiter.check(`${auth.auth.user.id}:${membershipId}`)
  if (!limit.success)
    return jsonError({ status: 429, code: 'rate_limited', message: 'Too many promo-code requests. Please try again shortly.', retryable: true })

  try {
    const binding = await bindPromoterPromoCode({
      actorUserId: auth.auth.user.id,
      membershipId,
      promoCodeId: parsed.data.promo_code_id,
    })
    return NextResponse.json({ data: binding }, { status: 201 })
  } catch (error) {
    if (error instanceof PromoterAssetCommandError)
      return jsonError({ status: error.status, code: error.code, message: error.message })
    console.error('[promoter promo code] binding failed', error)
    return jsonError({ status: 503, code: 'promo_code_unavailable', message: 'Promo-code attribution is temporarily unavailable.', retryable: true })
  }
}
