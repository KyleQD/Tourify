/**
 * PLAN-205 — Tour stop holds/options lifecycle.
 */

import "server-only"

import { z } from "zod"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export const TOUR_HOLD_STATUSES = [
  "held",
  "option",
  "confirmed",
  "released",
  "expired",
  "cancelled",
] as const

export type TourHoldStatus = (typeof TOUR_HOLD_STATUSES)[number]

export const tourHoldWriteSchema = z.object({
  tour_stop_id: z.string().uuid().optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  venue_label: z.string().trim().max(240).optional().nullable(),
  proposed_date: z.string().optional().nullable(),
  proposed_time: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(99).optional().default(1),
  option_number: z.number().int().min(1).max(99).optional().nullable(),
  status: z.enum(["held", "option"]).optional().default("held"),
  expires_at: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  contact_phone: z.string().optional().nullable(),
  competing_notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  reminder_at: z.string().optional().nullable(),
})

export class TourHoldError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = "TourHoldError"
    this.code = code
    this.status = status
  }
}

async function appendHistory(args: {
  supabase: SupabaseLike
  holdId: string
  orgId: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  note?: string | null
  actorUserId: string
}) {
  await args.supabase.from("tour_stop_hold_history").insert({
    hold_id: args.holdId,
    org_id: args.orgId,
    action: args.action,
    from_status: args.fromStatus,
    to_status: args.toStatus,
    note: args.note ?? null,
    actor_user_id: args.actorUserId,
  })
}

export async function listTourStopHolds(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
}) {
  const { data, error } = await args.supabase
    .from("tour_stop_holds")
    .select("*")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
    .order("priority", { ascending: true })
    .order("expires_at", { ascending: true, nullsFirst: false })

  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }
  return data ?? []
}

export async function createTourStopHold(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  userId: string
  input: unknown
}) {
  const parsed = tourHoldWriteSchema.safeParse(args.input)
  if (!parsed.success) {
    throw new TourHoldError("invalid_hold", parsed.error.issues[0]?.message || "Invalid hold.")
  }

  const { data, error } = await args.supabase
    .from("tour_stop_holds")
    .insert({
      org_id: args.orgId,
      tour_id: args.tourId,
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  await appendHistory({
    supabase: args.supabase,
    holdId: data.id,
    orgId: args.orgId,
    action: "create",
    fromStatus: null,
    toStatus: data.status,
    actorUserId: args.userId,
  })
  return data
}

export async function transitionTourStopHold(args: {
  supabase: SupabaseLike
  orgId: string
  holdId: string
  userId: string
  action: "expire" | "confirm" | "release" | "cancel"
  note?: string | null
  confirmed_event_id?: string | null
  confirmed_stop_id?: string | null
}) {
  const { data: existing, error } = await args.supabase
    .from("tour_stop_holds")
    .select("*")
    .eq("id", args.holdId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!existing) throw new TourHoldError("hold_not_found", "Hold not found.", 404)

  const fromStatus = String(existing.status)
  let toStatus: TourHoldStatus = fromStatus as TourHoldStatus
  const patch: Record<string, unknown> = {
    updated_by: args.userId,
    updated_at: new Date().toISOString(),
  }

  switch (args.action) {
    case "expire":
      if (!["held", "option"].includes(fromStatus)) {
        throw new TourHoldError("invalid_transition", "Only held/option holds can expire.")
      }
      toStatus = "expired"
      break
    case "release":
      if (!["held", "option"].includes(fromStatus)) {
        throw new TourHoldError("invalid_transition", "Only held/option holds can be released.")
      }
      toStatus = "released"
      break
    case "cancel":
      toStatus = "cancelled"
      break
    case "confirm":
      if (!["held", "option"].includes(fromStatus)) {
        throw new TourHoldError("invalid_transition", "Only held/option holds can be confirmed.")
      }
      toStatus = "confirmed"
      patch.confirmed_event_id = args.confirmed_event_id ?? null
      patch.confirmed_stop_id = args.confirmed_stop_id ?? existing.tour_stop_id ?? null
      break
    default:
      throw new TourHoldError("invalid_action", "Unknown hold action.")
  }

  patch.status = toStatus
  const { data, error: updateError } = await args.supabase
    .from("tour_stop_holds")
    .update(patch)
    .eq("id", args.holdId)
    .eq("org_id", args.orgId)
    .select("*")
    .maybeSingle()
  if (updateError) throw new Error(updateError.message)
  if (!data) throw new TourHoldError("hold_not_found", "Hold not found.", 404)

  await appendHistory({
    supabase: args.supabase,
    holdId: args.holdId,
    orgId: args.orgId,
    action: args.action,
    fromStatus,
    toStatus,
    note: args.note,
    actorUserId: args.userId,
  })

  return data
}

export async function listCompetingTourHolds(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  proposedDate: string
  venueLabel?: string | null
}) {
  let query = args.supabase
    .from("tour_stop_holds")
    .select("id, venue_label, proposed_date, priority, option_number, status, expires_at")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
    .eq("proposed_date", args.proposedDate)
    .in("status", ["held", "option"])

  if (args.venueLabel) query = query.ilike("venue_label", args.venueLabel)

  const { data, error } = await query.order("priority", { ascending: true })
  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }
  return data ?? []
}
