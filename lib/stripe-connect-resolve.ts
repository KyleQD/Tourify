/**
 * Option B: parallel Connect storage — legacy Express (v1) vs V2 core accounts.
 * - stripe_connect_account_id + kind v1_express (or NULL kind + id = legacy Express)
 * - stripe_connect_v2_account_id + kind v2
 *
 * Checkout / Connect-scoped API calls must use the resolved account id for `stripeAccount`.
 */

export type StripeConnectAccountKind = 'v1_express' | 'v2' | null

export interface StripeConnectProfileRow {
  stripe_connect_account_id?: string | null
  stripe_connect_v2_account_id?: string | null
  stripe_connect_account_kind?: StripeConnectAccountKind
}

/** True when the profile row has a V2 Connect account configured. */
export function isConnectV2(profile: StripeConnectProfileRow | null | undefined): boolean {
  if (!profile) return false
  return profile.stripe_connect_account_kind === 'v2' && Boolean(profile.stripe_connect_v2_account_id)
}

/** True when the profile uses (or predates) legacy Express onboarding. */
export function isConnectV1Express(profile: StripeConnectProfileRow | null | undefined): boolean {
  if (!profile?.stripe_connect_account_id) return false
  if (profile.stripe_connect_account_kind === 'v2') return false
  return profile.stripe_connect_account_kind === 'v1_express' || profile.stripe_connect_account_kind == null
}

/**
 * Returns the `acct_…` id to pass as `stripeAccount` / connected-account header.
 * V2 takes precedence when kind is v2; otherwise legacy Express id.
 */
export function resolveStripeConnectAccountId(
  profile: StripeConnectProfileRow | null | undefined,
): string | null {
  if (!profile) return null
  if (profile.stripe_connect_account_kind === 'v2' && profile.stripe_connect_v2_account_id)
    return profile.stripe_connect_v2_account_id
  if (profile.stripe_connect_account_id)
    return profile.stripe_connect_account_id
  return null
}
