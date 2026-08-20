import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { resolvePromoterTrackingLink } from '@/lib/promoter-network/assets-command'
import { hashTrackingToken, isSafePromoterDestinationPath } from '@/lib/promoter-network/tracking'
import { createRateLimiter } from '@/lib/utils/rate-limit'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const resolveTrackingLinkLimiter = createRateLimiter({ namespace: 'promoter:tracking-link:resolve', limit: 60, windowSec: 60 })
type RouteContext = { params: Promise<{ token: string }> }

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { token } = await params
  if (!TOKEN_PATTERN.test(token)) return new NextResponse(null, { status: 404 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await resolveTrackingLinkLimiter.check(ip)
  if (!limit.success) return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } })

  const priorSession = request.cookies.get('tourify_promoter_attribution_session')?.value
  const anonymousSessionId = priorSession && /^[A-Za-z0-9_-]{16,128}$/.test(priorSession) ? priorSession : randomUUID()
  try {
    const resolved = await resolvePromoterTrackingLink({
      tokenHash: hashTrackingToken(token),
      anonymousSessionId,
      ipHash: ip === 'unknown' ? null : hashTrackingToken(ip),
    })
    if (!resolved || !isSafePromoterDestinationPath(resolved.destination_path)) return new NextResponse(null, { status: 404 })

    const response = NextResponse.redirect(new URL(resolved.destination_path, request.nextUrl.origin), 302)
    response.cookies.set('tourify_promoter_attribution_session', anonymousSessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    })
    return response
  } catch (error) {
    console.error('[promoter tracking link] resolution failed', error)
    return new NextResponse(null, { status: 404 })
  }
}
