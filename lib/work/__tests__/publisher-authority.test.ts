import { describe, expect, it } from 'vitest'
import { evaluateProtectedWorkAuthority } from '../authoritative-publisher-facts'
import { canPublishWorkOpportunity, classifyWorkPosting } from '../opportunity-publication-policy'

const now = new Date('2026-10-18T12:00:00Z')
const approved = {
  accountId: 'artist-account-1',
  approvalType: 'employer' as const,
  status: 'approved' as const,
  approvedAt: '2026-10-10T12:00:00Z',
}
const entitled = {
  accountId: 'artist-account-1',
  subscriptionId: 'stripe-sub-123',
  stripePriceId: 'price_approved_artist_plus',
  subscriptionStatus: 'active',
  periodEndsAt: '2026-11-18T12:00:00Z',
}
const hiringPlans = [{ priceId: 'price_approved_artist_plus', allowedAccountTypes: ['artist'], activeListingLimit: 3 }]
const input = {
  accountId: 'artist-account-1',
  accountType: 'artist',
  canManageHiring: true,
  approvals: [approved],
  entitlements: [entitled],
  hiringPlans,
  activeJobCount: 2,
  now,
}
const paidJob = classifyWorkPosting({ jobType: 'one_time', paymentType: 'paid', paymentAmount: 100 })

describe('protected professional employer publishing authority', () => {
  it('grants an account only when approval, plan, scope and billing are all authoritative', () => {
    const authority = evaluateProtectedWorkAuthority(input)
    expect(authority).toEqual({
      accountType: 'artist',
      isVerifiedEmployer: true,
      hasPaidPostingEntitlement: true,
      canManageHiring: true,
      activeJobCount: 2,
      activeJobLimit: 3,
    })
    expect(canPublishWorkOpportunity(paidJob, authority)).toEqual({ allowed: true, kind: 'paid_work' })
  })

  it('never accepts other accounts subscription or employer approval', () => {
    expect(evaluateProtectedWorkAuthority({ ...input, approvals: [{ ...approved, accountId: 'another-account' }] }).isVerifiedEmployer).toBe(false)
    expect(evaluateProtectedWorkAuthority({ ...input, entitlements: [{ ...entitled, accountId: 'another-account' }] }).hasPaidPostingEntitlement).toBe(false)
  })

  it('does not mistake a paid personal plan for a job publishing entitlement', () => {
    const authority = evaluateProtectedWorkAuthority({ ...input, entitlements: [{ ...entitled, stripePriceId: 'price_music_streaming' }] })
    expect(authority.hasPaidPostingEntitlement).toBe(false)
    expect(canPublishWorkOpportunity(paidJob, authority)).toEqual({ allowed: false, reason: 'PAID_SUBSCRIPTION_REQUIRED' })
  })

  it('rejects revoked, pending, expired and unapproved employers', () => {
    expect(evaluateProtectedWorkAuthority({ ...input, approvals: [{ ...approved, status: 'pending' }] }).isVerifiedEmployer).toBe(false)
    expect(evaluateProtectedWorkAuthority({ ...input, approvals: [{ ...approved, revokedAt: '2026-10-17T00:00:00Z' }] }).isVerifiedEmployer).toBe(false)
    expect(evaluateProtectedWorkAuthority({ ...input, approvals: [{ ...approved, expiresAt: '2026-10-16T00:00:00Z' }] }).isVerifiedEmployer).toBe(false)
  })

  it('rejects canceled, past-due, revoked, or expired subscriptions', () => {
    for (const subscriptionStatus of ['canceled', 'past_due', 'trialing', 'incomplete']) {
      expect(evaluateProtectedWorkAuthority({ ...input, entitlements: [{ ...entitled, subscriptionStatus }] }).hasPaidPostingEntitlement).toBe(false)
    }
    expect(evaluateProtectedWorkAuthority({ ...input, entitlements: [{ ...entitled, revokedAt: '2026-10-17T00:00:00Z' }] }).hasPaidPostingEntitlement).toBe(false)
    expect(evaluateProtectedWorkAuthority({ ...input, entitlements: [{ ...entitled, periodEndsAt: '2026-10-17T00:00:00Z' }] }).hasPaidPostingEntitlement).toBe(false)
  })

  it('denies exhausted account plan limits and missing hiring permission', () => {
    expect(canPublishWorkOpportunity(paidJob, evaluateProtectedWorkAuthority({ ...input, activeJobCount: 3 }))).toEqual({
      allowed: false, reason: 'ACTIVE_LISTING_LIMIT_REACHED',
    })
    expect(canPublishWorkOpportunity(paidJob, evaluateProtectedWorkAuthority({ ...input, canManageHiring: false }))).toEqual({
      allowed: false, reason: 'HIRING_PERMISSION_REQUIRED',
    })
  })

  it('does not allow an artist to claim a venue-only plan', () => {
    expect(evaluateProtectedWorkAuthority({ ...input, hiringPlans: [{ ...hiringPlans[0], allowedAccountTypes: ['venue'] }] }).hasPaidPostingEntitlement).toBe(false)
  })

  it('requires a known, correctly configured hiring plan, never a user provided tier label', () => {
    expect(evaluateProtectedWorkAuthority({ ...input, hiringPlans: [] }).hasPaidPostingEntitlement).toBe(false)
    expect(evaluateProtectedWorkAuthority({ ...input, hiringPlans: [{ ...hiringPlans[0], activeListingLimit: -1 }] }).hasPaidPostingEntitlement).toBe(false)
  })
})
