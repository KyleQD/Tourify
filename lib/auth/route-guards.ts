import { NextRequest, NextResponse } from 'next/server'

/**
 * Internal/debug routes: in production require `INTERNAL_API_SECRET` or `CRON_SECRET`
 * via `Authorization: Bearer …` or `x-internal-api-secret`. Non-production allows all
 * callers so local dev works without secrets.
 */
function hasBearerAuthMatch(request: NextRequest, secret: string) {
  const authorizationHeader = request.headers.get('authorization')
  if (authorizationHeader === `Bearer ${secret}`) return true

  const internalHeader = request.headers.get('x-internal-api-secret')
  return internalHeader === secret
}

export function isAuthorizedInternalRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return true

  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
  if (!secret) return false

  return hasBearerAuthMatch(request, secret)
}

export function isAuthorizedCronRequest(request: NextRequest) {
  if (process.env.VERCEL === '1' && request.headers.get('x-vercel-cron') === '1')
    return true

  const secret = process.env.CRON_SECRET
  if (!secret) return false

  if (hasBearerAuthMatch(request, secret)) return true

  const legacy = request.headers.get('x-cron-secret') || ''
  return legacy === secret
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
