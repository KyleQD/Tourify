import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

import { buildUniqueEventSlug } from "@/app/api/events/_lib/events-v2-admin"
import { ArtistEventOperationsService } from "@/lib/artist/artist-event-operations.service"
import {
  combineArtistEventTimestamp,
  ensureArtistEventOrgId,
} from "@/lib/artist/artist-event-org"

type SupabaseLike = SupabaseClient | any

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase service configuration")
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export class ArtistEventPromoteService {
  static async promoteEvent({
    supabase,
    userId,
    eventId,
    orgId,
    reason = "native_ticketing",
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    orgId?: string | null
    reason?: "native_ticketing" | "venue_collab" | "org_collab"
  }) {
    const event = await ArtistEventOperationsService.getEvent({ supabase, userId, eventId })
    const service = createServiceClient()

    if (event.promoted_event_v2_id) {
      const { data: existingV2 } = await service
        .from("events_v2")
        .select("id, org_id")
        .eq("id", event.promoted_event_v2_id)
        .maybeSingle()

      return {
        event,
        events_v2_id: event.promoted_event_v2_id,
        org_id: existingV2?.org_id || event.producer_settings?.promoted_org_id || null,
        alreadyPromoted: true,
      }
    }

    const resolvedOrgId = orgId || (await ensureArtistEventOrgId(userId))
    const title = event.title || event.name || "Untitled event"
    const slug = await buildUniqueEventSlug(service as any, resolvedOrgId, title)
    const startAt = combineArtistEventTimestamp(event.event_date, event.start_time)
    const endAt = combineArtistEventTimestamp(event.event_date, event.end_time || event.start_time)

    const settings = {
      ...(event.producer_settings || {}),
      artist_source_event_id: event.id,
      artist_id: userId,
      promote_reason: reason,
      venue_name: event.venue_name,
      city: event.city,
      state: event.state,
      country: event.country,
      address: event.address,
      description: event.description,
      ticket_url: event.ticket_url,
      ticket_price_min: event.ticket_price_min,
      ticket_price_max: event.ticket_price_max,
    }

    const { data: v2, error } = await service
      .from("events_v2")
      .insert({
        org_id: resolvedOrgId,
        title,
        slug,
        status: event.status === "published" ? "confirmed" : "inquiry",
        start_at: startAt,
        end_at: endAt,
        timezone: event.producer_settings?.timezone || "America/Los_Angeles",
        capacity: event.capacity || null,
        settings,
        created_by: userId,
      })
      .select("id, slug, org_id, status")
      .single()

    if (error || !v2?.id) throw new Error(error?.message || "Failed to promote event")

    const { data: linked, error: linkError } = await supabase
      .from("events")
      .update({
        promoted_event_v2_id: v2.id,
        updated_at: new Date().toISOString(),
        producer_settings: {
          ...(event.producer_settings || {}),
          promoted_at: new Date().toISOString(),
          promote_reason: reason,
          promoted_org_id: resolvedOrgId,
        },
      })
      .eq("id", eventId)
      .eq("artist_id", userId)
      .select("*")
      .single()

    if (linkError) throw linkError

    return {
      event: linked,
      events_v2_id: v2.id,
      org_id: resolvedOrgId,
      alreadyPromoted: false,
    }
  }

  static async inviteCollaborator({
    supabase,
    userId,
    eventId,
    inviteeUserId,
    role = "collaborator",
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    inviteeUserId: string
    role?: string
  }) {
    const promoted = await this.promoteEvent({
      supabase,
      userId,
      eventId,
      reason: "org_collab",
    })

    const service = createServiceClient()
    const orgId = promoted.org_id || promoted.event?.producer_settings?.promoted_org_id
    if (!orgId) throw new Error("Promoted event is missing organization scope")

    const { data: existing } = await service
      .from("org_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", inviteeUserId)
      .maybeSingle()

    if (!existing) {
      const { error } = await service.from("org_members").insert({
        org_id: orgId,
        user_id: inviteeUserId,
        role: role === "owner" ? "admin" : "member",
        invited_by: userId,
      })
      if (error) throw error
    }

    const settings = {
      ...(promoted.event?.producer_settings || {}),
      collaborators: [
        ...((promoted.event?.producer_settings?.collaborators as any[]) || []).filter(
          (item: any) => item?.user_id !== inviteeUserId,
        ),
        { user_id: inviteeUserId, role, invited_at: new Date().toISOString() },
      ],
    }

    await supabase
      .from("events")
      .update({ producer_settings: settings, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("artist_id", userId)

    return { ...promoted, inviteeUserId, role }
  }

  static async listTicketTypes({
    supabase,
    userId,
    eventId,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
  }) {
    const event = await ArtistEventOperationsService.getEvent({ supabase, userId, eventId })
    if (!event.promoted_event_v2_id) return []

    const { data, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", event.promoted_event_v2_id)
      .order("priority_order", { ascending: true })

    if (error) throw error
    return data || []
  }

  static async upsertTicketType({
    supabase,
    userId,
    eventId,
    input,
  }: {
    supabase: SupabaseLike
    userId: string
    eventId: string
    input: {
      id?: string
      name: string
      price: number
      quantity_available: number
      description?: string
      category?: string
    }
  }) {
    const promoted = await this.promoteEvent({
      supabase,
      userId,
      eventId,
      reason: "native_ticketing",
    })

    const payload = {
      event_id: promoted.events_v2_id,
      name: input.name,
      description: input.description || null,
      price: input.price,
      quantity_available: input.quantity_available,
      category: input.category || "general",
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      const { data, error } = await supabase
        .from("ticket_types")
        .update(payload)
        .eq("id", input.id)
        .eq("event_id", promoted.events_v2_id)
        .select("*")
        .single()
      if (error) throw error
      return { ticketType: data, events_v2_id: promoted.events_v2_id }
    }

    const { data, error } = await supabase
      .from("ticket_types")
      .insert(payload)
      .select("*")
      .single()
    if (error) throw error
    return { ticketType: data, events_v2_id: promoted.events_v2_id }
  }
}
