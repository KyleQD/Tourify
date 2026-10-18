import { describe, expect, it } from 'vitest'
import { classifyWorkPosting, canPublishWorkOpportunity } from '../opportunity-publication-policy'
import { toPublicArtistWorkOpportunity, toPublicVenueWorkOpportunity } from '../public-work-opportunity'

const actor = {
  accountType: 'artist',
  hasPaidPostingEntitlement: false,
  isVerifiedEmployer: false,
  canManageHiring: false,
}

const artistRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Singer Wanted',
  description: 'Make an indie album together.',
  created_at: '2026-10-01T12:00:00Z',
  status: 'open',
  job_type: 'collaboration',
  payment_type: 'unpaid',
  payment_amount: null,
  city: 'Las Vegas',
  state: 'NV',
  contact_email: 'private@example.com',
  contact_phone: '555-222-3333',
  posted_by: 'internal-user-id',
  attachments: { secret: 'unpublished' },
  required_skills: ['Vocals'],
}

const now = new Date('2026-10-18T12:00:00Z')

describe('Tourify Work two-tier publishing policy', () => {
  it('allows a free artist to publish a genuinely unpaid collaboration', () => {
    const draft = classifyWorkPosting({ jobType: 'collaboration', paymentType: 'unpaid' })
    expect(draft).toEqual({ ok: true, kind: 'creative_collaboration', jobType: 'collaboration', paymentType: 'unpaid' })
    expect(canPublishWorkOpportunity(draft, actor)).toEqual({ allowed: true, kind: 'creative_collaboration' })
  })

  it('refuses a general account posting a collaboration', () => {
    expect(canPublishWorkOpportunity(
      classifyWorkPosting({ jobType: 'collaboration', paymentType: 'unpaid' }),
      { ...actor, accountType: 'general' }
    )).toEqual({ allowed: false, reason: 'ARTIST_ACCOUNT_REQUIRED' })
  })

  it('classifies paid and revenue-share collaborations as paid work', () => {
    expect(classifyWorkPosting({ jobType: 'collaboration', paymentType: 'paid', paymentAmount: 500 })).toMatchObject({ kind: 'paid_work' })
    expect(classifyWorkPosting({ jobType: 'collaboration', paymentType: 'revenue_share' })).toMatchObject({ kind: 'paid_work' })
  })

  it('blocks unpaid ordinary employment and contradictory compensation', () => {
    expect(classifyWorkPosting({ jobType: 'one_time', paymentType: 'unpaid' })).toEqual({ ok: false, code: 'UNPAID_EMPLOYMENT_NOT_ALLOWED' })
    expect(classifyWorkPosting({ jobType: 'collaboration', paymentType: 'unpaid', paymentAmount: 500 })).toEqual({ ok: false, code: 'INVALID_COMPENSATION' })
    expect(classifyWorkPosting({ jobType: 'tour', paymentType: 'paid', paymentAmount: -5 })).toEqual({ ok: false, code: 'INVALID_COMPENSATION' })
  })

  it('rejects missing payment type instead of silently defaulting to paid', () => {
    expect(classifyWorkPosting({ jobType: 'one_time' })).toEqual({ ok: false, code: 'INVALID_PAYMENT_TYPE' })
  })

  it('requires a professional account, paid entitlement, employer verification, and hiring access', () => {
    const draft = classifyWorkPosting({ jobType: 'one_time', paymentType: 'paid' })
    expect(canPublishWorkOpportunity(draft, { ...actor, accountType: 'general' })).toEqual({ allowed: false, reason: 'PROFESSIONAL_ACCOUNT_REQUIRED' })
    expect(canPublishWorkOpportunity(draft, actor)).toEqual({ allowed: false, reason: 'PAID_SUBSCRIPTION_REQUIRED' })
    expect(canPublishWorkOpportunity(draft, { ...actor, hasPaidPostingEntitlement: true })).toEqual({ allowed: false, reason: 'EMPLOYER_VERIFICATION_REQUIRED' })
    expect(canPublishWorkOpportunity(draft, { ...actor, hasPaidPostingEntitlement: true, isVerifiedEmployer: true })).toEqual({ allowed: false, reason: 'HIRING_PERMISSION_REQUIRED' })
    expect(canPublishWorkOpportunity(draft, { ...actor, hasPaidPostingEntitlement: true, isVerifiedEmployer: true, canManageHiring: true })).toEqual({ allowed: true, kind: 'paid_work' })
  })

  it('enforces paid-plan active listing limits', () => {
    const draft = classifyWorkPosting({ jobType: 'tour', paymentType: 'paid' })
    const entitled = { ...actor, hasPaidPostingEntitlement: true, isVerifiedEmployer: true, canManageHiring: true, activeJobCount: 3, activeJobLimit: 3 }
    expect(canPublishWorkOpportunity(draft, entitled)).toEqual({ allowed: false, reason: 'ACTIVE_LISTING_LIMIT_REACHED' })
    expect(canPublishWorkOpportunity(draft, { ...entitled, activeJobCount: 2 })).toEqual({ allowed: true, kind: 'paid_work' })
  })
})

describe('allowlisted public opportunity projections', () => {
  it('returns only intended public fields for collaborations', () => {
    const result = toPublicArtistWorkOpportunity(artistRow, { isEligibleArtist: true }, now)
    expect(result).toMatchObject({
      key: 'artist_job:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      kind: 'creative_collaboration',
      title: 'Singer Wanted',
      location: 'Las Vegas, NV',
      verifiedPaidEmployer: false,
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('private@example.com')
    expect(serialized).not.toContain('555-222-3333')
    expect(serialized).not.toContain('internal-user-id')
    expect(serialized).not.toContain('unpublished')
  })

  it('suppresses unverified paid artist listings', () => {
    const paid = { ...artistRow, job_type: 'one_time', payment_type: 'paid', payment_amount: 250 }
    expect(toPublicArtistWorkOpportunity(paid, { isEligibleArtist: true }, now)).toBeNull()
    expect(toPublicArtistWorkOpportunity(paid, { isVerifiedPaidEmployer: true }, now)).toBeNull()
    expect(toPublicArtistWorkOpportunity(paid, { isVerifiedPaidEmployer: true, hasPaidPostingEntitlement: true }, now))
      .toMatchObject({ kind: 'paid_work', verifiedPaidEmployer: true, compensation: { amount: 250 } })
  })

  it('suppresses expired and closed postings', () => {
    expect(toPublicArtistWorkOpportunity({ ...artistRow, status: 'closed' }, { isEligibleArtist: true }, now)).toBeNull()
    expect(toPublicArtistWorkOpportunity({ ...artistRow, expires_at: '2026-01-01T00:00:00Z' }, { isEligibleArtist: true }, now)).toBeNull()
  })

  it('projects venue jobs without internal recruiter or applicant metadata', () => {
    const listing = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Stagehand',
      description: 'Show call',
      status: 'published',
      created_at: '2026-10-01T10:00:00Z',
      location: 'Las Vegas',
      salary_range: { min: 200, max: 300, type: 'daily' },
      skills: ['Load-in'],
      created_by: 'private-recruiter-id',
      applicant_data: 'secret',
    }
    const result = toPublicVenueWorkOpportunity(listing, { isVerifiedPaidEmployer: true, hasPaidPostingEntitlement: true }, now)
    expect(result).toMatchObject({ kind: 'paid_work', compensation: { type: 'salary_range', min: 200, max: 300 }, source: 'venue_staffing' })
    expect(JSON.stringify(result)).not.toContain('private-recruiter-id')
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(toPublicVenueWorkOpportunity(listing, { isVerifiedPaidEmployer: false, hasPaidPostingEntitlement: true }, now)).toBeNull()
  })
})
