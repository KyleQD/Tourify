import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * VENUE-004 — venue availability block writer (venue-scoped).
 *
 * Shared availability helpers backing `app/api/venue/availability/route.ts`.
 * Every helper is expected to be reached ONLY after an application-level
 * `canManageVenue` scope check at the data boundary — the raw
 * `venue_availability` RLS boundary is owned by VENUE-005/DB-002 and must not
 * be treated as the authorization boundary for these writes.
 *
 * Callers pass either the acting user's Supabase client (after
 * `authenticateApiRequest`) or the service-role client once venue scope has
 * been established; the helpers themselves never read auth state.
 */

/** `yyyy-MM-dd` calendar dates as stored in venue_availability.date. */
export const AVAILABILITY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates and normalizes a `yyyy-MM-dd` calendar date. Returns the date
 * string when it is a real calendar day, otherwise null.
 */
export function parseAvailabilityDate(value: unknown): string | null {
  if (typeof value !== "string") return null
  if (!AVAILABILITY_DATE_RE.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }
  return value
}

export interface VenueAvailabilityRow {
  id: string
  venue_id: string
  date: string
  is_available: boolean | null
  blocked_reason: string | null
  notes: string | null
  booking_id: string | null
  event_id: string | null
  updated_at: string | null
}

const AVAILABILITY_SELECT =
  "id, venue_id, date, is_available, blocked_reason, notes, booking_id, event_id, updated_at"

export interface ListVenueAvailabilityInput {
  venueId: string
  /** Inclusive `yyyy-MM-dd` bounds (optional). */
  from?: string
  to?: string
}

/** Lists availability rows for one venue, oldest date first. */
export async function listVenueAvailability(
  service: SupabaseClient,
  input: ListVenueAvailabilityInput,
) {
  let query = service
    .from("venue_availability")
    .select(AVAILABILITY_SELECT)
    .eq("venue_id", input.venueId)
  if (input.from) query = query.gte("date", input.from)
  if (input.to) query = query.lte("date", input.to)
  return query.order("date", { ascending: true })
}

/**
 * VENUE-005 — venue-scoped reservation list backing
 * `app/api/venue/reservations/route.ts` and the venue calendar hook.
 *
 * Returns consuming-status reservation rows (hold/offer/contract/confirmed)
 * for one venue, optionally narrowed to an inclusive `[from,to]` window over
 * `reserved_range`. This mirrors the calendar surface that previously read the
 * raw table from the client; now the raw `venue_reservations` boundary is
 * service-role-only (VENUE-005/DB-002) and callers MUST already be gated by
 * `canManageVenue("manage_bookings")`. The projection deliberately excludes
 * sensitive columns (`source_id`, `created_by`, `reservation_channel`,
 * lifecycle status details) that the public/existence surface never consumed.
 */
export const CALENDAR_CONSUMING_STATUSES = ["hold", "offer", "contract", "confirmed"] as const

export const RESERVATION_CALENDAR_SELECT =
  "id, resource_key, starts_at, ends_at, status"

export interface ListVenueReservationsInput {
  venueId: string
  /** Inclusive window bounds (ISO 8601 timestamps, optional; both or neither). */
  from?: string
  to?: string
}

/** Lists consuming reservation rows for one venue, earliest start first. */
export async function listVenueReservations(
  service: SupabaseClient,
  input: ListVenueReservationsInput,
) {
  let query = service
    .from("venue_reservations")
    .select(RESERVATION_CALENDAR_SELECT)
    .eq("venue_id", input.venueId)
    .in("status", CALENDAR_CONSUMING_STATUSES)
  if (input.from && input.to) {
    query = query.overlaps("reserved_range", `[${input.from},${input.to}]`)
  }
  return query.order("starts_at", { ascending: true })
}

/**
 * Receiving-side contract (SIM-20260922-VENUE-002): returns whether a venue
 * date is manually blocked (`is_available = false`) so booking/request
 * validation can reject conflicts against manager-created blocks. Callers
 * reach this AFTER their own scope/authorization check — the raw
 * `venue_availability` RLS boundary belongs to VENUE-005/DB-002.
 */
export async function isVenueDateBlocked(
  service: SupabaseClient,
  input: { venueId: string; date: string },
) {
  const { data, error } = await service
    .from("venue_availability")
    .select("id")
    .eq("venue_id", input.venueId)
    .eq("date", input.date)
    .eq("is_available", false)
    .maybeSingle()
  return { blocked: Boolean(data?.id), error }
}

/**
 * Converts a booking/event timestamp to the `yyyy-MM-dd` calendar day used by
 * `venue_availability.date`.
 *
 * `venue_availability` is a calendar-day table, but booking requests carry an
 * instant. The UTC calendar day is used deliberately (and not the server's local
 * day, which would make the answer depend on the deployment host's timezone) and
 * matches how the booking lane already compares `event_date` (it parses the same
 * value into an instant and compares `toISOString()` bounds). Returns null for
 * a value that is not a parseable date so callers fail open on a malformed input
 * rather than rejecting a legitimate request.
 */
export function toAvailabilityCalendarDay(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

/**
 * Receiving-side one-liner for `validateVenueAvailability` (SIM-20260922-VENUE-002).
 *
 * Booking-request validation already holds a service-role client after its own
 * scope check, so it can call this directly to reject a request for a date the
 * venue manager has blocked. An unparseable event date is not treated as a block.
 */
export async function isVenueEventDateBlocked(
  service: SupabaseClient,
  input: { venueId: string; eventDate: string },
) {
  const date = toAvailabilityCalendarDay(input.eventDate)
  if (!date) return { blocked: false, error: null, date: null }
  const result = await isVenueDateBlocked(service, { venueId: input.venueId, date })
  return { ...result, date }
}

export interface UpsertVenueAvailabilityInput {
  venueId: string
  date: string
  isAvailable: boolean
  blockedReason?: string | null
  notes?: string | null
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Creates or replaces the availability row for a venue/date (the table has a
 * UNIQUE(venue_id, date) constraint). `isAvailable: false` is the manual block
 * path; `isAvailable: true` explicitly opens a date.
 */
export async function upsertVenueAvailability(
  service: SupabaseClient,
  input: UpsertVenueAvailabilityInput,
) {
  return service
    .from("venue_availability")
    .upsert(
      {
        venue_id: input.venueId,
        date: input.date,
        is_available: input.isAvailable,
        blocked_reason: normalizeText(input.blockedReason),
        notes: normalizeText(input.notes),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,date" },
    )
    .select(AVAILABILITY_SELECT)
    .maybeSingle()
}

/** Loads a single availability row by id. */
export async function getVenueAvailabilityById(service: SupabaseClient, id: string) {
  return service
    .from("venue_availability")
    .select(AVAILABILITY_SELECT)
    .eq("id", id)
    .maybeSingle()
}

export interface UpdateVenueAvailabilityInput {
  isAvailable?: boolean
  blockedReason?: string | null
  notes?: string | null
}

/** Updates an existing availability row by id. */
export async function updateVenueAvailabilityById(
  service: SupabaseClient,
  id: string,
  fields: UpdateVenueAvailabilityInput,
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.isAvailable !== undefined) update.is_available = fields.isAvailable
  if (fields.blockedReason !== undefined) update.blocked_reason = normalizeText(fields.blockedReason)
  if (fields.notes !== undefined) update.notes = normalizeText(fields.notes)
  return service
    .from("venue_availability")
    .update(update)
    .eq("id", id)
    .select(AVAILABILITY_SELECT)
    .maybeSingle()
}

/**
 * Clears a manual block for one venue/date. Rows that carry a booking or event
 * linkage are opened (is_available=true, reason/notes cleared) rather than
 * deleted so the booking engine's marker survives; standalone block rows are
 * removed so the date returns to open inventory.
 */
export async function clearVenueAvailability(
  service: SupabaseClient,
  input: { venueId: string; date: string },
) {
  const { data: existing } = await service
    .from("venue_availability")
    .select("id, booking_id, event_id")
    .eq("venue_id", input.venueId)
    .eq("date", input.date)
    .maybeSingle()
  return clearAvailabilityRow(service, existing)
}

/** Clears a manual block by row id (same conditional semantics as above). */
export async function clearVenueAvailabilityById(service: SupabaseClient, id: string) {
  const { data: existing } = await service
    .from("venue_availability")
    .select("id, booking_id, event_id")
    .eq("id", id)
    .maybeSingle()
  return clearAvailabilityRow(service, existing)
}

async function clearAvailabilityRow(
  service: SupabaseClient,
  existing: { id: string; booking_id: string | null; event_id: string | null } | null,
) {
  if (!existing?.id) {
    return { data: null, error: null, cleared: false }
  }
  if (existing.booking_id || existing.event_id) {
    const result = await service
      .from("venue_availability")
      .update({
        is_available: true,
        blocked_reason: null,
        notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(AVAILABILITY_SELECT)
      .maybeSingle()
    return { ...result, cleared: true }
  }
  const result = await service
    .from("venue_availability")
    .delete()
    .eq("id", existing.id)
    .select(AVAILABILITY_SELECT)
    .maybeSingle()
  return { ...result, cleared: true }
}