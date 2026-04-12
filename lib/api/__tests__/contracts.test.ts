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
            },
          },
        ],
        trending: [
          {
            id: "post-1",
            content: "New tour dates",
            created_at: new Date().toISOString(),
          },
        ],
        upcoming: [
          {
            id: "event-1",
            title: "Launch Show",
            event_date: new Date().toISOString(),
            venue_name: "Main Hall",
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
          },
        ],
        artists: [],
        venues: [],
        suggestions: [],
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
