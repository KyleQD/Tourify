/**
 * REP-202 — Pure helpers for event-driven command-center summary projections.
 *
 * Idempotent outbox apply, per-source watermarks, lag, and reconciliation.
 */

import type { CommandCenterDomainKey } from "@/lib/admin/command-center-summary-contract"

export const COMMAND_CENTER_PROJECTION_SOURCES = [
  "shows",
  "people",
  "vendors",
  "finance",
  "logistics",
  "readiness",
  "publications",
  "lifecycle",
] as const

export type CommandCenterProjectionSource =
  (typeof COMMAND_CENTER_PROJECTION_SOURCES)[number]

export interface ProjectionApplyDecision {
  apply: boolean
  reason: "apply" | "already_applied" | "stale_event"
}

export interface SourceLagReport {
  sourceKey: CommandCenterProjectionSource
  watermarkAt: string | null
  sourceUpdatedAt: string | null
  lagMs: number | null
  status: "ok" | "lagging" | "unknown" | "missing_watermark"
}

export interface DomainReconciliationRow {
  domain: CommandCenterDomainKey
  projectedCount: number | null
  liveCount: number | null
  matched: boolean
  delta: number | null
  detail: string | null
}

/** Map outbox event types to projection source keys. */
export function resolveProjectionSourceFromEventType(
  eventType: string,
): CommandCenterProjectionSource {
  const type = eventType.trim().toLowerCase()
  if (type.includes("lifecycle") || type.includes("transition") || type.includes("status"))
    return "lifecycle"
  if (type.includes("publish") || type.includes("publication") || type.includes("retract"))
    return "publications"
  if (type.includes("finance") || type.includes("budget") || type.includes("settlement"))
    return "finance"
  if (type.includes("logistic") || type.includes("travel") || type.includes("lodging"))
    return "logistics"
  if (type.includes("vendor") || type.includes("contract"))
    return "vendors"
  if (type.includes("team") || type.includes("staff") || type.includes("workforce"))
    return "people"
  if (type.includes("event") || type.includes("stop") || type.includes("show") || type.includes("plan"))
    return "shows"
  if (type.includes("readiness") || type.includes("advance"))
    return "readiness"
  return "lifecycle"
}

export function decideProjectionApply(input: {
  alreadyApplied: boolean
  eventCreatedAt: string
  sourceWatermarkAt: string | null
}): ProjectionApplyDecision {
  if (input.alreadyApplied) return { apply: false, reason: "already_applied" }
  if (input.sourceWatermarkAt) {
    const eventMs = Date.parse(input.eventCreatedAt)
    const watermarkMs = Date.parse(input.sourceWatermarkAt)
    if (Number.isFinite(eventMs) && Number.isFinite(watermarkMs) && eventMs < watermarkMs)
      return { apply: false, reason: "stale_event" }
  }
  return { apply: true, reason: "apply" }
}

export function advanceWatermark(input: {
  current: string | null
  eventAt: string
}): string {
  if (!input.current) return input.eventAt
  const currentMs = Date.parse(input.current)
  const eventMs = Date.parse(input.eventAt)
  if (!Number.isFinite(eventMs)) return input.current
  if (!Number.isFinite(currentMs) || eventMs >= currentMs) return input.eventAt
  return input.current
}

export function computeSourceLag(input: {
  sourceKey: CommandCenterProjectionSource
  watermarkAt: string | null
  sourceUpdatedAt: string | null
  nowIso: string
  /** Lag above this (ms) is reported as lagging. Default 60s. */
  lagThresholdMs?: number
}): SourceLagReport {
  const threshold = input.lagThresholdMs ?? 60_000
  if (!input.watermarkAt) {
    return {
      sourceKey: input.sourceKey,
      watermarkAt: null,
      sourceUpdatedAt: input.sourceUpdatedAt,
      lagMs: null,
      status: "missing_watermark",
    }
  }
  if (!input.sourceUpdatedAt) {
    return {
      sourceKey: input.sourceKey,
      watermarkAt: input.watermarkAt,
      sourceUpdatedAt: null,
      lagMs: null,
      status: "unknown",
    }
  }
  const sourceMs = Date.parse(input.sourceUpdatedAt)
  const watermarkMs = Date.parse(input.watermarkAt)
  if (!Number.isFinite(sourceMs) || !Number.isFinite(watermarkMs)) {
    return {
      sourceKey: input.sourceKey,
      watermarkAt: input.watermarkAt,
      sourceUpdatedAt: input.sourceUpdatedAt,
      lagMs: null,
      status: "unknown",
    }
  }
  const lagMs = Math.max(0, sourceMs - watermarkMs)
  return {
    sourceKey: input.sourceKey,
    watermarkAt: input.watermarkAt,
    sourceUpdatedAt: input.sourceUpdatedAt,
    lagMs,
    status: lagMs > threshold ? "lagging" : "ok",
  }
}

export function reconcileDomainCounts(input: {
  domain: CommandCenterDomainKey
  projectedCount: number | null
  liveCount: number | null
}): DomainReconciliationRow {
  if (input.projectedCount == null && input.liveCount == null) {
    return {
      domain: input.domain,
      projectedCount: null,
      liveCount: null,
      matched: true,
      delta: null,
      detail: "both null (denied/unavailable)",
    }
  }
  if (input.projectedCount == null || input.liveCount == null) {
    return {
      domain: input.domain,
      projectedCount: input.projectedCount,
      liveCount: input.liveCount,
      matched: false,
      delta: null,
      detail: "null mismatch",
    }
  }
  const delta = input.liveCount - input.projectedCount
  return {
    domain: input.domain,
    projectedCount: input.projectedCount,
    liveCount: input.liveCount,
    matched: delta === 0,
    delta,
    detail: delta === 0 ? null : `live ahead by ${delta}`,
  }
}

export function summarizeLag(reports: SourceLagReport[]): {
  maxLagMs: number | null
  laggingSources: CommandCenterProjectionSource[]
  missingWatermarks: CommandCenterProjectionSource[]
  overall: "ok" | "lagging" | "unknown" | "missing_watermark"
} {
  const laggingSources = reports
    .filter((row) => row.status === "lagging")
    .map((row) => row.sourceKey)
  const missingWatermarks = reports
    .filter((row) => row.status === "missing_watermark")
    .map((row) => row.sourceKey)
  const knownLags = reports
    .map((row) => row.lagMs)
    .filter((value): value is number => typeof value === "number")
  const maxLagMs = knownLags.length ? Math.max(...knownLags) : null

  if (missingWatermarks.length > 0)
    return { maxLagMs, laggingSources, missingWatermarks, overall: "missing_watermark" }
  if (laggingSources.length > 0)
    return { maxLagMs, laggingSources, missingWatermarks, overall: "lagging" }
  if (reports.some((row) => row.status === "unknown"))
    return { maxLagMs, laggingSources, missingWatermarks, overall: "unknown" }
  return { maxLagMs, laggingSources, missingWatermarks, overall: "ok" }
}

/** Tour aggregate outbox event types that should refresh the summary projection. */
export const TOUR_COMMAND_CENTER_OUTBOX_EVENT_TYPES = [
  "tour.lifecycle_changed",
  "tour.published",
  "tour.retracted",
  "tour.cancelled",
  "tour.archived",
  "tour.plan_updated",
  "tour.events_reconciled",
  "publication.committed",
  "publication.retracted",
  "publication.superseded",
] as const
