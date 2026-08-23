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

// ─────────────────────────────────────────────────────────────────────────────
// VEN-009 / VEN-010 — typed public & private venue profile contracts.
//
// The public shape is an explicit ALLOWLIST: anything not listed never leaves
// the server, so new private columns cannot leak by omission of a strip-list.
// Street-level location (address/postal_code), owner identity
// (user_id/main_profile_id), internal settings and contact details stay out of
// the public contract (contact projection is governed by VEN-026).
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicVenueProfile {
  id: string
  venue_name: string
  url_slug: string | null
  description: string | null
  city: string | null
  state: string | null
  country: string | null
  capacity: number | null
  capacity_total?: number | null
  venue_types: string[] | null
  amenities?: unknown
  social_links?: Record<string, unknown> | null
  avatar_url: string | null
  cover_image_url: string | null
  verification_status: string | null
  account_tier: string | null
  sound_system?: string | null
  lighting_rig?: string | null
  stage_dimensions?: string | null
  curfew?: string | null
  age_restrictions?: string | null
  is_public: boolean
  created_at: string | null
  updated_at: string | null
}

export type PrivateVenueProfile = Record<string, unknown> & {
  id: string
  user_id: string | null
  main_profile_id?: string | null
  venue_name: string
  url_slug?: string | null
  email?: string | null
  contact_info?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  is_public: boolean
}

const PUBLIC_KEYS = [
  "id",
  "venue_name",
  "url_slug",
  "description",
  "city",
  "state",
  "country",
  "capacity",
  "capacity_total",
  "venue_types",
  "amenities",
  "social_links",
  "avatar_url",
  "cover_image_url",
  "verification_status",
  "account_tier",
  "sound_system",
  "lighting_rig",
  "stage_dimensions",
  "curfew",
  "age_restrictions",
  "is_public",
  "created_at",
  "updated_at",
] as const

/** Projects an enriched venue row onto the public allowlist contract. */
export function toPublicVenueProfile(
  venue: VenueProfileRecord & Record<string, unknown>,
): PublicVenueProfile {
  const out: Record<string, unknown> = {}
  for (const key of PUBLIC_KEYS) {
    if (key in venue && venue[key] !== undefined) {
      out[key] = venue[key]
    }
  }
  // Defaults for contract-required primitives.
  if (typeof out.is_public !== "boolean") out.is_public = true
  if (!out.url_slug) out.url_slug = normalizeVenueSlug(String(out.venue_name ?? ""))
  return out as unknown as PublicVenueProfile
}
