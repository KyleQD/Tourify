import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })

    const supabase = createServiceRoleClient()
    const term = `%${parsed.data.q}%`

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.${term},full_name.ilike.${term}`)
      .neq('id', user.id)
      .limit(parsed.data.limit)

    if (error) {
      console.error('User search error:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    return NextResponse.json({ users: data || [] })
  } catch (error) {
    console.error('User search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
