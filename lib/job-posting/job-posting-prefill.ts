import type { CreateJobFormData } from "@/types/artist-jobs"

interface EventJobPrefillContext {
  description?: string | null
  eventDate?: string | null
  eventTime?: string | null
  venueName?: string | null
  venueAddress?: string | null
  venueCity?: string | null
  venueState?: string | null
  venueCountry?: string | null
  venueWebsite?: string | null
  venueContactEmail?: string | null
  venueContactPhone?: string | null
  durationMinutes?: number | null
  soundRequirements?: string | null
  lightingRequirements?: string | null
  stageRequirements?: string | null
  specialRequirements?: string | null
}

export interface TourJobPrefillStop {
  venueName?: string | null
  venueCity?: string | null
  venueState?: string | null
  venueCountry?: string | null
}

interface TourJobPrefillContext {
  description?: string | null
  startDate?: string | null
  transportation?: string | null
  accommodation?: string | null
  equipmentRequirements?: string | null
  specialRequirements?: string | null
  stops?: TourJobPrefillStop[]
}

function clean(value?: string | null): string {
  return value?.trim() ?? ""
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(clean).filter(Boolean))]
}

function joinDistinct(values: Array<string | null | undefined>): string {
  return uniqueValues(values).join(", ")
}

function buildRequirements(sections: Array<[label: string, value?: string | null]>): string {
  return sections
    .map(([label, value]) => {
      const normalized = clean(value)
      return normalized ? `${label}: ${normalized}` : ""
    })
    .filter(Boolean)
    .join("\n")
}

export function normalizeJobDate(value?: string | null): string {
  const normalized = clean(value)
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ""
}

export function normalizeJobTime(value?: string | null): string {
  const normalized = clean(value)
  const match = normalized.match(/(?:^|T)([01]\d|2[0-3]):([0-5]\d)/)
  return match ? `${match[1]}:${match[2]}` : ""
}

export function splitJobPrefillList(value?: string | null): string[] {
  return uniqueValues(clean(value).split(/[\n,;]+/))
}

export function buildEventJobInitialValues(context: EventJobPrefillContext): Partial<CreateJobFormData> {
  const durationMinutes = Number(context.durationMinutes)
  const location = clean(context.venueName) || clean(context.venueAddress)
  const specialRequirements = buildRequirements([
    ["Special requirements", context.specialRequirements],
    ["Sound", context.soundRequirements],
    ["Lighting", context.lightingRequirements],
    ["Stage", context.stageRequirements],
  ])

  return {
    description: clean(context.description),
    job_type: "one_time",
    status: "open",
    location,
    location_type: "in_person",
    city: clean(context.venueCity),
    state: clean(context.venueState),
    country: clean(context.venueCountry),
    event_date: normalizeJobDate(context.eventDate),
    event_time: normalizeJobTime(context.eventTime),
    duration_hours:
      Number.isFinite(durationMinutes) && durationMinutes > 0
        ? Number((durationMinutes / 60).toFixed(2))
        : undefined,
    special_requirements: specialRequirements,
    contact_email: clean(context.venueContactEmail),
    contact_phone: clean(context.venueContactPhone),
    external_link: clean(context.venueWebsite),
  }
}

export function buildTourJobInitialValues(context: TourJobPrefillContext): Partial<CreateJobFormData> {
  const stops = context.stops ?? []
  const venueNames = uniqueValues(stops.map((stop) => stop.venueName))
  const location = venueNames.length > 0 ? venueNames.join(", ") : "Multiple Locations"
  const specialRequirements = buildRequirements([
    ["Special requirements", context.specialRequirements],
    ["Transportation", context.transportation],
    ["Accommodation", context.accommodation],
  ])

  return {
    description: clean(context.description),
    job_type: "tour",
    status: "open",
    location,
    location_type: "in_person",
    city: joinDistinct(stops.map((stop) => stop.venueCity)),
    state: joinDistinct(stops.map((stop) => stop.venueState)),
    country: joinDistinct(stops.map((stop) => stop.venueCountry)),
    event_date: normalizeJobDate(context.startDate),
    required_equipment: splitJobPrefillList(context.equipmentRequirements),
    special_requirements: specialRequirements,
  }
}
