/**
 * Resolves author/post ID sets for the personalized artist Home feed.
 * Sources: follows, account_follows, band/org memberships, tags, collabs.
 */

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean).map((id) => String(id))))
}

export interface HomeFeedScope {
  followingUserIds: string[]
  followingProfileIds: string[]
  membershipProfileIds: string[]
  ownedProfileIds: string[]
  /** Posts the viewer is tagged in + accepted collabs + followed-collaborator accepted posts */
  extraPostIds: string[]
  /** Pending collab invites for Approvals inbox */
  pendingCollabPostIds: string[]
  /** Accepted collab post IDs for this viewer (profile surface) */
  acceptedCollabPostIds: string[]
}

export async function resolveMembershipProfileIds(
  supabase: any,
  userId: string
): Promise<string[]> {
  try {
    const { data: artistProfiles, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', userId)

    if (artistError || !artistProfiles?.length) return []

    const artistProfileIds = artistProfiles.map((row: { id: string }) => row.id)
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_artist_members')
      .select('organizer_account_id')
      .in('artist_profile_id', artistProfileIds)
      .eq('status', 'accepted')

    if (membershipError) return []
    return unique((memberships || []).map((row: { organizer_account_id: string }) => row.organizer_account_id))
  } catch {
    return []
  }
}

export async function resolveOwnedProfileIds(
  supabase: any,
  userId: string
): Promise<string[]> {
  const tables: Array<{ table: string; column: string }> = [
    { table: 'artist_profiles', column: 'user_id' },
    { table: 'venue_profiles', column: 'user_id' },
    { table: 'venue_profiles', column: 'main_profile_id' },
    { table: 'organizer_accounts', column: 'user_id' },
  ]

  const batches = await Promise.all(
    tables.map(async ({ table, column }) => {
      try {
        const { data, error } = await supabase.from(table).select('id').in(column, [userId])
        if (error) return []
        return (data || []).map((row: { id: string }) => row.id)
      } catch {
        return []
      }
    })
  )

  return unique(batches.flat())
}

async function resolveFollowedAccountProfileIds(
  supabase: any,
  userId: string
): Promise<string[]> {
  try {
    const { data: accountFollowRows } = await supabase
      .from('account_follows')
      .select('account_id')
      .eq('follower_user_id', userId)

    const accountIds = unique((accountFollowRows || []).map((row: any) => row.account_id))
    if (accountIds.length === 0) return []

    const { data: followedAccounts } = await supabase
      .from('accounts')
      .select('id, profile_id')
      .in('id', accountIds)

    return unique((followedAccounts || []).map((row: any) => row.profile_id))
  } catch {
    return []
  }
}

async function resolveTaggedPostIds(
  supabase: any,
  userId: string,
  limit = 80
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .contains('tagged_users', [userId])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return unique((data || []).map((row: { id: string }) => row.id))
  } catch {
    return []
  }
}

async function resolveCollabPostIds(
  supabase: any,
  {
    userId,
    followingUserIds,
    followingProfileIds,
  }: {
    userId: string
    followingUserIds: string[]
    followingProfileIds: string[]
  }
): Promise<{
  pendingCollabPostIds: string[]
  acceptedCollabPostIds: string[]
  followedCollaboratorPostIds: string[]
}> {
  const empty = {
    pendingCollabPostIds: [] as string[],
    acceptedCollabPostIds: [] as string[],
    followedCollaboratorPostIds: [] as string[],
  }

  try {
    const { data: ownRows, error: ownError } = await supabase
      .from('feed_post_collaborators')
      .select('post_id, status')
      .eq('collaborator_user_id', userId)
      .in('status', ['invited', 'accepted'])
      .limit(100)

    if (ownError) {
      // Table may not exist yet during rollout
      return empty
    }

    const pendingCollabPostIds = unique(
      (ownRows || [])
        .filter((row: { status: string }) => row.status === 'invited')
        .map((row: { post_id: string }) => row.post_id)
    )
    const acceptedCollabPostIds = unique(
      (ownRows || [])
        .filter((row: { status: string }) => row.status === 'accepted')
        .map((row: { post_id: string }) => row.post_id)
    )

    let followedCollaboratorPostIds: string[] = []
    const followedUsers = unique(followingUserIds.filter((id) => id !== userId))
    const followedProfiles = unique(followingProfileIds)

    if (followedUsers.length > 0 || followedProfiles.length > 0) {
      let query = supabase
        .from('feed_post_collaborators')
        .select('post_id')
        .eq('status', 'accepted')
        .limit(100)

      if (followedUsers.length > 0 && followedProfiles.length > 0) {
        query = query.or(
          `collaborator_user_id.in.(${followedUsers.join(',')}),collaborator_profile_id.in.(${followedProfiles.join(',')})`
        )
      } else if (followedUsers.length > 0) {
        query = query.in('collaborator_user_id', followedUsers)
      } else {
        query = query.in('collaborator_profile_id', followedProfiles)
      }

      const { data: followedRows } = await query
      followedCollaboratorPostIds = unique((followedRows || []).map((row: { post_id: string }) => row.post_id))
    }

    return { pendingCollabPostIds, acceptedCollabPostIds, followedCollaboratorPostIds }
  } catch {
    return empty
  }
}

export async function resolveHomeFeedScope(
  supabase: any,
  userId: string
): Promise<HomeFeedScope> {
  const [
    { data: followingData },
    followingProfileIdsFromAccounts,
    membershipProfileIds,
    ownedProfileIds,
    taggedPostIds,
  ] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    resolveFollowedAccountProfileIds(supabase, userId),
    resolveMembershipProfileIds(supabase, userId),
    resolveOwnedProfileIds(supabase, userId),
    resolveTaggedPostIds(supabase, userId),
  ])

  const followingUserIds = unique([
    userId,
    ...((followingData || []).map((row: { following_id: string }) => row.following_id)),
  ])

  const followingProfileIds = unique([
    ...followingProfileIdsFromAccounts,
    ...ownedProfileIds,
  ])

  const collab = await resolveCollabPostIds(supabase, {
    userId,
    followingUserIds,
    followingProfileIds: unique([...followingProfileIdsFromAccounts, ...membershipProfileIds]),
  })

  const extraPostIds = unique([
    ...taggedPostIds,
    ...collab.acceptedCollabPostIds,
    ...collab.followedCollaboratorPostIds,
  ])

  return {
    followingUserIds,
    followingProfileIds,
    membershipProfileIds,
    ownedProfileIds,
    extraPostIds,
    pendingCollabPostIds: collab.pendingCollabPostIds,
    acceptedCollabPostIds: collab.acceptedCollabPostIds,
  }
}

export async function resolveAcceptedCollabPostIdsForProfile(
  supabase: any,
  {
    profileId,
    userId,
  }: {
    profileId?: string | null
    userId?: string | null
  }
): Promise<string[]> {
  if (!profileId && !userId) return []

  try {
    let query = supabase
      .from('feed_post_collaborators')
      .select('post_id')
      .eq('status', 'accepted')
      .limit(80)

    if (profileId && userId) {
      query = query.or(
        `collaborator_profile_id.eq.${profileId},collaborator_user_id.eq.${userId}`
      )
    } else if (profileId) {
      query = query.eq('collaborator_profile_id', profileId)
    } else if (userId) {
      query = query.eq('collaborator_user_id', userId)
    }

    const { data, error } = await query
    if (error) return []
    return unique((data || []).map((row: { post_id: string }) => row.post_id))
  } catch {
    return []
  }
}
