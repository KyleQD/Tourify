import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseAuthFromCookies } from '@/lib/auth/api-auth'
import {
  canVoteOnPoll,
  resolvePollFollowerFlags,
} from '@/lib/polls/poll-eligibility'
import { buildPollPayload } from '@/lib/polls/hydrate-polls'

async function loadPollBundle(supabase: any, postId: string) {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, content, type, visibility, posted_as_profile_id, poll_ends_at, poll_total_votes')
    .eq('id', postId)
    .maybeSingle()

  if (postError || !post)
    return { error: postError?.message || 'Poll not found', status: 404 as const }

  if (post.type !== 'poll')
    return { error: 'Post is not a poll', status: 400 as const }

  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('id, text, position, vote_count')
    .eq('post_id', postId)
    .order('position', { ascending: true })

  if (optionsError)
    return { error: optionsError.message, status: 500 as const }

  return { post, options: options || [] }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params
    const postId = resolved.id
    const supabase = createServiceRoleClient()
    const auth = await parseAuthFromCookies(request as any)
    const userId = auth?.user?.id || null

    if (!postId)
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })

    const bundle = await loadPollBundle(supabase, postId)
    if ('error' in bundle && bundle.error)
      return NextResponse.json({ error: bundle.error }, { status: bundle.status })

    const { post, options } = bundle as { post: any; options: any[] }

    let viewerVotedOptionId: string | null = null
    if (userId) {
      const { data: vote } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
      viewerVotedOptionId = vote?.option_id || null
    }

    const poll = buildPollPayload({
      question: post.content,
      options,
      endsAt: post.poll_ends_at,
      totalVotes: post.poll_total_votes,
      viewerVotedOptionId,
    })

    return NextResponse.json({ success: true, data: poll })
  } catch (error) {
    console.error('Error fetching poll vote state:', error)
    return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params
    const postId = resolved.id
    const supabase = createServiceRoleClient()
    const auth = await parseAuthFromCookies(request as any)
    const user = auth?.user

    if (!user?.id)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    if (!postId)
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const optionId = typeof body.option_id === 'string' ? body.option_id : null
    if (!optionId)
      return NextResponse.json({ error: 'option_id is required' }, { status: 400 })

    const bundle = await loadPollBundle(supabase, postId)
    if ('error' in bundle && bundle.error)
      return NextResponse.json({ error: bundle.error }, { status: bundle.status })

    const { post, options } = bundle as { post: any; options: any[] }
    const option = options.find((row) => row.id === optionId)
    if (!option)
      return NextResponse.json({ error: 'Invalid poll option' }, { status: 400 })

    const flags = await resolvePollFollowerFlags({
      supabase,
      voterUserId: user.id,
      post,
    })

    const eligibility = canVoteOnPoll({
      post,
      voterUserId: user.id,
      ...flags,
    })

    if (!eligibility.ok)
      return NextResponse.json({ error: eligibility.reason }, { status: 403 })

    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id, option_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingVote) {
      if (existingVote.option_id === optionId) {
        const poll = buildPollPayload({
          question: post.content,
          options,
          endsAt: post.poll_ends_at,
          totalVotes: post.poll_total_votes,
          viewerVotedOptionId: optionId,
        })
        return NextResponse.json({ success: true, data: poll, already_voted: true })
      }

      return NextResponse.json(
        { error: 'You already voted on this poll' },
        { status: 409 }
      )
    }

    const { error: voteError } = await supabase
      .from('poll_votes')
      .insert({
        post_id: postId,
        option_id: optionId,
        user_id: user.id,
      })

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json(
          { error: 'You already voted on this poll' },
          { status: 409 }
        )
      }
      console.error('Failed to cast poll vote:', voteError)
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    const refreshed = await loadPollBundle(supabase, postId)
    if ('error' in refreshed && refreshed.error)
      return NextResponse.json({ error: refreshed.error }, { status: refreshed.status })

    const refreshedBundle = refreshed as { post: any; options: any[] }
    const poll = buildPollPayload({
      question: refreshedBundle.post.content,
      options: refreshedBundle.options,
      endsAt: refreshedBundle.post.poll_ends_at,
      totalVotes: refreshedBundle.post.poll_total_votes,
      viewerVotedOptionId: optionId,
    })

    return NextResponse.json({ success: true, data: poll })
  } catch (error) {
    console.error('Error casting poll vote:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
