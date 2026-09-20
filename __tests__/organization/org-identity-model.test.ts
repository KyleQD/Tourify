import {
  createCanonicalOrganizationIdentity,
  isOrganizationAccountProjection,
  organizationIdentityFromOrganizerAccount,
  ORGANIZATION_IDENTITY_TABLES,
} from '@/lib/organizations/identity'

describe('canonical organization identity model', () => {
  it('defines organizations as the tenant and organizer_accounts as its public profile', () => {
    expect(ORGANIZATION_IDENTITY_TABLES).toEqual({
      tenant: 'organizations',
      membership: 'org_members',
      publicProfile: 'organizer_accounts',
      accountProjection: 'accounts',
    })

    expect(
      organizationIdentityFromOrganizerAccount({
        id: 'organizer-1',
        ops_org_id: 'org-1',
      }),
    ).toEqual({
      kind: 'organization',
      organizationId: 'org-1',
      organizerAccountId: 'organizer-1',
      accountProjectionId: null,
    })
  })

  it('rejects an unbridged organizer profile for tenant-scoped work', () => {
    expect(
      organizationIdentityFromOrganizerAccount({ id: 'organizer-1', ops_org_id: null }),
    ).toBeNull()
    expect(
      createCanonicalOrganizationIdentity({
        organizerAccountId: 'organizer-1',
        organizationId: '  ',
      }),
    ).toBeNull()
  })

  it('recognizes accounts rows only as projections of the organizer profile', () => {
    expect(
      isOrganizationAccountProjection(
        {
          id: 'account-1',
          account_type: 'organization',
          profile_table: 'organizer_accounts',
          profile_id: 'organizer-1',
        },
        'organizer-1',
      ),
    ).toBe(true)
    expect(
      isOrganizationAccountProjection(
        {
          id: 'account-1',
          account_type: 'admin',
          profile_table: 'organizer_accounts',
          profile_id: 'other-organizer',
        },
        'organizer-1',
      ),
    ).toBe(false)
  })
})

