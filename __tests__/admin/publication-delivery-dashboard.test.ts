import { describe, expect, it } from "vitest"

import {
  buildDeliveryDashboardSummary,
  buildPublicationDeliverySlo,
  buildDeliveryEvidenceRows,
  deliveryEvidenceToCsv,
  filterDeliveryRows,
  isSafeDeliveryRetry,
  maskSubjectKeyForExport,
  selectRetryableDeliveryIds,
  type PublicationDeliveryRowView,
} from "@/lib/admin/publication-delivery-dashboard"

function row(
  overrides: Partial<PublicationDeliveryRowView> & Pick<PublicationDeliveryRowView, "id" | "status">,
): PublicationDeliveryRowView {
  return {
    orgId: "org-1",
    snapshotId: "snap-1",
    recipientId: "rec-1",
    channel: "in_app",
    attempts: 1,
    providerRef: null,
    lastErrorClass: null,
    lastError: null,
    outboxId: null,
    queuedAt: "2026-07-20T12:00:00.000Z",
    deliveredAt: null,
    openedAt: null,
    acknowledgedAt: null,
    failedAt: null,
    recipientDisplayName: "Alex",
    recipientSubjectType: "user",
    recipientSubjectKey: "user-1",
    publicationType: "tour_book",
    publicationTitle: "Summer Run",
    tourId: "tour-1",
    eventId: null,
    snapshotSequence: 1,
    snapshotVersion: 1,
    ...overrides,
  }
}

describe("PUB-205 delivery dashboard", () => {
  it("summarizes by status/channel and attention buckets", () => {
    const rows = [
      row({ id: "1", status: "failed", lastErrorClass: "retryable", channel: "email" }),
      row({ id: "2", status: "failed", lastErrorClass: "fatal", channel: "email" }),
      row({ id: "3", status: "delivered", deliveredAt: "2026-07-20T13:00:00.000Z", channel: "in_app" }),
      row({
        id: "4",
        status: "opened",
        deliveredAt: "2026-07-20T13:00:00.000Z",
        openedAt: "2026-07-20T14:00:00.000Z",
        channel: "in_app",
      }),
    ]

    const summary = buildDeliveryDashboardSummary(rows)
    expect(summary.byStatus.failed).toBe(2)
    expect(summary.byChannel.email.failed).toBe(2)
    expect(summary.attention.retryable).toBe(1)
    expect(summary.attention.unopened).toBe(1)
    expect(summary.attention.unacknowledged).toBe(2)
  })

  it("only marks retryable failed rows as safe to retry", () => {
    expect(
      isSafeDeliveryRetry({ status: "failed", lastErrorClass: "retryable" }),
    ).toBe(true)
    expect(isSafeDeliveryRetry({ status: "failed", lastErrorClass: null })).toBe(true)
    expect(isSafeDeliveryRetry({ status: "failed", lastErrorClass: "fatal" })).toBe(false)
    expect(isSafeDeliveryRetry({ status: "suppressed", lastErrorClass: "retryable" })).toBe(false)
    expect(
      selectRetryableDeliveryIds([
        row({ id: "a", status: "failed", lastErrorClass: "retryable" }),
        row({ id: "b", status: "failed", lastErrorClass: "fatal" }),
      ]),
    ).toEqual(["a"])
  })

  it("filters attention and search", () => {
    const rows = [
      row({ id: "1", status: "failed", recipientDisplayName: "Pat" }),
      row({
        id: "2",
        status: "delivered",
        deliveredAt: "2026-07-20T13:00:00.000Z",
        recipientDisplayName: "Quinn",
      }),
      row({
        id: "3",
        status: "acknowledged",
        acknowledgedAt: "2026-07-20T15:00:00.000Z",
        recipientDisplayName: "Pat",
      }),
    ]
    expect(filterDeliveryRows(rows, { status: "attention" }).map((r) => r.id)).toEqual([
      "1",
      "2",
    ])
    expect(filterDeliveryRows(rows, { q: "quinn" }).map((r) => r.id)).toEqual(["2"])
  })

  it("exports authorized evidence with masked subject keys", () => {
    expect(maskSubjectKeyForExport("manager@example.com")).toBe("ma***@example.com")
    const evidence = buildDeliveryEvidenceRows([
      row({
        id: "d1",
        status: "failed",
        recipientSubjectKey: "manager@example.com",
        lastErrorClass: "retryable",
      }),
    ])
    expect(evidence[0].recipientSubjectKeyMasked).toBe("ma***@example.com")
    const csv = deliveryEvidenceToCsv(evidence)
    expect(csv).toContain("deliveryId")
    expect(csv).toContain("ma***@example.com")
    expect(csv).not.toContain("manager@example.com")
  })

  it("builds delivery SLOs from persisted evidence without inventing unsupported telemetry", () => {
    const slo = buildPublicationDeliverySlo({
      measuredAt: "2026-07-20T12:01:00.000Z",
      rows: [
        row({ id: "queued", status: "queued", queuedAt: "2026-07-20T12:00:00.000Z" }),
        row({ id: "ok", status: "acknowledged", openedAt: "2026-07-20T12:00:20.000Z", acknowledgedAt: "2026-07-20T12:00:30.000Z" }),
        row({ id: "failed", status: "failed", attempts: 3, lastErrorClass: "retryable" }),
      ],
    })

    expect(slo.queueAgeP95Seconds).toBe(60)
    expect(slo.successRatePct).toBe(50)
    expect(slo.retryCount).toBe(2)
    expect(slo.status).toBe("unhealthy")
    expect(slo.violations.map((item) => item.metric)).toEqual(expect.arrayContaining([
      "queue_age_p95_seconds",
      "success_rate_pct",
      "provider_error_rate_pct",
    ]))
    expect(slo.unavailableMetrics).toEqual([
      "stale_offline_clients",
      "unauthorized_token_attempts",
    ])
  })

  it("returns an explicit unavailable state when no delivery evidence exists", () => {
    const slo = buildPublicationDeliverySlo({
      rows: [],
      measuredAt: "2026-07-20T12:01:00.000Z",
    })
    expect(slo.state).toBe("empty")
    expect(slo.status).toBe("unavailable")
    expect(slo.successRatePct).toBeNull()
  })
})
