import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface ConnectTelemetryRow {
  event_name: string
  connect_session_id: string | null
  platform: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const requestUrl = new URL(request.url)
    const days = Math.min(Math.max(Number(requestUrl.searchParams.get("days") || 7), 1), 30)
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const sinceIso = sinceDate.toISOString()

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from("connect_telemetry_events")
      .select("event_name, connect_session_id, platform, metadata, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(5000)

    if (error)
      return NextResponse.json({ error: "Failed to load connect telemetry summary" }, { status: 500 })

    const rows = (data || []) as ConnectTelemetryRow[]
    const summary = buildConnectTelemetrySummary(rows)

    return NextResponse.json({
      days,
      since: sinceIso,
      ...summary,
    })
  } catch (error) {
    console.error("[Connect Telemetry Summary API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

function buildConnectTelemetrySummary(rows: ConnectTelemetryRow[]) {
  const eventCounts: Record<string, number> = {}
  const platformCounts: Record<string, number> = {}
  const failureReasons: Record<string, number> = {}
  const sessions = new Map<string, { createdAt?: number; claimedAt?: number; confirmedAt?: number }>()

  for (const row of rows) {
    eventCounts[row.event_name] = (eventCounts[row.event_name] || 0) + 1
    const platform = row.platform || "unknown"
    platformCounts[platform] = (platformCounts[platform] || 0) + 1

    if (row.event_name === "connect_session_claim_rejected") {
      const reason = String(row.metadata?.reason || "unknown")
      failureReasons[reason] = (failureReasons[reason] || 0) + 1
    }

    if (!row.connect_session_id) continue

    const createdAtEpoch = new Date(row.created_at).getTime()
    const session = sessions.get(row.connect_session_id) || {}

    if (row.event_name === "connect_session_created" && !session.createdAt)
      session.createdAt = createdAtEpoch
    if (row.event_name === "connect_session_claimed" && !session.claimedAt)
      session.claimedAt = createdAtEpoch
    if (row.event_name === "connect_session_confirmed" && !session.confirmedAt)
      session.confirmedAt = createdAtEpoch

    sessions.set(row.connect_session_id, session)
  }

  const createdSessions = [...sessions.values()].filter((session) => Boolean(session.createdAt)).length
  const claimedSessions = [...sessions.values()].filter((session) => Boolean(session.claimedAt)).length
  const confirmedSessions = [...sessions.values()].filter((session) => Boolean(session.confirmedAt)).length

  const createdToClaimDurations: number[] = []
  const createdToConfirmDurations: number[] = []
  for (const session of sessions.values()) {
    if (session.createdAt && session.claimedAt && session.claimedAt >= session.createdAt)
      createdToClaimDurations.push(Math.round((session.claimedAt - session.createdAt) / 1000))
    if (session.createdAt && session.confirmedAt && session.confirmedAt >= session.createdAt)
      createdToConfirmDurations.push(Math.round((session.confirmedAt - session.createdAt) / 1000))
  }

  return {
    totals: {
      events: rows.length,
      createdSessions,
      claimedSessions,
      confirmedSessions,
      claimRate: createdSessions > 0 ? claimedSessions / createdSessions : 0,
      confirmRate: createdSessions > 0 ? confirmedSessions / createdSessions : 0,
      confirmGivenClaimRate: claimedSessions > 0 ? confirmedSessions / claimedSessions : 0,
      medianSecondsToClaim: getMedian(createdToClaimDurations),
      medianSecondsToConfirm: getMedian(createdToConfirmDurations),
    },
    eventCounts,
    platformCounts,
    topFailureReasons: Object.entries(failureReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count })),
  }
}

function getMedian(values: number[]) {
  if (!values.length) return null
  const sortedValues = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sortedValues.length / 2)
  if (sortedValues.length % 2 === 0)
    return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2)

  return sortedValues[middleIndex]
}
