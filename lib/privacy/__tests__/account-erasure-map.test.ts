import {
  ACCOUNT_ERASURE_MAP,
  ERASURE_MAP_PENDING_EXPLICIT_DELETE,
} from '../account-erasure-map'

describe('account erasure map', () => {
  it('covers the first bounded non-FK profile-data slice without claiming execution', () => {
    expect(ERASURE_MAP_PENDING_EXPLICIT_DELETE).toEqual([])

    expect(
      ERASURE_MAP_PENDING_EXPLICIT_DELETE.every(
        (entry) => entry.userColumn === 'user_id' && entry.evidence.length > 0,
      )
    ).toBe(true)
  })

  it('distinguishes verified cascade evidence from unresolved candidates', () => {
    expect(
      ACCOUNT_ERASURE_MAP.filter((entry) => entry.handling === 'cascade').map((entry) => entry.table)
    ).toEqual([
      'artist_dashboard_layouts',
      'user_active_profiles',
      'portfolio_items',
      'profile_experiences',
      'profile_certifications',
    ])

    expect(ACCOUNT_ERASURE_MAP.find((entry) => entry.table === 'agent_identities')?.handling).toBe(
      'review_required'
    )
    expect(ACCOUNT_ERASURE_MAP.find((entry) => entry.table === 'user_skills')?.handling).toBe(
      'review_required'
    )
  })
})
