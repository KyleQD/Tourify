import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { collectGeneralFriendIds } from '@/lib/messaging/friends'

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
})

/**
 * General-account friends for the New Message picker.
 * Friends = approved friend requests and/or mutual personal follows.
 * Entity follows (artist/venue/org) are intentionally excluded.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })

    const { q, limit } = parsed.data
    const supabase = createServiceRoleClient()
    const userId = ctx.userId

    const friendIds = await collectGeneralFriendIds({ supabase, userId })
    if (friendIds.length === 0)
      return NextResponse.json({ friends: [] })

    let profilesQuery = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', friendIds)
      .limit(limit)

    if (q) {
      // Quote pattern for PostgREST filter safety
      const pattern = `"%${q.replace(/"/g, '')}%"`
      profilesQuery = profilesQuery.or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    }

    const { data: profiles, error: profilesError } = await profilesQuery
    if (profilesError) {
      console.error('Friends profiles lookup failed:', profilesError)
      return NextResponse.json({ error: 'Failed to load friends' }, { status: 500 })
    }

    const friends = (profiles || []).map((profile) => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    }))

    return NextResponse.json({ friends })
  } catch (error) {
    console.error('Messages friends route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
