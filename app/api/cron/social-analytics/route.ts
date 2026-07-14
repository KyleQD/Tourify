import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

async function runSocialAnalyticsCron() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const cronSecret = process.env.CRON_SECRET

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/social-analytics`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${serviceKey}`,
      ...(cronSecret ? { 'x-cron-secret': cronSecret } : {}),
    },
    body: JSON.stringify({ runAll: true }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return NextResponse.json(
      { error: body.error || 'social-analytics edge function failed', details: body },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true, ...body })
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runSocialAnalyticsCron()
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runSocialAnalyticsCron()
}
