import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// VEN-244/245/246/247/248 — one storage location + one normalized shape per
// Venue setting.
//
// Canonical locations (matches venue_profiles generated DB types):
//   location      → top-level address/city/state/country/postal_code columns
//                   (contact_info.* copies are a legacy cache, VEN-018)
//   amenities     → top-level `amenities TEXT[]` of normalized snake_case keys
//                   (settings.amenities object remains a dual-write cache)
//   technical     → top-level stage_dimensions/sound_system/lighting_rig/
//                   curfew/age_restrictions/parking_spots columns
//   op. policies  → settings.operational_policies JSON (defined schema below)
//   venue types   → top-level venue_types TEXT[] of canonical taxonomy labels
// ─────────────────────────────────────────────────────────────────────────────

// ── Venue types taxonomy (union of both legacy editor lists) ────────────────

export const VENUE_TYPE_TAXONOMY = [
  "Concert Hall",
  "Club",
  "Bar",
  "Pub",
  "Lounge",
  "Theater",
  "Music Venue",
  "Nightclub",
  "Restaurant",
  "Cafe",
  "Art Gallery",
  "Recording Studio",
  "Rehearsal Space",
  "Rehearsal Studio",
  "Warehouse",
  "Loft Space",
  "Outdoor Space",
  "Outdoor Venue",
  "Festival Ground",
  "Park",
  "Beach Venue",
  "Rooftop",
  "Terrace",
  "Courtyard",
  "Garden",
  "Church",
  "Community Center",
  "Convention Center",
  "Hotel",
  "Resort",
  "Private Residence",
  "Mansion",
  "Estate",
  "Farm",
  "Barn",
  "Sports Venue",
  "Stadium",
  "Arena",
  "Gymnasium",
  "Ballroom",
  "Conference Room",
  "Corporate Space",
  "Co-working Space",
  "Pop-up Space",
  "Food Truck",
  "Mobile Venue",
  "Boat/Yacht",
  "Historic Building",
  "Museum",
  "Library",
  "University",
  "School",
  "Intimate Venue",
  "Other",
] as const

/**
 * VEN-248 — normalize stored venue-type values against the canonical
 * taxonomy (case-insensitive match, trimmed, deduped). Unknown legacy labels
 * are preserved as-is so no user data is silently dropped.
 */
export function normalizeVenueTypeLabels(
  values: unknown,
  taxonomy: readonly string[] = VENUE_TYPE_TAXONOMY,
): string[] {
  if (!Array.isArray(values)) return []
  const canonicalLower = taxonomy.map((t) => t.toLowerCase())
  const out: string[] = []
  for (const raw of values) {
    if (typeof raw !== "string") continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const idx = canonicalLower.indexOf(trimmed.toLowerCase())
    const label = idx >= 0 ? taxonomy[idx] : trimmed
    if (!out.includes(label)) out.push(label)
  }
  return out
}

// ── Amenities (VEN-247) ──────────────────────────────────────────────────────

/** Canonical amenity keys with human labels, grouped for editors. */
export const VENUE_AMENITY_GROUPS: {
  category: string
  items: { key: string; label: string }[]
}[] = [
  {
    category: "Audio / Visual",
    items: [
      { key: "sound_system", label: "Sound System" },
      { key: "lighting_system", label: "Lighting System" },
      { key: "stage", label: "Stage" },
      { key: "recording_capabilities", label: "Recording Capabilities" },
      { key: "live_streaming", label: "Livestream Setup" },
      { key: "projection_screen", label: "Projection Screen" },
      { key: "dj_booth", label: "DJ Booth" },
    ],
  },
  {
    category: "Facilities",
    items: [
      { key: "green_room", label: "Green Room" },
      { key: "dressing_rooms", label: "Dressing Rooms" },
      { key: "storage_space", label: "Storage Space" },
      { key: "loading_dock", label: "Loading Dock" },
      { key: "merchandise_space", label: "Merch Table Space" },
      { key: "office_space", label: "Office Space" },
    ],
  },
  {
    category: "Services",
    items: [
      { key: "bar_service", label: "Full Bar" },
      { key: "food_service", label: "Food Service" },
      { key: "catering_kitchen", label: "Catering Kitchen" },
      { key: "security", label: "Security" },
      { key: "coat_check", label: "Coat Check" },
      { key: "valet_parking", label: "Valet Parking" },
      { key: "event_planning", label: "Event Planning" },
      { key: "photography_services", label: "Photography Services" },
      { key: "alcohol_license", label: "Alcohol License" },
    ],
  },
  {
    category: "Accessibility & Comfort",
    items: [
      { key: "ada_accessible", label: "ADA Accessible" },
      { key: "elevator", label: "Elevator" },
      { key: "air_conditioning", label: "Air Conditioning" },
      { key: "heating", label: "Heating" },
      { key: "outdoor_space", label: "Outdoor Space" },
      { key: "smoking_area", label: "Smoking Area" },
    ],
  },
  {
    category: "Parking & Transportation",
    items: [
      { key: "parking", label: "Parking" },
      { key: "public_transport_nearby", label: "Public Transit Nearby" },
      { key: "uber_dropoff", label: "Rideshare Drop-off" },
    ],
  },
  {
    category: "Technology",
    items: [
      { key: "wifi", label: "Wi-Fi" },
      { key: "high_speed_internet", label: "High-Speed Internet" },
      { key: "power_outlets", label: "Power Outlets" },
      { key: "charging_stations", label: "Charging Stations" },
    ],
  },
]

export const VENUE_AMENITY_KEYS: string[] = VENUE_AMENITY_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
)

const AMENITY_LABEL_BY_KEY = new Map<string, string>(
  VENUE_AMENITY_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label] as const)),
)

/** Synonyms folded into canonical keys (legacy editor keys + display labels). */
const AMENITY_SYNONYMS: Record<string, string> = {
  accessible: "ada_accessible",
  accessibility: "ada_accessible",
  "ada_accessible": "ada_accessible",
  "ada accessible": "ada_accessible",
  "wi-fi": "wifi",
  "wifi": "wifi",
  lighting: "lighting_system",
  lighting_rig: "lighting_system",
  "lighting rig": "lighting_system",
  "full bar": "bar_service",
  kitchen: "catering_kitchen",
  merch_table: "merchandise_space",
  "merch table": "merchandise_space",
  livestream_setup: "live_streaming",
  "livestream setup": "live_streaming",
}

/** Normalize any raw amenity value (key or display label) to a canonical key. */
export function normalizeAmenityKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ")
  if (!trimmed) return null
  const synonym = AMENITY_SYNONYMS[trimmed]
  if (synonym) return synonym
  return trimmed.replace(/[\s-]+/g, "_")
}

export function amenityLabel(key: string): string {
  return AMENITY_LABEL_BY_KEY.get(key) ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * VEN-247 — project the legacy `settings.amenities` boolean-object onto the
 * canonical key array (truthy entries only, synonyms folded, order-stable).
 */
export function amenitiesFromLegacyObject(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const out: string[] = []
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (rawValue !== true && rawValue !== "true" && rawValue !== 1) continue
    const key = normalizeAmenityKey(rawKey)
    if (key && !out.includes(key)) out.push(key)
  }
  return out
}

/** Dual-write cache shape: canonical keys back to the legacy boolean object. */
export function legacyObjectFromAmenities(keys: unknown): Record<string, boolean> {
  if (!Array.isArray(keys)) return {}
  const out: Record<string, boolean> = {}
  for (const raw of keys) {
    const key = typeof raw === "string" ? normalizeAmenityKey(raw) : null
    if (key) out[key] = true
  }
  return out
}

/**
 * Merge stored top-level array values with legacy-object values into one
 * canonical, deduped array (read-side reconciliation during the window).
 */
export function reconcileAmenities(
  topLevel: unknown,
  legacySettings: unknown,
): string[] {
  const merged: string[] = []
  const push = (raw: unknown) => {
    if (typeof raw !== "string") return
    const key = normalizeAmenityKey(raw)
    if (key && !merged.includes(key)) merged.push(key)
  }
  if (Array.isArray(topLevel)) topLevel.forEach(push)
  amenitiesFromLegacyObject(legacySettings).forEach(push)
  return merged
}

export function hasAmenity(amenities: unknown, key: string): boolean {
  if (!Array.isArray(amenities)) return false
  return amenities.some((a) => normalizeAmenityKey(a) === key)
}

// ── Operational policies (VEN-245) ───────────────────────────────────────────

/** Defined persistence schema for settings.operational_policies (VEN-245). */
export const operationalPoliciesSchema = z.object({
  setup_time: z.string().max(120).optional(),
  breakdown_time: z.string().max(120).optional(),
  security: z.string().max(500).optional(),
  insurance_required: z.boolean().optional(),
  permits: z.string().max(500).optional(),
  union_rules: z.string().max(500).optional(),
  outside_vendors: z.string().max(300).optional(),
  alcohol_policy: z.string().max(300).optional(),
})

export type OperationalPolicies = z.infer<typeof operationalPoliciesSchema>

export const EMPTY_OPERATIONAL_POLICIES: OperationalPolicies = {
  setup_time: "",
  breakdown_time: "",
  security: "",
  insurance_required: false,
  permits: "",
  union_rules: "",
  outside_vendors: "",
  alcohol_policy: "",
}

/** Parse stored JSON into the defined schema, tolerating partial/legacy data. */
export function parseOperationalPolicies(value: unknown): OperationalPolicies {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_OPERATIONAL_POLICIES }
  }
  const parsed = operationalPoliciesSchema.safeParse(value)
  if (parsed.success) {
    return { ...EMPTY_OPERATIONAL_POLICIES, ...parsed.data }
  }
  // Salvage individually valid fields rather than discarding everything.
  const salvaged: Record<string, unknown> = {}
  const booleanKeys = new Set(["insurance_required"])
  for (const [key, fallback] of Object.entries(EMPTY_OPERATIONAL_POLICIES)) {
    const v = (value as Record<string, unknown>)[key]
    if (typeof v === "boolean" && (typeof fallback === "boolean" || booleanKeys.has(key))) {
      salvaged[key] = v
    } else if (typeof v === "string" && typeof fallback === "string") {
      salvaged[key] = v
    }
  }
  return { ...EMPTY_OPERATIONAL_POLICIES, ...(salvaged as OperationalPolicies) }
}

// ── Location (VEN-246) ───────────────────────────────────────────────────────

export interface VenueLocationFields {
  address: string
  city: string
  state: string
  country: string
  postal_code: string
}

/**
 * VEN-246 — read location from the canonical top-level columns, falling back
 * to the legacy contact_info JSON only when the column is empty (dual-read
 * window until the backfill migration runs everywhere).
 */
export function readCanonicalLocation(profile: Record<string, unknown> | null | undefined): VenueLocationFields {
  const contact = (profile?.contact_info ?? {}) as Record<string, unknown>
  const pick = (column: unknown, jsonKey: string): string => {
    if (typeof column === "string" && column.trim()) return column
    const cached = contact[jsonKey]
    return typeof cached === "string" ? cached : ""
  }
  return {
    address: pick(profile?.address, "address"),
    city: pick(profile?.city, "city"),
    state: pick(profile?.state, "state"),
    country: pick(profile?.country, "country"),
    postal_code: pick(profile?.postal_code, "postal_code"),
  }
}
