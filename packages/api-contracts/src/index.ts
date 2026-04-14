import { z } from "zod"

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
})

export const connectProfilePreviewSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().nullable(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
})

export const createConnectSessionRequestSchema = z.object({
  handshakeMethod: z.literal("nfc_ble").default("nfc_ble"),
  oneTimeClaim: z.boolean().default(true),
  expiresInSeconds: z.number().int().min(30).max(300).default(120),
})

export const createConnectSessionResponseSchema = z.object({
  connectSessionId: z.string().uuid(),
  ephemeralToken: z.string().min(20),
  expiresAt: z.string(),
  claimUrl: z.string(),
  webClaimUrl: z.string().url(),
  deepLinkUrl: z.string(),
})

export const claimConnectSessionRequestSchema = z.object({
  ephemeralToken: z.string().min(20),
  transportProof: z.record(z.string(), z.unknown()).optional(),
  deviceContext: z.record(z.string(), z.unknown()).optional(),
})

export const claimConnectSessionResponseSchema = z.object({
  connectSessionId: z.string().uuid(),
  profilePreview: connectProfilePreviewSchema,
  relationshipStatus: z.string(),
  requiresConfirm: z.boolean(),
})

export const confirmConnectSessionRequestSchema = z.object({
  connectSessionId: z.string().uuid(),
  intent: z.literal("send_follow_request"),
  deviceContext: z.record(z.string(), z.unknown()).optional(),
})

export const confirmConnectSessionResponseSchema = z.object({
  success: z.boolean(),
  followRequestId: z.string().nullable(),
  relationshipStatus: z.string(),
})

export const paymentCheckoutRequestSchema = z.object({
  bookingId: z.string().uuid(),
  eventId: z.string().uuid(),
  ticketQuantity: z.number().int().min(1),
  mobileRedirectUri: z.string().optional(),
})

export const paymentCheckoutResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string().optional(),
})

export const paymentVerifyResponseSchema = z.object({
  success: z.boolean(),
})

const discoverIntentSchema = z.union([
  z.literal("grow"),
  z.literal("network"),
  z.literal("book"),
  z.literal("learn"),
])

const discoverProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  account_type: z.union([z.literal("artist"), z.literal("venue"), z.literal("general")]),
  display_name: z.string(),
  avatar_url: z.string().nullable().optional(),
  bio: z.string().optional(),
  location: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  stats: z
    .object({
      followers: z.number(),
      following: z.number(),
      posts: z.number(),
    })
    .optional(),
  creator_type: z.string().nullable().optional(),
  service_offerings: z.array(z.string()).optional(),
  available_for_hire: z.boolean().optional(),
})

const discoverEventSchema = z.object({
  id: z.string(),
  slug: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  event_date: z.string().nullable().optional(),
  venue_name: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  attendance: z
    .object({
      attending: z.number(),
      interested: z.number(),
      total: z.number(),
    })
    .optional(),
})

const discoverPostSchema = z.object({
  id: z.string(),
  content: z.string(),
  created_at: z.string(),
  likes_count: z.number().optional(),
  comments_count: z.number().optional(),
  shares_count: z.number().optional(),
  profiles: z
    .object({
      id: z.string(),
      username: z.string(),
      full_name: z.string().optional(),
      avatar_url: z.string().optional(),
      is_verified: z.boolean().optional(),
    })
    .optional(),
})

const discoverForYouItemSchema = z.object({
  id: z.string(),
  item_type: z.union([z.literal("post"), z.literal("event"), z.literal("profile")]),
  score: z.number(),
  post: discoverPostSchema.optional(),
  event: discoverEventSchema.optional(),
  profile: discoverProfileSchema.optional(),
})

export const marketplaceCheckoutRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        listingId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(50),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const marketplaceCheckoutResponseSchema = z.object({
  data: z.object({
    orderId: z.string().uuid(),
    checkoutUrl: z.string().url(),
  }),
})

export const discoverRequestSchema = z.object({
  intent: discoverIntentSchema,
  location: z.string().optional(),
  creatorType: z.string().optional(),
  service: z.string().optional(),
  availableForHire: z.boolean().optional(),
})

const discoverMusicTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist_name: z.string(),
  artist_id: z.string().optional(),
  cover_art_url: z.string().nullable().optional(),
  file_url: z.string().optional(),
  genre: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  plays: z.number().optional(),
  likes: z.number().optional(),
})

export const discoverResponseSchema = z.object({
  success: z.boolean(),
  sections: z.object({
    for_you: z.array(discoverForYouItemSchema).optional(),
    trending: z.array(discoverPostSchema),
    upcoming: z.array(discoverEventSchema),
    people: z.array(discoverProfileSchema),
    artists: z.array(discoverProfileSchema).optional(),
    venues: z.array(discoverProfileSchema).optional(),
    suggestions: z.array(discoverProfileSchema).optional(),
    hire_matches: z.array(discoverProfileSchema).optional(),
    new_music: z.array(discoverMusicTrackSchema).optional(),
    trending_music: z.array(discoverMusicTrackSchema).optional(),
    new_artists: z.array(discoverProfileSchema).optional(),
    nearby_events: z.array(discoverEventSchema).optional(),
  }),
  stats: z
    .object({
      trending_count: z.number(),
      upcoming_count: z.number(),
      people_count: z.number(),
      suggestions_count: z.number(),
      hire_matches_count: z.number(),
    })
    .optional(),
  generated_at: z.string().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
export type CreateConnectSessionRequest = z.infer<typeof createConnectSessionRequestSchema>
export type CreateConnectSessionResponse = z.infer<typeof createConnectSessionResponseSchema>
export type ClaimConnectSessionRequest = z.infer<typeof claimConnectSessionRequestSchema>
export type ClaimConnectSessionResponse = z.infer<typeof claimConnectSessionResponseSchema>
export type ConfirmConnectSessionRequest = z.infer<typeof confirmConnectSessionRequestSchema>
export type ConfirmConnectSessionResponse = z.infer<typeof confirmConnectSessionResponseSchema>
export type PaymentCheckoutRequest = z.infer<typeof paymentCheckoutRequestSchema>
export type PaymentCheckoutResponse = z.infer<typeof paymentCheckoutResponseSchema>
export type PaymentVerifyResponse = z.infer<typeof paymentVerifyResponseSchema>
export type DiscoverRequest = z.infer<typeof discoverRequestSchema>
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>
export type MarketplaceCheckoutRequest = z.infer<typeof marketplaceCheckoutRequestSchema>
export type MarketplaceCheckoutResponse = z.infer<typeof marketplaceCheckoutResponseSchema>
