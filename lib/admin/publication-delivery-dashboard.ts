/**
 * PUB-205 — Delivery dashboard aggregates, safe-retry policy, export evidence.
 */

import type {
  PublicationDeliveryChannel,
  PublicationDeliveryStatus,
} from "@/lib/admin/publication-schema"

export interface PublicationDeliveryRowView {
  id: string
  orgId: string
  snapshotId: string
  recipientId: string
  channel: PublicationDeliveryChannel
  status: PublicationDeliveryStatus
  attempts: number
  providerRef: string | null
  lastErrorClass: string | null
  lastError: string | null
  outboxId: string | null
  queuedAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  acknowledgedAt: string | null
  failedAt: string | null
  recipientDisplayName: string | null
  recipientSubjectType: string | null
  recipientSubjectKey: string | null
  publicationType: string | null
  publicationTitle: string | null
  tourId: string | null
  eventId: string | null
  snapshotSequence: number | null
  snapshotVersion: number | null
}

export interface DeliveryDashboardFilters {
  status?: PublicationDeliveryStatus | PublicationDeliveryStatus[] | "attention"
  channel?: PublicationDeliveryChannel | PublicationDeliveryChannel[]
  snapshotId?: string
  tourId?: string
  q?: string
}

export interface DeliveryStatusCounts {
  queued: number
  processing: number
  delivered: number
  opened: number
  acknowledged: number
  failed: number
  suppressed: number
  expired: number
  revoked: number
}

export interface DeliveryDashboardSummary {
  total: number
  byStatus: DeliveryStatusCounts
  byChannel: Record<PublicationDeliveryChannel, DeliveryStatusCounts>
  attention: {
    failed: number
    unopened: number
    unacknowledged: number
    retryable: number
  }
}

export interface PublicationDeliverySlo {
  state: "ready" | "empty" | "stale" | "error"
  status: "healthy" | "at_risk" | "unhealthy" | "unavailable"
  measuredAt: string
  sampleSize: number
  sampleLimited: boolean
  queueAgeP95Seconds: number | null
  successRatePct: number | null
  providerErrorRatePct: number | null
  retryCount: number
  openRatePct: number | null
  ackRatePct: number | null
  violations: Array<{
    metric: string
    actual: number
    threshold: number
    severity: "warning" | "critical"
  }>
  unavailableMetrics: string[]
}

export const PUBLICATION_DELIVERY_SLO_THRESHOLDS = {
  maxQueueAgeP95Seconds: 30,
  minSuccessRatePct: 99,
  maxProviderErrorRatePct: 5,
  minOpenRatePct: 40,
  minAckRatePct: 40,
} as const

function percentile95(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

/** PUB-601 — persisted delivery SLO view; unsupported telemetry stays unavailable. */
export function buildPublicationDeliverySlo(args: {
  rows: PublicationDeliveryRowView[]
  measuredAt?: string
  sampleLimit?: number
}): PublicationDeliverySlo {
  const measuredAt = args.measuredAt ?? new Date().toISOString()
  const nowMs = new Date(measuredAt).getTime()
  const sampleSize = args.rows.length
  const sampleLimited = sampleSize >= (args.sampleLimit ?? 500)

  if (sampleSize === 0) {
    return {
      state: "empty",
      status: "unavailable",
      measuredAt,
      sampleSize,
      sampleLimited,
      queueAgeP95Seconds: null,
      successRatePct: null,
      providerErrorRatePct: null,
      retryCount: 0,
      openRatePct: null,
      ackRatePct: null,
      violations: [],
      unavailableMetrics: ["stale_offline_clients", "unauthorized_token_attempts"],
    }
  }

  const queuedAges = args.rows
    .filter((row) => row.status === "queued" || row.status === "processing")
    .map((row) => row.queuedAt ? Math.max(0, (nowMs - new Date(row.queuedAt).getTime()) / 1000) : NaN)
    .filter(Number.isFinite)
  const queueAgeP95Seconds = percentile95(queuedAges)
  const deliveryAttempts = args.rows.filter((row) =>
    ["delivered", "opened", "acknowledged", "failed"].includes(row.status),
  )
  const delivered = deliveryAttempts.filter((row) => row.status !== "failed")
  const successRatePct = deliveryAttempts.length
    ? (delivered.length / deliveryAttempts.length) * 100
    : null
  const providerErrorRatePct = deliveryAttempts.length
    ? (deliveryAttempts.filter((row) => row.status === "failed").length / deliveryAttempts.length) * 100
    : null
  const opened = delivered.filter((row) => Boolean(row.openedAt || row.acknowledgedAt)).length
  const acknowledged = delivered.filter((row) => Boolean(row.acknowledgedAt)).length
  const openRatePct = delivered.length ? (opened / delivered.length) * 100 : null
  const ackRatePct = delivered.length ? (acknowledged / delivered.length) * 100 : null
  const retryCount = args.rows.reduce((total, row) => total + Math.max(0, row.attempts - 1), 0)
  const violations: PublicationDeliverySlo["violations"] = []
  const check = (
    metric: string,
    actual: number | null,
    threshold: number,
    exceedIsViolation: boolean,
    severity: "warning" | "critical",
  ) => {
    if (actual == null) return
    if (exceedIsViolation ? actual > threshold : actual < threshold)
      violations.push({ metric, actual, threshold, severity })
  }
  check("queue_age_p95_seconds", queueAgeP95Seconds, PUBLICATION_DELIVERY_SLO_THRESHOLDS.maxQueueAgeP95Seconds, true, "warning")
  check("success_rate_pct", successRatePct, PUBLICATION_DELIVERY_SLO_THRESHOLDS.minSuccessRatePct, false, "critical")
  check("provider_error_rate_pct", providerErrorRatePct, PUBLICATION_DELIVERY_SLO_THRESHOLDS.maxProviderErrorRatePct, true, "critical")
  check("open_rate_pct", openRatePct, PUBLICATION_DELIVERY_SLO_THRESHOLDS.minOpenRatePct, false, "warning")
  check("ack_rate_pct", ackRatePct, PUBLICATION_DELIVERY_SLO_THRESHOLDS.minAckRatePct, false, "warning")

  return {
    state: sampleLimited ? "stale" : "ready",
    status: violations.some((item) => item.severity === "critical")
      ? "unhealthy"
      : violations.length
        ? "at_risk"
        : "healthy",
    measuredAt,
    sampleSize,
    sampleLimited,
    queueAgeP95Seconds,
    successRatePct,
    providerErrorRatePct,
    retryCount,
    openRatePct,
    ackRatePct,
    violations,
    unavailableMetrics: ["stale_offline_clients", "unauthorized_token_attempts"],
  }
}

export interface DeliveryEvidenceRow {
  deliveryId: string
  snapshotId: string
  publicationType: string | null
  publicationTitle: string | null
  sequence: number | null
  version: number | null
  tourId: string | null
  eventId: string | null
  recipientDisplayName: string | null
  recipientSubjectType: string | null
  /** Masked subject key — never full email/phone in export by default. */
  recipientSubjectKeyMasked: string | null
  channel: PublicationDeliveryChannel
  status: PublicationDeliveryStatus
  attempts: number
  providerRef: string | null
  lastErrorClass: string | null
  queuedAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  acknowledgedAt: string | null
  failedAt: string | null
}

const EMPTY_COUNTS = (): DeliveryStatusCounts => ({
  queued: 0,
  processing: 0,
  delivered: 0,
  opened: 0,
  acknowledged: 0,
  failed: 0,
  suppressed: 0,
  expired: 0,
  revoked: 0,
})

const CHANNELS: PublicationDeliveryChannel[] = ["in_app", "email", "sms", "push"]

/** Failed deliveries that are safe to retry (not fatal/suppressed). */
export function isSafeDeliveryRetry(row: Pick<PublicationDeliveryRowView, "status" | "lastErrorClass">): boolean {
  if (row.status !== "failed") return false
  const cls = (row.lastErrorClass || "retryable").toLowerCase()
  if (cls === "fatal" || cls === "suppressed") return false
  return true
}

export function buildDeliveryDashboardSummary(
  rows: PublicationDeliveryRowView[],
): DeliveryDashboardSummary {
  const byStatus = EMPTY_COUNTS()
  const byChannel = {
    in_app: EMPTY_COUNTS(),
    email: EMPTY_COUNTS(),
    sms: EMPTY_COUNTS(),
    push: EMPTY_COUNTS(),
  } as Record<PublicationDeliveryChannel, DeliveryStatusCounts>

  let unopened = 0
  let unacknowledged = 0
  let retryable = 0

  for (const row of rows) {
    if (row.status in byStatus) byStatus[row.status] += 1
    if (CHANNELS.includes(row.channel) && row.status in byChannel[row.channel])
      byChannel[row.channel][row.status] += 1

    if (
      (row.status === "delivered" || row.status === "queued" || row.status === "processing") &&
      !row.openedAt
    ) {
      unopened += 1
    }
    if (
      (row.status === "delivered" || row.status === "opened") &&
      !row.acknowledgedAt
    ) {
      unacknowledged += 1
    }
    if (isSafeDeliveryRetry(row)) retryable += 1
  }

  return {
    total: rows.length,
    byStatus,
    byChannel,
    attention: {
      failed: byStatus.failed,
      unopened,
      unacknowledged,
      retryable,
    },
  }
}

export function filterDeliveryRows(
  rows: PublicationDeliveryRowView[],
  filters: DeliveryDashboardFilters,
): PublicationDeliveryRowView[] {
  return rows.filter((row) => {
    if (filters.snapshotId && row.snapshotId !== filters.snapshotId) return false
    if (filters.tourId && row.tourId !== filters.tourId) return false

    if (filters.channel) {
      const channels = Array.isArray(filters.channel) ? filters.channel : [filters.channel]
      if (!channels.includes(row.channel)) return false
    }

    if (filters.status === "attention") {
      const isAttention =
        row.status === "failed" ||
        ((row.status === "delivered" || row.status === "queued" || row.status === "processing") &&
          !row.openedAt) ||
        ((row.status === "delivered" || row.status === "opened") && !row.acknowledgedAt)
      if (!isAttention) return false
    } else if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      if (!statuses.includes(row.status)) return false
    }

    if (filters.q?.trim()) {
      const q = filters.q.trim().toLowerCase()
      const haystack = [
        row.recipientDisplayName,
        row.recipientSubjectKey,
        row.publicationTitle,
        row.publicationType,
        row.providerRef,
        row.lastError,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function maskSubjectKeyForExport(subjectKey: string | null | undefined): string | null {
  if (!subjectKey?.trim()) return null
  const value = subjectKey.trim()
  if (value.includes("@")) {
    const [local, domain] = value.split("@")
    const safeLocal = local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`
    return `${safeLocal}@${domain}`
  }
  if (value.length <= 4) return "***"
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

export function buildDeliveryEvidenceRows(
  rows: PublicationDeliveryRowView[],
): DeliveryEvidenceRow[] {
  return rows.map((row) => ({
    deliveryId: row.id,
    snapshotId: row.snapshotId,
    publicationType: row.publicationType,
    publicationTitle: row.publicationTitle,
    sequence: row.snapshotSequence,
    version: row.snapshotVersion,
    tourId: row.tourId,
    eventId: row.eventId,
    recipientDisplayName: row.recipientDisplayName,
    recipientSubjectType: row.recipientSubjectType,
    recipientSubjectKeyMasked: maskSubjectKeyForExport(row.recipientSubjectKey),
    channel: row.channel,
    status: row.status,
    attempts: row.attempts,
    providerRef: row.providerRef,
    lastErrorClass: row.lastErrorClass,
    queuedAt: row.queuedAt,
    deliveredAt: row.deliveredAt,
    openedAt: row.openedAt,
    acknowledgedAt: row.acknowledgedAt,
    failedAt: row.failedAt,
  }))
}

export function deliveryEvidenceToCsv(rows: DeliveryEvidenceRow[]): string {
  const headers = [
    "deliveryId",
    "snapshotId",
    "publicationType",
    "publicationTitle",
    "sequence",
    "version",
    "tourId",
    "eventId",
    "recipientDisplayName",
    "recipientSubjectType",
    "recipientSubjectKeyMasked",
    "channel",
    "status",
    "attempts",
    "providerRef",
    "lastErrorClass",
    "queuedAt",
    "deliveredAt",
    "openedAt",
    "acknowledgedAt",
    "failedAt",
  ] as const

  function cell(value: unknown): string {
    if (value == null) return ""
    const raw = String(value)
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
    return raw
  }

  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((key) => cell(row[key])).join(","))
  }
  return `${lines.join("\n")}\n`
}

export function selectRetryableDeliveryIds(rows: PublicationDeliveryRowView[]): string[] {
  return rows.filter(isSafeDeliveryRetry).map((row) => row.id)
}
