/**
 * EVENT-102 — Typed event setup field destinations + validation.
 *
 * Maps builder free-text/JSON into:
 * - events_v2 columns (venue_id, capacity, timezone, age_restrictions, created_by)
 * - settings.setup structured block (promoter, production windows, contacts, ownership)
 */

import { z } from "zod"

const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected local time HH:mm")
  .nullable()
  .optional()

const emailSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().email().nullable().optional()
)
const phoneSchema = z.string().trim().max(40).nullable().optional()

export const eventPromoterContactSchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    email: emailSchema,
    phone: phoneSchema,
    company: z.string().trim().max(200).nullable().optional(),
  })
  .strict()

export const eventProductionWindowsSchema = z
  .object({
    load_in: localTimeSchema,
    sound_check: localTimeSchema,
    doors_open: localTimeSchema,
    curfew: localTimeSchema,
    /** Optional absolute ISO timestamps when known. */
    load_in_at: z.string().datetime().nullable().optional().or(z.literal("")),
    sound_check_at: z.string().datetime().nullable().optional().or(z.literal("")),
    doors_open_at: z.string().datetime().nullable().optional().or(z.literal("")),
    curfew_at: z.string().datetime().nullable().optional().or(z.literal("")),
  })
  .passthrough()

export const eventVenueRelationSchema = z
  .object({
    venues_v2_id: z.string().uuid().nullable().optional(),
    venue_account_id: z.string().uuid().nullable().optional(),
    label: z.string().trim().max(200).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    room: z.string().trim().max(120).nullable().optional(),
    contact_name: z.string().trim().max(200).nullable().optional(),
    contact_email: emailSchema,
    contact_phone: phoneSchema,
  })
  .strict()

export const eventOwnershipSchema = z
  .object({
    created_by: z.string().uuid().nullable().optional(),
    ops_owner_user_id: z.string().uuid().nullable().optional(),
    department_owner: z.string().trim().max(120).nullable().optional(),
  })
  .strict()

/** Loose builder input fields that feed the typed destinations. */
export const eventSetupInputSchema = z.object({
  timezone: z.string().trim().min(1).max(80).optional(),
  capacity: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  age_restriction: z.string().trim().max(120).optional().nullable(),
  age_restrictions: z.string().trim().max(120).optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  venue_name: z.string().optional().nullable(),
  venue_address: z.string().optional().nullable(),
  venue_room: z.string().optional().nullable(),
  venue_contact_name: z.string().optional().nullable(),
  venue_contact_email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  venue_contact_phone: z.string().optional().nullable(),
  doors_open: z.string().optional().nullable(),
  curfew: z.string().optional().nullable(),
  load_in_time: z.string().optional().nullable(),
  sound_check_time: z.string().optional().nullable(),
  promoter_contact: eventPromoterContactSchema.optional().nullable(),
  ops_owner_user_id: z.string().uuid().optional().nullable(),
  department_owner: z.string().trim().max(120).optional().nullable(),
  production_windows: z.record(z.unknown()).optional().nullable(),
})

export type EventSetupInput = z.infer<typeof eventSetupInputSchema>

export interface NormalizedEventSetup {
  columns: {
    timezone: string
    capacity: number | null
    age_restrictions: string | null
  }
  venueRelation: z.infer<typeof eventVenueRelationSchema>
  promoterContact: z.infer<typeof eventPromoterContactSchema> | null
  productionWindows: z.infer<typeof eventProductionWindowsSchema>
  ownership: z.infer<typeof eventOwnershipSchema>
  /** Merge into events_v2.settings */
  settingsPatch: Record<string, unknown>
}

function parseCapacity(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function requireLocalTime(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") throw new Error(`${field} must be a local time string (HH:mm).`)
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed))
    throw new Error(`${field} must be HH:mm (24-hour local time).`)
  return trimmed
}

/**
 * Validate + normalize builder fields into typed column/settings destinations.
 * Throws ZodError on invalid local times / emails when present.
 */
export function normalizeEventSetupFields(input: {
  raw: Record<string, unknown>
  createdBy?: string | null
  bridgedVenueId?: string | null
}): NormalizedEventSetup {
  const parsed = eventSetupInputSchema.parse(input.raw)

  const timezone = (parsed.timezone || "UTC").trim() || "UTC"
  const capacity = parseCapacity(parsed.capacity)
  const ageRestrictions =
    (typeof parsed.age_restrictions === "string" && parsed.age_restrictions.trim())
    || (typeof parsed.age_restriction === "string" && parsed.age_restriction.trim())
    || null

  const windowsRaw =
    parsed.production_windows && typeof parsed.production_windows === "object"
      ? parsed.production_windows
      : {}

  const productionWindows: z.infer<typeof eventProductionWindowsSchema> = {
    load_in: requireLocalTime(windowsRaw.load_in ?? parsed.load_in_time, "load_in_time"),
    sound_check: requireLocalTime(windowsRaw.sound_check ?? parsed.sound_check_time, "sound_check_time"),
    doors_open: requireLocalTime(windowsRaw.doors_open ?? parsed.doors_open, "doors_open"),
    curfew: requireLocalTime(windowsRaw.curfew ?? parsed.curfew, "curfew"),
    load_in_at: typeof windowsRaw.load_in_at === "string" && windowsRaw.load_in_at
      ? windowsRaw.load_in_at
      : null,
    sound_check_at: typeof windowsRaw.sound_check_at === "string" && windowsRaw.sound_check_at
      ? windowsRaw.sound_check_at
      : null,
    doors_open_at: typeof windowsRaw.doors_open_at === "string" && windowsRaw.doors_open_at
      ? windowsRaw.doors_open_at
      : null,
    curfew_at: typeof windowsRaw.curfew_at === "string" && windowsRaw.curfew_at
      ? windowsRaw.curfew_at
      : null,
  }

  const venueRelation = eventVenueRelationSchema.parse({
    venues_v2_id: input.bridgedVenueId ?? null,
    venue_account_id: parsed.venue_id ?? null,
    label: parsed.venue_name ?? null,
    address: parsed.venue_address ?? null,
    room: parsed.venue_room ?? null,
    contact_name: parsed.venue_contact_name ?? null,
    contact_email: parsed.venue_contact_email || null,
    contact_phone: parsed.venue_contact_phone ?? null,
  })

  let promoterContact: z.infer<typeof eventPromoterContactSchema> | null = null
  if (parsed.promoter_contact && typeof parsed.promoter_contact === "object") {
    promoterContact = eventPromoterContactSchema.parse(parsed.promoter_contact)
  }

  const ownership = eventOwnershipSchema.parse({
    created_by: input.createdBy ?? null,
    ops_owner_user_id: parsed.ops_owner_user_id ?? null,
    department_owner: parsed.department_owner ?? null,
  })

  const settingsPatch: Record<string, unknown> = {
    timezone,
    age_restrictions: ageRestrictions,
    doors_open: productionWindows.doors_open,
    curfew: productionWindows.curfew,
    load_in_time: productionWindows.load_in,
    sound_check_time: productionWindows.sound_check,
    venue_label: venueRelation.label,
    venue_address: venueRelation.address,
    venue_room: venueRelation.room,
    venue_contact_name: venueRelation.contact_name,
    venue_contact_email: venueRelation.contact_email,
    venue_contact_phone: venueRelation.contact_phone,
    venue_account_id: venueRelation.venue_account_id,
    promoter_contact: promoterContact,
    setup: {
      venue: venueRelation,
      promoter_contact: promoterContact,
      production_windows: productionWindows,
      ownership,
      capacity,
      age_restrictions: ageRestrictions,
      timezone,
    },
  }

  return {
    columns: {
      timezone,
      capacity,
      age_restrictions: ageRestrictions,
    },
    venueRelation,
    promoterContact,
    productionWindows,
    ownership,
    settingsPatch,
  }
}

export function readEventSetupFromSettings(
  settings: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!settings || typeof settings !== "object") return null
  const setup = settings.setup
  if (!setup || typeof setup !== "object" || Array.isArray(setup)) return null
  return setup as Record<string, unknown>
}
