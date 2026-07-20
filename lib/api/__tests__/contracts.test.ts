import {
  apiErrorSchema,
  claimConnectSessionRequestSchema,
  claimConnectSessionResponseSchema,
  confirmConnectSessionRequestSchema,
  confirmConnectSessionResponseSchema,
  createConnectSessionRequestSchema,
  createConnectSessionResponseSchema,
  discoverResponseSchema,
  marketplaceCheckoutRequestSchema,
  marketplaceCheckoutResponseSchema,
  paymentCheckoutRequestSchema,
  paymentCheckoutResponseSchema,
  paymentVerifyResponseSchema,
} from "@tourify/api-contracts"

describe("shared api contracts", () => {
  it("accepts valid connect session create payloads", () => {
    const request = createConnectSessionRequestSchema.parse({
      handshakeMethod: "nfc_ble",
      oneTimeClaim: true,
      expiresInSeconds: 120,
    })
    const response = createConnectSessionResponseSchema.parse({
      connectSessionId: "11111111-1111-4111-8111-111111111111",
      ephemeralToken: "abcdefghijklmnopqrstuvwxyz123456",
      expiresAt: new Date().toISOString(),
      claimUrl: "/connect/claim?token=test",
      webClaimUrl: "https://tourify.app/connect/claim?token=test",
      deepLinkUrl: "tourify://connect/claim?token=test",
    })

    expect(request.handshakeMethod).toBe("nfc_ble")
    expect(response.connectSessionId).toContain("-")
  })

  it("accepts valid connect claim and confirm payloads", () => {
    const claimRequest = claimConnectSessionRequestSchema.parse({
      ephemeralToken: "abcdefghijklmnopqrstuvwxyz123456",
      deviceContext: { platform: "ios" },
    })
    const claimResponse = claimConnectSessionResponseSchema.parse({
      connectSessionId: "11111111-1111-4111-8111-111111111111",
      profilePreview: {
        userId: "22222222-2222-4222-8222-222222222222",
        username: "artist",
        fullName: "Artist Name",
        avatarUrl: null,
        bio: null,
        location: null,
        email: null,
        phone: null,
      },
      relationshipStatus: "none",
      requiresConfirm: true,
    })
    const confirmRequest = confirmConnectSessionRequestSchema.parse({
      connectSessionId: "11111111-1111-4111-8111-111111111111",
      intent: "send_follow_request",
    })
    const confirmResponse = confirmConnectSessionResponseSchema.parse({
      success: true,
      followRequestId: null,
      relationshipStatus: "pending_outbound",
    })

    expect(claimRequest.ephemeralToken.length).toBeGreaterThan(20)
    expect(claimResponse.requiresConfirm).toBe(true)
    expect(confirmRequest.intent).toBe("send_follow_request")
    expect(confirmResponse.success).toBe(true)
  })

  it("accepts valid payment response shapes", () => {
    const checkoutRequest = paymentCheckoutRequestSchema.parse({
      bookingId: "11111111-1111-4111-8111-111111111111",
      eventId: "33333333-3333-4333-8333-333333333333",
      ticketQuantity: 2,
      mobileRedirectUri: "tourify://bookings",
    })
    const checkoutResponse = paymentCheckoutResponseSchema.parse({
      url: "https://checkout.stripe.com/pay/cs_test_123",
      sessionId: "cs_test_123",
    })
    const verifyResponse = paymentVerifyResponseSchema.parse({ success: true })

    expect(checkoutRequest.ticketQuantity).toBe(2)
    expect(checkoutResponse.url).toContain("stripe.com")
    expect(verifyResponse.success).toBe(true)
  })

  it("accepts valid discover response payloads", () => {
    const parsed = discoverResponseSchema.parse({
      success: true,
      sections: {
        for_you: [
          {
            id: "post-1",
            item_type: "post",
            score: 98,
            post: {
              id: "post-1",
              content: "New tour dates",
              created_at: new Date().toISOString(),
              likes_count: 10,
              comments_count: 2,
              shares_count: 1,
              profiles: {
                id: "user-1",
                username: "tourify",
                full_name: "Tourify Artist",
              },
            },
          },
        ],
        trending: [
          {
            id: "post-1",
            content: "New tour dates",
            created_at: new Date().toISOString(),
            likes_count: 10,
            comments_count: 2,
            shares_count: 1,
            profiles: {
              id: "user-1",
              username: "tourify",
            },
          },
        ],
        upcoming: [
          {
            id: "event-1",
            title: "Launch Show",
            event_date: new Date().toISOString(),
            venue_name: "Main Hall",
            venue_city: "Nashville",
            poster_url: "https://cdn.example.com/poster.jpg",
            ticket_price_min: 20,
            ticket_price_max: 45,
          },
        ],
        nearby_events: [
          {
            id: "event-1",
            title: "Launch Show",
            venue_city: "Nashville",
            poster_url: "https://cdn.example.com/poster.jpg",
            ticket_price_min: 20,
            ticket_price_max: 45,
          },
        ],
        people: [
          {
            id: "profile-1",
            username: "tourify",
            account_type: "artist",
            display_name: "Tourify Artist",
            verified: true,
            location: "Nashville",
            genres: ["Indie"],
            top_track: {
              id: "track-1",
              title: "Midnight Drive",
              file_url: "/api/music/stream?trackId=track-1",
            },
          },
        ],
        artists: [],
        venues: [
          {
            id: "venue-1",
            username: "mainhall",
            account_type: "venue",
            display_name: "Main Hall",
            verified: true,
            location: "Nashville",
          },
        ],
        suggestions: [],
        new_music: [
          {
            id: "track-1",
            title: "Midnight Drive",
            artist_name: "Tourify Artist",
            artist_username: "tourify",
          },
        ],
        trending_music: [],
        top_songs: [
          {
            id: "track-1",
            title: "Midnight Drive",
            artist_name: "Tourify Artist",
            artist_username: "tourify",
            plays: 120,
            likes: 18,
          },
        ],
        top_albums_by_genre: [
          {
            id: "album-1",
            title: "Night Roads",
            artist_name: "Tourify Artist",
            genre: "Indie",
            plays: 40,
            likes: 8,
          },
        ],
        tours: [
          {
            id: "tour-1",
            slug: "summer-run",
            name: "Summer Run",
            event_count: 4,
            cities: ["Nashville", "Austin"],
            artist_names: ["Tourify Artist"],
          },
        ],
        new_artists: [
          {
            id: "profile-1",
            username: "tourify",
            account_type: "artist",
            display_name: "Tourify Artist",
            verified: true,
            genres: ["Indie"],
            top_track: {
              id: "track-1",
              title: "Midnight Drive",
              file_url: "/api/music/stream?trackId=track-1",
            },
          },
        ],
      },
      stats: {
        trending_count: 1,
        upcoming_count: 1,
        people_count: 1,
        suggestions_count: 0,
        hire_matches_count: 0,
      },
      generated_at: new Date().toISOString(),
    })

    expect(parsed.success).toBe(true)
    expect(parsed.sections.people).toHaveLength(1)
    expect(parsed.sections.trending[0]?.likes_count).toBe(10)
    expect(parsed.sections.top_songs?.[0]?.plays).toBe(120)
    expect(parsed.sections.top_albums_by_genre?.[0]?.genre).toBe("Indie")
    expect(parsed.sections.new_artists?.[0]?.top_track?.id).toBe("track-1")
    expect(parsed.sections.upcoming[0]?.ticket_price_min).toBe(20)
    expect(parsed.sections.venues?.[0]?.account_type).toBe("venue")
    expect(parsed.sections.tours?.[0]?.slug).toBe("summer-run")
  })

  it("accepts valid marketplace checkout payloads", () => {
    const checkoutRequest = marketplaceCheckoutRequestSchema.parse({
      lines: [
        {
          listingId: "11111111-1111-4111-8111-111111111111",
          quantity: 1,
        },
      ],
      metadata: {
        source: "mobile",
      },
    })

    const checkoutResponse = marketplaceCheckoutResponseSchema.parse({
      data: {
        orderId: "22222222-2222-4222-8222-222222222222",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      },
    })

    expect(checkoutRequest.lines).toHaveLength(1)
    expect(checkoutResponse.data.checkoutUrl).toContain("stripe.com")
  })

  it("accepts standardized api errors", () => {
    const parsed = apiErrorSchema.parse({
      error: {
        code: "internal_error",
        message: "Internal server error",
        retryable: true,
      },
    })

    expect(parsed.error.retryable).toBe(true)
  })
})
