import { classifyWorkPosting, type WorkOpportunityKind, type WorkPaymentType } from './opportunity-publication-policy'

/**
 * Explicit, allowlisted public Work-discovery DTO.
 * Raw source rows must never be returned alongside this object.
 */
export interface PublicWorkOpportunity {
  key: string
  source: 'artist_job' | 'venue_staffing'
  sourceId: string
  kind: WorkOpportunityKind
  title: string
  description: string
  location: string | null
  remote: boolean
  workType: string | null
  requiredSkills: string[]
  compensation: { type: WorkPaymentType | 'salary_range'; amount: number | null; min?: number | null; max?: number | null } | null
  publishedAt: string
  expiresAt: string | null
  detailHref: string
  verifiedPaidEmployer: boolean
}

/** Resolve these facts using protected employer/artist data, never raw listing fields. */
export interface PublicWorkPublisherEligibility {
  isEligibleArtist?: boolean
  isVerifiedPaidEmployer?: boolean
  hasPaidPostingEntitlement?: boolean
}

function publicString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function publicAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num >= 0 ? num : null
}

function visibleDate(value: unknown, now: Date): string | null {
  const dateString = publicString(value)
  if (!dateString) return null
  const millis = Date.parse(dateString)
  if (!Number.isFinite(millis) || millis <= now.getTime()) return null
  return dateString
}

function isCurrent(expiry: unknown, now: Date): boolean {
  if (expiry === undefined || expiry === null || expiry === '') return true
  return visibleDate(expiry, now) !== null
}

function publicSkills(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim()).filter(Boolean).slice(0, 20) : []
}

function baseValid(row: Record<string, unknown>, now: Date): boolean {
  const title = publicString(row.title)
  const created = publicString(row.created_at)
  return Boolean(publicString(row.id) && title && created && !Number.isNaN(Date.parse(created!)) && isCurrent(row.expires_at, now))
}

/** Map only open, nonexpired artist postings with eligibility resolved separately. */
export function toPublicArtistWorkOpportunity(
  row: Record<string, unknown>,
  publisher: PublicWorkPublisherEligibility,
  now = new Date()
): PublicWorkOpportunity | null {
  if (row.status !== 'open' || !baseValid(row, now)) return null

  const classification = classifyWorkPosting({
    jobType: publicString(row.job_type),
    paymentType: publicString(row.payment_type),
    paymentAmount: row.payment_amount as number | string | null | undefined,
  })
  if (!classification.ok) return null

  if (classification.kind === 'paid_work') {
    if (!publisher.isVerifiedPaidEmployer || !publisher.hasPaidPostingEntitlement) return null
  } else if (!publisher.isEligibleArtist) {
    return null
  }

  const sourceId = publicString(row.id)!
  const loc = (publicString(row.location) ?? [row.city, row.state, row.country].map(publicString).filter(Boolean).join(', ')) || null
  return {
    key: 'artist_job:' + sourceId,
    source: 'artist_job',
    sourceId,
    kind: classification.kind,
    title: publicString(row.title)!,
    description: publicString(row.description) ?? '',
    location: loc,
    remote: row.location_type === 'remote',
    workType: publicString(row.job_type),
    requiredSkills: publicSkills(row.required_skills),
    compensation: classification.kind === 'paid_work'
      ? { type: classification.paymentType, amount: publicAmount(row.payment_amount) }
      : null,
    publishedAt: publicString(row.created_at)!,
    expiresAt: publicString(row.expires_at),
    detailHref: '/jobs/' + encodeURIComponent(sourceId) + '?source=artist',
    verifiedPaidEmployer: classification.kind === 'paid_work',
  }
}

/** Map only published, nonexpired professional staffing posts from verified paid employers. */
export function toPublicVenueWorkOpportunity(
  row: Record<string, unknown>,
  publisher: PublicWorkPublisherEligibility,
  now = new Date()
): PublicWorkOpportunity | null {
  if (row.status !== 'published' || !baseValid(row, now)) return null
  if (!publisher.isVerifiedPaidEmployer || !publisher.hasPaidPostingEntitlement) return null

  const sourceId = publicString(row.id)!
  const salary = row.salary_range && typeof row.salary_range === 'object' && !Array.isArray(row.salary_range)
    ? row.salary_range as Record<string, unknown> : null
  const min = salary ? publicAmount(salary.min) : null
  const max = salary ? publicAmount(salary.max) : null

  return {
    key: 'venue_staffing:' + sourceId,
    source: 'venue_staffing',
    sourceId,
    kind: 'paid_work',
    title: publicString(row.title)!,
    description: publicString(row.description) ?? '',
    location: publicString(row.location),
    remote: row.remote === true,
    workType: publicString(row.employment_type),
    requiredSkills: publicSkills(row.skills),
    compensation: min !== null || max !== null ? { type: 'salary_range', amount: null, min, max } : null,
    publishedAt: publicString(row.created_at)!,
    expiresAt: publicString(row.expires_at),
    detailHref: '/jobs/' + encodeURIComponent(sourceId) + '?source=venue',
    verifiedPaidEmployer: true,
  }
}
