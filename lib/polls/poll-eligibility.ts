export interface PollPostForEligibility {
  id: string
  type?: string | null
  visibility?: string | null
  user_id?: string | null
  posted_as_profile_id?: string | null
  poll_ends_at?: string | Date | null
}

export interface PollEligibilityInput {
  post: PollPostForEligibility
  voterUserId: string | null | undefined
  isAccountFollower: boolean
  isUserFollower: boolean
  isPostOwner: boolean
  now?: Date
}

export function canVoteOnPoll(input: PollEligibilityInput): { ok: boolean; reason?: string } {
  const { post, voterUserId } = input
  if (!voterUserId)
    return { ok: false, reason: 'Authentication required' }

  if (post.type && post.type !== 'poll')
    return { ok: false, reason: 'Post is not a poll' }

  const now = input.now || new Date()
  if (post.poll_ends_at) {
    const endsAt = post.poll_ends_at instanceof Date
      ? post.poll_ends_at
      : new Date(post.poll_ends_at)
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime())
      return { ok: false, reason: 'Poll has ended' }
  }

  if (input.isPostOwner)
    return { ok: true }

  const visibility = post.visibility || 'public'
  if (visibility === 'private')
    return { ok: false, reason: 'Poll is private' }

  if (visibility === 'followers') {
    if (input.isAccountFollower || input.isUserFollower)
      return { ok: true }
    return { ok: false, reason: 'Followers only' }
  }

  return { ok: true }
}

export async function resolvePollFollowerFlags(params: {
  supabase: any
  voterUserId: string
  post: PollPostForEligibility
}): Promise<{ isAccountFollower: boolean; isUserFollower: boolean; isPostOwner: boolean }> {
  const { supabase, voterUserId, post } = params
  const isPostOwner = post.user_id === voterUserId

  let isAccountFollower = false
  if (post.posted_as_profile_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('profile_id', post.posted_as_profile_id)
      .maybeSingle()

    if (account?.id) {
      const { data: follow } = await supabase
        .from('account_follows')
        .select('id')
        .eq('account_id', account.id)
        .eq('follower_user_id', voterUserId)
        .maybeSingle()
      isAccountFollower = Boolean(follow)
    }
  }

  let isUserFollower = false
  if (post.user_id && post.user_id !== voterUserId) {
    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', voterUserId)
      .eq('following_id', post.user_id)
      .maybeSingle()
    isUserFollower = Boolean(follow)
  }

  return { isAccountFollower, isUserFollower, isPostOwner }
}
