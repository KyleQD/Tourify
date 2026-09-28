import { NextRequest, NextResponse } from "next/server"

import {
  adminAccessErrorResponse,
  assertEventAuthority,
  extractIdFromPath,
  requireEventChildAccess,
} from "@/lib/admin/admin-tour-event-access"
import { mapAdvancingStatusToTourAdvanceStatus } from "@/lib/admin/admin-ops-context"
import { resolveAdvanceShareNotificationUrl } from "@/lib/admin/publication-share-surface-inventory"
import { withAdminCapability } from "@/lib/auth/api-auth"

export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    const access = await assertEventAuthority({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    const { data: existing } = await supabase
      .from("advancing_documents")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle()

    if (existing) return NextResponse.json({ advancing: existing })

    const { data: event } = await supabase
      .from("events_v2")
      .select("id, title, venue_id, settings, start_at, org_id")
      .eq("id", eventId)
      .maybeSingle()

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const settings = event.settings || {}
    const stub = {
      event_id: eventId,
      org_id: access.orgId || event.org_id,
      venue_contact_name: settings.venue_contact_name || null,
      venue_contact_phone: settings.venue_contact_phone || null,
      venue_contact_email: settings.venue_contact_email || null,
      status: "pending",
    }

    return NextResponse.json({ advancing: stub, auto_generated: true })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to load advancing")
    return NextResponse.json({ error: message }, { status })
  }
})

export const POST = withAdminCapability("advance.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    const access = await assertEventAuthority({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })
    if (!access.orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 })

    const body = await request.json()

    const { data, error } = await supabase
      .from("advancing_documents")
      .upsert(
        {
          ...body,
          event_id: eventId,
          org_id: access.orgId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (body.status !== undefined) {
      await supabase
        .from("tour_events")
        .update({ advance_status: mapAdvancingStatusToTourAdvanceStatus(body.status) })
        .eq("event_id", eventId)
    }

    if (body.status === "sent") {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
        const serviceClient = createServiceRoleClient()
        const { data: event } = await supabase
          .from("events_v2")
          .select("title, settings")
          .eq("id", eventId)
          .maybeSingle()
        const eventTitle = event?.title || "your event"
        const settings =
          event?.settings && typeof event.settings === "object"
            ? (event.settings as Record<string, unknown>)
            : {}
        const notifyUserIds = new Set<string>()

        let venueEmail = data?.venue_contact_email || body.venue_contact_email || null
        const venueAccountId = typeof settings.venue_account_id === "string" ? settings.venue_account_id : null
        if (venueAccountId) {
          const { data: venueProfile } = await serviceClient
            .from("venue_profiles")
            .select("id, contact_info, user_id")
            .eq("id", venueAccountId)
            .maybeSingle()
          const contactInfo =
            venueProfile?.contact_info && typeof venueProfile.contact_info === "object"
              ? (venueProfile.contact_info as Record<string, unknown>)
              : {}
          if (typeof contactInfo.email === "string" && contactInfo.email.trim()) {
            venueEmail = contactInfo.email.trim()
          }
          if (venueProfile?.user_id) notifyUserIds.add(venueProfile.user_id)
        }

        if (venueEmail) {
          const { data: profiles } = await serviceClient
            .from("profiles")
            .select("id")
            .eq("email", venueEmail)
          for (const profile of profiles || []) notifyUserIds.add(profile.id)
        }

        const { data: participants } = await supabase
          .from("event_participants")
          .select("participant_id")
          .eq("event_id", eventId)
          .in("participant_type", ["Individual", "Artist"])
          .limit(100)

        for (const participant of participants || []) {
          if (participant.participant_id) notifyUserIds.add(participant.participant_id)
        }

        if (notifyUserIds.size > 0) {
          await serviceClient.from("notifications").insert(
            Array.from(notifyUserIds).map((userId) => ({
              user_id: userId,
              type: "advance_sent",
              title: `Advance sent: ${eventTitle}`,
              content: `The advancing package for ${eventTitle} has been marked as sent.`,
              metadata: {
                event_id: eventId,
                url: resolveAdvanceShareNotificationUrl({
                  shareToken: data?.share_token,
                  eventId,
                }),
              },
            })),
          )
        }
      } catch (notifyError) {
        console.warn("[Advancing] mark-sent notification skipped:", notifyError)
      }
    }

    return NextResponse.json({ advancing: data })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to save advancing")
    return NextResponse.json({ error: message }, { status })
  }
})

export const PATCH = withAdminCapability("advance.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    await assertEventAuthority({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    const body = await request.json()
    const { id, ...updates } = body

    if (typeof id === "string" && id.trim()) {
      await requireEventChildAccess({
        supabase,
        userId: user.id,
        eventId,
        orgId: admin.orgId,
        childTable: "advancing_documents",
        childId: id,
        parentFkColumn: "event_id",
      })
    }

    const { data, error } = await supabase
      .from("advancing_documents")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .eq("org_id", admin.orgId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (updates.status !== undefined) {
      await supabase
        .from("tour_events")
        .update({ advance_status: mapAdvancingStatusToTourAdvanceStatus(updates.status) })
        .eq("event_id", eventId)
    }

    return NextResponse.json({ advancing: data })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to update advancing")
    return NextResponse.json({ error: message }, { status })
  }
})
