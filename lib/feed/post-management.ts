import 'server-only'

import { isOrganizationType, normalizeAccountType } from '@/lib/accounts/account-types'

type SupabaseLike = any

export interface ManageablePost {
  id: string
  user_id?: string | null
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function canManageFromPermissions(permissions: unknown) {
  if (!permissions || typeof permissions !== 'object') return false
  return (permissions as Record<string, unknown>).can_manage_content === true
}

async function safeSelectOwnedIds(
  supabase: SupabaseLike,
  table: string,
  ids: string[],
  userId: string
) {
  if (ids.length === 0) return []

  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .in('id', ids)
      .eq('user_id', userId)

    if (error) {
      console.warn(`[Post Management] Failed to read owned ${table}:`, error)
      return []
    }

    return (data || []).map((row: { id?: string | null }) => row.id).filter(Boolean) as string[]
  } catch (error) {
    console.warn(`[Post Management] Failed to read owned ${table}:`, error)
    return []
  }
}

async function getDirectOwnedProfileIds(
  supabase: SupabaseLike,
  profileIds: string[],
  userId: string
) {
  const [artistIds, venueIds, organizationIds] = await Promise.all([
    safeSelectOwnedIds(supabase, 'artist_profiles', profileIds, userId),
    safeSelectOwnedIds(supabase, 'venue_profiles', profileIds, userId),
    safeSelectOwnedIds(supabase, 'organizer_accounts', profileIds, userId),
  ])

  return unique([...artistIds, ...venueIds, ...organizationIds])
}

async function getDelegatedManageProfileIds(
  supabase: SupabaseLike,
  profileIds: string[],
  userId: string
) {
  if (profileIds.length === 0) return []

  try {
    const { data, error } = await supabase
      .from('account_relationships')
      .select('owned_profile_id, permissions')
      .eq('owner_user_id', userId)
      .in('owned_profile_id', profileIds)

    if (error) {
      console.warn('[Post Management] Failed to read delegated account permissions:', error)
      return []
    }

    return (data || [])
      .filter((row: { permissions?: unknown }) => canManageFromPermissions(row.permissions))
      .map((row: { owned_profile_id?: string | null }) => row.owned_profile_id)
      .filter(Boolean) as string[]
  } catch (error) {
    console.warn('[Post Management] Failed to read delegated account permissions:', error)
    return []
  }
}

function isCompatiblePostType(post: ManageablePost) {
  const type = normalizeAccountType(post.posted_as_type)
  return (
    type === 'general' ||
    type === 'artist' ||
    type === 'service' ||
    type === 'venue' ||
    isOrganizationType(type)
  )
}

export async function getManageablePostIds({
  supabase,
  posts,
  userId,
}: {
  supabase: SupabaseLike
  posts: ManageablePost[]
  userId?: string | null
}) {
  const manageablePostIds = new Set<string>()
  if (!userId || posts.length === 0) return manageablePostIds

  for (const post of posts) {
    if (post.user_id === userId) manageablePostIds.add(post.id)
  }

  const candidateProfileIds = unique(
    posts
      .filter((post) => !manageablePostIds.has(post.id) && isCompatiblePostType(post))
      .map((post) => post.posted_as_profile_id)
  )

  if (candidateProfileIds.length === 0) return manageablePostIds

  const [directOwnedIds, delegatedIds] = await Promise.all([
    getDirectOwnedProfileIds(supabase, candidateProfileIds, userId),
    getDelegatedManageProfileIds(supabase, candidateProfileIds, userId),
  ])

  const manageableProfileIds = new Set(unique([...directOwnedIds, ...delegatedIds]))

  for (const post of posts) {
    if (post.posted_as_profile_id && manageableProfileIds.has(post.posted_as_profile_id)) {
      manageablePostIds.add(post.id)
    }
  }

  return manageablePostIds
}

export async function canManagePost({
  supabase,
  post,
  userId,
}: {
  supabase: SupabaseLike
  post: ManageablePost
  userId?: string | null
}) {
  const ids = await getManageablePostIds({ supabase, posts: [post], userId })
  return ids.has(post.id)
}
