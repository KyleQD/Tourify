import "server-only"

import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getArtistEventVisibility,
  visibilityToIsPublic,
  type ArtistEventVisibility,
} from "@/lib/artist/artist-event-visibility"
import {
  combineArtistEventTimestamp,
  ensureArtistEventOrgId,
} from "@/lib/artist/artist-event-org"
import { normalizeArtistEventDate } from "@/lib/artist/normalize-artist-event-date"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type SupabaseLike = SupabaseClient | any

export const artistEventInputSchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  event_type: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  event_date: z.string().optional().nullable(),
  doors_open: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  venue_name: z.string().optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  capacity: z.union([z.number().int(), z.null()]).optional(),
  tags: z.array(z.string()).optional(),
  setlist: z.array(z.string()).optional(),
  ticket_url: z.string().optional().nullable(),
  ticket_price_min: z.union([z.number(), z.null()]).optional(),
  ticket_price_max: z.union([z.number(), z.null()]).optional(),
  poster_url: z.string().optional().nullable(),
  creator_account_type: z.string().optional(),
  creation_source: z.string().optional().nullable(),
  producer_settings: z.record(z.unknown()).optional().nullable(),
})

function buildUniqueSlug(title: string) {
  const base = (title || "event")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "event"
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

function assertOwnership(event: { artist_id?: string | null; created_by?: string | null } | null, userId: string) {
  if (!event) throw Object.assign(new Error("Event not found"), { status: 404 })
  if (event.artist_id !== userId && event.created_by !== userId) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

function rowToApiEvent(row: any) {
  if (!row) return null
  const settings = row.producer_settings || {}
  const eventDate = normalizeArtistEventDate(row)
  return {
    ...row,
    title: row.title || row.name,
    name: row.name || row.title,
    description: row.description ?? settings.description ?? "",
    event_date: eventDate || row.event_date || null,
    producer_settings: settings,
    access_role: row.access_role || "owner",
    collaborator_permissions: row.collaborator_permissions || null,
  }
}

async function listAcceptedBookingCollaboratorEvents(userId: string, status?: string | null) {
  const service = createServiceRoleClient()
  const { data: bookingRows } = await service
    .from("booking_requests")
    .select("id, event_id, event_collaboration_status")
    .eq("artist_id", userId)
    .eq("status", "accepted")
    .not("event_id", "is", null)

  const eventIds = Array.from(new Set((bookingRows || []).map((row: any) => row.event_id).filter(Boolean)))
  if (eventIds.length === 0) return []

  let query = service
    .from("events_v2")
    .select("id, title, slug, status, start_at, end_at, timezone, capacity, settings, created_by, org_id")
    .in("id", eventIds)
    .order("start_at", { ascending: true })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((row: any) => {
    const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
    return rowToApiEvent({
      ...row,
      name: row.title,
      event_type: settings.event_type || settings.type || "other",
      event_date: row.start_at ? String(row.start_at).slice(0, 10) : null,
      start_time: row.start_at ? String(row.start_at).slice(11, 16) : null,
      venue_name: settings.venue_name || null,
      city: settings.city || null,
      state: settings.state || null,
      country: settings.country || null,
      ticket_url: settings.ticket_url || null,
      description: settings.description || "",
      access_role: "collaborator",
      collaborator_permissions: {
        promote: true,
        view_public_details: true,
        view_artist_activity: true,
        view_limited_insights: true,
        edit_event: false,
        assign_roles: false,
        manage_financials: false,
      },
    })
  })
}

function extractMissingColumn(message?: string | null): string | null {
  const match = String(message || "").match(/Could not find the '([^']+)' column/i)
  return match?.[1] || null
}

async function insertEventWithColumnFallback({
  supabase,
  payload,
}: {
  supabase: SupabaseLike
  payload: Record<string, unknown>
}) {
  let attemptPayload = { ...payload }
  let lastError: any = null

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from("events")
      .insert(attemptPayload)
      .select("*")
      .single()

    if (!error) return data

    lastError = error
    // Only retry for PostgREST missing-column schema cache errors — not NOT NULL (23502)
    const isMissingColumn =
      error.code === "PGRST204" || /Could not find the '[^']+' column/i.test(error.message || "")
    if (!isMissingColumn) throw error

    const missing = extractMissingColumn(error.message)

    if (missing && Object.prototype.hasOwnProperty.call(attemptPayload, missing)) {
      if (missing === "description" && attemptPayload.description != null) {
        const settings =
          attemptPayload.producer_settings && typeof attemptPayload.producer_settings === "object"
            ? { ...(attemptPayload.producer_settings as Record<string, unknown>) }
            : {}
        settings.description = attemptPayload.description
        attemptPayload.producer_settings = settings
      }
      delete attemptPayload[missing]
      continue
    }

    throw error
  }

  throw lastError || new Error("Failed to create event")
}

async function updateEventWithColumnFallback({
  supabase,
  eventId,
  userId,
  payload,
}: {
  supabase: SupabaseLike
  eventId: string
  userId: string
  payload: Record<string, unknown>
}) {
  let attemptPayload = { ...payload }
  let lastError: any = null

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from("events")
      .update(attemptPayload)
      .eq("id", eventId)
      .eq("artist_id", userId)
      .select("*")
      .single()

    if (!error) return data

    lastError = error
    const isMissingColumn =
      error.code === "PGRST204" || /Could not find the '[^']+' column/i.test(error.message || "")
    if (!isMissingColumn) throw error

    const missing = extractMissingColumn(error.message)

    if (missing && Object.prototype.hasOwnProperty.call(attemptPayload, missing)) {
      if (missing === "description" && attemptPayload.description != null) {
        const settings =
          attemptPayload.producer_settings && typeof attemptPayload.producer_settings === "object"
            ? { ...(attemptPayload.producer_settings as Record<string, unknown>) }
            : {}
        settings.description = attemptPayload.description
        attemptPayload.producer_settings = settings
      }
      delete attemptPayload[missing]
      continue
    }

    throw error
  }

  throw lastError || new Error("Failed to update event")
}

export class ArtistEventOperationsService {
  static async listEvents({
    supabase,
    userId,
    status,
  }: {
    supabase: SupabaseLike
    userId: string
    status?: string | null
  }) {
    let query = supabase
      .from("events")
      .select("*")
      .or(`artist_id.eq.${userId},created_by.eq.${userId}`)
      .order("event_date", { ascending: true })

    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) throw error
    const ownedEvents = (data || []).map(rowToApiEvent)
    const collaboratorEvents = await listAcceptedBookingCollaboratorEvents(userId, status)
    const byId = new Map<string, any>()
    for (const event of [...ownedEvents, ...collaboratorEvents]) {
      if (event?.id && !byId.has(String(event.id))) byId.set(String(event.id), event)
    }
    return Array.from(byId.values())
  }

  static async getEvent({
    supabase,
    userId,
    eventId,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
  }) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle()

    if (error) throw error
    assertOwnership(data, userId)
    return rowToApiEvent(data)
  }

  static async createEvent({
    supabase,
    userId,
    input,
  }: {
    supabase: SupabaseLike
    userId: string
    input: unknown
  }) {
    const parsed = artistEventInputSchema.parse(input || {})
    const title = (parsed.title || parsed.name || "Untitled event").trim()
    const slug = buildUniqueSlug(title)
    const now = new Date().toISOString()
    const orgId = await ensureArtistEventOrgId(userId)
    const timezone =
      (parsed.producer_settings as any)?.timezone ||
      "America/Los_Angeles"
    const startAt = combineArtistEventTimestamp(parsed.event_date, parsed.start_time, now)
    const endAt = combineArtistEventTimestamp(
      parsed.event_date,
      parsed.end_time || parsed.start_time,
      startAt,
    )
    const producerSettings = {
      ...(parsed.producer_settings || {}),
      timezone,
    }

    const insertPayload: Record<string, unknown> = {
      org_id: orgId,
      artist_id: userId,
      created_by: userId,
      creator_account_type: "artist",
      title,
      name: title,
      description: parsed.description || "",
      event_type: parsed.event_type || parsed.type || "concert",
      status: parsed.status === "published" ? "published" : "draft",
      event_date: parsed.event_date || null,
      doors_open: parsed.doors_open || null,
      start_time: parsed.start_time || null,
      end_time: parsed.end_time || null,
      start_at: startAt,
      end_at: endAt,
      timezone,
      settings: producerSettings,
      venue_name: parsed.venue_name || null,
      venue_id: parsed.venue_id || null,
      address: parsed.address || null,
      city: parsed.city || null,
      state: parsed.state || null,
      country: parsed.country || null,
      capacity: parsed.capacity ?? null,
      tags: parsed.tags || [],
      setlist: parsed.setlist || [],
      slug,
      ticket_url: parsed.ticket_url || null,
      ticket_price_min: parsed.ticket_price_min ?? null,
      ticket_price_max: parsed.ticket_price_max ?? null,
      poster_url: parsed.poster_url || null,
      producer_settings: producerSettings,
      tickets_sold: 0,
      revenue: 0,
      created_at: now,
      updated_at: now,
    }

    const createVisibility = getArtistEventVisibility({
      producer_settings: producerSettings as any,
    })
    insertPayload.is_public = visibilityToIsPublic(createVisibility)

    const data = await insertEventWithColumnFallback({
      supabase,
      payload: insertPayload,
    })
    return rowToApiEvent(data)
  }

  static async updateEvent({
    supabase,
    userId,
    eventId,
    input,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    input: unknown
  }) {
    await this.getEvent({ supabase, userId, eventId })
    const parsed = artistEventInputSchema.parse(input || {})
    const title = (parsed.title || parsed.name || "").trim()

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title) {
      updatePayload.title = title
      updatePayload.name = title
    }
    if (parsed.description !== undefined) updatePayload.description = parsed.description
    if (parsed.event_type || parsed.type) {
      updatePayload.event_type = parsed.event_type || parsed.type
    }
    if (parsed.status) updatePayload.status = parsed.status
    if (parsed.event_date !== undefined) updatePayload.event_date = parsed.event_date
    if (parsed.doors_open !== undefined) updatePayload.doors_open = parsed.doors_open
    if (parsed.start_time !== undefined) updatePayload.start_time = parsed.start_time
    if (parsed.end_time !== undefined) updatePayload.end_time = parsed.end_time
    if (parsed.venue_name !== undefined) updatePayload.venue_name = parsed.venue_name
    if (parsed.venue_id !== undefined) updatePayload.venue_id = parsed.venue_id
    if (parsed.address !== undefined) updatePayload.address = parsed.address
    if (parsed.city !== undefined) updatePayload.city = parsed.city
    if (parsed.state !== undefined) updatePayload.state = parsed.state
    if (parsed.country !== undefined) updatePayload.country = parsed.country
    if (parsed.capacity !== undefined) updatePayload.capacity = parsed.capacity
    if (parsed.tags !== undefined) updatePayload.tags = parsed.tags
    if (parsed.setlist !== undefined) updatePayload.setlist = parsed.setlist
    if (parsed.ticket_url !== undefined) updatePayload.ticket_url = parsed.ticket_url
    if (parsed.ticket_price_min !== undefined) updatePayload.ticket_price_min = parsed.ticket_price_min
    if (parsed.ticket_price_max !== undefined) updatePayload.ticket_price_max = parsed.ticket_price_max
    if (parsed.poster_url !== undefined) updatePayload.poster_url = parsed.poster_url
    if (parsed.producer_settings !== undefined) {
      updatePayload.producer_settings = parsed.producer_settings
      const visibility = getArtistEventVisibility({ producer_settings: parsed.producer_settings as any })
      updatePayload.is_public = visibilityToIsPublic(visibility)
    }

    const data = await updateEventWithColumnFallback({
      supabase,
      eventId,
      userId,
      payload: updatePayload,
    })
    return rowToApiEvent(data)
  }

  static async deleteEvent({
    supabase,
    userId,
    eventId,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
  }) {
    await this.getEvent({ supabase, userId, eventId })
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("artist_id", userId)
    if (error) throw error
    return { id: eventId }
  }

  static async publishEvent({
    supabase,
    userId,
    eventId,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
  }) {
    const event = await this.getEvent({ supabase, userId, eventId })
    if (!event.title?.trim() && !event.name?.trim()) {
      throw Object.assign(new Error("Title is required to publish"), { status: 400 })
    }
    if (!event.event_date) {
      throw Object.assign(new Error("Event date is required to publish"), { status: 400 })
    }
    if (!event.venue_name && !event.city) {
      throw Object.assign(new Error("Venue or city is required to publish"), { status: 400 })
    }

    let slug = event.slug
    if (!slug) {
      slug = buildUniqueSlug(event.title || event.name || "event")
    }

    const visibility = getArtistEventVisibility(event) as ArtistEventVisibility
    const updatePayload: Record<string, unknown> = {
      status: "published",
      slug,
      is_public: visibilityToIsPublic(visibility),
      updated_at: new Date().toISOString(),
    }

    let { data, error } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", eventId)
      .eq("artist_id", userId)
      .select("*")
      .single()

    if (error && (error.code === "PGRST204" || /column/i.test(error.message || ""))) {
      delete updatePayload.is_public
      const retry = await supabase
        .from("events")
        .update(updatePayload)
        .eq("id", eventId)
        .eq("artist_id", userId)
        .select("*")
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    const published = rowToApiEvent(data)
    const alreadyPublished = event.status === "published"

    // Idempotent feed post: skip if a post already exists for this event_id
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("type", "event")
      .limit(50)

    const hasFeedPost = (existingPosts || []).some((post: any) => {
      const meta = post?.metadata
      if (!meta || typeof meta !== "object") return false
      return String(meta.event_id || "") === String(published.id)
    })

    if (!hasFeedPost && !alreadyPublished) {
      const eventDate = published.event_date || ""
      const location = [published.venue_name, published.city].filter(Boolean).join(", ")
      const postVisibility = visibility === "private" ? "private" : "public"
      const postContent = [
        `New event: "${published.title || published.name}"`,
        eventDate ? `📅 ${eventDate}` : "",
        location ? `📍 ${location}` : "",
        published.description ? `\n${String(published.description).slice(0, 200)}` : "",
      ]
        .filter(Boolean)
        .join(" ")

      const { error: postError } = await supabase.from("posts").insert({
        user_id: userId,
        content: postContent,
        type: "event",
        visibility: postVisibility,
        hashtags: ["event", "livemusic"],
        metadata: {
          event_id: published.id,
          event_slug: published.slug || slug,
          event_title: published.title || published.name,
          event_date: eventDate,
          event_location: location,
        },
      })
      if (postError) console.error("[ArtistEventOps] Failed to create feed post:", postError)
    }

    return published
  }
}

export function getArtistEventErrorStatus(error: any, fallback = 500) {
  if (error?.status && Number.isFinite(error.status)) return error.status
  if (error?.code === "PGRST116") return 404
  return fallback
}
