import "server-only"

import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

import { buildUniqueEventSlug, mapIncomingStatusToV2, mapV2StatusToUi } from "@/app/api/events/_lib/events-v2-admin"
import { resolveAdminOrgIdForUser } from "@/app/api/events/_lib/admin-event-persistence"
import { getEventReadiness, getTourReadiness } from "@/lib/admin/operations-readiness"

type SupabaseLike = SupabaseClient | any

const uuidOrEmptySchema = z.union([z.string().uuid(), z.literal("")])

export const tourAssignmentInputSchema = z.object({
  tour_id: z.string().uuid(),
  ordinal: z.number().int().nullable().optional(),
  is_primary: z.boolean().optional(),
  leg_name: z.string().trim().max(120).nullable().optional(),
  market: z.string().trim().max(120).nullable().optional(),
  advance_status: z.enum(["not_started", "in_progress", "ready", "blocked", "settled"]).optional(),
  routing_notes: z.string().trim().max(2000).nullable().optional(),
})

const tourStopAssignmentSchema = tourAssignmentInputSchema.extend({
  event_id: z.string().uuid(),
})

export const adminEventInputBaseSchema = z.object({
    title: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    event_type: z.string().optional().nullable(),
    public_visibility: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    status: z.string().optional().nullable(),
    start_at: z.string().min(1).optional(),
    end_at: z.string().min(1).optional(),
    event_date: z.string().optional(),
    event_time: z.string().optional(),
    timezone: z.string().optional(),
    duration_minutes: z.number().int().min(0).max(1440).optional(),
    venue_id: z.string().uuid().optional().nullable(),
    venue_name: z.string().optional().nullable(),
    venue_address: z.string().optional().nullable(),
    venue_room: z.string().optional().nullable(),
    venue_contact_name: z.string().optional().nullable(),
    venue_contact_email: z.string().optional().nullable(),
    venue_contact_phone: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    capacity: z.union([z.number().int(), z.string()]).optional().nullable(),
    tour_id: uuidOrEmptySchema.optional().nullable(),
    tour_ids: z.array(z.string().uuid()).optional(),
    tour_assignments: z.array(tourAssignmentInputSchema).optional(),
    primary_tour_id: z.string().uuid().optional().nullable(),
    doors_open: z.string().optional().nullable(),
    curfew: z.string().optional().nullable(),
    load_in_time: z.string().optional().nullable(),
    sound_check_time: z.string().optional().nullable(),
    sound_requirements: z.string().max(5000).optional().nullable(),
    lighting_requirements: z.string().max(5000).optional().nullable(),
    stage_requirements: z.string().max(5000).optional().nullable(),
    special_requirements: z.string().max(5000).optional().nullable(),
    set_times: z.array(z.record(z.unknown())).optional(),
    ticket_price: z.number().optional(),
    vip_price: z.number().optional(),
    expected_revenue: z.number().optional(),
    expected_expenses: z.number().optional(),
    artist_ids: z.array(z.string()).optional(),
    staff_ids: z.array(z.string()).optional(),
    vendor_ids: z.array(z.string()).optional(),
    stakeholders: z.string().optional().nullable(),
    hospitality_rider: z.string().optional().nullable(),
    technical_rider: z.string().optional().nullable(),
    security_notes: z.string().optional().nullable(),
    settlement_terms: z.string().optional().nullable(),
    promoter_contact: z.record(z.unknown()).optional().nullable(),
    travel: z.string().optional().nullable(),
    lodging: z.string().optional().nullable(),
    equipment: z.string().optional().nullable(),
    site_map: z.string().optional().nullable(),
    supply_list: z.string().optional().nullable(),
    documents: z.string().optional().nullable(),
    comps: z.union([z.number(), z.string()]).optional().nullable(),
    guest_list_budget: z.union([z.number(), z.string()]).optional().nullable(),
    day_sheet_notes: z.string().optional().nullable(),
    creation_source: z.string().optional().nullable(),
    producer_intent: z.string().optional().nullable(),
    template_key: z.string().optional().nullable(),
    setup_checklist: z.record(z.boolean()).optional(),
    setup_context: z.record(z.unknown()).optional().nullable(),
})

export const adminEventInputSchema = adminEventInputBaseSchema
  .refine((data) => Boolean(data.title?.trim() || data.name?.trim()), {
    message: "title or name is required",
  })
  .refine((data) => Boolean(data.start_at?.trim() || data.event_date?.trim()), {
    message: "start_at or event_date is required",
  })

export const adminTourInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.union([z.number(), z.string()]).optional().nullable(),
  revenue: z.union([z.number(), z.string()]).optional().nullable(),
  expenses: z.union([z.number(), z.string()]).optional().nullable(),
  main_artist: z.string().optional().nullable(),
  artist_id: z.string().uuid().optional().nullable(),
  genre: z.string().optional().nullable(),
  cover_image: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable(),
  markets: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  event_ids: z.array(z.string().uuid()).optional(),
  routing: z.array(z.record(z.unknown())).optional(),
  events: z
    .array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().min(1),
          venue: z.string().optional(),
          venue_name: z.string().optional(),
          date: z.string().optional(),
          event_date: z.string().optional(),
          time: z.string().optional(),
          event_time: z.string().optional(),
          description: z.string().optional(),
          capacity: z.union([z.number().int(), z.string()]).optional(),
          market: z.string().optional().nullable(),
          leg_name: z.string().optional().nullable(),
          advance_status: z.enum(["not_started", "in_progress", "ready", "blocked", "settled"]).optional(),
          ordinal: z.number().int().optional(),
        })
        .transform((event) => ({
          id: event.id,
          name: event.name,
          venue: event.venue || event.venue_name || "",
          date: event.date || event.event_date || "",
          time: event.time || event.event_time || undefined,
          description: event.description,
          capacity: event.capacity,
          market: event.market ?? undefined,
          leg_name: event.leg_name ?? undefined,
          advance_status: event.advance_status,
          ordinal: event.ordinal,
        }))
        .refine((event) => Boolean(event.date?.trim()), { message: "date is required" })
    )
    .optional(),
})

export const plannerTourInputSchema = z.object({
  step1: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    mainArtist: z.string().min(1),
    genre: z.string().optional(),
    coverImage: z.string().optional(),
  }),
  step2: z.object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    route: z.array(z.record(z.unknown())).default([]),
  }),
  step3: z.object({
    events: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        venue: z.string().min(1),
        date: z.string().min(1),
        time: z.string().optional(),
        description: z.string().optional(),
        capacity: z.union([z.number().int(), z.string()]).optional(),
      })
    ).default([]),
  }),
  step4: z.object({
    artists: z.array(z.record(z.unknown())).default([]),
    crew: z.array(z.record(z.unknown())).default([]),
  }),
  step5: z.object({
    transportation: z.record(z.unknown()).default({}),
    accommodation: z.record(z.unknown()).default({}),
    equipment: z.array(z.record(z.unknown())).default([]),
  }),
  step6: z.object({
    ticketTypes: z.array(z.record(z.unknown())).default([]),
    budget: z.object({
      total: z.union([z.number(), z.string()]).optional().default(0),
      expenses: z.array(z.record(z.unknown())).default([]),
    }),
    sponsors: z.array(z.record(z.unknown())).default([]),
  }),
  tourId: z.string().uuid().optional(),
})

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

function parseCapacity(value: unknown): number | null {
  const n = parseNumber(value)
  if (n === null || n < 0) return null
  return Math.round(n)
}

function combineDateTimeToIso(date?: string | null, time?: string | null): string | null {
  if (!date?.trim()) return null
  const t = (time?.trim() || "00:00").slice(0, 5)
  // Date/time values from the admin forms are stored in the event's configured
  // timezone (UTC by default). Keep the default path deterministic across local,
  // CI, and server runtimes instead of applying the host machine's timezone.
  const ms = Date.parse(`${date.trim()}T${t}:00.000Z`)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

function defaultEndAt(startIso: string): string {
  return new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000).toISOString()
}

function slugify(value: string, fallback: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 56) || fallback
  )
}

async function buildUniqueTourSlug(supabase: SupabaseLike, orgId: string | null, name: string): Promise<string> {
  const base = slugify(name, "tour")
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`
    let query = supabase.from("tours").select("id").eq("slug", slug)
    if (orgId) query = query.eq("org_id", orgId)
    const { data, error } = await query.maybeSingle()
    if (error) return `${base}-${Date.now().toString(36)}`
    if (!data) return slug
  }
  return `${base}-${Date.now().toString(36)}`
}

function readSetupSelections(input: Partial<z.infer<typeof adminEventInputBaseSchema>>) {
  const context = input.setup_context && typeof input.setup_context === "object"
    ? (input.setup_context as Record<string, unknown>)
    : {}
  const artists = Array.isArray(context.artists) ? context.artists : []
  const crew = Array.isArray(context.crew) ? context.crew : []
  const vendors = Array.isArray(context.vendors) ? context.vendors : []

  const artistIds = [
    ...(input.artist_ids ?? []),
    ...artists.map((item: any) => String(item?.id || "")).filter(Boolean),
  ]
  const staffIds = [
    ...(input.staff_ids ?? []),
    ...crew.map((item: any) => String(item?.id || "")).filter(Boolean),
  ]
  const vendorEntries = [
    ...(input.vendor_ids ?? []).map((id) => ({ id, label: id.replace(/^vendor:/i, ""), meta: "Vendor" })),
    ...vendors.map((item: any) => ({
      id: String(item?.id || item?.label || ""),
      label: String(item?.label || item?.name || item?.id || "Vendor"),
      meta: String(item?.meta || "general"),
    })),
  ].filter((entry) => entry.id || entry.label)

  return {
    artistIds: Array.from(new Set(artistIds.filter(Boolean))),
    staffIds: Array.from(new Set(staffIds.filter(Boolean))),
    vendorEntries,
    artists,
    crew,
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Best-effort bridge from builder settings into operational tables used by hub managers. */
async function seedOperationalRecordsFromInput(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string | null
  input: Partial<z.infer<typeof adminEventInputBaseSchema>>
  eventStartAt?: string | null
}) {
  const { artistIds, staffIds, vendorEntries, artists, crew } = readSetupSelections(args.input)

  // Artists / participants
  for (const [index, artistId] of artistIds.entries()) {
    if (!isUuid(artistId)) continue
    const artistMeta = artists.find((item: any) => String(item?.id) === artistId) as any
    const role = index === 0 ? "headliner" : "support"
    const { error } = await args.supabase.from("event_participants").upsert(
      {
        event_id: args.eventId,
        participant_id: artistId,
        participant_type: "Artist",
        role: artistMeta?.meta?.includes?.("support") ? "support" : role,
        status: "invited",
        metadata: { seeded_from_builder: true, label: artistMeta?.label || null },
      },
      { onConflict: "event_id,participant_id", ignoreDuplicates: true }
    )
    if (error) console.warn("[AdminTourEventOperations] participant seed skipped:", error.message)
  }

  // Crew as participants + optional staff_shifts when a staff_members row exists
  const shiftDate = args.eventStartAt
    ? new Date(args.eventStartAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  for (const staffId of staffIds) {
    if (!isUuid(staffId)) continue
    const crewMeta = crew.find((item: any) => String(item?.id) === staffId) as any

    const { error: participantError } = await args.supabase.from("event_participants").upsert(
      {
        event_id: args.eventId,
        participant_id: staffId,
        participant_type: "Individual",
        role: "staff",
        status: "invited",
        metadata: { seeded_from_builder: true, label: crewMeta?.label || null },
      },
      { onConflict: "event_id,participant_id", ignoreDuplicates: true }
    )
    if (participantError) console.warn("[AdminTourEventOperations] staff participant seed skipped:", participantError.message)

    let staffMemberId: string | null = null
    const byId = await args.supabase.from("staff_members").select("id").eq("id", staffId).maybeSingle()
    if (byId.data?.id) staffMemberId = byId.data.id
    if (!staffMemberId) {
      const byUser = await args.supabase
        .from("staff_members")
        .select("id")
        .eq("user_id", staffId)
        .limit(1)
        .maybeSingle()
      if (byUser.data?.id) staffMemberId = byUser.data.id
    }

    if (!staffMemberId) continue

    const { data: existingShift } = await args.supabase
      .from("staff_shifts")
      .select("id")
      .eq("event_id", args.eventId)
      .eq("staff_member_id", staffMemberId)
      .limit(1)
      .maybeSingle()
    if (existingShift?.id) continue

    const { error: shiftError } = await args.supabase.from("staff_shifts").insert({
      event_id: args.eventId,
      staff_member_id: staffMemberId,
      shift_date: shiftDate,
      start_time: "09:00",
      end_time: "17:00",
      role_assignment: crewMeta?.meta || crewMeta?.label || "crew",
      status: "scheduled",
      created_by: args.userId,
      notes: "Seeded from event producer builder",
    })
    if (shiftError) console.warn("[AdminTourEventOperations] staff shift seed skipped:", shiftError.message)
  }

  // Vendors → event_vendor_requests
  for (const vendor of vendorEntries) {
    const vendorName = vendor.label || vendor.id
    if (!vendorName) continue
    const { data: existingVendor } = await args.supabase
      .from("event_vendor_requests")
      .select("id")
      .eq("event_id", args.eventId)
      .ilike("vendor_name", vendorName)
      .limit(1)
      .maybeSingle()
    if (existingVendor?.id) continue

    const insertPayload: Record<string, unknown> = {
      event_id: args.eventId,
      vendor_name: vendorName.slice(0, 200),
      service_type: (vendor.meta || "general").slice(0, 120),
      status: "pending",
      created_by: args.userId,
      notes: "Seeded from event producer builder",
    }
    if (args.orgId) insertPayload.org_id = args.orgId

    const { error: vendorError } = await args.supabase.from("event_vendor_requests").insert(insertPayload)
    if (vendorError) console.warn("[AdminTourEventOperations] vendor seed skipped:", vendorError.message)
  }

  // Ticket types from scalar prices
  const ticketPrice = typeof args.input.ticket_price === "number" ? args.input.ticket_price : null
  const vipPrice = typeof args.input.vip_price === "number" ? args.input.vip_price : null
  if (ticketPrice != null || vipPrice != null) {
    const { data: existingTypes } = await args.supabase
      .from("ticket_types")
      .select("id, name")
      .eq("event_id", args.eventId)

    const names = new Set((existingTypes ?? []).map((row: { name?: string }) => String(row.name || "").toLowerCase()))
    const inserts: Array<Record<string, unknown>> = []
    if (ticketPrice != null && !names.has("general admission")) {
      inserts.push({
        event_id: args.eventId,
        name: "General Admission",
        price: ticketPrice,
        quantity_available: 100,
        quantity_sold: 0,
        category: "general",
        is_active: true,
      })
    }
    if (vipPrice != null && !names.has("vip")) {
      inserts.push({
        event_id: args.eventId,
        name: "VIP",
        price: vipPrice,
        quantity_available: 25,
        quantity_sold: 0,
        category: "vip",
        is_active: true,
      })
    }
    if (inserts.length) {
      const { error: ticketError } = await args.supabase.from("ticket_types").insert(inserts)
      if (ticketError) console.warn("[AdminTourEventOperations] ticket_types seed skipped:", ticketError.message)
    }
  }
}

async function resolveVenuesV2IdForAccount(args: {
  supabase: SupabaseLike
  orgId?: string | null
  userId: string
  venueAccountId?: string | null
  venueName?: string | null
}): Promise<string | null> {
  const venueAccountId = args.venueAccountId?.trim() || null
  if (!venueAccountId) return null

  // If the id already exists in venues_v2, use it directly.
  const { data: existingV2 } = await args.supabase
    .from("venues_v2")
    .select("id")
    .eq("id", venueAccountId)
    .maybeSingle()
  if (existingV2?.id) return existingV2.id

  let profileName = args.venueName?.trim() || null
  const { data: profile } = await args.supabase
    .from("venue_profiles")
    .select("id, venue_name")
    .eq("id", venueAccountId)
    .maybeSingle()
  if (profile?.venue_name) profileName = String(profile.venue_name)

  if (profileName) {
    const { data: byName } = await args.supabase
      .from("venues_v2")
      .select("id, name")
      .ilike("name", profileName)
      .limit(1)
      .maybeSingle()
    if (byName?.id) return byName.id
  }

  const slugBase = (profileName || "venue")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "venue"

  const { data: inserted, error } = await args.supabase
    .from("venues_v2")
    .insert({
      name: profileName || "Venue",
      slug: `${slugBase}-${venueAccountId.slice(0, 8)}`,
      created_by: args.userId,
    })
    .select("id")
    .single()

  if (error || !inserted?.id) {
    console.warn("[AdminTourEventOperations] venues_v2 bridge skipped:", error?.message)
    return null
  }
  return inserted.id
}

function eventSettingsFromInput(input: Partial<z.infer<typeof adminEventInputBaseSchema>>): Record<string, unknown> {
  const settings: Record<string, unknown> = {}
  const copy = (inputKey: keyof typeof input, settingKey: string = inputKey) => {
    if (!Object.prototype.hasOwnProperty.call(input, inputKey)) return
    const value = input[inputKey]
    settings[settingKey] = value === "" ? null : value
  }

  copy("event_type")
  copy("public_visibility")
  copy("description")
  copy("tags")
  copy("venue_name", "venue_label")
  copy("venue_address")
  copy("venue_room")
  copy("venue_contact_name")
  copy("venue_contact_email")
  copy("venue_contact_phone")
  copy("location")
  copy("doors_open")
  copy("curfew")
  copy("load_in_time")
  copy("sound_check_time")
  copy("sound_requirements")
  copy("lighting_requirements")
  copy("stage_requirements")
  copy("special_requirements")
  copy("set_times")
  if (input.ticket_price !== undefined) settings.ticket_price = input.ticket_price
  if (input.vip_price !== undefined) settings.vip_price = input.vip_price
  if (input.expected_revenue !== undefined) settings.expected_revenue = input.expected_revenue
  if (input.expected_expenses !== undefined) settings.expected_expenses = input.expected_expenses
  if (input.artist_ids !== undefined) {
    settings.artist_ids = input.artist_ids
    settings.artist_account_ids = input.artist_ids.filter((id) => isUuid(String(id)))
  }
  copy("staff_ids")
  copy("vendor_ids")
  if (Object.prototype.hasOwnProperty.call(input, "venue_id")) {
    // Builders attach venue_profiles ids; keep account link even when venues_v2 FK is resolved separately.
    settings.venue_account_id = input.venue_id && isUuid(String(input.venue_id)) ? input.venue_id : null
  }
  copy("stakeholders")
  copy("hospitality_rider")
  copy("technical_rider")
  copy("security_notes")
  copy("settlement_terms")
  copy("promoter_contact")
  copy("travel")
  copy("lodging")
  copy("equipment")
  copy("site_map")
  copy("supply_list")
  copy("documents")
  if (input.comps !== undefined) settings.comps = input.comps
  if (input.guest_list_budget !== undefined) settings.guest_list_budget = input.guest_list_budget
  copy("day_sheet_notes")
  copy("creation_source")
  copy("producer_intent")
  copy("template_key")
  copy("setup_checklist")
  copy("setup_context")
  return settings
}

function normalizeAssignments(input: {
  tourId?: string | null
  tourIds?: string[]
  assignments?: Array<z.infer<typeof tourAssignmentInputSchema>>
  primaryTourId?: string | null
}): Array<z.infer<typeof tourAssignmentInputSchema>> {
  const byTour = new Map<string, z.infer<typeof tourAssignmentInputSchema>>()

  if (input.tourId) byTour.set(input.tourId, { tour_id: input.tourId })
  for (const tourId of input.tourIds ?? []) byTour.set(tourId, { tour_id: tourId })
  for (const assignment of input.assignments ?? []) {
    byTour.set(assignment.tour_id, { ...byTour.get(assignment.tour_id), ...assignment })
  }

  const values = Array.from(byTour.values())
  const primaryTourId = input.primaryTourId ?? values.find((assignment) => assignment.is_primary)?.tour_id ?? values[0]?.tour_id
  return values.map((assignment, index) => ({
    ...assignment,
    ordinal: assignment.ordinal ?? index,
    is_primary: assignment.tour_id === primaryTourId,
  }))
}

export class AdminTourEventAuthError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "AdminTourEventAuthError"
    this.status = status
  }
}

export class AdminTourPublishReadinessError extends Error {
  status = 422
  readiness: ReturnType<typeof getTourReadiness>

  constructor(readiness: ReturnType<typeof getTourReadiness>) {
    super("Tour is not ready to publish.")
    this.name = "AdminTourPublishReadinessError"
    this.readiness = readiness
  }
}

export function getAdminTourEventErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof AdminTourEventAuthError) return error.status
  if (error instanceof AdminTourPublishReadinessError) return error.status
  if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "ZodError") return 400
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : ""
  if (message === "Event not found." || message === "Tour not found.") return 404
  return fallback
}

async function listUserOrgIds(supabase: SupabaseLike, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("org_members").select("org_id").eq("user_id", userId)
  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((row: { org_id?: string | null }) => row.org_id)
    .filter((orgId: string | null | undefined): orgId is string => Boolean(orgId))
}

async function resolveAuthorizedOrgId(args: {
  supabase: SupabaseLike
  userId: string
  requestedOrgId?: string | null
}): Promise<string | null> {
  const memberships = await listUserOrgIds(args.supabase, args.userId)
  const requestedOrgId = args.requestedOrgId?.trim() || null

  if (requestedOrgId) {
    if (!memberships.includes(requestedOrgId)) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }
    return requestedOrgId
  }

  if (memberships[0]) return memberships[0]
  return resolveAdminOrgIdForUser(args.supabase, args.userId)
}

async function assertUserCanAccessOrg(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string | null | undefined
  ownerUserId?: string | null
}): Promise<string> {
  if (args.orgId) {
    const memberships = await listUserOrgIds(args.supabase, args.userId)
    if (!memberships.includes(args.orgId)) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }
    return args.orgId
  }

  // Legacy rows without org_id remain accessible only to the owning admin.
  if (args.ownerUserId && args.ownerUserId === args.userId) return ""

  throw new AdminTourEventAuthError("Organization is not available to this admin account.")
}

async function assertToursInOrg(supabase: SupabaseLike, orgId: string, tourIds: string[]): Promise<void> {
  if (tourIds.length === 0) return
  const { data, error } = await supabase.from("tours").select("id").eq("org_id", orgId).in("id", tourIds)
  if (error) throw new Error(error.message)
  const found = new Set((data ?? []).map((row: { id: string }) => row.id))
  const missing = tourIds.filter((id) => !found.has(id))
  if (missing.length > 0) {
    throw new AdminTourEventAuthError("One or more tours are not available to this admin account.")
  }
}

async function assertTourInOrg(supabase: SupabaseLike, orgId: string, tourId: string): Promise<void> {
  await assertToursInOrg(supabase, orgId, [tourId])
}

async function assertEventInOrg(supabase: SupabaseLike, orgId: string, eventId: string): Promise<void> {
  const { data, error } = await supabase
    .from("events_v2")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) {
    throw new AdminTourEventAuthError("Event is not available to this admin account.")
  }
}

function readSettings(row: Record<string, unknown>): Record<string, unknown> {
  return row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
    ? (row.settings as Record<string, unknown>)
    : {}
}

function presentTour(row: Record<string, unknown>, events: unknown[] = []) {
  const settings = readSettings(row)
  const linkedShows = events.length
  const storedShows = typeof row.total_shows === "number" ? row.total_shows : 0
  const totalShows = linkedShows > 0 ? linkedShows : storedShows
  return {
    ...row,
    id: row.id,
    artist: settings.main_artist ?? settings.mainArtist ?? row.artist ?? row.main_artist ?? "Tour",
    main_artist: settings.main_artist ?? settings.mainArtist ?? row.main_artist ?? null,
    genre: settings.genre ?? null,
    cover_image: settings.cover_image ?? settings.coverImage ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    total_shows: totalShows,
    totalShows,
    completed_shows: row.completed_shows ?? 0,
    completedShows: row.completed_shows ?? 0,
    expected_revenue: row.revenue ?? row.expected_revenue ?? 0,
    readiness: getTourReadiness({
      name: typeof row.name === "string" ? row.name : "",
      main_artist: String(settings.main_artist ?? settings.mainArtist ?? row.main_artist ?? ""),
      artist_account_id:
        typeof row.artist_id === "string"
          ? row.artist_id
          : typeof settings.artist_account_id === "string"
            ? settings.artist_account_id
            : null,
      start_date: typeof row.start_date === "string" ? row.start_date : null,
      end_date: typeof row.end_date === "string" ? row.end_date : null,
      events: events as any[],
      route: Array.isArray(settings.route) ? (settings.route as any[]) : [],
      transportation: typeof settings.transportation === "object" && settings.transportation ? settings.transportation as Record<string, unknown> : {},
      accommodation: typeof settings.accommodation === "object" && settings.accommodation ? settings.accommodation as Record<string, unknown> : {},
      equipment: Array.isArray(settings.equipment) ? settings.equipment as Array<Record<string, unknown>> : [],
      crew_count: Array.isArray(settings.crew) ? settings.crew.length : 0,
      budget: row.budget as string | number | null,
    }),
    events,
  }
}

function presentEvent(row: Record<string, unknown>, tours: unknown[] = [], metrics?: { sold?: number; revenue?: number; expenses?: number }) {
  const settings = readSettings(row)
  const primaryTour = (tours as Array<{ id?: string; is_primary?: boolean }>).find((tour) => tour.is_primary) ?? tours[0] ?? null
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.title,
    title: row.title,
    description: typeof settings.description === "string" ? settings.description : "",
    status: mapV2StatusToUi(String(row.status ?? "inquiry")),
    event_date: row.start_at,
    event_time:
      typeof row.start_at === "string" && row.start_at.includes("T")
        ? row.start_at.slice(11, 16)
        : null,
    end_date: row.end_at,
    duration_minutes:
      typeof row.start_at === "string" && typeof row.end_at === "string"
        ? Math.max(0, Math.round((Date.parse(row.end_at) - Date.parse(row.start_at)) / 60000))
        : 0,
    venue_id: row.venue_id,
    venue_name: settings.venue_label ?? null,
    venue_address: settings.venue_address ?? null,
    venue_contact_name: settings.venue_contact_name ?? null,
    venue_contact_email: settings.venue_contact_email ?? null,
    venue_contact_phone: settings.venue_contact_phone ?? null,
    location: settings.location ?? null,
    capacity: row.capacity ?? 0,
    doors_open: settings.doors_open ?? null,
    curfew: settings.curfew ?? null,
    load_in_time: settings.load_in_time ?? null,
    sound_check_time: settings.sound_check_time ?? null,
    ticket_price: settings.ticket_price ?? 0,
    vip_price: settings.vip_price ?? 0,
    expected_revenue: settings.expected_revenue ?? 0,
    expected_expenses: settings.expected_expenses ?? 0,
    sound_requirements: settings.sound_requirements ?? null,
    lighting_requirements: settings.lighting_requirements ?? null,
    stage_requirements: settings.stage_requirements ?? null,
    special_requirements: settings.special_requirements ?? null,
    ordinal: (primaryTour as { ordinal?: number | null } | null)?.ordinal ?? null,
    market: (primaryTour as { market?: string | null } | null)?.market ?? null,
    leg_name: (primaryTour as { leg_name?: string | null } | null)?.leg_name ?? null,
    advance_status:
      (primaryTour as { advance_status?: string | null } | null)?.advance_status
      ?? "not_started",
    tickets_sold: metrics?.sold ?? 0,
    actual_revenue: metrics?.revenue ?? 0,
    expenses: metrics?.expenses ?? 0,
    tour: primaryTour,
    tours,
    created_at: row.created_at,
    settings,
    readiness: getEventReadiness({
      title: typeof row.title === "string" ? row.title : "",
      start_at: typeof row.start_at === "string" ? row.start_at : null,
      venue_name: typeof settings.venue_label === "string" ? settings.venue_label : null,
      venue_id: typeof row.venue_id === "string" ? row.venue_id : null,
      venue_account_id: typeof settings.venue_account_id === "string" ? settings.venue_account_id : null,
      capacity: row.capacity as string | number | null,
      tour_ids: (tours as Array<{ id?: string }>).map((tour) => String(tour.id)).filter(Boolean),
      primary_tour_id: primaryTour && typeof (primaryTour as { id?: unknown }).id === "string" ? (primaryTour as { id: string }).id : null,
      technical_rider: typeof settings.technical_rider === "string" ? settings.technical_rider : null,
      hospitality_rider: typeof settings.hospitality_rider === "string" ? settings.hospitality_rider : null,
      security_notes: typeof settings.security_notes === "string" ? settings.security_notes : null,
      promoter_contact: settings.promoter_contact,
      load_in_time: typeof settings.load_in_time === "string" ? settings.load_in_time : null,
      sound_check_time: typeof settings.sound_check_time === "string" ? settings.sound_check_time : null,
      settlement_terms: typeof settings.settlement_terms === "string" ? settings.settlement_terms : null,
      ticket_price: settings.ticket_price as string | number | null,
      staff_count: Array.isArray(settings.staff_ids) ? settings.staff_ids.length : 0,
      vendor_count: Array.isArray(settings.vendor_ids) ? settings.vendor_ids.length : 0,
      advance_status: typeof settings.advance_status === "string" ? settings.advance_status : null,
      expected_revenue: settings.expected_revenue as string | number | null,
      expected_expenses: settings.expected_expenses as string | number | null,
      team_count: [
        ...(Array.isArray(settings.artist_ids) ? settings.artist_ids : []),
        ...(Array.isArray(settings.staff_ids) ? settings.staff_ids : []),
        ...(Array.isArray(settings.vendor_ids) ? settings.vendor_ids : []),
      ].length,
    }),
  }
}

export class AdminTourEventOperationsService {
  static async resolveOrgId(args: {
    supabase: SupabaseLike
    userId: string
    tourId?: string | null
    requestedOrgId?: string | null
  }) {
    if (args.requestedOrgId !== undefined) {
      return resolveAuthorizedOrgId({
        supabase: args.supabase,
        userId: args.userId,
        requestedOrgId: args.requestedOrgId,
      })
    }
    return resolveAdminOrgIdForUser(args.supabase, args.userId, args.tourId)
  }

  static async listEvents(args: { supabase: SupabaseLike; userId: string; orgId?: string | null; status?: string | null }) {
    const orgId = await resolveAuthorizedOrgId({
      supabase: args.supabase,
      userId: args.userId,
      requestedOrgId: args.orgId,
    })
    if (!orgId) return []

    let query = args.supabase
      .from("events_v2")
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, org_id")
      .eq("org_id", orgId)
      .order("start_at", { ascending: false })
      .limit(200)

    if (args.status && args.status !== "all") query = query.eq("status", mapIncomingStatusToV2(args.status))

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows = data ?? []
    const eventIds = rows.map((event: { id: string }) => event.id)
    const [tourLinks, ticketSales, finances] = await Promise.all([
      eventIds.length
        ? args.supabase.from("tour_events").select("event_id, tour_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes, tours(id, name, status)").in("event_id", eventIds)
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? args.supabase.from("ticket_sales").select("event_id, quantity, total_amount").in("event_id", eventIds).eq("payment_status", "completed")
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? args.supabase.from("financial_transactions").select("event_id, type, amount").in("event_id", eventIds)
        : Promise.resolve({ data: [] }),
    ])

    const toursByEvent = new Map<string, unknown[]>()
    for (const link of tourLinks.data ?? []) {
      const eventTours = toursByEvent.get(link.event_id) ?? []
      eventTours.push({
        id: link.tour_id,
        name: link.tours?.name ?? "Tour",
        status: link.tours?.status ?? null,
        ordinal: link.ordinal,
        is_primary: Boolean(link.is_primary),
        leg_name: link.leg_name,
        market: link.market,
        advance_status: link.advance_status,
        routing_notes: link.routing_notes,
      })
      toursByEvent.set(link.event_id, eventTours)
    }

    const metrics = new Map<string, { sold: number; revenue: number; expenses: number }>()
    for (const sale of ticketSales.data ?? []) {
      const next = metrics.get(sale.event_id) ?? { sold: 0, revenue: 0, expenses: 0 }
      next.sold += Number(sale.quantity) || 0
      next.revenue += Number(sale.total_amount) || 0
      metrics.set(sale.event_id, next)
    }
    for (const finance of finances.data ?? []) {
      if (finance.type !== "expense") continue
      const next = metrics.get(finance.event_id) ?? { sold: 0, revenue: 0, expenses: 0 }
      next.expenses += Number(finance.amount) || 0
      metrics.set(finance.event_id, next)
    }

  return rows.map((row: Record<string, unknown>) => presentEvent(row, toursByEvent.get(String(row.id)) ?? [], metrics.get(String(row.id))))
  }

  static async getEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string
  }) {
    const { data, error } = await args.supabase
      .from("events_v2")
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, org_id, created_by")
      .eq("id", args.eventId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error("Event not found.")

    if (args.orgId && data.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Event is not available to the acting organization.")
    }

    const orgId = await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: data.org_id,
      ownerUserId: data.created_by,
    })

    const assignments = await this.getTourAssignments({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId: orgId || data.org_id,
    })
    return presentEvent(data, assignments)
  }

  static async createEvent(args: {
    supabase: SupabaseLike
    userId: string
    input: z.infer<typeof adminEventInputSchema>
    orgId?: string
  }) {
    const input = adminEventInputSchema.parse(args.input)
    const tourId = input.tour_id === "" || !input.tour_id ? null : input.tour_id
    const assignments = normalizeAssignments({
      tourId,
      tourIds: input.tour_ids,
      assignments: input.tour_assignments,
      primaryTourId: input.primary_tour_id,
    })
    const orgId = await resolveAuthorizedOrgId({
      supabase: args.supabase,
      userId: args.userId,
      requestedOrgId: args.orgId,
    })
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }
    await assertToursInOrg(args.supabase, orgId, assignments.map((assignment) => assignment.tour_id))

    const title = (input.title?.trim() || input.name?.trim() || "").slice(0, 500)
    const startAt = input.start_at?.trim() || combineDateTimeToIso(input.event_date, input.event_time)
    if (!startAt) throw new Error("Could not determine start time.")

    const settings = eventSettingsFromInput(input)
    settings.event_type ??= "live"
    settings.public_visibility ??= "private"
    const bridgedVenueId = await resolveVenuesV2IdForAccount({
      supabase: args.supabase,
      orgId,
      userId: args.userId,
      venueAccountId: input.venue_id,
      venueName: input.venue_name,
    })

    const slug = await buildUniqueEventSlug(args.supabase, orgId, title)
    const { data: inserted, error } = await args.supabase
      .from("events_v2")
      .insert({
        org_id: orgId,
        title,
        slug,
        status: mapIncomingStatusToV2(input.status ?? undefined),
        start_at: startAt,
        end_at: input.end_at?.trim()
          || (input.duration_minutes
            ? new Date(Date.parse(startAt) + input.duration_minutes * 60 * 1000).toISOString()
            : defaultEndAt(startAt)),
        venue_id: bridgedVenueId,
        capacity: parseCapacity(input.capacity),
        timezone: input.timezone || "UTC",
        created_by: args.userId,
        settings,
      })
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, org_id")
      .single()

    if (error || !inserted?.id) throw new Error(error?.message || "Failed to create event.")

    try {
      await this.replaceTourAssignments({
        supabase: args.supabase,
        orgId,
        eventId: inserted.id,
        assignments,
      })
    } catch (assignmentError) {
      await args.supabase.from("events_v2").delete().eq("id", inserted.id)
      throw assignmentError
    }

    await seedOperationalRecordsFromInput({
      supabase: args.supabase,
      userId: args.userId,
      eventId: inserted.id,
      orgId,
      input,
      eventStartAt: startAt,
    })

    return presentEvent(inserted, assignments.map((assignment) => ({ id: assignment.tour_id, ...assignment })))
  }

  static async updateEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    input: Partial<z.infer<typeof adminEventInputSchema>>
    orgId?: string
  }) {
    const { data: existing, error: existingError } = await args.supabase
      .from("events_v2")
      .select("id, org_id, settings, created_by, start_at, end_at")
      .eq("id", args.eventId)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error("Event not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Event is not available to the acting organization.")
    }

    const input = adminEventInputBaseSchema.partial().parse(args.input)

    const orgId = await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: existing.org_id,
      ownerUserId: existing.created_by,
    })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.title || input.name) patch.title = (input.title || input.name || "").trim()
    if (input.status) patch.status = mapIncomingStatusToV2(input.status)
    const existingStartMs = Date.parse(String(existing.start_at || ""))
    const existingEndMs = Date.parse(String(existing.end_at || ""))
    const existingDurationMs = Number.isFinite(existingStartMs)
      && Number.isFinite(existingEndMs)
      && existingEndMs > existingStartMs
      ? existingEndMs - existingStartMs
      : 2 * 60 * 60 * 1000
    const requestedDurationMs = input.duration_minutes && input.duration_minutes > 0
      ? input.duration_minutes * 60 * 1000
      : existingDurationMs

    let nextStart = String(existing.start_at || "")
    if (input.start_at) {
      nextStart = input.start_at
    } else if (input.event_date) {
      const existingTime = Number.isFinite(existingStartMs)
        ? new Date(existingStartMs).toISOString().slice(11, 16)
        : "00:00"
      nextStart = combineDateTimeToIso(
        input.event_date,
        input.event_time || existingTime,
      ) || ""
    }

    if (input.start_at || input.event_date) {
      const nextStartMs = Date.parse(nextStart)
      if (!Number.isFinite(nextStartMs)) throw new Error("Event start time is invalid.")
      patch.start_at = new Date(nextStartMs).toISOString()
      patch.end_at = input.end_at
        ? new Date(input.end_at).toISOString()
        : new Date(nextStartMs + requestedDurationMs).toISOString()
    } else if (input.end_at) {
      patch.end_at = new Date(input.end_at).toISOString()
    } else if (input.duration_minutes && Number.isFinite(existingStartMs)) {
      patch.end_at = new Date(existingStartMs + requestedDurationMs).toISOString()
    }

    if (input.start_at || input.event_date || input.end_at || input.duration_minutes) {
      const effectiveStartMs = Date.parse(String(patch.start_at || existing.start_at || ""))
      const effectiveEndMs = Date.parse(String(patch.end_at || existing.end_at || ""))
      if (!Number.isFinite(effectiveEndMs) || effectiveEndMs <= effectiveStartMs) {
        throw new Error("Event end time must be after its start time.")
      }
    }
    if ("venue_id" in input) {
      const bridgedVenueId = await resolveVenuesV2IdForAccount({
        supabase: args.supabase,
        orgId: orgId || existing.org_id,
        userId: args.userId,
        venueAccountId: input.venue_id,
        venueName: input.venue_name,
      })
      patch.venue_id = bridgedVenueId
    }
    if ("capacity" in input) patch.capacity = parseCapacity(input.capacity)
    patch.settings = { ...(existing.settings ?? {}), ...eventSettingsFromInput(input) }

    if (input.tour_id !== undefined || input.tour_ids !== undefined || input.tour_assignments !== undefined || input.primary_tour_id !== undefined) {
      if (!orgId && !existing.org_id) {
        throw new AdminTourEventAuthError("Organization is not available to this admin account.")
      }
      const tourId = input.tour_id === "" || !input.tour_id ? null : input.tour_id
      await this.replaceTourAssignments({
        supabase: args.supabase,
        orgId: orgId || existing.org_id,
        eventId: args.eventId,
        assignments: normalizeAssignments({
          tourId,
          tourIds: input.tour_ids,
          assignments: input.tour_assignments,
          primaryTourId: input.primary_tour_id,
        }),
      })
    }

    let updateQuery = args.supabase
      .from("events_v2")
      .update(patch)
      .eq("id", args.eventId)
    if (existing.org_id) updateQuery = updateQuery.eq("org_id", existing.org_id)
    const { data, error } = await updateQuery
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, org_id")
      .single()
    if (error) throw new Error(error.message)

    await seedOperationalRecordsFromInput({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId: orgId || existing.org_id,
      input,
      eventStartAt: typeof data?.start_at === "string" ? data.start_at : null,
    })

    return presentEvent(data)
  }

  static async deleteEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string
  }) {
    const { data: existing, error: existingError } = await args.supabase
      .from("events_v2")
      .select("id, org_id, created_by")
      .eq("id", args.eventId)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error("Event not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Event is not available to the acting organization.")
    }

    await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: existing.org_id,
      ownerUserId: existing.created_by,
    })

    await args.supabase.from("tour_events").delete().eq("event_id", args.eventId)
    const { error } = await args.supabase.from("events_v2").delete().eq("id", args.eventId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  static async replaceTourAssignments(args: {
    supabase: SupabaseLike
    orgId: string
    eventId: string
    assignments: Array<z.infer<typeof tourAssignmentInputSchema>>
  }) {
    if (!args.orgId) throw new AdminTourEventAuthError("Organization is not available to this admin account.")

    const normalized = normalizeAssignments({ assignments: args.assignments })
    await assertEventInOrg(args.supabase, args.orgId, args.eventId)
    await assertToursInOrg(args.supabase, args.orgId, normalized.map((assignment) => assignment.tour_id))

    const { error: deleteError } = await args.supabase.from("tour_events").delete().eq("event_id", args.eventId)
    if (deleteError) throw new Error(deleteError.message)
    if (normalized.length === 0) return []

    const rows = normalized.map((assignment, index) => ({
      tour_id: assignment.tour_id,
      event_id: args.eventId,
      ordinal: assignment.ordinal ?? index,
      is_primary: Boolean(assignment.is_primary),
      leg_name: assignment.leg_name ?? null,
      market: assignment.market ?? null,
      advance_status: assignment.advance_status ?? "not_started",
      routing_notes: assignment.routing_notes ?? null,
    }))

    const { data, error } = await args.supabase.from("tour_events").insert(rows).select("*")
    if (error) throw new Error(error.message)
    return data ?? []
  }

  static async getTourAssignments(args: {
    supabase: SupabaseLike
    userId: string
    eventId?: string
    tourId?: string
    orgId: string
  }) {
    // orgId is required; empty string is reserved for legacy owner rows without org_id.
    if (args.orgId === undefined || args.orgId === null) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    let query = args.supabase
      .from("tour_events")
      .select("event_id, tour_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes, tours(id, name, status, org_id)")
      .order("ordinal", { ascending: true })
    if (args.eventId) query = query.eq("event_id", args.eventId)
    if (args.tourId) query = query.eq("tour_id", args.tourId)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows = data ?? []
    const scoped = args.orgId
      ? rows.filter((link: any) => !link.tours || link.tours.org_id === undefined || link.tours.org_id === args.orgId)
      : rows

    return scoped.map((link: any) => ({
      id: link.tour_id,
      name: link.tours?.name ?? "Tour",
      status: link.tours?.status ?? null,
      event_id: link.event_id,
      tour_id: link.tour_id,
      ordinal: link.ordinal,
      is_primary: Boolean(link.is_primary),
      leg_name: link.leg_name,
      market: link.market,
      advance_status: link.advance_status,
      routing_notes: link.routing_notes,
    }))
  }

  static async assertAdminEventAccess(args: { supabase: SupabaseLike; userId: string; eventId: string }) {
    return this.getEvent(args)
  }

  static async assertAdminTourAccess(args: { supabase: SupabaseLike; userId: string; tourId: string }) {
    return this.getTour(args)
  }

  static async addTourAssignment(args: {
    supabase: SupabaseLike
    orgId: string
    eventId: string
    assignment: z.infer<typeof tourAssignmentInputSchema>
  }) {
    if (!args.orgId) throw new AdminTourEventAuthError("Organization is not available to this admin account.")

    const assignment = tourAssignmentInputSchema.parse(args.assignment)
    await assertTourInOrg(args.supabase, args.orgId, assignment.tour_id)
    await assertEventInOrg(args.supabase, args.orgId, args.eventId)

    const row = {
      tour_id: assignment.tour_id,
      event_id: args.eventId,
      ordinal: assignment.ordinal ?? null,
      is_primary: Boolean(assignment.is_primary),
      leg_name: assignment.leg_name ?? null,
      market: assignment.market ?? null,
      advance_status: assignment.advance_status ?? "not_started",
      routing_notes: assignment.routing_notes ?? null,
    }

    const { data: existing, error: lookupError } = await args.supabase
      .from("tour_events")
      .select("tour_id, event_id")
      .eq("tour_id", assignment.tour_id)
      .eq("event_id", args.eventId)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)

    if (assignment.is_primary) {
      await args.supabase.from("tour_events").update({ is_primary: false }).eq("event_id", args.eventId)
    }

    const result = existing
      ? await args.supabase.from("tour_events").update(row).eq("tour_id", assignment.tour_id).eq("event_id", args.eventId).select("*").single()
      : await args.supabase.from("tour_events").insert(row).select("*").single()

    if (result.error) throw new Error(result.error.message)
    return result.data
  }

  static async detachTourAssignment(args: {
    supabase: SupabaseLike
    eventId: string
    tourId: string
    orgId: string
  }) {
    if (!args.orgId) throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    await assertEventInOrg(args.supabase, args.orgId, args.eventId)
    await assertTourInOrg(args.supabase, args.orgId, args.tourId)

    const { error } = await args.supabase
      .from("tour_events")
      .delete()
      .eq("event_id", args.eventId)
      .eq("tour_id", args.tourId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  static async reconcileTourAssignments(args: {
    supabase: SupabaseLike
    orgId: string
    tourId: string
    assignments: Array<z.infer<typeof tourStopAssignmentSchema>>
  }) {
    if (!args.orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    const normalized = args.assignments
      .map((assignment) => tourStopAssignmentSchema.parse(assignment))
      .sort((left, right) => (left.ordinal ?? Number.MAX_SAFE_INTEGER) - (right.ordinal ?? Number.MAX_SAFE_INTEGER))
    if (normalized.length > 500) throw new Error("A tour cannot contain more than 500 stops.")
    await assertTourInOrg(args.supabase, args.orgId, args.tourId)
    await Promise.all(
      normalized.map((assignment) =>
        assertEventInOrg(args.supabase, args.orgId, assignment.event_id),
      ),
    )

    const links = normalized.map((assignment, index) => ({
      event_id: assignment.event_id,
      ordinal: index,
      is_primary: Boolean(assignment.is_primary),
      leg_name: assignment.leg_name ?? null,
      market: assignment.market ?? null,
      advance_status: assignment.advance_status ?? "not_started",
      routing_notes: assignment.routing_notes ?? null,
    }))

    const { data, error } = await args.supabase.rpc("reconcile_admin_tour_events", {
      p_org_id: args.orgId,
      p_tour_id: args.tourId,
      p_links: links,
    })
    if (error) throw new Error(error.message)
    return data ?? []
  }

  static async listTours(args: { supabase: SupabaseLike; userId: string; orgId?: string | null; status?: string | null }) {
    const orgId = await resolveAuthorizedOrgId({
      supabase: args.supabase,
      userId: args.userId,
      requestedOrgId: args.orgId,
    })
    if (!orgId) return []

    const applyStatus = (query: any) => {
      if (!args.status || args.status === "all") return query
      const statuses = args.status.split(",").map((value) => value.trim()).filter(Boolean)
      return statuses.length > 1 ? query.in("status", statuses) : query.eq("status", args.status)
    }

    const orgResult = await applyStatus(
      args.supabase
        .from("tours")
        .select("*")
        .eq("org_id", orgId)
        .order("start_date", { ascending: true, nullsFirst: false }),
    )

    if (orgResult.error) throw new Error(orgResult.error.message)

    const tours = (orgResult.data ?? []) as Array<Record<string, unknown>>
    const tourIds = tours.map((tour) => String(tour.id))
    let links: any[] = []
    if (tourIds.length) {
      const { data: linkRows, error: linkError } = await args.supabase
        .from("tour_events")
        .select("tour_id, ordinal, is_primary, events_v2(id, title, status, start_at, end_at, venue_id, settings, capacity)")
        .in("tour_id", tourIds)
        .order("ordinal", { ascending: true })
      // tour_events / events_v2 may be missing on older environments; still return tours.
      if (!linkError) links = linkRows ?? []
    }

    const eventsByTour = new Map<string, unknown[]>()
    for (const link of links) {
      const event = link.events_v2
      if (!event) continue
      const events = eventsByTour.get(link.tour_id) ?? []
      events.push(presentEvent(event, [{ id: link.tour_id, ordinal: link.ordinal, is_primary: link.is_primary }]))
      eventsByTour.set(link.tour_id, events)
    }
    return tours.map((tour) => presentTour(tour, eventsByTour.get(String(tour.id)) ?? []))
  }

  static async getTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
  }) {
    const { data: tour, error } = await args.supabase.from("tours").select("*").eq("id", args.tourId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!tour) throw new Error("Tour not found.")

    if (args.orgId && tour.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Tour is not available to the acting organization.")
    }

    await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: tour.org_id,
      ownerUserId: tour.created_by ?? tour.user_id,
    })

    const { data: links, error: linkError } = await args.supabase
      .from("tour_events")
      .select("tour_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes, events_v2(id, title, status, start_at, end_at, venue_id, settings, capacity)")
      .eq("tour_id", args.tourId)
      .order("ordinal", { ascending: true })
    if (linkError) throw new Error(linkError.message)

    const events = (links ?? [])
      .filter((link: any) => Boolean(link.events_v2))
      .map((link: any) =>
        presentEvent(link.events_v2, [
          {
            id: args.tourId,
            ordinal: link.ordinal,
            is_primary: link.is_primary,
            leg_name: link.leg_name,
            market: link.market,
            advance_status: link.advance_status,
            routing_notes: link.routing_notes,
          },
        ])
      )

    return presentTour(tour, events)
  }

  static async createTour(args: {
    supabase: SupabaseLike
    userId: string
    input: z.input<typeof adminTourInputSchema>
    orgId?: string
  }) {
    const input = adminTourInputSchema.parse(args.input)
    const orgId = await resolveAuthorizedOrgId({
      supabase: args.supabase,
      userId: args.userId,
      requestedOrgId: args.orgId,
    })
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }
    const slug = input.slug || (await buildUniqueTourSlug(args.supabase, orgId, input.name))
    const incomingRoute = Array.isArray(input.routing)
      ? input.routing
      : Array.isArray(input.settings?.route)
        ? (input.settings.route as unknown[])
        : []
    const settings = {
      ...(input.settings ?? {}),
      main_artist: input.main_artist ?? null,
      genre: input.genre ?? null,
      cover_image: input.cover_image ?? null,
      markets: input.markets ?? [],
      route: incomingRoute,
      ...(input.artist_id ? { artist_account_id: input.artist_id, artist_account_ids: [input.artist_id] } : {}),
    }

    const { data: tour, error } = await args.supabase
      .from("tours")
      .insert({
        org_id: orgId,
        name: input.name,
        slug,
        description: input.description ?? null,
        // Activation is a separate, readiness-gated command.
        status: input.status === "active" ? "planning" : input.status ?? "planning",
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        budget: parseNumber(input.budget),
        revenue: parseNumber(input.revenue),
        expenses: parseNumber(input.expenses),
        settings,
        ...(input.artist_id ? { artist_id: input.artist_id } : {}),
        created_by: args.userId,
        // Legacy column still used by older RLS/policies and UI paths
        user_id: args.userId,
      })
      .select("*")
      .single()
    if (error || !tour?.id) throw new Error(error?.message || "Failed to create tour.")

    if (input.event_ids !== undefined || input.events !== undefined) {
      return this.updateTour({
        supabase: args.supabase,
        userId: args.userId,
        orgId,
        tourId: tour.id,
        input: {
          ...input,
          status: input.status === "active" ? "planning" : input.status,
        },
      })
    }

    return presentTour(tour)
  }

  static async updateTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    input: Partial<z.input<typeof adminTourInputSchema>> & Record<string, unknown>
    orgId?: string
  }) {
    // Accept management-page payloads that may include extra UI-only fields.
    // Known fields are never allowed to fall back to unvalidated raw values.
    const input = adminTourInputSchema.partial().parse(args.input)
    const raw = args.input ?? {}

    const { data: existing, error: lookupError } = await args.supabase
      .from("tours")
      .select("id, org_id, settings, created_by, user_id, status")
      .eq("id", args.tourId)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (!existing) throw new Error("Tour not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Tour is not available to the acting organization.")
    }

    await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: existing.org_id,
      ownerUserId: existing.created_by ?? existing.user_id,
    })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ["name", "description", "status", "start_date", "end_date"] as const) {
      if (key in input) patch[key] = input[key] ?? null
      else if (key in raw) patch[key] = raw[key] ?? null
    }
    if (patch.status === "active" && existing.status !== "active") {
      throw new AdminTourEventAuthError(
        "Use the publish action to activate a tour after readiness validation.",
        409,
      )
    }
    if ("budget" in input || "budget" in raw) patch.budget = parseNumber(input.budget ?? raw.budget)
    if ("revenue" in input || "revenue" in raw || "expected_revenue" in raw) {
      patch.revenue = parseNumber(input.revenue ?? raw.revenue ?? raw.expected_revenue)
    }
    if ("expenses" in input || "expenses" in raw) patch.expenses = parseNumber(input.expenses ?? raw.expenses)
    if ("crew_size" in raw) patch.crew_size = parseNumber(raw.crew_size)
    if ("transportation" in raw) patch.transportation = raw.transportation ?? null
    if ("accommodation" in raw) patch.accommodation = raw.accommodation ?? null
    if ("equipment_requirements" in raw) patch.equipment_requirements = raw.equipment_requirements ?? null

    // Keep ownership columns populated for legacy policies/UI.
    if (!existing.created_by) patch.created_by = args.userId
    if (!existing.user_id) patch.user_id = args.userId
    if (!existing.org_id) {
      const resolvedOrgId = await resolveAuthorizedOrgId({
        supabase: args.supabase,
        userId: args.userId,
      })
      if (resolvedOrgId) patch.org_id = resolvedOrgId
    }

    const mainArtist = input.main_artist ?? raw.main_artist ?? raw.artist
    const incomingRoute = Array.isArray(input.routing)
      ? input.routing
      : Array.isArray(raw.routing)
        ? raw.routing
        : Array.isArray((input.settings as Record<string, unknown> | undefined)?.route)
          ? (input.settings as Record<string, unknown>).route
          : Array.isArray((raw.settings as Record<string, unknown> | undefined)?.route)
            ? (raw.settings as Record<string, unknown>).route
            : undefined

    if (input.artist_id !== undefined) patch.artist_id = input.artist_id
    patch.settings = {
      ...(existing.settings ?? {}),
      ...(input.settings ?? {}),
      ...(typeof raw.settings === "object" && raw.settings && !Array.isArray(raw.settings) ? raw.settings : {}),
      ...(mainArtist !== undefined ? { main_artist: mainArtist } : {}),
      ...(input.artist_id
        ? { artist_account_id: input.artist_id, artist_account_ids: [input.artist_id] }
        : {}),
      ...(input.genre !== undefined || raw.genre !== undefined ? { genre: input.genre ?? raw.genre } : {}),
      ...(input.cover_image !== undefined || raw.cover_image !== undefined
        ? { cover_image: input.cover_image ?? raw.cover_image }
        : {}),
      ...(input.cover_image_url !== undefined || raw.cover_image_url !== undefined
        ? { cover_image: input.cover_image_url ?? raw.cover_image_url }
        : {}),
      ...(input.markets !== undefined ? { markets: input.markets } : {}),
      ...(incomingRoute !== undefined ? { route: incomingRoute } : {}),
    }

    const { data, error } = await args.supabase.from("tours").update(patch).eq("id", args.tourId).select("*").single()
    if (error) throw new Error(error.message)

    const orgId = String(existing.org_id || data?.org_id || "")
    const exactStopsRequested = input.event_ids !== undefined || input.events !== undefined
    if (orgId && exactStopsRequested) {
      const { data: currentLinks, error: currentLinksError } = await args.supabase
        .from("tour_events")
        .select("event_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes")
        .eq("tour_id", args.tourId)
      if (currentLinksError) throw new Error(currentLinksError.message)

      const existingByEvent = new Map<string, any>(
        (currentLinks ?? []).map((link: any) => [String(link.event_id), link]),
      )
      const desiredByEvent = new Map<string, z.infer<typeof tourStopAssignmentSchema>>()

      for (const [index, eventInput] of (input.events ?? []).entries()) {
        let eventId = eventInput.id && isUuid(eventInput.id) ? eventInput.id : null
        if (eventId) {
          await assertEventInOrg(args.supabase, orgId, eventId)
          await this.updateEvent({
            supabase: args.supabase,
            userId: args.userId,
            orgId,
            eventId,
            input: {
              name: eventInput.name,
              event_date: eventInput.date,
              event_time: eventInput.time,
              venue_name: eventInput.venue,
              capacity: eventInput.capacity,
            },
          })
        } else {
          const created = await this.createEvent({
            supabase: args.supabase,
            userId: args.userId,
            orgId,
            input: {
              name: eventInput.name,
              description: eventInput.description,
              event_date: eventInput.date,
              event_time: eventInput.time,
              venue_name: eventInput.venue,
              capacity: eventInput.capacity,
            },
          })
          eventId = String((created as { id?: string }).id || "")
          if (!eventId) throw new Error("Created tour stop did not return an event ID.")
        }

        desiredByEvent.set(eventId, {
          event_id: eventId,
          tour_id: args.tourId,
          ordinal: eventInput.ordinal ?? index,
          market: eventInput.market ?? null,
          leg_name: eventInput.leg_name ?? null,
          advance_status: eventInput.advance_status,
          is_primary: true,
        })
      }

      for (const eventId of input.event_ids ?? []) {
        if (desiredByEvent.has(eventId)) continue
        await assertEventInOrg(args.supabase, orgId, eventId)
        const prior = existingByEvent.get(eventId)
        desiredByEvent.set(eventId, {
          event_id: eventId,
          tour_id: args.tourId,
          ordinal: prior?.ordinal ?? desiredByEvent.size,
          market: prior?.market ?? null,
          leg_name: prior?.leg_name ?? null,
          advance_status: prior?.advance_status ?? "not_started",
          routing_notes: prior?.routing_notes ?? null,
          is_primary: prior?.is_primary ?? true,
        })
      }

      await this.reconcileTourAssignments({
        supabase: args.supabase,
        orgId,
        tourId: args.tourId,
        assignments: Array.from(desiredByEvent.values()),
      })
    }

    const { data: links, error: linksError } = await args.supabase
      .from("tour_events")
      .select("tour_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes, events_v2(id, title, status, start_at, end_at, venue_id, settings, capacity)")
      .eq("tour_id", args.tourId)
      .order("ordinal", { ascending: true })
    if (linksError) throw new Error(linksError.message)

    const linkedEvents = (links ?? [])
      .filter((link: any) => Boolean(link.events_v2))
      .map((link: any) =>
        presentEvent(link.events_v2, [
          {
            id: args.tourId,
            ordinal: link.ordinal,
            is_primary: link.is_primary,
            leg_name: link.leg_name,
            market: link.market,
            advance_status: link.advance_status,
            routing_notes: link.routing_notes,
          },
        ])
      )

    if (exactStopsRequested) {
      const canonicalRoute = (links ?? [])
        .filter((link: any) => Boolean(link.events_v2))
        .map((link: any, index: number) => {
          const event = link.events_v2
          const eventSettings = readSettings(event)
          return {
            order: index + 1,
            name: event.title,
            venue: eventSettings.venue_label ?? "",
            date: typeof event.start_at === "string" ? event.start_at.slice(0, 10) : "",
            time: typeof event.start_at === "string" ? event.start_at.slice(11, 16) : null,
            market: link.market ?? null,
            leg_name: link.leg_name ?? null,
            capacity: event.capacity ?? null,
            advance_status: link.advance_status ?? "not_started",
            event_id: event.id,
          }
        })
      const nextSettings = {
        ...(data.settings && typeof data.settings === "object" ? data.settings : {}),
        route: canonicalRoute,
      }
      const { error: settingsError } = await args.supabase
        .from("tours")
        .update({ settings: nextSettings })
        .eq("id", args.tourId)
        .eq("org_id", orgId)
      if (settingsError) throw new Error(settingsError.message)
      data.settings = nextSettings
    }

    return presentTour(data, linkedEvents)
  }

  static async deleteTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
  }) {
    const { data: existing, error: lookupError } = await args.supabase
      .from("tours")
      .select("id, org_id, created_by, user_id")
      .eq("id", args.tourId)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (!existing) throw new Error("Tour not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Tour is not available to the acting organization.")
    }

    await assertUserCanAccessOrg({
      supabase: args.supabase,
      userId: args.userId,
      orgId: existing.org_id,
      ownerUserId: existing.created_by ?? existing.user_id,
    })

    // Detach only — never cascade-delete events_v2 rows.
    await args.supabase.from("tour_events").delete().eq("tour_id", args.tourId)
    const { error } = await args.supabase.from("tours").delete().eq("id", args.tourId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  static async publishEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string
  }) {
    const event = await this.updateEvent({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId: args.orgId,
      input: { status: "confirmed" },
    })

    try {
      await args.supabase.from("work_mode_publications").insert({
        event_id: args.eventId,
        publication_type: "event_publish",
        title: `Event published: ${String((event as { name?: string; title?: string }).name || (event as { title?: string }).title || "Event")}`,
        payload: {
          event_id: args.eventId,
          status: "confirmed",
        },
        published_by: args.userId,
        published_at: new Date().toISOString(),
      })
    } catch (error) {
      console.warn("[AdminTourEventOperations] event work-mode publish skipped:", error)
    }

    return event
  }

  static async publishTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
  }) {
    const tour = await this.getTour({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })
    const readiness = (tour as { readiness: ReturnType<typeof getTourReadiness> }).readiness
    const hasCriticalConflicts = readiness.conflicts.some(
      (conflict) => conflict.severity === "critical",
    )
    if (readiness.blockers.length > 0 || hasCriticalConflicts) {
      throw new AdminTourPublishReadinessError(readiness)
    }

    const orgId = String((tour as { org_id?: string }).org_id || args.orgId || "")
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    const { error } = await args.supabase.rpc("publish_admin_tour", {
      p_org_id: orgId,
      p_tour_id: args.tourId,
      p_actor_user_id: args.userId,
    })
    if (error) throw new Error(error.message)

    return this.getTour({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
    })
  }

  static async createTourFromPlanner(args: { supabase: SupabaseLike; userId: string; input: z.infer<typeof plannerTourInputSchema> }) {
    const input = plannerTourInputSchema.parse(args.input)
    const expenses = input.step6.budget.expenses.reduce((sum, expense) => sum + (parseNumber(expense.amount) ?? 0), 0)
    const equipmentCost = input.step5.equipment.reduce((sum, item) => sum + (parseNumber(item.cost) ?? 0), 0)
    const tour = await this.createTour({
      supabase: args.supabase,
      userId: args.userId,
      input: {
        name: input.step1.name,
        description: input.step1.description,
        main_artist: input.step1.mainArtist,
        genre: input.step1.genre,
        cover_image: input.step1.coverImage,
        start_date: input.step2.startDate,
        end_date: input.step2.endDate,
        budget: input.step6.budget.total,
        expenses: expenses + equipmentCost + (parseNumber(input.step5.transportation["cost"]) ?? 0) + (parseNumber(input.step5.accommodation["cost"]) ?? 0),
        settings: {
          route: input.step2.route,
          artists: input.step4.artists,
          crew: input.step4.crew,
          transportation: input.step5.transportation,
          accommodation: input.step5.accommodation,
          equipment: input.step5.equipment,
          ticketTypes: input.step6.ticketTypes,
          sponsors: input.step6.sponsors,
        },
        events: input.step3.events,
      },
    })
    return tour
  }
}
