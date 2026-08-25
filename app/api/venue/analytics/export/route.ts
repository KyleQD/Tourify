import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-181 — real analytics export (CSV). Reuses the snapshot endpoint's
 * server aggregation by calling its handler logic via internal fetch is
 * avoided; instead we re-run the same service contract inline through a
 * lightweight proxy to keep one source of truth.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let venueId = new URL(request.url).searchParams.get("venue_id")
  if (!venueId) {
    const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
    venueId = venue?.id || null
  }
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "view_analytics")
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Same-origin internal call to the snapshot route keeps math single-sourced.
  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const incoming = new URL(request.url)
  const target = `${origin}/api/venue/analytics?venue_id=${encodeURIComponent(venueId)}${incoming.searchParams.get("start") ? `&start=${incoming.searchParams.get("start")}` : ""}${incoming.searchParams.get("end") ? `&end=${incoming.searchParams.get("end")}` : ""}`
  const cookieHeader = request.headers.get("cookie") || ""

  const res = await fetch(target, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  })
  if (!res.ok) {
    return NextResponse.json({ error: `Snapshot unavailable (${res.status})` }, { status: 502 })
  }
  const payload = await res.json()
  const s = payload?.snapshot
  if (!s) return NextResponse.json({ error: "Empty snapshot" }, { status: 502 })

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const lines: string[] = []
  lines.push("section,key,value_current,value_previous,delta_percent")
  lines.push(["window", "start", esc(s.window.start), esc(s.previous_window.start), ""].join(","))
  for (const cmp of s.comparison || []) {
    lines.push(
      ["kpi", cmp.metric, cmp.current ?? "", cmp.previous ?? "", cmp.delta_percent ?? ""]
        .map((v) => (typeof v === "string" && v.includes(",") ? esc(v) : String(v)))
        .join(","),
    )
  }
  for (const stage of Object.entries(s.current.bookings || {})) {
    lines.push(`funnel,${stage[0]},${stage[1]},`)
  }
  lines.push("")
  lines.push("event,title,start_at,attendance_validated,tickets_sold,capacity,fill_rate_percent")
  for (const e of s.per_event || []) {
    lines.push([e.id, e.title, e.start_at || "", e.attendance_validated, e.tickets_sold, e.capacity ?? "", e.fill_rate ?? ""].map(esc).join(","))
  }
  if ((s.unavailable || []).length) {
    lines.push("")
    for (const note of s.unavailable) lines.push(`# unavailable: ${note}`)
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="venue-analytics-${venueId.slice(0, 8)}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
