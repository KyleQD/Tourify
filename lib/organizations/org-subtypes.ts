/**
 * Canonical organization public subtypes.
 * One public shell at /organization/{slug}; subtype controls modules.
 */

export const ORGANIZATION_SUBTYPES = [
  'band',
  'label',
  'promoter',
  'performance_agency',
  'staffing_agency',
  'production_company',
  'rental_company',
  'generic',
] as const

export type OrganizationSubtype = (typeof ORGANIZATION_SUBTYPES)[number]

export const ORGANIZATION_SUBTYPE_LABELS: Record<OrganizationSubtype, string> = {
  band: 'Band',
  label: 'Label',
  promoter: 'Promoter',
  performance_agency: 'Performance Agency',
  staffing_agency: 'Staffing Agency',
  production_company: 'Production Company',
  rental_company: 'Rental Company',
  generic: 'Organization',
}

/** Map legacy create-form / organization_type values to public subtypes. */
export const LEGACY_ORG_TYPE_TO_SUBTYPE: Record<string, OrganizationSubtype> = {
  band: 'band',
  label: 'label',
  promoter: 'promoter',
  performance_agency: 'performance_agency',
  staffing_agency: 'staffing_agency',
  production_company: 'production_company',
  rental_company: 'rental_company',
  generic: 'generic',
  talent_agency: 'performance_agency',
  booking_agency: 'performance_agency',
  event_management: 'promoter',
  festival_organizer: 'promoter',
  tour_management: 'promoter',
  other: 'generic',
}

export function normalizeOrganizationSubtype(
  raw: string | null | undefined
): OrganizationSubtype {
  if (!raw) return 'generic'
  if ((ORGANIZATION_SUBTYPES as readonly string[]).includes(raw))
    return raw as OrganizationSubtype
  return LEGACY_ORG_TYPE_TO_SUBTYPE[raw] ?? 'generic'
}

export function organizationSubtypeLabel(raw: string | null | undefined): string {
  return ORGANIZATION_SUBTYPE_LABELS[normalizeOrganizationSubtype(raw)]
}

export function hasArtistRoster(subtype: OrganizationSubtype): boolean {
  return subtype === 'band' || subtype === 'label'
}

export function hasPublicEventsModule(subtype: OrganizationSubtype): boolean {
  return subtype === 'promoter' || subtype === 'band' || subtype === 'generic'
}

export function hasServicesJobsModule(subtype: OrganizationSubtype): boolean {
  return (
    subtype === 'performance_agency' ||
    subtype === 'staffing_agency' ||
    subtype === 'production_company' ||
    subtype === 'rental_company' ||
    subtype === 'generic'
  )
}

export function slugifyOrganizationName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  return slug || 'org'
}
