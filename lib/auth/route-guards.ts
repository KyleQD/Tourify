import { NextRequest, NextResponse } from 'next/server'

/**
 * Internal/debug routes require `INTERNAL_API_SECRET` or `CRON_SECRET`
 * via `Authorization: Bearer …` or `x-internal-api-secret`.
 * Non-production still requires a configured secret when one is present,
 * so preview/dev cannot stay accidentally open.
 */
function hasBearerAuthMatch(request: NextRequest, secret: string) {
  const authorizationHeader = request.headers.get('authorization')
  if (authorizationHeader === `Bearer ${secret}`) return true

  const internalHeader = request.headers.get('x-internal-api-secret')
  return internalHeader === secret
}

export function isAuthorizedInternalRequest(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
  if (!secret) {
    // Fail closed outside local development when secrets are missing.
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_OPEN_INTERNAL_ROUTES === '1'
  }

  return hasBearerAuthMatch(request, secret)
}

export function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  if (hasBearerAuthMatch(request, secret)) return true

  const legacy = request.headers.get('x-cron-secret') || ''
  return legacy === secret
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
