import {
  getCanonicalStorefrontOwner,
  getStorefrontEntityType,
  isCanonicalStorefrontOwner,
} from '@/lib/marketplace/storefront-identity'

describe('storefront identity contract', () => {
  it('maps verified persona contexts to per-persona owner keys', () => {
    expect(
      getCanonicalStorefrontOwner({
        userId: 'user-1',
        profileId: 'artist-1',
        accountType: 'artist',
      })
    ).toEqual({
      sellerEntityId: 'artist-1',
      sellerEntityType: 'artist',
      sellerUserId: 'user-1',
    })
  })

  it('keeps service personas in the artist profile family', () => {
    expect(getStorefrontEntityType('service')).toBe('artist')
  })

  it('preserves general users and organization identities', () => {
    expect(getStorefrontEntityType(undefined)).toBe('user')
    expect(getStorefrontEntityType('organization')).toBe('organization')
  })

  it('requires entity and authenticated-user ownership to match', () => {
    const context = { userId: 'user-1', profileId: 'venue-1', accountType: 'venue' }
    const owner = getCanonicalStorefrontOwner(context)

    expect(isCanonicalStorefrontOwner(owner, context)).toBe(true)
    expect(
      isCanonicalStorefrontOwner(owner, {
        userId: 'user-2',
        profileId: 'venue-1',
        accountType: 'venue',
      })
    ).toBe(false)
    expect(
      isCanonicalStorefrontOwner(owner, {
        userId: 'user-1',
        profileId: 'venue-1',
        accountType: 'artist',
      })
    ).toBe(false)
  })
})
