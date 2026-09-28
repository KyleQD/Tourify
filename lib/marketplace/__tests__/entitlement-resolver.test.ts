/**
 * Unit tests for the marketplace entitlement resolver.
 *
 * Covers every account type and every combination of capability/entitlement.
 * These run without any Supabase or network calls.
 */

import {
  resolveMarketplaceEntitlements,
  assertMarketplaceEntitlement,
  isListingKindPermitted,
  isServiceModePermitted,
  type ListingKind,
  type ServiceMode,
} from '../entitlement-resolver'

// ---------------------------------------------------------------------------
// resolveMarketplaceEntitlements
// ---------------------------------------------------------------------------

describe('resolveMarketplaceEntitlements', () => {
  describe('general account', () => {
    const e = resolveMarketplaceEntitlements('general')

    it('can sell physical goods', () => expect(e.canSellPhysicalGoods).toBe(true))
    it('can sell services', () => expect(e.canSellServices).toBe(true))
    it('can create external listings', () => expect(e.canCreateExternalListings).toBe(true))
    it('cannot manage ticket collections', () => expect(e.canManageTicketCollection).toBe(false))
    it('can share to feed', () => expect(e.canShareToFeed).toBe(true))
    it('can activate storefront', () => expect(e.canActivateStorefront).toBe(true))
    it('is not a ticket-only storefront', () => expect(e.isTicketOnlyStorefront).toBe(false))
    it('always blocks music category', () => expect(e.musicCategoryBlocked).toBe(true))
    it('permits all three listing kinds', () => {
      expect(e.permittedListingKinds).toEqual(
        expect.arrayContaining(['physical', 'service', 'external'])
      )
      expect(e.permittedListingKinds).toHaveLength(3)
    })
    it('permits all service modes', () => {
      expect(e.permittedServiceModes).toEqual(
        expect.arrayContaining(['fixed_price', 'booking_request', 'quote_request'])
      )
      expect(e.permittedServiceModes).toHaveLength(3)
    })
  })

  describe('artist account', () => {
    const e = resolveMarketplaceEntitlements('artist')

    it('can sell physical goods (merch)', () => expect(e.canSellPhysicalGoods).toBe(true))
    it('can sell services', () => expect(e.canSellServices).toBe(true))
    it('can create external listings', () => expect(e.canCreateExternalListings).toBe(true))
    it('cannot manage ticket collections', () => expect(e.canManageTicketCollection).toBe(false))
    it('is not a ticket-only storefront', () => expect(e.isTicketOnlyStorefront).toBe(false))
    it('always blocks music category', () => expect(e.musicCategoryBlocked).toBe(true))
    it('permits all listing kinds', () => {
      expect(e.permittedListingKinds).toHaveLength(3)
    })
  })

  describe('service (artist subtype) account', () => {
    const e = resolveMarketplaceEntitlements('service')

    it('treated identically to artist — can sell physical goods', () =>
      expect(e.canSellPhysicalGoods).toBe(true))
    it('can sell services', () => expect(e.canSellServices).toBe(true))
    it('can create external listings', () => expect(e.canCreateExternalListings).toBe(true))
    it('always blocks music category', () => expect(e.musicCategoryBlocked).toBe(true))
  })

  describe('venue account', () => {
    const e = resolveMarketplaceEntitlements('venue')

    it('can sell physical goods', () => expect(e.canSellPhysicalGoods).toBe(true))
    it('can sell services (room rental, rehearsal, etc.)', () =>
      expect(e.canSellServices).toBe(true))
    it('can create external listings', () => expect(e.canCreateExternalListings).toBe(true))
    it('cannot manage ticket collections', () => expect(e.canManageTicketCollection).toBe(false))
    it('is not a ticket-only storefront', () => expect(e.isTicketOnlyStorefront).toBe(false))
    it('always blocks music category', () => expect(e.musicCategoryBlocked).toBe(true))
  })

  describe('organization account', () => {
    const e = resolveMarketplaceEntitlements('organization')

    it('cannot sell physical goods', () => expect(e.canSellPhysicalGoods).toBe(false))
    it('cannot sell services', () => expect(e.canSellServices).toBe(false))
    it('cannot create external listings', () => expect(e.canCreateExternalListings).toBe(false))
    it('can manage ticket collections', () => expect(e.canManageTicketCollection).toBe(true))
    it('can share to feed (tickets and storefront)', () => expect(e.canShareToFeed).toBe(true))
    it('can activate storefront (ticket-only)', () => expect(e.canActivateStorefront).toBe(true))
    it('is a ticket-only storefront', () => expect(e.isTicketOnlyStorefront).toBe(true))
    it('always blocks music category', () => expect(e.musicCategoryBlocked).toBe(true))
    it('has no permitted listing kinds', () => expect(e.permittedListingKinds).toHaveLength(0))
    it('has no permitted service modes', () => expect(e.permittedServiceModes).toHaveLength(0))
  })

  describe('legacy organization aliases', () => {
    it('admin alias resolves to organization entitlements', () => {
      const e = resolveMarketplaceEntitlements('admin')
      expect(e.canSellPhysicalGoods).toBe(false)
      expect(e.isTicketOnlyStorefront).toBe(true)
    })

    it('organizer alias resolves to organization entitlements', () => {
      const e = resolveMarketplaceEntitlements('organizer')
      expect(e.canSellPhysicalGoods).toBe(false)
      expect(e.canManageTicketCollection).toBe(true)
    })
  })

  describe('unknown / null account type', () => {
    it('null falls back to general entitlements', () => {
      const e = resolveMarketplaceEntitlements(null)
      expect(e.canSellPhysicalGoods).toBe(true)
    })

    it('undefined falls back to general entitlements', () => {
      const e = resolveMarketplaceEntitlements(undefined)
      expect(e.canSellPhysicalGoods).toBe(true)
    })

    it('unrecognized type falls back to general entitlements', () => {
      const e = resolveMarketplaceEntitlements('super_admin')
      expect(e.canSellPhysicalGoods).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// assertMarketplaceEntitlement
// ---------------------------------------------------------------------------

describe('assertMarketplaceEntitlement', () => {
  it('does not throw when capability is permitted', () => {
    const e = resolveMarketplaceEntitlements('artist')
    expect(() => assertMarketplaceEntitlement(e, 'canSellPhysicalGoods')).not.toThrow()
  })

  it('throws when organization tries to sell physical goods', () => {
    const e = resolveMarketplaceEntitlements('organization')
    expect(() => assertMarketplaceEntitlement(e, 'canSellPhysicalGoods')).toThrow()
  })

  it('throws when organization tries to sell services', () => {
    const e = resolveMarketplaceEntitlements('organization')
    expect(() => assertMarketplaceEntitlement(e, 'canSellServices')).toThrow()
  })

  it('throws when organization tries to create external listings', () => {
    const e = resolveMarketplaceEntitlements('organization')
    expect(() => assertMarketplaceEntitlement(e, 'canCreateExternalListings')).toThrow()
  })

  it('thrown error has a code property', () => {
    const e = resolveMarketplaceEntitlements('organization')
    try {
      assertMarketplaceEntitlement(e, 'canSellServices')
      fail('should have thrown')
    } catch (err: unknown) {
      expect((err as Error & { code?: string }).code).toBe('marketplace_entitlement_denied')
    }
  })

  it('does not throw when organization manages ticket collection', () => {
    const e = resolveMarketplaceEntitlements('organization')
    expect(() => assertMarketplaceEntitlement(e, 'canManageTicketCollection')).not.toThrow()
  })

  it('throws when non-org tries to manage ticket collection', () => {
    const e = resolveMarketplaceEntitlements('artist')
    expect(() => assertMarketplaceEntitlement(e, 'canManageTicketCollection')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// isListingKindPermitted
// ---------------------------------------------------------------------------

describe('isListingKindPermitted', () => {
  const KINDS: ListingKind[] = ['physical', 'service', 'external']

  it('permits all kinds for general', () => {
    const e = resolveMarketplaceEntitlements('general')
    KINDS.forEach(kind => expect(isListingKindPermitted(e, kind)).toBe(true))
  })

  it('permits all kinds for artist', () => {
    const e = resolveMarketplaceEntitlements('artist')
    KINDS.forEach(kind => expect(isListingKindPermitted(e, kind)).toBe(true))
  })

  it('permits all kinds for venue', () => {
    const e = resolveMarketplaceEntitlements('venue')
    KINDS.forEach(kind => expect(isListingKindPermitted(e, kind)).toBe(true))
  })

  it('permits no kinds for organization', () => {
    const e = resolveMarketplaceEntitlements('organization')
    KINDS.forEach(kind => expect(isListingKindPermitted(e, kind)).toBe(false))
  })
})

// ---------------------------------------------------------------------------
// isServiceModePermitted
// ---------------------------------------------------------------------------

describe('isServiceModePermitted', () => {
  const MODES: ServiceMode[] = ['fixed_price', 'booking_request', 'quote_request']

  it('permits all modes for general', () => {
    const e = resolveMarketplaceEntitlements('general')
    MODES.forEach(mode => expect(isServiceModePermitted(e, mode)).toBe(true))
  })

  it('permits all modes for artist', () => {
    const e = resolveMarketplaceEntitlements('artist')
    MODES.forEach(mode => expect(isServiceModePermitted(e, mode)).toBe(true))
  })

  it('permits all modes for venue', () => {
    const e = resolveMarketplaceEntitlements('venue')
    MODES.forEach(mode => expect(isServiceModePermitted(e, mode)).toBe(true))
  })

  it('permits no service modes for organization', () => {
    const e = resolveMarketplaceEntitlements('organization')
    MODES.forEach(mode => expect(isServiceModePermitted(e, mode)).toBe(false))
  })
})

// ---------------------------------------------------------------------------
// Music category is always blocked
// ---------------------------------------------------------------------------

describe('music category block', () => {
  const types = ['general', 'artist', 'service', 'venue', 'organization', null, undefined]

  it.each(types)('musicCategoryBlocked is always true for "%s"', type => {
    const e = resolveMarketplaceEntitlements(type)
    expect(e.musicCategoryBlocked).toBe(true)
  })
})
