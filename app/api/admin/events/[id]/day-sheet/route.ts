import { NextRequest, NextResponse } from "next/server"

import {
  adminAccessErrorResponse,
  assertEventAuthority,
  extractIdFromPath,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
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

    const { data: existing } = await supabase
      .from("day_sheets")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle()

    if (existing) {
      const { data: receipts } = await supabase
        .from("day_sheet_receipts")
        .select("*")
        .eq("event_id", eventId)
        .order("sent_at", { ascending: false })

      return NextResponse.json({ day_sheet: existing, receipts: receipts || [] })
    }

    const [{ data: event }, { data: adv }] = await Promise.all([
      supabase.from("events_v2").select("id, title, start_at, settings, org_id").eq("id", eventId).maybeSingle(),
      supabase
        .from("advancing_documents")
        .select("catering_notes, venue_contact_phone")
        .eq("event_id", eventId)
        .maybeSingle(),
    ])

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const settings = event.settings || {}
    const startAt = event.start_at ? new Date(event.start_at) : new Date()

    const toTime = (hhmm: string | null | undefined) => {
      if (!hhmm) return null
      return hhmm.length === 5 ? hhmm : null
    }

    const stub = {
      event_id: eventId,
      org_id: event.org_id,
      venue_name: settings.venue_label || "",
      load_in_time: toTime(settings.load_in_time),
      sound_check_time: toTime(settings.sound_check_time),
      doors_open_time: toTime(settings.doors_open),
      headliner_set_time: startAt.toTimeString().slice(0, 5),
      catering_notes: adv?.catering_notes || null,
    }

    return NextResponse.json({ day_sheet: stub, auto_generated: true })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to load day sheet")
    return NextResponse.json({ error: message }, { status })
  }
})

export const POST = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
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
      .from("day_sheets")
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
    return NextResponse.json({ day_sheet: data })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to save day sheet")
    return NextResponse.json({ error: message }, { status })
  }
})
