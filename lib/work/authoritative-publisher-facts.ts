import type { WorkPublicationAuthority } from './opportunity-publication-policy'

/**
 * Facts must originate from server-only, access-controlled employer approval,
 * entitlement and hiring-authorization records. Never build these from
 * `accounts.is_verified`, artist profile tiers, client flags or user metadata.
 */
export interface ProtectedEmployerApproval {
  accountId: string
  status: 'approved' | 'pending' | 'revoked' | 'rejected'
  approvalType: 'employer'
  reviewedProfileId: string
  reviewedAccountType: string
  reviewedProfileTable: string
  approvedAt: string | null
  expiresAt?: string | null
  revokedAt?: string | null
}

export interface ProtectedWorkEntitlement {
  /** The EXACT professional account permitted to publish, not merely the owner. */
  accountId: string
  subscriptionId: string
  stripePriceId: string
  subscriptionStatus: string
  periodEndsAt: string | null
  revokedAt?: string | null
}

/** Server-controlled price ID -> publishing entitlement mapping. */
export interface WorkHiringPlan {
  priceId: string
  allowedAccountTypes: readonly string[]
  activeListingLimit: number
}

export interface ProtectedAuthorityInput {
  accountId: string
  accountType: string
  profileId: string
  profileTable: string
  canManageHiring: boolean
  approvals: readonly ProtectedEmployerApproval[]
  entitlements: readonly ProtectedWorkEntitlement[]
  hiringPlans: readonly WorkHiringPlan[]
  activeJobCount: number
  now?: Date
}

function validFutureDate(value: string | null | undefined, now: Date): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > now.getTime()
}

/**
 * Fail-closed evaluation of server-confirmed publisher facts.
 * Requires a verified account-scoped grant plus an account-scoped active
 * subscription referencing an explicitly authorized Stripe price ID.
 */
export function evaluateProtectedWorkAuthority(input: ProtectedAuthorityInput): WorkPublicationAuthority {
  const now = input.now ?? new Date()
  const isApproved = input.approvals.some((a) =>
    a.accountId === input.accountId &&
    a.approvalType === 'employer' &&
    a.reviewedProfileId === input.profileId &&
    a.reviewedAccountType === input.accountType &&
    a.reviewedProfileTable === input.profileTable &&
    a.status === 'approved' &&
    !a.revokedAt &&
    Boolean(a.approvedAt && Number.isFinite(Date.parse(a.approvedAt)) && Date.parse(a.approvedAt) <= now.getTime()) &&
    (!a.expiresAt || validFutureDate(a.expiresAt, now))
  )

  const matching: Array<{ plan: WorkHiringPlan; entitlement: ProtectedWorkEntitlement }> = []
  for (const entitlement of input.entitlements) {
    if (
      entitlement.accountId !== input.accountId ||
      entitlement.subscriptionStatus !== 'active' ||
      entitlement.revokedAt ||
      !entitlement.subscriptionId ||
      !validFutureDate(entitlement.periodEndsAt, now)
    ) continue
    const plan = input.hiringPlans.find((candidate) =>
      candidate.priceId === entitlement.stripePriceId &&
      candidate.allowedAccountTypes.includes(input.accountType) &&
      Boolean(candidate.priceId) &&
      Number.isSafeInteger(candidate.activeListingLimit) &&
      candidate.activeListingLimit >= 0
    )
    if (plan) matching.push({ plan, entitlement })
  }

  const limits = matching.map((row) => row.plan.activeListingLimit)
  const activeJobLimit = limits.length ? Math.max(...limits) : undefined

  return {
    accountType: input.accountType,
    isVerifiedEmployer: isApproved,
    hasPaidPostingEntitlement: activeJobLimit !== undefined,
    canManageHiring: input.canManageHiring,
    activeJobCount: input.activeJobCount,
    activeJobLimit,
  }
}
