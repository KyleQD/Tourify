import "server-only"

import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

import { buildUniqueEventSlug, mapIncomingStatusToV2, mapV2StatusToUi } from "@/app/api/events/_lib/events-v2-admin"
import { resolveAdminOrgIdForUser } from "@/app/api/events/_lib/admin-event-persistence"
import { getEventReadiness, getTourReadiness } from "@/lib/admin/operations-readiness"
import {
  requireTourAccess,
  requireTourCapability,
  TourAccessDeniedError,
  TourCapabilityDeniedError,
} from "@/lib/admin/tour-access.service"
import {
  EventAccessDeniedError,
  EventCapabilityDeniedError,
  requireEventAccess,
  requireEventCapability,
} from "@/lib/admin/event-access.service"
import {
  normalizeEventSetupFields,
  readEventSetupFromSettings,
} from "@/lib/admin/event-setup-fields"
import {
  buildEventSetupChecklist,
  mergeSetupChecklistIntoSettings,
} from "@/lib/admin/event-setup-checklist"
import {
  buildEventVersionConflictDiff,
  EventVersionConflictError,
} from "@/lib/admin/event-version-diff"
import {
  applyTourPortfolioQuery,
  parseTourPortfolioQuery,
  type TourPortfolioPage,
  type TourPortfolioQueryInput,
  type TourPortfolioRow,
  TourPortfolioQueryError,
} from "@/lib/admin/tour-portfolio-query"
import {
  applyEventPortfolioQuery,
  parseEventPortfolioQuery,
  type EventPortfolioPage,
  type EventPortfolioQueryInput,
  type EventPortfolioRow,
} from "@/lib/admin/event-portfolio-query"
import {
  buildAttentionIssues,
  defaultPublicationSummary,
  summarizeReadiness,
  type AttentionIssueDTO,
} from "@/lib/admin/admin-operations-contracts"
import {
  actorCanViewAllOrgTours,
  buildAccessibleTourIdSet,
  filterTourPortfolioByAccess,
} from "@/lib/admin/tour-portfolio-visibility"
import { loadTourTagsByTourIds, replaceTourTags } from "@/lib/admin/tour-tags.service"
import {
  assertTourStopReconcileMode,
  planTourStopReconciliation,
  type TourStopReconcileMode,
  type TourStopReconcilePlan,
} from "@/lib/admin/tour-stop-reconciliation"
import {
  assertStateAllowsAction,
  assertTourMutationAllowed,
  StateAwareAuthDeniedError,
} from "@/lib/admin/state-aware-authorization"
import {
  buildTourMetadataConflictDiff,
  TourMetadataVersionConflictError,
} from "@/lib/admin/tour-metadata-version-diff"
import {
  assertTourHardDeleteEligible,
  TourDeleteEligibilityError,
} from "@/lib/admin/tour-delete-eligibility"
import { logAuditEvent } from "@/lib/audit"
import { commitDomainWithOutbox } from "@/lib/admin/publication-outbox.service"
import { buildPublicationOutboxIdempotencyKey } from "@/lib/admin/publication-outbox"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

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
    venue_city: z.string().optional().nullable(),
    venue_state: z.string().optional().nullable(),
    venue_postal_code: z.string().optional().nullable(),
    venue_country: z.string().optional().nullable(),
    venue_website: z.string().optional().nullable(),
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
    age_restriction: z.string().max(120).optional().nullable(),
    age_restrictions: z.string().max(120).optional().nullable(),
    ops_owner_user_id: z.string().uuid().optional().nullable(),
    department_owner: z.string().max(120).optional().nullable(),
    production_windows: z.record(z.unknown()).optional().nullable(),
    sound_requirements: z.string().max(5000).optional().nullable(),
    lighting_requirements: z.string().max(5000).optional().nullable(),
    stage_requirements: z.string().max(5000).optional().nullable(),
    special_requirements: z.string().max(5000).optional().nullable(),
    set_times: z.array(z.record(z.unknown())).optional(),
    ticket_price: z.number().optional(),
    vip_price: z.number().optional(),
    /** TIX-105 — incomplete | not_ticketed | explicit_setup; never invents inventory. */
    ticketing_setup: z.enum(["incomplete", "not_ticketed", "explicit_setup"]).optional(),
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
    quick_start_placeholder: z.boolean().optional(),
    quick_start_label: z.string().max(120).optional().nullable(),
    quick_start_completed_at: z.string().optional().nullable(),
    /** EVENT-104 optimistic concurrency — client must send current event_version to avoid silent overwrite. */
    expected_version: z.number().int().positive().optional(),
    event_version: z.number().int().positive().optional(),
    /** Client's last known tour-plan touch timestamp for conflict messaging. */
    tour_plan_touched_at: z.string().optional().nullable(),
    schedule_details: z.record(z.unknown()).optional().nullable(),
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
  /** PLAN-103 — how omitted stops are handled (default exact). */
  reconcile_mode: z.enum(["exact", "merge", "attach_only"]).optional(),
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
  /** TOUR-201 optimistic concurrency — send current metadata_version to avoid silent overwrite. */
  expected_version: z.number().int().positive().optional(),
  metadata_version: z.number().int().positive().optional(),
  /** TOUR-209 — portfolio owner / lead + tag links. */
  owner_user_id: z.string().uuid().optional().nullable(),
  lead_user_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),
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

/**
 * PLAN-105 — Builder records setup intent only.
 * Does NOT invent staff_shifts or ticket inventory. Those require
 * explicit reviewed provisioning via provisionEventOperations.
 */
async function recordSetupIntentFromInput(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string | null
  input: Partial<z.infer<typeof adminEventInputBaseSchema>>
  eventStartAt?: string | null
}) {
  const { artistIds, staffIds, vendorEntries, artists, crew } = readSetupSelections(args.input)
  const ticketPrice = typeof args.input.ticket_price === "number" ? args.input.ticket_price : null
  const vipPrice = typeof args.input.vip_price === "number" ? args.input.vip_price : null

  const { data: eventRow, error: loadError } = await args.supabase
    .from("events_v2")
    .select("id, settings")
    .eq("id", args.eventId)
    .maybeSingle()
  if (loadError) {
    console.warn("[AdminTourEventOperations] setup intent load skipped:", loadError.message)
    return
  }

  const settings = readSettings(eventRow || {})
  const setupIntent = {
    recorded_at: new Date().toISOString(),
    recorded_by: args.userId,
    artists: artistIds.map((id) => {
      const meta = artists.find((item: any) => String(item?.id) === id) as any
      return { id, label: meta?.label || null, role: meta?.meta || null }
    }),
    crew: staffIds.map((id) => {
      const meta = crew.find((item: any) => String(item?.id) === id) as any
      return { id, label: meta?.label || null, role: meta?.meta || null }
    }),
    vendors: vendorEntries.map((vendor) => ({
      id: vendor.id,
      label: vendor.label || null,
      service_type: vendor.meta || null,
    })),
    ticketing_intent: {
      general_admission_price: ticketPrice,
      vip_price: vipPrice,
      // No quantities — inventory requires explicit provision command.
    },
    staffing_intent: {
      event_start_at: args.eventStartAt || null,
      // Shifts require explicit provision command (PLAN-105).
      proposed_staff_ids: staffIds,
    },
    status: "intent_only",
  }

  const { error } = await args.supabase
    .from("events_v2")
    .update({
      settings: {
        ...settings,
        setup_intent: setupIntent,
      },
    })
    .eq("id", args.eventId)
  if (error) console.warn("[AdminTourEventOperations] setup intent save skipped:", error.message)

  // Soft party invites remain allowed (not inventory/shifts).
  for (const [index, artistId] of artistIds.entries()) {
    if (!isUuid(artistId)) continue
    const artistMeta = artists.find((item: any) => String(item?.id) === artistId) as any
    const role = index === 0 ? "headliner" : "support"
    const { error: participantError } = await args.supabase.from("event_participants").upsert(
      {
        event_id: args.eventId,
        participant_id: artistId,
        participant_type: "Artist",
        role: artistMeta?.meta?.includes?.("support") ? "support" : role,
        status: "invited",
        metadata: { setup_intent: true, label: artistMeta?.label || null },
      },
      { onConflict: "event_id,participant_id", ignoreDuplicates: true },
    )
    if (participantError) {
      console.warn("[AdminTourEventOperations] participant invite skipped:", participantError.message)
    }
  }

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
        metadata: { setup_intent: true, label: crewMeta?.label || null },
      },
      { onConflict: "event_id,participant_id", ignoreDuplicates: true },
    )
    if (participantError) {
      console.warn("[AdminTourEventOperations] staff invite skipped:", participantError.message)
    }
  }
}

/** @deprecated PLAN-105 — use recordSetupIntentFromInput / provisionEventOperations */
async function seedOperationalRecordsFromInput(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string | null
  input: Partial<z.infer<typeof adminEventInputBaseSchema>>
  eventStartAt?: string | null
}) {
  return recordSetupIntentFromInput(args)
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
  copy("venue_city")
  copy("venue_state")
  copy("venue_postal_code")
  copy("venue_country")
  copy("venue_website")
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
  if (input.ticketing_setup !== undefined) settings.ticketing_setup = input.ticketing_setup
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
  copy("quick_start_placeholder")
  copy("quick_start_label")
  copy("quick_start_completed_at")
  copy("schedule_details")
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

/** EVENT-201 — Server publish rejects when contract blockers remain. */
export class AdminEventPublishReadinessError extends Error {
  status = 422
  readiness: ReturnType<typeof getEventReadiness>

  constructor(readiness: ReturnType<typeof getEventReadiness>) {
    super("Event is not ready to publish.")
    this.name = "AdminEventPublishReadinessError"
    this.readiness = readiness
  }
}

export class AdminReadinessOverrideReasonError extends Error {
  status = 422

  constructor() {
    super("A reason is required when overriding readiness warnings.")
    this.name = "AdminReadinessOverrideReasonError"
  }
}

export function getAdminTourEventErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof AdminTourEventAuthError) return error.status
  if (error instanceof AdminTourPublishReadinessError) return error.status
  if (error instanceof AdminEventPublishReadinessError) return error.status
  if (error instanceof AdminReadinessOverrideReasonError) return error.status
  if (error instanceof TourDeleteEligibilityError) return error.status
  if (error instanceof TourAccessDeniedError) return error.status
  if (error instanceof TourCapabilityDeniedError) return error.status
  if (error instanceof EventAccessDeniedError) return error.status
  if (error instanceof EventCapabilityDeniedError) return error.status
  if (error instanceof EventVersionConflictError) return error.status
  if (error instanceof TourPortfolioQueryError) return error.status
  if (error instanceof StateAwareAuthDeniedError) return error.status
  if (error instanceof TourMetadataVersionConflictError) return error.status
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
  const metadataVersion =
    typeof row.metadata_version === "number" && Number.isFinite(row.metadata_version)
      ? row.metadata_version
      : 1
  return {
    ...row,
    id: row.id,
    metadata_version: metadataVersion,
    metadataVersion,
    owner_user_id: row.owner_user_id ?? null,
    lead_user_id: row.lead_user_id ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
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

async function loadTeamTourIdsForUser(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
}): Promise<string[]> {
  const { data, error } = await args.supabase
    .from("tour_team_members")
    .select("tour_id, tours!inner(id, org_id)")
    .eq("user_id", args.userId)
    .eq("tours.org_id", args.orgId)
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST200") {
      const fallback = await args.supabase
        .from("tour_team_members")
        .select("tour_id")
        .eq("user_id", args.userId)
      if (fallback.error) return []
      return [...new Set(((fallback.data ?? []) as unknown[]).map((row) => String((row as { tour_id: string }).tour_id)))]
    }
    return []
  }
  return [...new Set(((data ?? []) as unknown[]).map((row) => String((row as { tour_id: string }).tour_id)))]
}

async function loadGrantedTourIdsForUser(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
}): Promise<string[]> {
  const { data, error } = await args.supabase
    .from("entity_grants")
    .select("resource_id")
    .eq("org_id", args.orgId)
    .eq("resource_type", "tour")
    .eq("grantee_user_id", args.userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
  if (error) {
    if (error.code === "42P01") return []
    return []
  }
  return [...new Set(((data ?? []) as unknown[]).map((row) => String((row as { resource_id: string }).resource_id)))]
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
    start_at: row.start_at,
    event_date: row.start_at,
    event_time:
      typeof row.start_at === "string" && row.start_at.includes("T")
        ? row.start_at.slice(11, 16)
        : null,
    end_at: row.end_at,
    end_date: row.end_at,
    duration_minutes:
      typeof row.start_at === "string" && typeof row.end_at === "string"
        ? Math.max(0, Math.round((Date.parse(row.end_at) - Date.parse(row.start_at)) / 60000))
        : 0,
    venue_id: row.venue_id,
    venue_name: settings.venue_label ?? null,
    venue_address: settings.venue_address ?? null,
    venue_city: settings.venue_city ?? null,
    venue_state: settings.venue_state ?? null,
    venue_postal_code: settings.venue_postal_code ?? null,
    venue_country: settings.venue_country ?? null,
    venue_website: settings.venue_website ?? null,
    venue_contact_name: settings.venue_contact_name ?? null,
    venue_contact_email: settings.venue_contact_email ?? null,
    venue_contact_phone: settings.venue_contact_phone ?? null,
    location: settings.location ?? null,
    capacity: row.capacity ?? 0,
    timezone: row.timezone ?? settings.timezone ?? "UTC",
    age_restrictions: row.age_restrictions ?? settings.age_restrictions ?? null,
    doors_open: settings.doors_open ?? null,
    curfew: settings.curfew ?? null,
    load_in_time: settings.load_in_time ?? null,
    sound_check_time: settings.sound_check_time ?? null,
    promoter_contact: settings.promoter_contact ?? null,
    setup: readEventSetupFromSettings(settings),
    setup_checklist: settings.setup_checklist_status ?? null,
    event_version: typeof row.event_version === "number" ? row.event_version : 1,
    tour_plan_touched_at: typeof settings.tour_plan_touched_at === "string" ? settings.tour_plan_touched_at : null,
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
    updated_at: row.updated_at ?? row.created_at,
    settings,
    schedule_details: settings.schedule_details ?? null,
    readiness: getEventReadiness({
      eventId: typeof row.id === "string" ? row.id : null,
      orgId: typeof row.org_id === "string" ? row.org_id : null,
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
      has_logistics: Boolean(settings.has_logistics || settings.logistics),
      has_site_map: Boolean(settings.site_map_id || settings.has_site_map),
      has_documents: Boolean(settings.has_documents),
      has_comms: Boolean(settings.has_comms),
      day_sheet_notes: typeof settings.day_sheet_notes === "string" ? settings.day_sheet_notes : null,
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

  static async listEvents(args: {
    supabase: SupabaseLike
    userId: string
    orgId?: string | null
    status?: string | null
    query?: EventPortfolioQueryInput | URLSearchParams
    allowedTourIds?: readonly string[]
  }) {
    const { events } = await this.listEventPortfolio(args)
    return events
  }

  static async listEventPortfolio(args: {
    supabase: SupabaseLike
    userId: string
    orgId?: string | null
    status?: string | null
    query?: EventPortfolioQueryInput | URLSearchParams
    allowedTourIds?: readonly string[]
  }): Promise<{
    orgId: string
    page: EventPortfolioPage
    events: ReturnType<typeof presentEvent>[]
    summary: {
      totalCount: number
      thisWeekCount: number
      needsAttentionCount: number
      missingVenueCount: number
      staffingGapCount: number
      capacity: number
      ticketsSold: number
    }
    attention: AttentionIssueDTO[]
  }> {
    const scopedTourIds = Array.from(new Set(args.allowedTourIds || []))
    const orgId = scopedTourIds.length > 0
      ? args.orgId || null
      : await resolveAuthorizedOrgId({
          supabase: args.supabase,
          userId: args.userId,
          requestedOrgId: args.orgId,
        })
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.", 403)
    }

    const queryInput =
      args.query instanceof URLSearchParams
        ? args.query
        : {
            ...(args.query || {}),
            status: (args.query && "status" in args.query ? args.query.status : undefined) ?? args.status,
          }
    const parsedQuery = parseEventPortfolioQuery(queryInput)

    let scopedEventIds: string[] | null = null
    if (scopedTourIds.length > 0) {
      const { data: links, error: linksError } = await args.supabase
        .from("tour_events")
        .select("event_id")
        .in("tour_id", scopedTourIds)
      if (linksError) throw new Error(linksError.message)
      scopedEventIds = Array.from(new Set(
        (links || []).map((link: { event_id: string }) => link.event_id).filter(Boolean),
      ))
      if (scopedEventIds.length === 0) {
        const emptyPage = applyEventPortfolioQuery({ rows: [], query: parsedQuery, orgId })
        return {
          orgId,
          page: emptyPage,
          events: [],
          summary: {
            totalCount: 0,
            thisWeekCount: 0,
            needsAttentionCount: 0,
            missingVenueCount: 0,
            staffingGapCount: 0,
            capacity: 0,
            ticketsSold: 0,
          },
          attention: [],
        }
      }
    }

    let eventQuery = args.supabase
      .from("events_v2")
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, updated_at, org_id")
      .eq("org_id", orgId)
      .order("start_at", { ascending: false })
      .limit(1000)

    if (scopedEventIds) eventQuery = eventQuery.in("id", scopedEventIds)

    const { data, error } = await eventQuery
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

    const presented = rows.map((row: Record<string, unknown>) =>
      presentEvent(row, toursByEvent.get(String(row.id)) ?? [], metrics.get(String(row.id))),
    )
    const portfolioRows = presented.map((event) => ({
      ...(event as Record<string, unknown>),
      readiness: summarizeReadiness((event as { readiness?: unknown }).readiness),
    })) as EventPortfolioRow[]
    const page = applyEventPortfolioQuery({ rows: portfolioRows, query: parsedQuery, orgId })
    const pageIds = new Set(page.items.map((event) => String(event.id)))
    const events = presented.filter((event) => pageIds.has(String(event.id)))
    const eventById = new Map(presented.map((event) => [String(event.id), event]))
    const orderedEvents = page.items.map((event) => eventById.get(String(event.id))).filter(Boolean) as ReturnType<typeof presentEvent>[]
    const attention = orderedEvents.flatMap((event) =>
      buildAttentionIssues({
        entityType: "event",
        entityId: String(event.id),
        readiness: (event as { readiness?: unknown }).readiness,
        sourceBasePath: "/admin/dashboard/events",
        limit: 2,
      }),
    )
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() + 7)
    const summarySource = page.items
    const summary = {
      totalCount: page.totalCount,
      thisWeekCount: summarySource.filter((event) => {
        const value = event.start_at ? new Date(String(event.start_at)) : null
        return value && !Number.isNaN(value.getTime()) && value >= now && value <= weekEnd
      }).length,
      needsAttentionCount: summarySource.filter((event) => {
        const status = event.readiness && typeof event.readiness === "object"
          ? String((event.readiness as { status?: unknown }).status || "")
          : ""
        return status === "needs_attention" || status === "at_risk" || status === "blocked"
      }).length,
      missingVenueCount: summarySource.filter((event) => !event.venue_id && !event.venue_name).length,
      staffingGapCount: summarySource.filter((event) => {
        const settings = event.settings && typeof event.settings === "object" ? event.settings as Record<string, unknown> : {}
        return !Array.isArray(settings.staff_ids) || settings.staff_ids.length === 0
      }).length,
      capacity: summarySource.reduce((sum, event) => sum + (Number(event.capacity) || 0), 0),
      ticketsSold: summarySource.reduce((sum, event) => sum + (Number(event.tickets_sold) || 0), 0),
    }

    return { orgId, page, events: orderedEvents.length ? orderedEvents : events, summary, attention }
  }

  static async getEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string
  }) {
    // EVENT-101: all event panel/legacy reads share the canonical access service.
    let accessOrgId: string | null = null
    try {
      const access = await requireEventAccess({
        supabase: args.supabase,
        userId: args.userId,
        eventId: args.eventId,
        orgId: args.orgId,
      })
      accessOrgId = access.orgId
    } catch (error) {
      if (error instanceof EventAccessDeniedError) {
        throw new AdminTourEventAuthError("Event not found.", 404)
      }
      throw error
    }

    const { data, error } = await args.supabase
      .from("events_v2")
      .select("id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, org_id, created_by")
      .eq("id", args.eventId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error("Event not found.")

    const assignments = await this.getTourAssignments({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId: accessOrgId || data.org_id,
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

    // EVENT-102: typed destinations for venue/promoter/times/capacity/age/ownership.
    const setup = normalizeEventSetupFields({
      raw: input as Record<string, unknown>,
      createdBy: args.userId,
      bridgedVenueId,
    })
    Object.assign(settings, setup.settingsPatch)

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
        capacity: setup.columns.capacity,
        timezone: setup.columns.timezone,
        age_restrictions: setup.columns.age_restrictions,
        created_by: args.userId,
        settings,
      })
      .select("id, title, status, start_at, end_at, venue_id, capacity, timezone, age_restrictions, settings, created_at, org_id, created_by")
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

    // EVENT-103 — reload settings (incl. setup_intent) and attach explicit checklist.
    const { data: withIntent } = await args.supabase
      .from("events_v2")
      .select("id, title, status, start_at, end_at, venue_id, capacity, timezone, age_restrictions, settings, created_at, org_id, created_by")
      .eq("id", inserted.id)
      .maybeSingle()

    const eventRow = withIntent || inserted
    const checklist = buildEventSetupChecklist({
      eventId: inserted.id,
      event: eventRow as Record<string, unknown>,
    })
    const nextSettings = mergeSetupChecklistIntoSettings(readSettings(eventRow), checklist)
    await args.supabase
      .from("events_v2")
      .update({ settings: nextSettings })
      .eq("id", inserted.id)

    const presented = presentEvent(
      { ...eventRow, settings: nextSettings },
      assignments.map((assignment) => ({ id: assignment.tour_id, ...assignment })),
    )
    return {
      ...presented,
      setup_checklist: checklist,
    }
  }

  static async updateEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    input: Partial<z.infer<typeof adminEventInputSchema>>
    orgId?: string
    capabilities?: readonly AdminCapability[]
  }) {
    const { data: existing, error: existingError } = await args.supabase
      .from("events_v2")
      .select("id, org_id, settings, created_by, start_at, end_at, title, status, venue_id, capacity, timezone, age_restrictions, event_version")
      .eq("id", args.eventId)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error("Event not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Event is not available to the acting organization.")
    }

    const input = adminEventInputBaseSchema.partial().parse(args.input)
    const currentVersion = typeof existing.event_version === "number" ? existing.event_version : 1
    const expectedVersion = input.expected_version ?? input.event_version
    const settingsExisting = readSettings(existing)
    const capabilities = args.capabilities ?? (["event.manage"] as const)

    assertStateAllowsAction({
      domain: "event",
      state: existing.status,
      action: input.status && input.status !== existing.status
        ? "update_status_direct"
        : "update_metadata",
      capabilities,
      actorUserId: args.userId,
      priorActorUserId: existing.created_by,
      legallyRetained: Boolean(
        settingsExisting.legal_hold === true
        || settingsExisting.legal_retention === true
        || settingsExisting.legally_retained === true,
      ),
    })

    if (typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
      const presented = presentEvent(existing, [])
      const diff = buildEventVersionConflictDiff({
        expectedVersion,
        server: {
          eventVersion: currentVersion,
          title: existing.title ?? null,
          status: existing.status ?? null,
          start_at: existing.start_at ?? null,
          end_at: existing.end_at ?? null,
          venue_id: existing.venue_id ?? null,
          capacity: typeof existing.capacity === "number" ? existing.capacity : null,
          timezone: existing.timezone ?? null,
          age_restrictions: existing.age_restrictions ?? null,
        },
        client: {
          eventVersion: expectedVersion,
          title: input.title ?? input.name ?? null,
          status: input.status ?? null,
          start_at: input.start_at ?? null,
          end_at: input.end_at ?? null,
          venue_id: input.venue_id ?? null,
          capacity: parseCapacity(input.capacity),
          timezone: input.timezone ?? null,
          age_restrictions: input.age_restrictions ?? input.age_restriction ?? null,
        },
        serverTourPlanTouchedAt:
          typeof settingsExisting.tour_plan_touched_at === "string"
            ? settingsExisting.tour_plan_touched_at
            : null,
        clientTourPlanTouchedAt: input.tour_plan_touched_at ?? null,
      })
      throw new EventVersionConflictError({
        currentVersion,
        expectedVersion,
        diff,
        serverEvent: presented as Record<string, unknown>,
      })
    }

    let eventAccess
    try {
      eventAccess = await requireEventCapability({
        supabase: args.supabase,
        userId: args.userId,
        eventId: args.eventId,
        orgId: args.orgId || existing.org_id,
        capability: "event.manage",
        capabilities,
      })
    } catch (error) {
      if (error instanceof EventAccessDeniedError || error instanceof EventCapabilityDeniedError) {
        throw new AdminTourEventAuthError(error.message, error.status)
      }
      throw error
    }
    const orgId = eventAccess.orgId || existing.org_id
    if (!orgId) throw new AdminTourEventAuthError("Organization is not available to this admin account.")

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      event_version: currentVersion + 1,
    }
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
    let bridgedVenueId: string | null | undefined
    if ("venue_id" in input) {
      bridgedVenueId = await resolveVenuesV2IdForAccount({
        supabase: args.supabase,
        orgId: orgId || existing.org_id,
        userId: args.userId,
        venueAccountId: input.venue_id,
        venueName: input.venue_name,
      })
      patch.venue_id = bridgedVenueId
    }

    const setupKeys = [
      "timezone",
      "capacity",
      "age_restriction",
      "age_restrictions",
      "venue_id",
      "venue_name",
      "venue_address",
      "venue_city",
      "venue_state",
      "venue_postal_code",
      "venue_country",
      "venue_website",
      "venue_room",
      "venue_contact_name",
      "venue_contact_email",
      "venue_contact_phone",
      "doors_open",
      "curfew",
      "load_in_time",
      "sound_check_time",
      "promoter_contact",
      "ops_owner_user_id",
      "department_owner",
      "production_windows",
    ] as const
    const hasSetupField = setupKeys.some((key) => Object.prototype.hasOwnProperty.call(input, key))
    const settingsFromInput = eventSettingsFromInput(input)

    if (hasSetupField) {
      const setup = normalizeEventSetupFields({
        raw: input as Record<string, unknown>,
        createdBy: existing.created_by,
        bridgedVenueId: bridgedVenueId ?? (typeof patch.venue_id === "string" ? patch.venue_id : null),
      })
      if ("timezone" in input) patch.timezone = setup.columns.timezone
      if ("capacity" in input) patch.capacity = setup.columns.capacity
      if ("age_restriction" in input || "age_restrictions" in input) {
        patch.age_restrictions = setup.columns.age_restrictions
      }
      patch.settings = {
        ...(existing.settings ?? {}),
        ...settingsFromInput,
        ...setup.settingsPatch,
      }
    } else {
      if ("capacity" in input) patch.capacity = parseCapacity(input.capacity)
      patch.settings = { ...(existing.settings ?? {}), ...settingsFromInput }
    }

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
      .eq("event_version", currentVersion)
    if (existing.org_id) updateQuery = updateQuery.eq("org_id", existing.org_id)
    const { data, error } = await updateQuery
      .select("id, title, status, start_at, end_at, venue_id, capacity, timezone, age_restrictions, event_version, settings, created_at, org_id, created_by")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) {
      // Lost the race — another writer bumped the version.
      const { data: latest } = await args.supabase
        .from("events_v2")
        .select("id, org_id, settings, created_by, start_at, end_at, title, status, venue_id, capacity, timezone, age_restrictions, event_version")
        .eq("id", args.eventId)
        .maybeSingle()
      const latestVersion = typeof latest?.event_version === "number" ? latest.event_version : currentVersion + 1
      const latestSettings = readSettings(latest || {})
      const diff = buildEventVersionConflictDiff({
        expectedVersion: currentVersion,
        server: {
          eventVersion: latestVersion,
          title: latest?.title ?? null,
          status: latest?.status ?? null,
          start_at: latest?.start_at ?? null,
          end_at: latest?.end_at ?? null,
          venue_id: latest?.venue_id ?? null,
          capacity: typeof latest?.capacity === "number" ? latest.capacity : null,
          timezone: latest?.timezone ?? null,
          age_restrictions: latest?.age_restrictions ?? null,
        },
        client: {
          eventVersion: currentVersion,
          title: input.title ?? input.name ?? null,
          status: input.status ?? null,
          start_at: input.start_at ?? null,
          end_at: input.end_at ?? null,
          venue_id: input.venue_id ?? null,
          capacity: parseCapacity(input.capacity),
          timezone: input.timezone ?? null,
          age_restrictions: input.age_restrictions ?? input.age_restriction ?? null,
        },
        serverTourPlanTouchedAt:
          typeof latestSettings.tour_plan_touched_at === "string"
            ? latestSettings.tour_plan_touched_at
            : null,
        clientTourPlanTouchedAt: input.tour_plan_touched_at ?? null,
      })
      throw new EventVersionConflictError({
        currentVersion: latestVersion,
        expectedVersion: currentVersion,
        diff,
        serverEvent: latest ? (presentEvent(latest, []) as Record<string, unknown>) : null,
      })
    }

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
    capabilities?: readonly AdminCapability[]
  }) {
    const { data: existing, error: existingError } = await args.supabase
      .from("events_v2")
      .select("id, org_id, created_by, status, settings")
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

    const settings = readSettings(existing)
    assertStateAllowsAction({
      domain: "event",
      state: existing.status,
      action: "delete",
      capabilities: args.capabilities ?? (["event.manage"] as const),
      actorUserId: args.userId,
      priorActorUserId: existing.created_by,
      legallyRetained: Boolean(
        settings.legal_hold === true
        || settings.legal_retention === true
        || settings.legally_retained === true,
      ),
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
    /** PLAN-103 — default exact (omit = detach link only, never delete event). */
    mode?: TourStopReconcileMode
  }): Promise<{ links: unknown[]; reconciliation: TourStopReconcilePlan }> {
    if (!args.orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    const mode = assertTourStopReconcileMode(args.mode || "exact")
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

    const { data: currentRows, error: currentError } = await args.supabase
      .from("tour_events")
      .select("event_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes")
      .eq("tour_id", args.tourId)
    if (currentError) throw new Error(currentError.message)

    const current = (currentRows ?? []).map((row: any) => ({
      event_id: String(row.event_id),
      ordinal: typeof row.ordinal === "number" ? row.ordinal : 0,
      is_primary: Boolean(row.is_primary),
      leg_name: row.leg_name ?? null,
      market: row.market ?? null,
      advance_status: row.advance_status ?? "not_started",
      routing_notes: row.routing_notes ?? null,
    }))

    const desired = normalized.map((assignment, index) => ({
      event_id: assignment.event_id,
      ordinal: assignment.ordinal ?? index,
      is_primary: Boolean(assignment.is_primary),
      leg_name: assignment.leg_name ?? null,
      market: assignment.market ?? null,
      advance_status: assignment.advance_status ?? "not_started",
      routing_notes: assignment.routing_notes ?? null,
    }))

    const reconciliation = planTourStopReconciliation({ mode, current, desired })

    if (mode === "attach_only") {
      // Upsert desired links only — never detach omitted links or delete events.
      for (const [index, link] of reconciliation.upserts.entries()) {
        await this.addTourAssignment({
          supabase: args.supabase,
          orgId: args.orgId,
          eventId: link.event_id,
          assignment: {
            tour_id: args.tourId,
            ordinal: link.ordinal ?? index,
            is_primary: link.is_primary,
            leg_name: link.leg_name,
            market: link.market,
            advance_status: (link.advance_status as any) || "not_started",
            routing_notes: link.routing_notes,
          },
        })
      }
      await this.touchEventsForTourPlanChange({
        supabase: args.supabase,
        orgId: args.orgId,
        tourId: args.tourId,
        eventIds: reconciliation.upserts.map((link) => link.event_id),
      })
      const { data: links, error: linksError } = await args.supabase
        .from("tour_events")
        .select("*")
        .eq("tour_id", args.tourId)
        .order("ordinal", { ascending: true })
      if (linksError) throw new Error(linksError.message)
      return { links: links ?? [], reconciliation }
    }

    // exact + merge: persist the planned full (exact) or merged set via RPC (link detach only).
    const links = reconciliation.upserts.map((assignment, index) => ({
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

    // EVENT-104 — tour-plan stop changes bump event versions so concurrent editors conflict.
    const touchedIds = Array.from(
      new Set([
        ...reconciliation.upserts.map((link) => link.event_id),
        ...reconciliation.detachEventIds,
        ...reconciliation.updatedEventIds,
        ...reconciliation.addedEventIds,
      ]),
    )
    await this.touchEventsForTourPlanChange({
      supabase: args.supabase,
      orgId: args.orgId,
      tourId: args.tourId,
      eventIds: touchedIds,
    })

    return { links: data ?? [], reconciliation }
  }

  /** EVENT-104 — bump event_version + tour_plan_touched_at after tour-plan reconciliation. */
  static async touchEventsForTourPlanChange(args: {
    supabase: SupabaseLike
    orgId: string
    tourId: string
    eventIds: string[]
  }) {
    const touchedAt = new Date().toISOString()
    const uniqueIds = Array.from(new Set(args.eventIds.filter(Boolean)))
    for (const eventId of uniqueIds) {
      const { data: row } = await args.supabase
        .from("events_v2")
        .select("id, event_version, settings")
        .eq("id", eventId)
        .eq("org_id", args.orgId)
        .maybeSingle()
      if (!row?.id) continue
      const currentVersion = typeof row.event_version === "number" ? row.event_version : 1
      const settings = readSettings(row)
      await args.supabase
        .from("events_v2")
        .update({
          event_version: currentVersion + 1,
          updated_at: touchedAt,
          settings: {
            ...settings,
            tour_plan_touched_at: touchedAt,
            tour_plan_touch_tour_id: args.tourId,
          },
        })
        .eq("id", eventId)
        .eq("org_id", args.orgId)
        .eq("event_version", currentVersion)
    }
  }

  static async listTourPortfolio(args: {
    supabase: SupabaseLike
    userId: string
    orgId?: string | null
    query?: TourPortfolioQueryInput | URLSearchParams
    /** @deprecated Prefer query.status — kept for callers that only pass status. */
    status?: string | null
    /** TOUR-209 — effective capabilities for portfolio visibility. */
    capabilities?: readonly string[]
    /** Tour-only account projection; when present, org-wide enumeration is forbidden. */
    allowedTourIds?: readonly string[]
  }): Promise<{ orgId: string; page: TourPortfolioPage; tours: ReturnType<typeof presentTour>[] }> {
    const scopedTourIds = Array.from(new Set(args.allowedTourIds || []))
    const orgId = scopedTourIds.length > 0
      ? args.orgId || null
      : await resolveAuthorizedOrgId({
          supabase: args.supabase,
          userId: args.userId,
          requestedOrgId: args.orgId,
        })
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.", 403)
    }

    const queryInput =
      args.query instanceof URLSearchParams
        ? args.query
        : {
            ...(args.query || {}),
            status: (args.query && "status" in args.query ? args.query.status : undefined) ?? args.status,
          }

    const query = parseTourPortfolioQuery(queryInput)

    let orgQuery = args.supabase
      .from("tours")
      .select("*")
      .eq("org_id", orgId)
    if (scopedTourIds.length > 0) orgQuery = orgQuery.in("id", scopedTourIds)
    const orgResult = await orgQuery

    if (orgResult.error) throw new Error(orgResult.error.message)

    let rows = (orgResult.data ?? []) as TourPortfolioRow[]

    // TOUR-209 — attach tags before filter/query so tag filters and projections work.
    const allTourIds = rows.map((row) => String(row.id))
    const tagsByTour = await loadTourTagsByTourIds({
      supabase: args.supabase,
      tourIds: allTourIds,
    })
    rows = rows.map((row) => ({
      ...row,
      tags: tagsByTour.get(String(row.id)) ?? [],
    }))

    const canViewAll = scopedTourIds.length === 0 && actorCanViewAllOrgTours(args.capabilities ?? ["tour.view"])
    const [teamTourIds, grantTourIds] = canViewAll
      ? [[], []]
      : await Promise.all([
          loadTeamTourIdsForUser({ supabase: args.supabase, userId: args.userId, orgId }),
          loadGrantedTourIdsForUser({ supabase: args.supabase, userId: args.userId, orgId }),
        ])
    const accessibleTourIds = scopedTourIds.length > 0
      ? new Set(scopedTourIds)
      : canViewAll
      ? null
      : buildAccessibleTourIdSet({
          rows,
          userId: args.userId,
          canViewAllOrgTours: false,
          teamTourIds,
          grantTourIds,
        })
    const visible = filterTourPortfolioByAccess({ rows, accessibleTourIds })
    const page = applyTourPortfolioQuery({ rows: visible.rows, query, orgId })

    const tourIds = page.items.map((tour) => String(tour.id))
    let links: any[] = []
    if (tourIds.length) {
      const { data: linkRows, error: linkError } = await args.supabase
        .from("tour_events")
        .select("tour_id, ordinal, is_primary, events_v2(id, title, status, start_at, end_at, venue_id, settings, capacity)")
        .in("tour_id", tourIds)
        .order("ordinal", { ascending: true })
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

    const tours = page.items.map((tour) =>
      presentTour(
        {
          ...(tour as Record<string, unknown>),
          tags: tour.tags ?? tagsByTour.get(String(tour.id)) ?? [],
        },
        eventsByTour.get(String(tour.id)) ?? [],
      ),
    )
    return { orgId, page, tours }
  }

  static async listTours(args: {
    supabase: SupabaseLike
    userId: string
    orgId?: string | null
    status?: string | null
    query?: TourPortfolioQueryInput | URLSearchParams
    allowedTourIds?: readonly string[]
  }) {
    try {
      const { tours } = await this.listTourPortfolio(args)
      return tours
    } catch (error) {
      if (error instanceof AdminTourEventAuthError && error.status === 403) return []
      throw error
    }
  }

  static async getTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
  }) {
    // TOUR-102: all tour panel/legacy reads share the canonical access service.
    try {
      await requireTourAccess({
        supabase: args.supabase,
        userId: args.userId,
        tourId: args.tourId,
        orgId: args.orgId,
      })
    } catch (error) {
      if (error instanceof TourAccessDeniedError) {
        throw new AdminTourEventAuthError("Tour not found.", 404)
      }
      throw error
    }

    const { data: tour, error } = await args.supabase.from("tours").select("*").eq("id", args.tourId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!tour) throw new Error("Tour not found.")

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
        owner_user_id: input.owner_user_id ?? args.userId,
        lead_user_id: input.lead_user_id ?? null,
        created_by: args.userId,
        // Legacy column still used by older RLS/policies and UI paths
        user_id: args.userId,
      })
      .select("*")
      .single()
    if (error || !tour?.id) throw new Error(error?.message || "Failed to create tour.")

    let tags: unknown[] = []
    if (input.tag_ids !== undefined) {
      tags = await replaceTourTags({
        supabase: args.supabase,
        tourId: tour.id,
        orgId,
        userId: args.userId,
        tagIds: input.tag_ids,
      })
    }

    if (input.event_ids !== undefined || input.events !== undefined) {
      return this.updateTour({
        supabase: args.supabase,
        userId: args.userId,
        orgId,
        tourId: tour.id,
        input: {
          ...input,
          // Do not synthesize `status: undefined`: updateTour treats presence as
          // an intentional lifecycle write. Active creation remains planning
          // until the readiness-gated publish command succeeds.
          ...(input.status === "active" ? { status: "planning" as const } : {}),
        },
      })
    }

    return presentTour({ ...tour, tags })
  }

  static async updateTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    input: Partial<z.input<typeof adminTourInputSchema>> & Record<string, unknown>
    orgId?: string
    /** SEC-202 — effective capabilities for state-aware gates. */
    capabilities?: readonly AdminCapability[]
  }) {
    // Accept management-page payloads that may include extra UI-only fields.
    // Known fields are never allowed to fall back to unvalidated raw values.
    const input = adminTourInputSchema.partial().parse(args.input)
    const raw = args.input ?? {}
    const capabilities = args.capabilities ?? (["tour.manage"] as const)

    const { data: existing, error: lookupError } = await args.supabase
      .from("tours")
      .select("id, org_id, settings, created_by, user_id, status, name, description, start_date, end_date, budget, revenue, expenses, metadata_version")
      .eq("id", args.tourId)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (!existing) throw new Error("Tour not found.")

    if (args.orgId && existing.org_id !== args.orgId) {
      throw new AdminTourEventAuthError("Tour is not available to the acting organization.")
    }

    try {
      await requireTourCapability({
        supabase: args.supabase,
        userId: args.userId,
        tourId: args.tourId,
        orgId: args.orgId || existing.org_id,
        capability: "tour.manage",
        capabilities,
      })
    } catch (error) {
      if (error instanceof TourAccessDeniedError || error instanceof TourCapabilityDeniedError) {
        throw new AdminTourEventAuthError(error.message, error.status)
      }
      throw error
    }

    const currentVersion =
      typeof existing.metadata_version === "number" && Number.isFinite(existing.metadata_version)
        ? existing.metadata_version
        : 1
    const expectedVersion = input.expected_version ?? input.metadata_version
    const settingsExisting = readSettings(existing)

    if (typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
      const diff = buildTourMetadataConflictDiff({
        expectedVersion,
        server: {
          metadataVersion: currentVersion,
          name: existing.name ?? null,
          description: existing.description ?? null,
          status: existing.status ?? null,
          start_date: existing.start_date ?? null,
          end_date: existing.end_date ?? null,
          budget: existing.budget != null ? String(existing.budget) : null,
          revenue: existing.revenue != null ? String(existing.revenue) : null,
          expenses: existing.expenses != null ? String(existing.expenses) : null,
          main_artist: String(settingsExisting.main_artist ?? settingsExisting.mainArtist ?? "") || null,
          genre: typeof settingsExisting.genre === "string" ? settingsExisting.genre : null,
        },
        client: {
          metadataVersion: expectedVersion,
          name: input.name ?? (typeof raw.name === "string" ? raw.name : null),
          description: input.description ?? (raw.description as string | null | undefined) ?? null,
          status: (input.status as string | undefined) ?? (raw.status as string | undefined) ?? null,
          start_date: input.start_date ?? (raw.start_date as string | null | undefined) ?? null,
          end_date: input.end_date ?? (raw.end_date as string | null | undefined) ?? null,
          budget: input.budget != null ? String(input.budget) : raw.budget != null ? String(raw.budget) : null,
          revenue:
            input.revenue != null
              ? String(input.revenue)
              : raw.revenue != null
                ? String(raw.revenue)
                : null,
          expenses:
            input.expenses != null
              ? String(input.expenses)
              : raw.expenses != null
                ? String(raw.expenses)
                : null,
          main_artist:
            (input.main_artist as string | null | undefined)
            ?? (raw.main_artist as string | null | undefined)
            ?? null,
          genre: (input.genre as string | null | undefined) ?? (raw.genre as string | null | undefined) ?? null,
        },
      })
      throw new TourMetadataVersionConflictError({
        currentVersion,
        expectedVersion,
        diff,
        serverTour: presentTour(existing, []) as Record<string, unknown>,
      })
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      metadata_version: currentVersion + 1,
    }
    for (const key of ["name", "description", "status", "start_date", "end_date"] as const) {
      if (key in input) patch[key] = input[key] ?? null
      else if (key in raw) patch[key] = raw[key] ?? null
    }
    if ("owner_user_id" in input) patch.owner_user_id = input.owner_user_id ?? null
    if ("lead_user_id" in input) patch.lead_user_id = input.lead_user_id ?? null

    const hasStatusChange =
      Object.prototype.hasOwnProperty.call(patch, "status")
      && patch.status !== existing.status
    if (hasStatusChange) {
      assertTourMutationAllowed({
        status: existing.status,
        action: "update_status_direct",
        capabilities,
        actorUserId: args.userId,
        settings: existing.settings,
        createdBy: existing.created_by ?? existing.user_id,
      })
    }

    assertTourMutationAllowed({
      status: existing.status,
      action: "update_metadata",
      capabilities,
      actorUserId: args.userId,
      settings: existing.settings,
      createdBy: existing.created_by ?? existing.user_id,
    })

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

    // SEC-110 + TOUR-201: mutation predicates include id, org, and optimistic metadata_version.
    let updateQuery = args.supabase
      .from("tours")
      .update(patch)
      .eq("id", args.tourId)
      .eq("metadata_version", currentVersion)
    if (args.orgId) updateQuery = updateQuery.eq("org_id", args.orgId)
    else if (existing.org_id) updateQuery = updateQuery.eq("org_id", existing.org_id)
    const { data, error } = await updateQuery.select("*").maybeSingle()
    if (error) {
      // Column missing until migration — retry without version predicate.
      if (error.code === "42703" || /metadata_version/i.test(error.message || "")) {
        const { metadata_version: _mv, ...legacyPatch } = patch
        let legacyQuery = args.supabase.from("tours").update(legacyPatch).eq("id", args.tourId)
        if (args.orgId) legacyQuery = legacyQuery.eq("org_id", args.orgId)
        else if (existing.org_id) legacyQuery = legacyQuery.eq("org_id", existing.org_id)
        const legacy = await legacyQuery.select("*").maybeSingle()
        if (legacy.error) throw new Error(legacy.error.message)
        if (!legacy.data) throw new AdminTourEventAuthError("Tour not found.", 404)
        return presentTour(legacy.data)
      }
      throw new Error(error.message)
    }
    if (!data) {
      throw new TourMetadataVersionConflictError({
        currentVersion,
        expectedVersion: expectedVersion ?? currentVersion,
        diff: buildTourMetadataConflictDiff({
          expectedVersion: expectedVersion ?? currentVersion,
          server: {
            metadataVersion: currentVersion,
            name: existing.name ?? null,
            description: existing.description ?? null,
            status: existing.status ?? null,
            start_date: existing.start_date ?? null,
            end_date: existing.end_date ?? null,
            budget: existing.budget != null ? String(existing.budget) : null,
            revenue: existing.revenue != null ? String(existing.revenue) : null,
            expenses: existing.expenses != null ? String(existing.expenses) : null,
            main_artist: String(settingsExisting.main_artist ?? "") || null,
            genre: typeof settingsExisting.genre === "string" ? settingsExisting.genre : null,
          },
          client: {},
        }),
        serverTour: presentTour(existing, []) as Record<string, unknown>,
      })
    }

    const orgId = String(existing.org_id || data?.org_id || "")
    const exactStopsRequested = input.event_ids !== undefined || input.events !== undefined
    let stopReconciliation: TourStopReconcilePlan | null = null
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

      const reconciled = await this.reconcileTourAssignments({
        supabase: args.supabase,
        orgId,
        tourId: args.tourId,
        assignments: Array.from(desiredByEvent.values()),
        mode: input.reconcile_mode || "exact",
      })
      stopReconciliation = reconciled.reconciliation
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

    let tags: unknown[] | undefined
    if (input.tag_ids !== undefined && orgId) {
      tags = await replaceTourTags({
        supabase: args.supabase,
        tourId: args.tourId,
        orgId,
        userId: args.userId,
        tagIds: input.tag_ids,
      })
    } else if (orgId) {
      const tagMap = await loadTourTagsByTourIds({
        supabase: args.supabase,
        tourIds: [args.tourId],
      })
      tags = tagMap.get(args.tourId) ?? []
    }

    const presented = presentTour({ ...data, tags: tags ?? [] }, linkedEvents)
    return stopReconciliation
      ? { ...presented, reconciliation: stopReconciliation }
      : presented
  }

  static async deleteTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
    capabilities?: readonly AdminCapability[]
    correlationId?: string | null
  }) {
    const { data: existing, error: lookupError } = await args.supabase
      .from("tours")
      .select("id, org_id, created_by, user_id, status, settings, name, start_date, end_date")
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

    assertTourMutationAllowed({
      status: existing.status,
      action: "delete",
      capabilities: args.capabilities ?? (["tour.delete"] as const),
      actorUserId: args.userId,
      settings: existing.settings,
      createdBy: existing.created_by ?? existing.user_id,
    })

    // TOUR-208 — block when published/ticketed/contracted/paid/staffed/referenced.
    const eligibility = await assertTourHardDeleteEligible({
      supabase: args.supabase,
      tourId: args.tourId,
      orgId: existing.org_id,
      tour: existing as Record<string, unknown>,
    })

    const correlationId = args.correlationId?.trim() || crypto.randomUUID()
    const orgId = args.orgId || existing.org_id

    // Detach only — never cascade-delete events_v2 rows.
    const { error: detachError } = await args.supabase
      .from("tour_events")
      .delete()
      .eq("tour_id", args.tourId)
    if (detachError) throw new Error(detachError.message)

    // SEC-110: delete predicates include target id + acting/resolved org_id.
    let deleteQuery = args.supabase.from("tours").delete().eq("id", args.tourId)
    if (orgId) deleteQuery = deleteQuery.eq("org_id", orgId)
    const { data: deleted, error } = await deleteQuery.select("id").maybeSingle()
    if (error) throw new Error(error.message)
    if (!deleted) throw new AdminTourEventAuthError("Tour not found.", 404)

    await logAuditEvent({
      actorId: args.userId,
      orgId,
      action: "delete",
      entityType: "tour",
      entityId: args.tourId,
      correlationId,
      oldValues: {
        id: existing.id,
        name: existing.name,
        status: existing.status,
        start_date: existing.start_date,
        end_date: existing.end_date,
      },
      newValues: {
        kind: "tour.hard_delete",
        detached_event_links: eligibility.willDetachEventLinks,
        eligibility_counts: eligibility.counts,
      },
    })

    try {
      await commitDomainWithOutbox(args.supabase as SupabaseClient, {
        orgId,
        commandName: "tour.delete",
        correlationId,
        actorUserId: args.userId,
        domainPayload: {
          tourId: args.tourId,
          detachedEventLinks: eligibility.willDetachEventLinks,
        },
        eventType: "tour.deleted",
        aggregateType: "tour",
        aggregateId: args.tourId,
        outboxPayload: {
          tourId: args.tourId,
          name: existing.name,
          priorStatus: existing.status,
        },
        idempotencyKey: buildPublicationOutboxIdempotencyKey({
          orgId,
          eventType: "tour.deleted",
          aggregateType: "tour",
          aggregateId: args.tourId,
          naturalKey: `tour.hard_delete:${args.tourId}`,
        }),
      })
    } catch (outboxError) {
      // Deletion already committed; surface audit trail but do not resurrect the tour.
      console.error("[TOUR-208] tour.deleted outbox commit failed after hard delete", outboxError)
    }

    return {
      success: true,
      detachedEventLinks: eligibility.willDetachEventLinks,
      correlationId,
    }
  }

  static async publishEvent(args: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string
    /** EVENT-201 — warning finding ids authorized for override. */
    overrideFindingIds?: readonly string[]
    overrideReason?: string | null
    capabilities?: readonly AdminCapability[]
  }) {
    const overrideReason = args.overrideReason?.trim() || null
    if ((args.overrideFindingIds?.length ?? 0) > 0 && !overrideReason) {
      throw new AdminReadinessOverrideReasonError()
    }

    const existing = await this.getEvent({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId: args.orgId,
    })

    const orgId = String((existing as { org_id?: string }).org_id || args.orgId || "")
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    // EVENT-201 — reload persisted event and evaluate inside publish path (not UI-bypassable).
    const { evaluateEventReadinessFromPersisted } = await import(
      "@/lib/admin/event-readiness-engine.service"
    )
    const evaluation = await evaluateEventReadinessFromPersisted({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId,
      overrideFindingIds: args.overrideFindingIds,
      hasOverrideCapability: (args.capabilities || []).includes("event.publish"),
    })
    if (!evaluation.ok) {
      const legacyShape = {
        score: 0,
        items: [],
        blockers: evaluation.blockers.map((row) => ({
          id: row.id,
          label: row.label,
          state: "missing" as const,
          blocksPublish: true,
          detail: row.message,
          remediationUrl: row.remediationUrl,
          evidence: row.evidence,
        })),
        conflicts: evaluation.warnings.map((row) => ({
          id: row.id,
          severity: "warning" as const,
          label: row.label,
          detail: row.message,
          remediationUrl: row.remediationUrl,
        })),
        evaluation,
      }
      throw new AdminEventPublishReadinessError(legacyShape as ReturnType<typeof getEventReadiness>)
    }

    const event = await this.updateEvent({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.eventId,
      orgId,
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
          readiness_overrides: args.overrideFindingIds || [],
          readiness_override_reason: overrideReason,
          readiness_ok: true,
        },
        published_by: args.userId,
        published_at: new Date().toISOString(),
      })
    } catch (error) {
      console.warn("[AdminTourEventOperations] event work-mode publish skipped:", error)
    }

    return {
      ...event,
      readiness: evaluation,
    }
  }

  static async publishTour(args: {
    supabase: SupabaseLike
    userId: string
    tourId: string
    orgId?: string
    /** PUB-201 — warning finding ids authorized for override. */
    overrideFindingIds?: readonly string[]
    capabilities?: readonly AdminCapability[]
    /** PUB-204 — required for durable publish; duplicates return original publication. */
    idempotencyKey?: string | null
    correlationId?: string | null
  }) {
    const tour = await this.getTour({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })

    const orgId = String((tour as { org_id?: string }).org_id || args.orgId || "")
    if (!orgId) {
      throw new AdminTourEventAuthError("Organization is not available to this admin account.")
    }

    // PUB-201 — reload persisted plan and evaluate inside publish path (not UI-bypassable).
    const { evaluateTourReadinessFromPersistedPlan } = await import(
      "@/lib/admin/tour-readiness-engine.service"
    )
    const evaluation = await evaluateTourReadinessFromPersistedPlan({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
      overrideFindingIds: args.overrideFindingIds,
      hasOverrideCapability: (args.capabilities || []).includes("tour.publish"),
    })
    if (!evaluation.ok) {
      const legacyShape = {
        score: 0,
        blockers: evaluation.blockers.map((row) => row.message),
        warnings: evaluation.warnings.map((row) => row.message),
        conflicts: evaluation.blockers.map((row) => ({
          severity: "critical" as const,
          message: row.message,
          id: row.id,
        })),
        evaluation,
      }
      throw new AdminTourPublishReadinessError(legacyShape as unknown as ReturnType<typeof getTourReadiness>)
    }

    // PUB-204 — snapshot, audience, deliveries, lifecycle, audit, outbox in one commit.
    const {
      publishTourBookTransactionally,
      resolveTourPublishIdempotencyKey,
    } = await import("@/lib/admin/publication-transactional-publish.service")

    const planVersion =
      typeof (tour as Record<string, unknown>).plan_version === "number"
        ? Number((tour as Record<string, unknown>).plan_version)
        : 1
    const idempotencyKey = resolveTourPublishIdempotencyKey({
      orgId,
      tourId: args.tourId,
      headerKey: args.idempotencyKey,
      sourcePlanVersion: planVersion,
    })

    const published = await publishTourBookTransactionally({
      supabase: args.supabase,
      orgId,
      actorUserId: args.userId,
      tourId: args.tourId,
      idempotencyKey,
      correlationId: args.correlationId,
      sourcePlanVersion: planVersion,
    })

    const refreshed = await this.getTour({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
    })

    return {
      ...refreshed,
      publication: {
        snapshotId: published.result.snapshotId,
        alreadyExisted: published.result.alreadyExisted,
        sequence: published.result.sequence,
        version: published.result.version,
        checksum: published.result.checksum,
        correlationId: published.result.correlationId,
        outboxId: published.result.outboxId,
        deliveryCount: published.assembly.deliveries.length,
        recipientCount: published.assembly.audience.recipient_count,
      },
    }
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
