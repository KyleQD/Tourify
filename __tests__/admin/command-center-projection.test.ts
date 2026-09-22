import { describe, expect, it } from "vitest"

import {
  advanceWatermark,
  computeSourceLag,
  decideProjectionApply,
  reconcileDomainCounts,
  resolveProjectionSourceFromEventType,
  summarizeLag,
} from "@/lib/admin/command-center-projection"

describe("REP-202 command-center projection helpers", () => {
  it("maps outbox event types to projection sources", () => {
    expect(resolveProjectionSourceFromEventType("tour.lifecycle_changed")).toBe("lifecycle")
    expect(resolveProjectionSourceFromEventType("tour.published")).toBe("publications")
    expect(resolveProjectionSourceFromEventType("tour.events_reconciled")).toBe("shows")
    expect(resolveProjectionSourceFromEventType("publication.committed")).toBe("publications")
  })

  it("applies outbox events idempotently and skips stale watermarks", () => {
    expect(
      decideProjectionApply({
        alreadyApplied: true,
        eventCreatedAt: "2026-07-20T12:00:00.000Z",
        sourceWatermarkAt: null,
      }).reason,
    ).toBe("already_applied")

    expect(
      decideProjectionApply({
        alreadyApplied: false,
        eventCreatedAt: "2026-07-20T11:00:00.000Z",
        sourceWatermarkAt: "2026-07-20T12:00:00.000Z",
      }).reason,
    ).toBe("stale_event")

    expect(
      decideProjectionApply({
        alreadyApplied: false,
        eventCreatedAt: "2026-07-20T13:00:00.000Z",
        sourceWatermarkAt: "2026-07-20T12:00:00.000Z",
      }),
    ).toEqual({ apply: true, reason: "apply" })
  })

  it("advances watermarks monotonically", () => {
    expect(
      advanceWatermark({
        current: "2026-07-20T12:00:00.000Z",
        eventAt: "2026-07-20T11:00:00.000Z",
      }),
    ).toBe("2026-07-20T12:00:00.000Z")
    expect(
      advanceWatermark({
        current: "2026-07-20T12:00:00.000Z",
        eventAt: "2026-07-20T13:00:00.000Z",
      }),
    ).toBe("2026-07-20T13:00:00.000Z")
  })

  it("reports lag and missing watermarks distinctly from zero lag", () => {
    const missing = computeSourceLag({
      sourceKey: "finance",
      watermarkAt: null,
      sourceUpdatedAt: "2026-07-20T12:05:00.000Z",
      nowIso: "2026-07-20T12:06:00.000Z",
    })
    expect(missing.status).toBe("missing_watermark")
    expect(missing.lagMs).toBeNull()

    const lagging = computeSourceLag({
      sourceKey: "shows",
      watermarkAt: "2026-07-20T12:00:00.000Z",
      sourceUpdatedAt: "2026-07-20T12:05:00.000Z",
      nowIso: "2026-07-20T12:06:00.000Z",
      lagThresholdMs: 60_000,
    })
    expect(lagging.status).toBe("lagging")
    expect(lagging.lagMs).toBe(5 * 60_000)

    const summary = summarizeLag([missing, lagging])
    expect(summary.overall).toBe("missing_watermark")
    expect(summary.laggingSources).toContain("shows")
  })

  it("reconciles projected vs live domain counts without treating null as zero", () => {
    expect(
      reconcileDomainCounts({
        domain: "finance",
        projectedCount: null,
        liveCount: null,
      }).matched,
    ).toBe(true)

    const mismatch = reconcileDomainCounts({
      domain: "shows",
      projectedCount: 2,
      liveCount: 5,
    })
    expect(mismatch.matched).toBe(false)
    expect(mismatch.delta).toBe(3)
  })
})
