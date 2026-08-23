/**
 * POST /api/world/stations/report
 *
 * P16-T08 — listener reporting/correction + health feedback for stations.
 * Fail-closed validation; rows land in world_radio_station_reports for
 * console triage (never auto-mutating station state).
 */
import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const REPORT_KINDS = ["correction", "health_feedback", "unavailable"] as const

export async function POST(request: NextRequest) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const stationId = typeof body.stationId === "string" ? body.stationId.trim() : ""
  const reportKind = typeof body.reportKind === "string" ? body.reportKind : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!stationId || stationId.includes("://")) {
    return NextResponse.json({ error: "invalid_station_id" }, { status: 400 })
  }
  if (!(REPORT_KINDS as readonly string[]).includes(reportKind)) {
    return NextResponse.json({ error: "invalid_report_kind" }, { status: 400 })
  }
  if (!message || message.length > 1000) {
    return NextResponse.json({ error: "message_required_1_to_1000" }, { status: 400 })
  }

  const supabase = await createClient()
  // Generated DB types predate P16 tables; console slices use explicitly
  // annotated structural clients rather than regenerating shared types.
  const reports = (supabase as unknown as {
    from(table: string): {
      insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>
    }
  }).from("world_radio_station_reports")
  const inserted = await reports.insert({
    station_id: stationId,
    report_kind: reportKind,
    message,
  })
  if (inserted.error) {
    // Unknown station ids or RLS denials fail closed without detail leaks.
    return NextResponse.json({ error: "report_rejected" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
