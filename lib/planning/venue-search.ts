export type PlanningVenueSource = "catalog" | "tourify_profile"

export interface PlanningVenueResult {
  key: string
  source: PlanningVenueSource
  sourceLabel: "Venue catalog" | "Tourify venue profile"
  name: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  website: string
  contactName: string
  contactEmail: string
  contactPhone: string
  capacity: number | null
  technicalSpecs: Record<string, unknown>
}

export interface PlanningVenueSearchResponse {
  groups: {
    catalog: PlanningVenueResult[]
    tourifyProfiles: PlanningVenueResult[]
  }
  nextCursor: string | null
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function positiveCapacity(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

export function mapCatalogVenue(row: Record<string, unknown>): PlanningVenueResult {
  return {
    key: `catalog:${stringValue(row.source_id)}`,
    source: "catalog",
    sourceLabel: "Venue catalog",
    name: stringValue(row.name),
    address: stringValue(row.address),
    city: stringValue(row.city),
    state: stringValue(row.state),
    postalCode: stringValue(row.postal_code),
    country: stringValue(row.country) || "US",
    website: stringValue(row.website),
    contactName: "",
    contactEmail: stringValue(row.email),
    contactPhone: stringValue(row.phone),
    capacity: positiveCapacity(row.capacity),
    technicalSpecs: objectValue(row.technical_specs),
  }
}

export function mapTourifyVenueProfile(row: Record<string, unknown>): PlanningVenueResult {
  const contact = objectValue(row.contact_info)
  const social = objectValue(row.social_links)
  const settings = objectValue(row.settings)
  const technical = objectValue(settings.technical_specs || settings.stage_specs)

  return {
    key: `profile:${stringValue(row.id)}`,
    source: "tourify_profile",
    sourceLabel: "Tourify venue profile",
    name: stringValue(row.venue_name),
    address: stringValue(row.address),
    city: stringValue(row.city),
    state: stringValue(row.state),
    postalCode: stringValue(row.postal_code),
    country: stringValue(row.country) || "US",
    website: stringValue(contact.website || social.website || settings.website),
    contactName: stringValue(contact.name || contact.booking_name),
    contactEmail: stringValue(contact.booking_email || contact.email),
    contactPhone: stringValue(contact.booking_phone || contact.phone),
    capacity: positiveCapacity(row.capacity),
    technicalSpecs: technical,
  }
}

export function planningVenueAddress(result: PlanningVenueResult): string {
  return [result.address, result.city, result.state, result.postalCode]
    .filter(Boolean)
    .join(", ")
}
