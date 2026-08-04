import { z } from "zod"

import { normalizeVenueSlug } from "@/lib/venue/routing"

const jsonRecord = z.record(z.unknown())

export const venueProfileUpdateSchema = z
  .object({
    venue_name: z.string().trim().min(2).max(120).optional(),
    url_slug: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    state: z.string().trim().max(100).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    postal_code: z.string().trim().max(30).nullable().optional(),
    capacity: z.number().int().min(0).max(1_000_000).nullable().optional(),
    venue_types: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    amenities: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    contact_info: jsonRecord.nullable().optional(),
    social_links: jsonRecord.nullable().optional(),
    settings: jsonRecord.nullable().optional(),
    sound_system: z.string().trim().max(2000).nullable().optional(),
    lighting_rig: z.string().trim().max(2000).nullable().optional(),
    stage_dimensions: z.string().trim().max(500).nullable().optional(),
    is_public: z.boolean().optional(),
  })
  .strict()

export function parseVenueProfileUpdate(input: unknown) {
  const parsed = venueProfileUpdateSchema.safeParse(input)
  if (!parsed.success) return parsed

  const data = { ...parsed.data }
  if (data.url_slug) data.url_slug = normalizeVenueSlug(data.url_slug)
  if (!data.url_slug && data.venue_name) {
    data.url_slug = normalizeVenueSlug(data.venue_name)
  }
  return { success: true as const, data }
}

type VenueProfileRecord = Record<string, unknown> & {
  user_id?: string | null
  main_profile_id?: string | null
  is_public?: boolean | null
  contact_info?: unknown
  settings?: unknown
}

export function isVenueProfileOwner(
  venue: VenueProfileRecord,
  userId: string | null | undefined,
): boolean {
  return Boolean(
    userId && (venue.user_id === userId || venue.main_profile_id === userId),
  )
}

export function venueProfileResponse(
  venue: VenueProfileRecord,
  ownerView: boolean,
): VenueProfileRecord {
  if (ownerView) return venue

  const contact =
    venue.contact_info && typeof venue.contact_info === "object"
      ? (venue.contact_info as Record<string, unknown>)
      : {}

  const {
    settings: _settings,
    user_id: _userId,
    main_profile_id: _mainProfileId,
    ...publicVenue
  } = venue

  return {
    ...publicVenue,
    contact_info: {
      booking_email:
        typeof contact.booking_email === "string" ? contact.booking_email : null,
    },
  }
}
