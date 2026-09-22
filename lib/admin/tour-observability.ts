/**
 * TOUR-106 — Tour access and latency instrumentation.
 *
 * Captures list/summary latency, denied/failed calls, stale read models,
 * legacy-route usage, and client request fanout.
 */

import { createClient } from "@supabase/supabase-js"

export type TourTelemetryEventName =
  | "tour.list"
  | "tour.summary"
  | "tour.access_denied"
  | "tour.request_failed"
  | "tour.stale_read"
  | "tour.legacy_route"
  | "tour.client_fanout"

export interface TourTelemetryEvent {
  eventName: TourTelemetryEventName
  endpoint: string
  orgId?: string | null
  userId?: string | null
  tourId?: string | null
  statusCode?: number | null
  latencyMs?: number | null
  correlationId?: string | null
  isLegacy?: boolean
  isStale?: boolean
  fanoutCount?: number | null
  errorCode?: string | null
  metadata?: Record<string, unknown>
}

const recentEvents: TourTelemetryEvent[] = []
const MAX_RECENT = 200

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Test helper — recent in-process events (ring buffer). */
export function getRecentTourTelemetry(): readonly TourTelemetryEvent[] {
  return recentEvents
}

export function clearRecentTourTelemetry(): void {
  recentEvents.length = 0
}

export async function recordTourTelemetry(event: TourTelemetryEvent): Promise<void> {
  recentEvents.push(event)
  if (recentEvents.length > MAX_RECENT) recentEvents.shift()

  if (process.env.NODE_ENV !== "test") {
    console.info(
      "[tour telemetry]",
      JSON.stringify({
        event: event.eventName,
        endpoint: event.endpoint,
        orgId: event.orgId ?? null,
        latencyMs: event.latencyMs ?? null,
        statusCode: event.statusCode ?? null,
        isLegacy: Boolean(event.isLegacy),
        isStale: Boolean(event.isStale),
        fanoutCount: event.fanoutCount ?? null,
        correlationId: event.correlationId ?? null,
        errorCode: event.errorCode ?? null,
      }),
    )
  }

  try {
    const admin = createServiceClient()
    if (!admin) return
    const { error } = await admin.from("admin_tour_api_telemetry").insert({
      event_name: event.eventName,
      endpoint: event.endpoint,
      org_id: event.orgId || null,
      user_id: event.userId || null,
      tour_id: event.tourId || null,
      status_code: event.statusCode ?? null,
      latency_ms: event.latencyMs ?? null,
      correlation_id: event.correlationId || null,
      is_legacy: Boolean(event.isLegacy),
      is_stale: Boolean(event.isStale),
      fanout_count: event.fanoutCount ?? null,
      error_code: event.errorCode || null,
      metadata: event.metadata || {},
    })
    if (error) console.warn("[tour telemetry] insert skipped:", error.message)
  } catch (error) {
    console.warn("[tour telemetry] insert skipped:", error)
  }
}

export function startTourTimer(): { startedAt: number; elapsedMs: () => number } {
  const startedAt = Date.now()
  return {
    startedAt,
    elapsedMs: () => Math.max(Date.now() - startedAt, 0),
  }
}

export async function withTourListTelemetry<T>(args: {
  endpoint: string
  orgId?: string | null
  userId?: string | null
  correlationId?: string | null
  isLegacy?: boolean
  run: () => Promise<T>
  getStatus: (result: T) => number
  getStale?: (result: T) => boolean
  getErrorCode?: (result: T) => string | null
}): Promise<T> {
  const timer = startTourTimer()
  try {
    const result = await args.run()
    const status = args.getStatus(result)
    const isStale = args.getStale?.(result) ?? false
    const errorCode = args.getErrorCode?.(result) ?? null

    if (status === 401 || status === 403) {
      await recordTourTelemetry({
        eventName: "tour.access_denied",
        endpoint: args.endpoint,
        orgId: args.orgId,
        userId: args.userId,
        statusCode: status,
        latencyMs: timer.elapsedMs(),
        correlationId: args.correlationId,
        isLegacy: args.isLegacy,
        errorCode,
      })
    } else if (status >= 400) {
      await recordTourTelemetry({
        eventName: "tour.request_failed",
        endpoint: args.endpoint,
        orgId: args.orgId,
        userId: args.userId,
        statusCode: status,
        latencyMs: timer.elapsedMs(),
        correlationId: args.correlationId,
        isLegacy: args.isLegacy,
        errorCode,
      })
    } else {
      await recordTourTelemetry({
        eventName: args.isLegacy ? "tour.legacy_route" : "tour.list",
        endpoint: args.endpoint,
        orgId: args.orgId,
        userId: args.userId,
        statusCode: status,
        latencyMs: timer.elapsedMs(),
        correlationId: args.correlationId,
        isLegacy: args.isLegacy,
        isStale,
      })
      if (isStale) {
        await recordTourTelemetry({
          eventName: "tour.stale_read",
          endpoint: args.endpoint,
          orgId: args.orgId,
          userId: args.userId,
          statusCode: status,
          latencyMs: timer.elapsedMs(),
          correlationId: args.correlationId,
          isLegacy: args.isLegacy,
          isStale: true,
        })
      }
    }
    return result
  } catch (error) {
    await recordTourTelemetry({
      eventName: "tour.request_failed",
      endpoint: args.endpoint,
      orgId: args.orgId,
      userId: args.userId,
      statusCode: 500,
      latencyMs: timer.elapsedMs(),
      correlationId: args.correlationId,
      isLegacy: args.isLegacy,
      errorCode: error instanceof Error ? error.name : "unknown",
    })
    throw error
  }
}

export async function recordTourSummaryTelemetry(args: {
  endpoint: string
  orgId?: string | null
  userId?: string | null
  tourId?: string | null
  statusCode: number
  latencyMs: number
  correlationId?: string | null
  isStale?: boolean
  errorCode?: string | null
}): Promise<void> {
  if (args.statusCode === 401 || args.statusCode === 403) {
    await recordTourTelemetry({
      eventName: "tour.access_denied",
      ...args,
      isStale: args.isStale,
    })
    return
  }
  if (args.statusCode >= 400) {
    await recordTourTelemetry({
      eventName: "tour.request_failed",
      ...args,
    })
    return
  }
  await recordTourTelemetry({
    eventName: "tour.summary",
    ...args,
  })
  if (args.isStale) {
    await recordTourTelemetry({
      eventName: "tour.stale_read",
      ...args,
      isStale: true,
    })
  }
}

export async function recordLegacyTourRouteHit(args: {
  endpoint: string
  orgId?: string | null
  userId?: string | null
  statusCode: number
  latencyMs: number
  correlationId?: string | null
}): Promise<void> {
  await recordTourTelemetry({
    eventName: "tour.legacy_route",
    endpoint: args.endpoint,
    orgId: args.orgId,
    userId: args.userId,
    statusCode: args.statusCode,
    latencyMs: args.latencyMs,
    correlationId: args.correlationId,
    isLegacy: true,
  })
}

export async function recordTourClientFanout(args: {
  endpoint: string
  orgId?: string | null
  userId?: string | null
  tourId?: string | null
  fanoutCount: number
  correlationId?: string | null
}): Promise<void> {
  await recordTourTelemetry({
    eventName: "tour.client_fanout",
    endpoint: args.endpoint,
    orgId: args.orgId,
    userId: args.userId,
    tourId: args.tourId,
    fanoutCount: args.fanoutCount,
    correlationId: args.correlationId,
    statusCode: 200,
  })
}
