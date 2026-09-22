import { NextRequest, NextResponse } from "next/server"

import { buildTourStopImpactPreview } from "@/lib/admin/tour-stop-protection"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * PLAN-204 — Impact preview for protected stop mutations.
 * Body: { stop_id?, event_id?, stop_name? }
 */
export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const eventId = body.event_id ? String(body.event_id) : null
    const stopId = body.stop_id ? String(body.stop_id) : eventId || "unknown"
    const stopName = body.stop_name ? String(body.stop_name) : "Stop"

    let publishedOrActive = false
    let ticketsSold = 0
    let contracts = 0
    let staffAssignments = 0
    let settled = false

    if (eventId) {
      const { data: event } = await supabase
        .from("events_v2")
        .select("id, status, settings")
        .eq("id", eventId)
        .eq("org_id", admin.orgId)
        .maybeSingle()
      const status = String(event?.status || "").toLowerCase()
      publishedOrActive = ["published", "confirmed", "active", "on_sale"].includes(status)
      settled = status === "settled" || String(event?.settings?.advance_status || "") === "settled"

      const { count: ticketCount } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
      ticketsSold = ticketCount || 0

      const { count: contractCount } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
      contracts = contractCount || 0

      const { count: staffCount } = await supabase
        .from("event_participants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
      staffAssignments = staffCount || 0
    }

    const { data: tour } = await supabase
      .from("tours")
      .select("settings")
      .eq("id", tourId)
      .eq("org_id", admin.orgId)
      .maybeSingle()
    const settings = tour?.settings && typeof tour.settings === "object" ? tour.settings as Record<string, unknown> : {}
    const legallyRetained = Boolean(settings.legal_hold || settings.legally_retained)

    const preview = buildTourStopImpactPreview({
      stopId,
      eventId,
      stopName,
      counts: {
        publishedOrActive,
        ticketsSold,
        contracts,
        staffAssignments,
        settled,
        legallyRetained,
      },
    })

    return NextResponse.json({ success: true, preview, tourId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Impact preview failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
