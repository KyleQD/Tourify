import type { ActingContext } from '@/lib/auth/acting-context'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import type { AccountAuthor } from '@/lib/accounts/account-author'

type SnapshotInput = {
  supabase: any
  accountType: string | null | undefined
  profileId: string | null | undefined
  userId?: string | null
}

function slugLike(value: string | null | undefined) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80)

  return slug || null
}

async function fetchSingleRow(supabase: any, table: string, id: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.warn(`[AccountSnapshot] Failed to read ${table} snapshot`, error)
    return null
  }

  return data as Record<string, any> | null
}

async function fetchRowsByIds(supabase: any, table: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, Record<string, any>>()

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .in('id', uniqueIds)

  if (error) {
    console.warn(`[AccountSnapshot] Failed to batch-read ${table}`, error)
    return new Map<string, Record<string, any>>()
  }

  return new Map(
    ((data || []) as Record<string, any>[]).map((row) => [String(row.id), row])
  )
}

function authorFromArtistRow(resolvedProfileId: string, data: Record<string, any> | null): AccountAuthor {
  const name = data?.artist_name || data?.stage_name || data?.display_name || data?.name || 'Artist'
  return {
    id: resolvedProfileId,
    type: 'artist',
    name,
    username: data?.url_slug || data?.username || slugLike(name),
    avatarUrl: data?.avatar_url || data?.profile_image_url || data?.image_url || null,
    isVerified: Boolean(data?.is_verified || data?.verified),
  }
}

function authorFromVenueRow(resolvedProfileId: string, data: Record<string, any> | null): AccountAuthor {
  const name = data?.venue_name || data?.display_name || data?.name || 'Venue'
  return {
    id: resolvedProfileId,
    type: 'venue',
    name,
    username: data?.username || data?.url_slug || slugLike(name),
    avatarUrl: data?.avatar_url || data?.profile_image_url || data?.image_url || null,
    isVerified: Boolean(data?.is_verified || data?.verified),
  }
}

function authorFromOrgRow(resolvedProfileId: string, data: Record<string, any> | null): AccountAuthor {
  const name = data?.organization_name || data?.display_name || data?.name || 'Organization'
  return {
    id: resolvedProfileId,
    type: 'organization',
    name,
    username: data?.username || data?.url_slug || slugLike(name),
    avatarUrl: data?.avatar_url || data?.logo_url || data?.image_url || null,
    isVerified: Boolean(data?.is_verified || data?.verified),
  }
}

function authorFromProfileRow(generalProfileId: string, data: Record<string, any> | null): AccountAuthor {
  const name = data?.full_name || data?.name || data?.display_name || data?.username || 'Community Member'
  return {
    id: generalProfileId,
    type: 'general',
    name,
    username: data?.username || slugLike(name),
    avatarUrl: data?.avatar_url || null,
    isVerified: Boolean(data?.is_verified || data?.verified),
  }
}

/**
 * Batch-resolve authors for feed enrichment (one query per entity table).
 * Keys match feed route format: `${accountType}:${profileId}:${userId}`.
 */
export async function resolveAccountAuthorSnapshotsBatch(
  supabase: any,
  keys: string[]
): Promise<Map<string, AccountAuthor>> {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  const result = new Map<string, AccountAuthor>()
  if (uniqueKeys.length === 0) return result

  const artistIds: string[] = []
  const venueIds: string[] = []
  const orgIds: string[] = []
  const generalIds: string[] = []
  const parsed: Array<{ key: string; accountType: string; profileId: string; userId: string }> = []

  for (const key of uniqueKeys) {
    const [accountType, profileId, userId = ''] = key.split(':')
    const normalizedType = normalizeAccountType(accountType || 'general')
    parsed.push({ key, accountType: normalizedType, profileId, userId })

    if (normalizedType === 'artist' || normalizedType === 'service') {
      if (profileId) artistIds.push(profileId)
    } else if (normalizedType === 'venue') {
      if (profileId) venueIds.push(profileId)
    } else if (normalizedType === 'organization') {
      if (profileId) orgIds.push(profileId)
    } else {
      const generalId = userId || profileId
      if (generalId) generalIds.push(generalId)
    }
  }

  const [artistMap, venueMap, orgMap, profileMap] = await Promise.all([
    fetchRowsByIds(supabase, 'artist_profiles', artistIds),
    fetchRowsByIds(supabase, 'venue_profiles', venueIds),
    fetchRowsByIds(supabase, 'organizer_accounts', orgIds),
    fetchRowsByIds(supabase, 'profiles', generalIds),
  ])

  for (const item of parsed) {
    if (item.accountType === 'artist' || item.accountType === 'service') {
      const row = item.profileId ? artistMap.get(item.profileId) || null : null
      const author = authorFromArtistRow(item.profileId, row)
      author.type = item.accountType
      result.set(item.key, author)
      continue
    }

    if (item.accountType === 'venue') {
      result.set(
        item.key,
        authorFromVenueRow(item.profileId, item.profileId ? venueMap.get(item.profileId) || null : null)
      )
      continue
    }

    if (item.accountType === 'organization') {
      result.set(
        item.key,
        authorFromOrgRow(item.profileId, item.profileId ? orgMap.get(item.profileId) || null : null)
      )
      continue
    }

    const generalId = item.userId || item.profileId || ''
    result.set(
      item.key,
      authorFromProfileRow(generalId, generalId ? profileMap.get(generalId) || null : null)
    )
  }

  return result
}

export async function resolveAccountAuthorSnapshot({
  supabase,
  accountType,
  profileId,
  userId,
}: SnapshotInput): Promise<AccountAuthor> {
  const normalizedType = normalizeAccountType(accountType || 'general')
  const resolvedProfileId = profileId || userId || ''

  if (normalizedType === 'artist' || normalizedType === 'service') {
    const data = resolvedProfileId
      ? await fetchSingleRow(supabase, 'artist_profiles', resolvedProfileId)
      : null
    const author = authorFromArtistRow(resolvedProfileId, data)
    author.type = normalizedType
    return author
  }

  if (normalizedType === 'venue') {
    const data = resolvedProfileId
      ? await fetchSingleRow(supabase, 'venue_profiles', resolvedProfileId)
      : null
    return authorFromVenueRow(resolvedProfileId, data)
  }

  if (normalizedType === 'organization') {
    const data = resolvedProfileId
      ? await fetchSingleRow(supabase, 'organizer_accounts', resolvedProfileId)
      : null
    return authorFromOrgRow(resolvedProfileId, data)
  }

  const generalProfileId = userId || resolvedProfileId || ''
  const data = generalProfileId
    ? await fetchSingleRow(supabase, 'profiles', generalProfileId)
    : null

  return authorFromProfileRow(generalProfileId, data)
}

export async function resolveActingAccountSnapshot(ctx: ActingContext): Promise<AccountAuthor> {
  return resolveAccountAuthorSnapshot({
    supabase: ctx.supabase,
    accountType: ctx.accountType,
    profileId: ctx.profileId,
    userId: ctx.userId,
  })
}
