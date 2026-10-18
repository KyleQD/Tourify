import 'server-only'

import type { ActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  evaluateProtectedWorkAuthority,
  type ProtectedEmployerApproval,
  type ProtectedWorkEntitlement,
  type WorkHiringPlan,
} from '../authoritative-publisher-facts'
import type { WorkPublicationAuthority } from '../opportunity-publication-policy'

/**
 * Server-side resolver for a future guarded Work publishing API.
 *
 * Requires the protected work_* tables described in
 * docs/work/work-hiring-entitlements-ddl-proposal.sql. NOT used by the legacy
 * job routes and must not be enabled before an approved DB migration.
 *
 * The actor is a verified session-derived ActingContext. Neither the user ID,
 * acting entity, activeCount, approval or Stripe status may come from a request
 * payload. activeJobCount MUST eventually come from a transactional quota ledger.
 */
export async function resolveProtectedWorkPublisherAuthority(
  actor: ActingContext,
  activeJobCount: number
): Promise<{ accountId: string | null; authority: WorkPublicationAuthority }> {
  const denied: WorkPublicationAuthority = {
    accountType: actor.accountType,
    isVerifiedEmployer: false,
    hasPaidPostingEntitlement: false,
    canManageHiring: false,
    activeJobCount,
    // No unbounded listing default when we cannot verify quota.
    activeJobLimit: 0,
  }

  if (!Number.isSafeInteger(activeJobCount) || activeJobCount < 0)
    return { accountId: null, authority: denied }

  const entityType = actor.accountType === 'service'
    ? 'artist'
    : actor.accountType === 'admin'
      ? 'organization'
      : actor.accountType

  if (!['artist', 'venue', 'organization'].includes(entityType))
    return { accountId: null, authority: denied }

  const profileTable = entityType === 'artist'
    ? 'artist_profiles'
    : entityType === 'venue'
      ? 'venue_profiles'
      : 'organizer_accounts'

  const db = createServiceRoleClient()
  const { data: account, error: accountError } = await db
    .from('accounts')
    .select('id, owner_user_id, profile_id, account_type, is_active')
    .eq('profile_id', actor.profileId)
    .eq('profile_table', profileTable)
    .eq('account_type', entityType)
    .eq('is_active', true)
    .maybeSingle()

  if (accountError) throw new Error('Work authority: account lookup failed')
  if (!account || !account.id || !account.owner_user_id)
    return { accountId: null, authority: denied }

  // RPC caller is the verified current user, NEVER a user ID from the browser.
  const { data: canManageHiring, error: permissionError } = await actor.supabase.rpc(
    'can_manage_hiring',
    {
      p_user_id: actor.userId,
      p_entity_type: entityType,
      p_entity_id: actor.profileId,
    }
  )
  if (permissionError) throw new Error('Work authority: hiring permission lookup failed')
  if (canManageHiring !== true)
    return { accountId: account.id, authority: denied }

  // Service-role reads are restricted to server-only protected tables.
  const [approvalResult, entitlementResult] = await Promise.all([
    db.from('work_employer_approvals')
      .select('account_id, approval_type, status, approved_at, expires_at, revoked_at')
      .eq('account_id', account.id)
      .eq('approval_type', 'employer'),
    db.from('work_hiring_entitlements')
      .select('account_id, stripe_subscription_id, revoked_at')
      .eq('account_id', account.id)
      .is('revoked_at', null),
  ])
  if (approvalResult.error || entitlementResult.error)
    throw new Error('Work authority: protected approval/entitlement lookup failed')

  const subscriptionIds = Array.from(
    new Set((entitlementResult.data ?? [])
      .map((entry) => entry.stripe_subscription_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0))
  )
  const subscriptions = subscriptionIds.length
    ? await db.from('subscriptions')
        .select('stripe_subscription_id, stripe_price_id, status, user_id, current_period_end')
        .in('stripe_subscription_id', subscriptionIds)
    : { data: [], error: null }
  if (subscriptions.error)
    throw new Error('Work authority: subscription lookup failed')

  const ownerSubscriptions = (subscriptions.data ?? []).filter((subscription) =>
    subscription.user_id === account.owner_user_id
  )
  const priceIds = Array.from(new Set(ownerSubscriptions.map((subscription) => subscription.stripe_price_id)))
  const plansResult = priceIds.length
    ? await db.from('work_hiring_plans')
        .select('stripe_price_id, allowed_account_types, active_listing_limit')
        .in('stripe_price_id', priceIds)
        .eq('enabled', true)
    : { data: [], error: null }
  if (plansResult.error)
    throw new Error('Work authority: hiring plan lookup failed')

  const subscriptionMap = new Map(ownerSubscriptions.map((subscription) =>
    [subscription.stripe_subscription_id, subscription]
  ))
  const entitlements: ProtectedWorkEntitlement[] = (entitlementResult.data ?? [])
    .flatMap((row) => {
      const subscription = subscriptionMap.get(row.stripe_subscription_id)
      if (!subscription) return []
      return [{
        accountId: row.account_id,
        subscriptionId: row.stripe_subscription_id,
        stripePriceId: subscription.stripe_price_id,
        subscriptionStatus: subscription.status,
        periodEndsAt: subscription.current_period_end,
        revokedAt: row.revoked_at,
      }]
    })

  const approvals: ProtectedEmployerApproval[] = (approvalResult.data ?? []).map((row) => ({
    accountId: row.account_id,
    approvalType: row.approval_type,
    status: row.status,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }))

  const hiringPlans: WorkHiringPlan[] = (plansResult.data ?? []).map((row) => ({
    priceId: row.stripe_price_id,
    allowedAccountTypes: Array.isArray(row.allowed_account_types) ? row.allowed_account_types : [],
    activeListingLimit: row.active_listing_limit,
  }))

  return {
    accountId: account.id,
    authority: evaluateProtectedWorkAuthority({
      accountId: account.id,
      accountType: actor.accountType,
      canManageHiring: true,
      approvals,
      entitlements,
      hiringPlans,
      activeJobCount,
    }),
  }
}
