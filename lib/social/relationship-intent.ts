export type RelationshipKind = 'friend' | 'follow'

export type FollowableAccountType =
  | 'artist'
  | 'venue'
  | 'organizer'
  | 'business'
  | 'organization'

export type GeneralAccountType = 'general' | 'primary' | 'user'

export const FOLLOWABLE_ACCOUNT_TYPES = new Set<string>([
  'artist',
  'venue',
  'organizer',
  'business',
  'organization',
])

export const GENERAL_ACCOUNT_TYPES = new Set<string>([
  'general',
  'primary',
  'user',
])

export interface ResolvedRelationshipTarget {
  kind: RelationshipKind
  accountId: string | null
  ownerUserId: string | null
  profileId: string | null
  accountType: string | null
  displayName: string | null
}

export function isFollowableAccountType(accountType: string | null | undefined) {
  if (!accountType) return false
  return FOLLOWABLE_ACCOUNT_TYPES.has(accountType.toLowerCase())
}

export function isGeneralAccountType(accountType: string | null | undefined) {
  if (!accountType) return true
  const normalized = accountType.toLowerCase()
  if (FOLLOWABLE_ACCOUNT_TYPES.has(normalized)) return false
  return GENERAL_ACCOUNT_TYPES.has(normalized) || normalized === 'admin' || normalized === 'staff'
}

export function normalizeDiscoverAccountType(accountType: string | null | undefined): 'artist' | 'venue' | 'organization' | 'general' {
  const normalized = (accountType || 'general').toLowerCase()
  if (normalized === 'artist') return 'artist'
  if (normalized === 'venue') return 'venue'
  if (normalized === 'organizer' || normalized === 'business' || normalized === 'organization')
    return 'organization'
  return 'general'
}

/**
 * Decide friend vs follow from known account/profile type metadata.
 * Prefer account type when present; fall back to profile account_type.
 */
export function resolveRelationshipKind(params: {
  targetAccountType?: string | null
  targetProfileAccountType?: string | null
  forceKind?: RelationshipKind | 'auto' | null
}): RelationshipKind {
  if (params.forceKind === 'friend' || params.forceKind === 'follow')
    return params.forceKind

  const accountType = params.targetAccountType || params.targetProfileAccountType || null
  if (isFollowableAccountType(accountType)) return 'follow'
  return 'friend'
}

export async function loadRelationshipTarget(params: {
  supabase: any
  targetAccountId?: string | null
  targetUserId?: string | null
  forceKind?: RelationshipKind | 'auto' | null
}): Promise<ResolvedRelationshipTarget | { error: string; code: string; status: number }> {
  const { supabase, targetAccountId, targetUserId, forceKind } = params

  if (!targetAccountId && !targetUserId) {
    return {
      error: 'targetAccountId or targetUserId is required',
      code: 'validation_error',
      status: 400,
    }
  }

  if (targetAccountId) {
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, owner_user_id, account_type, profile_id, display_name, is_active')
      .eq('id', targetAccountId)
      .maybeSingle()

    if (error) {
      return { error: 'Failed to load account', code: 'account_lookup_failed', status: 500 }
    }

    if (!account || account.is_active === false) {
      return { error: 'Account not found', code: 'not_found', status: 404 }
    }

    const kind = resolveRelationshipKind({
      targetAccountType: account.account_type,
      forceKind,
    })

    return {
      kind,
      accountId: String(account.id),
      ownerUserId: account.owner_user_id ? String(account.owner_user_id) : null,
      profileId: account.profile_id ? String(account.profile_id) : null,
      accountType: account.account_type ? String(account.account_type) : null,
      displayName: account.display_name ? String(account.display_name) : null,
    }
  }

  const userId = String(targetUserId)

  const [{ data: profile }, { data: personaAccounts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, account_type, full_name, username')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('accounts')
      .select('id, owner_user_id, account_type, profile_id, display_name, is_active')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .in('account_type', Array.from(FOLLOWABLE_ACCOUNT_TYPES)),
  ])

  const followableAccounts = (personaAccounts || []).filter((row: any) =>
    isFollowableAccountType(row.account_type)
  )

  // Prefer a single followable persona when the caller only passed a user id
  // and forceKind is follow / auto with followable personas.
  const preferredAccount =
    forceKind === 'follow'
      ? followableAccounts[0]
      : followableAccounts.length === 1
        ? followableAccounts[0]
        : null

  if (preferredAccount && resolveRelationshipKind({
    targetAccountType: preferredAccount.account_type,
    targetProfileAccountType: profile?.account_type,
    forceKind,
  }) === 'follow') {
    return {
      kind: 'follow',
      accountId: String(preferredAccount.id),
      ownerUserId: String(preferredAccount.owner_user_id || userId),
      profileId: preferredAccount.profile_id ? String(preferredAccount.profile_id) : null,
      accountType: String(preferredAccount.account_type),
      displayName: preferredAccount.display_name
        ? String(preferredAccount.display_name)
        : profile?.full_name || profile?.username || null,
    }
  }

  const kind = resolveRelationshipKind({
    targetProfileAccountType: profile?.account_type,
    forceKind: forceKind === 'follow' && !preferredAccount ? 'friend' : forceKind,
  })

  return {
    kind,
    accountId: null,
    ownerUserId: userId,
    profileId: profile?.id ? String(profile.id) : userId,
    accountType: profile?.account_type ? String(profile.account_type) : 'general',
    displayName: profile?.full_name || profile?.username || null,
  }
}
