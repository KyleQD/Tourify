import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50)

    if (!query) return NextResponse.json({ users: [] })

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ users: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to search users' }, { status: 500 })
  }
})


