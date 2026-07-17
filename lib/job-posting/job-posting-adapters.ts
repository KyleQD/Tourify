import { getDefaultApplicationFields } from "@/lib/hiring/job-posting-builder-schema"
import type { HiringEntity } from "@/types/hiring-entity"
import type { CreateJobFormData } from "@/types/artist-jobs"

export type WorkforceSalaryType = "hourly" | "daily" | "flat" | "salary" | "fixed" | "annual"

export interface WorkforceQuickJobValues {
  title: string
  description: string
  department?: string
  position?: string
  employmentType?: string
  experienceLevel?: string
  location?: string
  eventDate?: string
  numberOfPositions?: number
  salaryMin?: string | number | null
  salaryMax?: string | number | null
  salaryType?: WorkforceSalaryType
  remote?: boolean
  urgent?: boolean
  requirements?: string[]
  responsibilities?: string[]
  skills?: string[]
  benefits?: string[]
}

interface VenueContext {
  id: string
  name?: string | null
}

interface EventJobContext {
  eventDate?: string | null
  eventLocation?: string | null
}

interface TourJobContext {
  tourId: string
  tourName: string
  tourStartDate?: string | null
  tourEndDate?: string | null
}

function cleanString(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function coercePositiveInteger(value: unknown, fallback = 1): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.trunc(parsed))
}

function coerceNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSalaryType(type?: WorkforceSalaryType): "hourly" | "daily" | "flat" | "salary" {
  if (type === "annual") return "salary"
  if (type === "fixed") return "flat"
  if (type === "daily" || type === "salary" || type === "flat") return type
  return "hourly"
}

function buildSalaryRange(values: WorkforceQuickJobValues) {
  const min = coerceNumberOrNull(values.salaryMin)
  const max = coerceNumberOrNull(values.salaryMax)
  if (min === null && max === null) return null

  return {
    min,
    max,
    type: normalizeSalaryType(values.salaryType),
  }
}

function omitEmptyStrings<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== "")) as T
}

export function buildWorkforceJobPostingPayload({
  employer,
  values,
  status,
}: {
  employer: HiringEntity
  values: WorkforceQuickJobValues
  status: "draft" | "published"
}) {
  const eventDate = cleanString(values.eventDate)

  return {
    entity_type: employer.entityType,
    entity_id: employer.entityId,
    employer_entity_type: employer.entityType,
    employer_entity_id: employer.entityId,
    title: values.title.trim(),
    description: values.description.trim(),
    department: cleanString(values.department),
    position: cleanString(values.position),
    employment_type: values.employmentType || "contractor",
    location: cleanString(values.location),
    number_of_positions: coercePositiveInteger(values.numberOfPositions),
    experience_level: values.experienceLevel || "entry",
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    salary_range: buildSalaryRange(values),
    remote: Boolean(values.remote),
    urgent: Boolean(values.urgent),
    requirements: values.requirements ?? [],
    responsibilities: values.responsibilities ?? [],
    skills: values.skills ?? [],
    benefits: values.benefits ?? [],
    application_form_template: { fields: getDefaultApplicationFields() },
    status,
  }
}

export function buildVenueJobPostingPayload({
  venue,
  values,
}: {
  venue: VenueContext
  values: WorkforceQuickJobValues
}) {
  return {
    venue_id: venue.id,
    title: values.title.trim(),
    department: cleanString(values.department),
    description: values.description.trim(),
    employment_type: values.employmentType || "contractor",
    experience_level: values.experienceLevel || "entry",
    location: cleanString(values.location) || venue.name || "Venue",
    number_of_positions: coercePositiveInteger(values.numberOfPositions),
    remote: Boolean(values.remote),
    urgent: Boolean(values.urgent),
    salary_range: buildSalaryRange(values) ?? undefined,
    requirements: values.requirements ?? [],
    responsibilities: values.responsibilities ?? [],
    skills: values.skills ?? [],
    benefits: values.benefits ?? [],
    status: "published" as const,
  }
}

export function buildArtistJobPayload({
  values,
  eventDate,
  deadline,
}: {
  values: CreateJobFormData
  eventDate?: string
  deadline?: string
}) {
  return {
    ...values,
    event_date: eventDate ?? values.event_date,
    deadline: deadline ?? values.deadline,
  }
}

export function buildEventJobPayload({
  values,
  context,
}: {
  values: CreateJobFormData
  context: EventJobContext
}) {
  return {
    ...values,
    location: values.location || context.eventLocation || "",
    event_date: values.event_date || context.eventDate || undefined,
  }
}

export function buildTourJobPayload({
  values,
  context,
}: {
  values: CreateJobFormData
  context: TourJobContext
}) {
  return omitEmptyStrings({
    ...values,
    tour_id: context.tourId,
    tour_name: context.tourName,
    tour_start_date: context.tourStartDate,
    tour_end_date: context.tourEndDate,
  })
}

export function buildJobPostingEndpoint(pathname: string, queryString?: string): string {
  if (!queryString) return pathname
  return `${pathname}?${queryString.replace(/^\?/, "")}`
}
