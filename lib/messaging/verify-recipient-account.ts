import { isOrganizationType, normalizeAccountType, type ProfileType } from '@/lib/accounts/account-types'

/**
 * Ensure the recipient user owns (or can receive for) the target entity account.
 * Personal/general always resolves to the recipient user id.
 */
export async function verifyRecipientAccount(input: {
  supabase: any
  recipientUserId: string
  profileId?: string | null
  accountType?: string | null
}): Promise<{ ok: true; profileId: string; accountType: ProfileType } | { ok: false; error: string }> {
  const accountType = normalizeAccountType(input.accountType || 'general')
  const profileId = input.profileId || input.recipientUserId

  if (accountType === 'general') {
    if (profileId !== input.recipientUserId)
      return { ok: false, error: 'Personal inbox profile must match recipient' }
    return { ok: true, profileId: input.recipientUserId, accountType: 'general' }
  }

  if (accountType === 'artist' || accountType === 'service') {
    const { data } = await input.supabase
      .from('artist_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', input.recipientUserId)
      .maybeSingle()
    if (!data) return { ok: false, error: 'Recipient does not own that artist account' }
    return { ok: true, profileId, accountType }
  }

  if (accountType === 'venue') {
    const { data } = await input.supabase
      .from('venue_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', input.recipientUserId)
      .maybeSingle()
    if (!data) return { ok: false, error: 'Recipient does not own that venue account' }
    return { ok: true, profileId, accountType }
  }

  if (isOrganizationType(accountType)) {
    const { data } = await input.supabase
      .from('organizer_accounts')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', input.recipientUserId)
      .maybeSingle()
    if (!data) return { ok: false, error: 'Recipient does not own that organization account' }
    return { ok: true, profileId, accountType: 'organization' }
  }

  return { ok: false, error: `Unsupported recipient account type: ${accountType}` }
}
