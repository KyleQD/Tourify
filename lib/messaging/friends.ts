/**
 * General-account friendship helpers.
 * Friends are personal (general) connections — not artist/venue/org follows.
 */

export function unionFriendIds(input: {
  acceptedRequestPeerIds: string[]
  mutualFollowIds: string[]
}): string[] {
  return Array.from(new Set([
    ...input.acceptedRequestPeerIds,
    ...input.mutualFollowIds,
  ].filter(Boolean)))
}

export async function collectGeneralFriendIds(input: {
  supabase: any
  userId: string
}): Promise<string[]> {
  const { supabase, userId } = input

  const [acceptedAsTarget, acceptedAsRequester, followingResult] = await Promise.all([
    supabase
      .from('follow_requests')
      .select('requester_id')
      .eq('target_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId),
  ])

  const acceptedRequestPeerIds = [
    ...((acceptedAsTarget.data || []).map((row: { requester_id: string }) => row.requester_id)),
    ...((acceptedAsRequester.data || []).map((row: { target_id: string }) => row.target_id)),
  ]

  const followingIds = (followingResult.data || [])
    .map((row: { following_id: string }) => row.following_id)
    .filter(Boolean)

  let mutualFollowIds: string[] = []
  if (followingIds.length > 0) {
    const { data: mutual } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)
      .in('follower_id', followingIds)
    mutualFollowIds = (mutual || []).map((row: { follower_id: string }) => row.follower_id)
  }

  return unionFriendIds({ acceptedRequestPeerIds, mutualFollowIds })
    .filter((id) => id !== userId)
}
