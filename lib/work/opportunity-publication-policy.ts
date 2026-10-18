/**
 * Pure publication policy for Flow-ready Tourify Work opportunities.
 *
 * IMPORTANT: This module does NOT validate Stripe subscriptions or verification
 * documents. The API must resolve those facts from trusted server-side sources.
 * Do not infer them from client headers, profile metadata or self-editable flags.
 */
export type WorkOpportunityKind = 'paid_work' | 'creative_collaboration'
export type WorkPaymentType = 'paid' | 'unpaid' | 'revenue_share' | 'exposure'
export type WorkJobType = 'one_time' | 'recurring' | 'tour' | 'residency' | 'collaboration'

export type WorkPostingClassification =
  | { ok: true; kind: WorkOpportunityKind; paymentType: WorkPaymentType; jobType: WorkJobType }
  | {
      ok: false
      code: 'INVALID_JOB_TYPE' | 'INVALID_PAYMENT_TYPE' | 'INVALID_COMPENSATION' | 'UNPAID_EMPLOYMENT_NOT_ALLOWED'
    }

export interface WorkPostingDraft {
  jobType?: string | null
  paymentType?: string | null
  paymentAmount?: number | string | null
}

const JOB_TYPES: readonly string[] = ['one_time', 'recurring', 'tour', 'residency', 'collaboration']
const PAYMENT_TYPES: readonly string[] = ['paid', 'unpaid', 'revenue_share', 'exposure']

/** A revenue-share or paid collaboration is a financially compensated opportunity. */
export function classifyWorkPosting(draft: WorkPostingDraft): WorkPostingClassification {
  if (!draft.jobType || !JOB_TYPES.includes(draft.jobType))
    return { ok: false, code: 'INVALID_JOB_TYPE' }
  if (!draft.paymentType || !PAYMENT_TYPES.includes(draft.paymentType))
    return { ok: false, code: 'INVALID_PAYMENT_TYPE' }

  const amount = draft.paymentAmount === undefined || draft.paymentAmount === null || draft.paymentAmount === ''
    ? null
    : Number(draft.paymentAmount)
  if (amount !== null && (!Number.isFinite(amount) || amount < 0))
    return { ok: false, code: 'INVALID_COMPENSATION' }

  const jobType = draft.jobType as WorkJobType
  const paymentType = draft.paymentType as WorkPaymentType
  const financiallyCompensated = paymentType === 'paid' || paymentType === 'revenue_share' || (amount !== null && amount > 0)

  if (jobType !== 'collaboration' && !financiallyCompensated)
    return { ok: false, code: 'UNPAID_EMPLOYMENT_NOT_ALLOWED' }

  if (financiallyCompensated) {
    if (paymentType === 'unpaid' || paymentType === 'exposure')
      return { ok: false, code: 'INVALID_COMPENSATION' }
    return { ok: true, kind: 'paid_work', jobType, paymentType }
  }

  return { ok: true, kind: 'creative_collaboration', jobType, paymentType }
}

export type WorkPostingPolicyReason =
  | 'INVALID_POSTING'
  | 'ARTIST_ACCOUNT_REQUIRED'
  | 'PROFESSIONAL_ACCOUNT_REQUIRED'
  | 'PAID_SUBSCRIPTION_REQUIRED'
  | 'EMPLOYER_VERIFICATION_REQUIRED'
  | 'HIRING_PERMISSION_REQUIRED'
  | 'ACTIVE_LISTING_LIMIT_REACHED'

export type WorkPostingPolicyDecision =
  | { allowed: true; kind: WorkOpportunityKind }
  | { allowed: false; reason: WorkPostingPolicyReason }

export interface WorkPublicationAuthority {
  /** Verified by server-side acting-context resolver, not a request-body type. */
  accountType: string
  /** Server-validated paid plan that explicitly includes the job-posting entitlement. */
  hasPaidPostingEntitlement: boolean
  /** Independently verified employer status from a protected authoritative workflow. */
  isVerifiedEmployer: boolean
  /** Authorization to hire on the acting professional entity, not merely account ownership. */
  canManageHiring: boolean
  /** Optional server-resolved plan limits; omitted means no limit imposed here. */
  activeJobCount?: number
  activeJobLimit?: number
}

/**
 * Authorize the posting's eventual PUBLICATION.
 * Must also be run on repost, promotion from draft, and changes to paid terms.
 * API layer must separately validate active actor ownership and request integrity.
 */
export function canPublishWorkOpportunity(
  classification: WorkPostingClassification,
  authority: WorkPublicationAuthority
): WorkPostingPolicyDecision {
  if (!classification.ok) return { allowed: false, reason: 'INVALID_POSTING' }

  if (classification.kind === 'creative_collaboration') {
    return authority.accountType === 'artist'
      ? { allowed: true, kind: classification.kind }
      : { allowed: false, reason: 'ARTIST_ACCOUNT_REQUIRED' }
  }

  if (!['artist', 'service', 'venue', 'organization', 'admin'].includes(authority.accountType))
    return { allowed: false, reason: 'PROFESSIONAL_ACCOUNT_REQUIRED' }
  if (!authority.hasPaidPostingEntitlement)
    return { allowed: false, reason: 'PAID_SUBSCRIPTION_REQUIRED' }
  if (!authority.isVerifiedEmployer)
    return { allowed: false, reason: 'EMPLOYER_VERIFICATION_REQUIRED' }
  if (!authority.canManageHiring)
    return { allowed: false, reason: 'HIRING_PERMISSION_REQUIRED' }
  if (authority.activeJobLimit !== undefined) {
    if (!Number.isSafeInteger(authority.activeJobCount) || (authority.activeJobCount ?? -1) < 0)
      return { allowed: false, reason: 'ACTIVE_LISTING_LIMIT_REACHED' }
    if (!Number.isSafeInteger(authority.activeJobLimit) || authority.activeJobLimit < 0)
      return { allowed: false, reason: 'ACTIVE_LISTING_LIMIT_REACHED' }
    if ((authority.activeJobCount ?? 0) >= authority.activeJobLimit)
      return { allowed: false, reason: 'ACTIVE_LISTING_LIMIT_REACHED' }
  }

  return { allowed: true, kind: classification.kind }
}
