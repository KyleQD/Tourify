import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TRAVEL-302 / TRAVEL-104 — Travel segment commands.
 * GET: list segments with lifecycle status.
 * POST: transition segment status (propose/confirm/cancel/change).
 */
export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")
      const status = searchParams.get("status")
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)

      let query = supabase
        .from("travel_segments")
        .select("id, org_id, tour_id, event_id, leg_id, person_id, segment_type, status, provider, booking_ref, departure_utc, arrival_utc, notes, created_at, updated_at")
        .eq("org_id", orgId)
        .order("departure_utc", { ascending: true })
        .limit(limit)

      if (tourId) query = query.eq("tour_id", tourId)
      if (eventId) query = query.eq("event_id", eventId)
      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            segments: [],
            unavailable: true,
            unavailableReason: "Travel segments table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const segments = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          legId: r.leg_id ? String(r.leg_id) : null,
          personId: r.person_id ? String(r.person_id) : null,
          segmentType: String(r.segment_type ?? "flight"),
          status: String(r.status ?? "proposed"),
          provider: r.provider ? String(r.provider) : null,
          bookingRef: r.booking_ref ? String(r.booking_ref) : null,
          departureUtc: r.departure_utc ? String(r.departure_utc) : null,
          arrivalUtc: r.arrival_utc ? String(r.arrival_utc) : null,
          notes: r.notes ? String(r.notes) : null,
          createdAt: String(r.created_at ?? ""),
          updatedAt: String(r.updated_at ?? ""),
        }
      })

      const summary = {
        total: segments.length,
        proposed: segments.filter((s) => s.status === "proposed").length,
        confirmed: segments.filter((s) => s.status === "confirmed").length,
        cancelled: segments.filter((s) => s.status === "cancelled").length,
        changed: segments.filter((s) => s.status === "changed").length,
      }

      return NextResponse.json({ success: true, segments, summary, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          segments: [],
          unavailable: true,
          unavailableReason: "Travel segments table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Travel Segments]", error)
      return NextResponse.json({ error: "Travel segments unavailable" }, { status: 503 })
    }
  },
)

// POST — transition segment status
export const POST = withAdminCapability(
  "logistics.manage",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const body = (await request.json()) as Record<string, unknown>
      const { segmentId, command, reason } = body as { segmentId?: string; command?: string; reason?: string }

      if (!segmentId || !command) {
        return NextResponse.json({ error: "segmentId and command are required" }, { status: 400 })
      }

      const ALLOWED_COMMANDS = ["propose", "confirm", "cancel", "change", "reinstate"]
      if (!ALLOWED_COMMANDS.includes(command)) {
        return NextResponse.json({ error: `Unknown command: ${command}` }, { status: 400 })
      }

      const STATUS_MAP: Record<string, string> = {
        propose: "proposed",
        confirm: "confirmed",
        cancel: "cancelled",
        change: "changed",
        reinstate: "proposed",
      }

      const { data: existing } = await supabase
        .from("travel_segments")
        .select("id, status, org_id")
        .eq("id", segmentId)
        .eq("org_id", orgId)
        .single()

      if (!existing) {
        return NextResponse.json({ error: "Segment not found" }, { status: 404 })
      }

      const { error: updateError } = await supabase
        .from("travel_segments")
        .update({ status: STATUS_MAP[command], updated_at: new Date().toISOString() })
        .eq("id", segmentId)
        .eq("org_id", orgId)

      if (updateError) throw new Error(updateError.message)

      return NextResponse.json({ success: true, segmentId, newStatus: STATUS_MAP[command], command })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      console.error("[Admin Travel Segment Command]", error)
      return NextResponse.json({ error: "Command failed" }, { status: 503 })
    }
  },
)
