/**
 * Trust tier for new DMs:
 * - Entity (artist/venue/org): open if sender follows that account, else request
 * - General: open if friends (accepted request / mutual follow), else existing resolve_message_context
 */

import { isOrganizationType, normalizeAccountType, type ProfileType } from '@/lib/accounts/account-types'

export interface DmTrustResult {
  tier: 'open' | 'request' | 'context'
  context_type: string | null
  context_id: string | null
}

const ENTITY_TYPES = new Set(['artist', 'service', 'venue', 'organization', 'admin'])

export function isEntityMessagingAccountType(accountType?: string | null): boolean {
  const normalized = normalizeAccountType(accountType || 'general')
  return ENTITY_TYPES.has(normalized) || isOrganizationType(normalized)
}

export function tierFromEntityFollow(isFollowingAccount: boolean): DmTrustResult {
  if (isFollowingAccount)
    return { tier: 'open', context_type: 'account_follow', context_id: null }
  return { tier: 'request', context_type: null, context_id: null }
}

export async function resolveAccountsIdForProfile(input: {
  supabase: any
  profileId: string
  accountType?: string | null
}): Promise<string | null> {
  const { supabase, profileId, accountType } = input
  const normalized = normalizeAccountType(accountType || 'general') as ProfileType

  // account_follows.account_id references public.accounts.id
  const byId = await supabase
    .from('accounts')
    .select('id')
    .eq('id', profileId)
    .maybeSingle()
  if (byId.data?.id) return String(byId.data.id)

  let byProfile = supabase
    .from('accounts')
    .select('id')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .limit(1)

  if (normalized !== 'general')
    byProfile = byProfile.eq('account_type', normalized === 'admin' ? 'organization' : normalized)

  const { data } = await byProfile.maybeSingle()
  if (data?.id) return String(data.id)

  // Fallback without type filter (band/org subtype mismatches)
  const { data: anyMatch } = await supabase
    .from('accounts')
    .select('id')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return anyMatch?.id ? String(anyMatch.id) : null
}

export async function isFollowingAccount(input: {
  supabase: any
  followerUserId: string
  accountId: string
}): Promise<boolean> {
  const { data } = await input.supabase
    .from('account_follows')
    .select('id')
    .eq('follower_user_id', input.followerUserId)
    .eq('account_id', input.accountId)
    .maybeSingle()
  return Boolean(data?.id)
}

export async function areGeneralFriends(input: {
  supabase: any
  userId: string
  otherUserId: string
}): Promise<boolean> {
  const { supabase, userId, otherUserId } = input

  const { data: accepted } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${userId},target_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},target_id.eq.${userId})`,
    )
    .maybeSingle()

  if (accepted?.id) return true

  const [{ data: a }, { data: b }] = await Promise.all([
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', otherUserId)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', otherUserId)
      .eq('following_id', userId)
      .maybeSingle(),
  ])

  return Boolean(a?.id && b?.id)
}

export async function resolveDmTrustForNewConversation(input: {
  supabase: any
  senderId: string
  recipientId: string
  recipientProfileId: string
  recipientAccountType?: string | null
  fallback: () => Promise<DmTrustResult>
}): Promise<DmTrustResult> {
  const {
    supabase,
    senderId,
    recipientId,
    recipientProfileId,
    recipientAccountType,
    fallback,
  } = input

  if (isEntityMessagingAccountType(recipientAccountType)) {
    const accountId = await resolveAccountsIdForProfile({
      supabase,
      profileId: recipientProfileId,
      accountType: recipientAccountType,
    })
    if (!accountId)
      return { tier: 'request', context_type: null, context_id: null }

    const following = await isFollowingAccount({
      supabase,
      followerUserId: senderId,
      accountId,
    })
    return tierFromEntityFollow(following)
  }

  // General / personal recipient: friends → open; else use shared context resolver
  const friends = await areGeneralFriends({
    supabase,
    userId: senderId,
    otherUserId: recipientId,
  })
  if (friends)
    return { tier: 'open', context_type: null, context_id: null }

  return fallback()
}
