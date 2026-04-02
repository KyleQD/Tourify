import { NextRequest, NextResponse } from 'next/server'

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

  return hasBearerAuthMatch(request, secret)
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
