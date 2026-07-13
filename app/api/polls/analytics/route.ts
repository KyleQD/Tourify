import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { aggregatePollAnalytics } from '@/lib/polls/poll-analytics'

interface PollAnalyticsPostRow {
  id: string
  content: string | null
  created_at: string
  poll_ends_at: string | null
  poll_total_votes: number | null
  posted_as_profile_id: string
}

interface PollAnalyticsOptionRow {
  id: string
  post_id: string
  text: string
  position: number
  vote_count: number
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { supabase, profileId, userId } = ctx
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '20')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20

    const { data: polls, error: pollsError } = await supabase
      .from('posts')
      .select('id, content, created_at, poll_ends_at, poll_total_votes, posted_as_profile_id')
      .eq('type', 'poll')
      .eq('posted_as_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (pollsError) {
      console.error('[poll analytics] Failed to load polls:', pollsError)
      return NextResponse.json({ error: 'Failed to load poll analytics' }, { status: 500 })
    }

    const pollRows = (polls || []) as PollAnalyticsPostRow[]
    const pollIds = pollRows.map((poll) => poll.id)

    let optionsByPost = new Map<string, PollAnalyticsOptionRow[]>()
    if (pollIds.length > 0) {
      const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .select('id, post_id, text, position, vote_count')
        .in('post_id', pollIds)
        .order('position', { ascending: true })

      if (optionsError)
        console.warn('[poll analytics] Failed to load options:', optionsError.message)
      else {
        optionsByPost = new Map()
        for (const option of ((options || []) as PollAnalyticsOptionRow[])) {
          const list = optionsByPost.get(option.post_id) || []
          list.push(option)
          optionsByPost.set(option.post_id, list)
        }
      }
    }

    let followerCount = 0
    const { data: account } = await supabase
      .from('accounts')
      .select('id, follower_count')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (account)
      followerCount = account.follower_count || 0
    else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', userId)
        .maybeSingle()
      followerCount = profile?.followers_count || 0
    }

    const summary = aggregatePollAnalytics({
      polls: pollRows.map((poll) => ({
        ...poll,
        content: poll.content || '',
        options: optionsByPost.get(poll.id) || [],
      })),
      followerCount,
    })

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('[poll analytics] error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
