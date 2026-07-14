import { describe, expect, it } from 'vitest'
import {
  hasArtistRoster,
  hasPublicEventsModule,
  hasServicesJobsModule,
  normalizeOrganizationSubtype,
  organizationSubtypeLabel,
  slugifyOrganizationName,
} from '@/lib/organizations/org-subtypes'
import {
  getOrganizationPublicProfilePath,
  resolvePublicProfilePath,
} from '@/lib/utils/public-profile-routes'

describe('organization subtypes', () => {
  it('normalizes legacy organization types', () => {
    expect(normalizeOrganizationSubtype('talent_agency')).toBe('performance_agency')
    expect(normalizeOrganizationSubtype('festival_organizer')).toBe('promoter')
    expect(normalizeOrganizationSubtype('band')).toBe('band')
    expect(normalizeOrganizationSubtype(null)).toBe('generic')
  })

  it('labels subtypes for public UI', () => {
    expect(organizationSubtypeLabel('label')).toBe('Label')
    expect(organizationSubtypeLabel('promoter')).toBe('Promoter')
  })

  it('gates modules by subtype', () => {
    expect(hasArtistRoster('band')).toBe(true)
    expect(hasArtistRoster('label')).toBe(true)
    expect(hasArtistRoster('promoter')).toBe(false)
    expect(hasPublicEventsModule('promoter')).toBe(true)
    expect(hasServicesJobsModule('staffing_agency')).toBe(true)
  })

  it('slugifies org names', () => {
    expect(slugifyOrganizationName('Night Owl Records!')).toBe('night-owl-records')
  })
})

describe('organization public paths', () => {
  it('builds organization URLs from slug', () => {
    expect(getOrganizationPublicProfilePath('insomniac')).toBe('/organization/insomniac')
  })

  it('resolves organization account types to org routes', () => {
    expect(
      resolvePublicProfilePath({
        id: 'acct-1',
        username: 'acme-label',
        account_type: 'organization',
      })
    ).toBe('/organization/acme-label')
    expect(
      resolvePublicProfilePath({
        id: 'acct-2',
        username: 'legacy-org',
        account_type: 'admin',
      })
    ).toBe('/organization/legacy-org')
  })
})
