import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateRequestWithBearerFallback } from '@/lib/auth/mobile-request-auth'

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestWithBearerFallback(request)
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })

    const supabase = createServiceRoleClient()
    // PostgREST or-filter safety: strip syntax-altering characters before
    // interpolating into the ilike clause list.
    const safeTerm = parsed.data.q.replace(/[,()\\]/g, ' ').trim()
    const term = `%${safeTerm}%`

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
