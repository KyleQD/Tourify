import { isPollClosed } from '@/lib/polls/poll-duration'

export interface PollOptionPayload {
  id: string
  text: string
  votes: number
  position: number
}

export interface PollPayload {
  question: string
  options: PollOptionPayload[]
  endsAt: string | null
  totalVotes: number
  isClosed: boolean
  viewerVotedOptionId: string | null
  viewerHasVoted: boolean
}

export function buildPollPayload(params: {
  question: string
  options: Array<{ id: string; text: string; vote_count?: number | null; position?: number | null }>
  endsAt?: string | null
  totalVotes?: number | null
  viewerVotedOptionId?: string | null
  now?: Date
}): PollPayload {
  const options: PollOptionPayload[] = [...params.options]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((option) => ({
      id: option.id,
      text: option.text,
      votes: option.vote_count || 0,
      position: option.position || 0,
    }))

  const totalVotes = typeof params.totalVotes === 'number'
    ? params.totalVotes
    : options.reduce((sum, option) => sum + option.votes, 0)

  const viewerVotedOptionId = params.viewerVotedOptionId || null

  return {
    question: params.question,
    options,
    endsAt: params.endsAt || null,
    totalVotes,
    isClosed: isPollClosed(params.endsAt, params.now),
    viewerVotedOptionId,
    viewerHasVoted: Boolean(viewerVotedOptionId),
  }
}

export async function hydratePostsWithPolls(params: {
  supabase: any
  posts: any[]
  viewerUserId?: string | null
}): Promise<any[]> {
  const { supabase, posts, viewerUserId } = params
  const pollPosts = posts.filter((post) => post?.type === 'poll' && post?.id)
  if (pollPosts.length === 0) return posts

  const postIds = pollPosts.map((post) => post.id)

  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('id, post_id, text, position, vote_count')
    .in('post_id', postIds)
    .order('position', { ascending: true })

  if (optionsError) {
    console.warn('[polls] Failed to hydrate options:', optionsError.message)
    return posts
  }

  let viewerVotes: Array<{ post_id: string; option_id: string }> = []
  if (viewerUserId) {
    const { data: votes, error: votesError } = await supabase
      .from('poll_votes')
      .select('post_id, option_id')
      .eq('user_id', viewerUserId)
      .in('post_id', postIds)

    if (votesError)
      console.warn('[polls] Failed to hydrate viewer votes:', votesError.message)
    else
      viewerVotes = votes || []
  }

  const optionsByPost = new Map<string, any[]>()
  for (const option of options || []) {
    const list = optionsByPost.get(option.post_id) || []
    list.push(option)
    optionsByPost.set(option.post_id, list)
  }

  const voteByPost = new Map(
    viewerVotes.map((vote) => [vote.post_id, vote.option_id])
  )

  return posts.map((post) => {
    if (post?.type !== 'poll') return post
    const postOptions = optionsByPost.get(post.id) || []
    if (postOptions.length === 0) return post

    const poll = buildPollPayload({
      question: post.content,
      options: postOptions,
      endsAt: post.poll_ends_at || null,
      totalVotes: post.poll_total_votes,
      viewerVotedOptionId: voteByPost.get(post.id) || null,
    })

    return {
      ...post,
      poll,
      poll_ends_at: post.poll_ends_at || null,
      poll_total_votes: poll.totalVotes,
    }
  })
}
