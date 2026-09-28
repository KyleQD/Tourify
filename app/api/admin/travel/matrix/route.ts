import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TRAVEL-301 / LODGE-302 — Party travel matrix.
 * Returns person × route-leg coverage matrix for the acting org.
 */
export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")

      // Load route legs for this tour/event
      const legQuery = supabase
        .from("tour_route_legs")
        .select("id, tour_id, from_stop_id, to_stop_id, mode, departure_utc, arrival_utc, org_id, leg_order")
        .eq("org_id", orgId)
        .order("leg_order", { ascending: true })
        .limit(50)

      if (tourId) void legQuery.eq("tour_id", tourId)

      const { data: legs, error: legError } = await legQuery

      if (legError) {
        if (legError.code === "42P01") {
          return NextResponse.json({
            success: true,
            matrix: { legs: [], persons: [], cells: [] },
            unavailable: true,
            unavailableReason: "Route legs table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(legError.message)
      }

      // Load travel segments linked to legs
      const segmentQuery = supabase
        .from("travel_segments")
        .select("id, leg_id, person_id, status, segment_type, departure_utc, arrival_utc, notes")
        .eq("org_id", orgId)
        .limit(200)

      if (tourId) void segmentQuery.eq("tour_id", tourId)
      if (eventId) void segmentQuery.eq("event_id", eventId)

      const { data: segments, error: segError } = await segmentQuery

      if (segError && segError.code !== "42P01") throw new Error(segError.message)

      // Load lodging inventory for rooms-covered column
      const lodgingQuery = supabase
        .from("lodging_blocks")
        .select("id, event_id, person_id, status, check_in_date, check_out_date")
        .eq("org_id", orgId)
        .limit(200)

      if (eventId) void lodgingQuery.eq("event_id", eventId)
      const { data: lodging } = await lodgingQuery

      const safeLegs = ((legs ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          legOrder: Number(r.leg_order ?? 0),
          mode: String(r.mode ?? "ground"),
          departureUtc: r.departure_utc ? String(r.departure_utc) : null,
          arrivalUtc: r.arrival_utc ? String(r.arrival_utc) : null,
        }
      })

      const safeSegments = ((segments ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          legId: r.leg_id ? String(r.leg_id) : null,
          personId: r.person_id ? String(r.person_id) : null,
          status: String(r.status ?? "proposed"),
          segmentType: String(r.segment_type ?? "flight"),
        }
      })

      // Build person set from segments
      const personIds = [...new Set(safeSegments.map((s) => s.personId).filter(Boolean))]

      // Build cell matrix: person × leg → status
      type CellStatus = "confirmed" | "proposed" | "missing" | "not_required"
      interface MatrixCell { personId: string; legId: string; status: CellStatus }
      const cells: MatrixCell[] = []

      for (const personId of personIds) {
        for (const leg of safeLegs) {
          const seg = safeSegments.find((s) => s.personId === personId && s.legId === leg.id)
          const status: CellStatus = seg
            ? seg.status === "confirmed" ? "confirmed" : "proposed"
            : "missing"
          cells.push({ personId: personId!, legId: leg.id, status })
        }
      }

      // Lodging summary per person
      const lodgingByPerson: Record<string, number> = {}
      for (const room of (lodging ?? []) as unknown[]) {
        const r = room as Record<string, unknown>
        const pid = r.person_id ? String(r.person_id) : null
        if (pid) lodgingByPerson[pid] = (lodgingByPerson[pid] ?? 0) + 1
      }

      return NextResponse.json({
        success: true,
        matrix: {
          legs: safeLegs,
          persons: personIds.map((pid) => ({
            id: pid,
            lodgingNights: lodgingByPerson[pid!] ?? 0,
          })),
          cells,
        },
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          matrix: { legs: [], persons: [], cells: [] },
          unavailable: true,
          unavailableReason: "Travel matrix tables not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Travel Matrix]", error)
      return NextResponse.json({ error: "Travel matrix unavailable" }, { status: 503 })
    }
  },
)
