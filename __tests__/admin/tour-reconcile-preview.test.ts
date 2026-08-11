import { describe, expect, it } from "vitest"

import { buildTourReconcilePreview } from "@/lib/admin/tour-reconcile-preview"
import { planTourStopReconciliation } from "@/lib/admin/tour-stop-reconciliation"

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

describe("PLAN-104 reconciliation preview", () => {
  it("surfaces detach/reorder/date/venue impacts and protected conflicts", () => {
    const reconciliation = planTourStopReconciliation({
      mode: "exact",
      current: [
        { event_id: A, ordinal: 0 },
        { event_id: B, ordinal: 1 },
      ],
      desired: [
        { event_id: B, ordinal: 0 },
        { event_id: C, ordinal: 1 },
      ],
    })

    const preview = buildTourReconcilePreview({
      reconciliation,
      currentStops: [
        { event_id: A, name: "LA", date: "2026-08-01", venue: "Forum", ordinal: 0 },
        { event_id: B, name: "SD", date: "2026-08-02", venue: "Arena", ordinal: 1 },
      ],
      desiredStops: [
        { event_id: B, name: "SD", date: "2026-08-03", venue: "Waterfront", ordinal: 0 },
        { event_id: C, name: "SF", date: "2026-08-05", venue: "Chase", ordinal: 1 },
      ],
      protectedEventIds: [A],
      protectedReasons: { [A]: "LA is published." },
    })

    expect(preview.detachments.map((stop) => stop.name)).toEqual(["LA"])
    expect(preview.additions.map((stop) => stop.name)).toEqual(["SF"])
    expect(preview.modifications.some((mod) => mod.fields.includes("date"))).toBe(true)
    expect(preview.modifications.some((mod) => mod.fields.includes("venue"))).toBe(true)
    expect(preview.reorders).toBe(true)
    expect(preview.protectedConflicts[0]?.reason).toContain("published")
    expect(preview.requiresConfirmation).toBe(true)
    expect(preview.downstream.some((item) => item.kind === "protected_conflict")).toBe(true)
    expect(preview.downstream.some((item) => item.kind === "link_detach")).toBe(true)
  })
})
