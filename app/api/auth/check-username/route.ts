import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const USERNAME_CHECK_WINDOW_MS = 60_000
const USERNAME_CHECK_MAX_REQUESTS = 30

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(key: string) {
  const now = Date.now()
  const existing = rateLimitBuckets.get(key)
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + USERNAME_CHECK_WINDOW_MS })
    return false
  }

  existing.count += 1
  rateLimitBuckets.set(key, existing)
  return existing.count > USERNAME_CHECK_MAX_REQUESTS
}

export async function GET(request: NextRequest) {
  try {
    if (isRateLimited(getClientKey(request))) {
      return NextResponse.json(
        { available: false },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rawUsername = searchParams.get('username') || ''
    const username = normalizeUsername(rawUsername)

    if (!username) {
      return NextResponse.json(
        { available: false },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .limit(1)

    if (error) {
      console.error('[Check Username] Query failed:', error)
      return NextResponse.json(
        { available: false },
        { status: 500 }
      )
    }

    const available = !data || data.length === 0

    // Return boolean only — avoid leaking whether a username maps to a real account shape.
    return NextResponse.json({ available })
  } catch (error) {
    console.error('[Check Username] Unexpected error:', error)
    return NextResponse.json(
      { available: false },
      { status: 500 }
    )
  }
}
