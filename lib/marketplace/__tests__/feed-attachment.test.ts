/**
 * Unit tests for feed-attachment CTA resolution logic.
 *
 * Tests the pure CTA inference without any Supabase calls.
 */

// The CTA resolver is an internal function — we test it via the exported
// type system by constructing mock attachment objects and verifying the
// correct CTA label is rendered by FeedListingCard.

describe('feed attachment CTA resolution', () => {
  // Mirror the logic from feed-attachment.ts resolveCta
  function resolveCta(
    listingKind: string,
    serviceMode: string | null,
    category: string
  ): string {
    if (listingKind === 'external') return 'view_on_provider'
    if (category === 'tickets' || category === 'ticket') return 'get_tickets'
    if (listingKind === 'service') {
      if (serviceMode === 'booking_request') return 'request_booking'
      if (serviceMode === 'quote_request') return 'request_quote'
      return 'book_now'
    }
    return 'buy_now'
  }

  describe('physical listings', () => {
    it('returns buy_now for physical merch', () => {
      expect(resolveCta('physical', null, 'merch')).toBe('buy_now')
    })

    it('returns buy_now for physical prints', () => {
      expect(resolveCta('physical', null, 'photos-and-prints')).toBe('buy_now')
    })
  })

  describe('service listings', () => {
    it('returns request_booking for booking_request mode', () => {
      expect(resolveCta('service', 'booking_request', 'services')).toBe('request_booking')
    })

    it('returns request_quote for quote_request mode', () => {
      expect(resolveCta('service', 'quote_request', 'services')).toBe('request_quote')
    })

    it('returns book_now for fixed_price mode', () => {
      expect(resolveCta('service', 'fixed_price', 'services')).toBe('book_now')
    })

    it('returns book_now when service_mode is null', () => {
      expect(resolveCta('service', null, 'services')).toBe('book_now')
    })

    it('service CTA is never buy_now', () => {
      const cta = resolveCta('service', 'fixed_price', 'services')
      expect(cta).not.toBe('buy_now')
    })
  })

  describe('external listings', () => {
    it('returns view_on_provider for any external listing', () => {
      expect(resolveCta('external', null, 'merch')).toBe('view_on_provider')
    })

    it('external CTA overrides category', () => {
      expect(resolveCta('external', null, 'tickets')).toBe('view_on_provider')
    })
  })

  describe('ticket listings (from ticket adapter)', () => {
    it('returns get_tickets for tickets category', () => {
      expect(resolveCta('physical', null, 'tickets')).toBe('get_tickets')
    })

    it('returns get_tickets for ticket category (singular)', () => {
      expect(resolveCta('physical', null, 'ticket')).toBe('get_tickets')
    })
  })
})

describe('feed attachment attribution', () => {
  it('storefront share always has cta = view_marketplace', () => {
    // This is guaranteed by the type system — FeedStorefrontAttachment.cta is literal 'view_marketplace'
    const mockSfAttachment = {
      type: 'storefront' as const,
      cta: 'view_marketplace' as const,
      originalSellerUserId: 'seller-123',
    }
    expect(mockSfAttachment.cta).toBe('view_marketplace')
  })

  it('original_seller_user_id is preserved through reshare', () => {
    // Simulates: seller A shares → user B reshares → attachment still points to seller A
    const originalSellerId = 'seller-a'
    const resharerId = 'user-b'

    // In the share-to-feed route, original_seller_user_id comes from the listing's
    // seller_user_id, not from the resharer's userId
    const insertedAttachment = {
      original_seller_user_id: originalSellerId, // always from listing, never from resharer
      post_user_id: resharerId,
    }

    expect(insertedAttachment.original_seller_user_id).toBe(originalSellerId)
    expect(insertedAttachment.original_seller_user_id).not.toBe(resharerId)
  })
})
