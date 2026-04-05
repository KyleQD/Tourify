import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawUsername = searchParams.get('username') || ''
    const username = normalizeUsername(rawUsername)

    if (!username) {
      return NextResponse.json(
        { available: false, message: 'Username is required' },
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
        { available: false, message: 'Failed to check username availability' },
        { status: 500 }
      )
    }

    const available = !data || data.length === 0

    return NextResponse.json({
      available,
      username,
      message: available ? 'Username is available' : 'Username is already taken'
    })
  } catch (error) {
    console.error('[Check Username] Unexpected error:', error)
    return NextResponse.json(
      { available: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
