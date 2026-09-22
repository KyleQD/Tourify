import { describe, expect, it } from "vitest"

import { planTourStopReconciliation } from "@/lib/admin/tour-stop-reconciliation"

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

describe("PLAN-103 exact stop reconciliation", () => {
  it("exact mode adds, updates, reorders, and detaches omitted links (events retained)", () => {
    const plan = planTourStopReconciliation({
      mode: "exact",
      current: [
        { event_id: A, ordinal: 0, market: "LA" },
        { event_id: B, ordinal: 1, market: "SD" },
      ],
      desired: [
        { event_id: B, ordinal: 0, market: "SD-updated" },
        { event_id: C, ordinal: 1, market: "SF" },
      ],
    })

    expect(plan.detachEventIds).toEqual([A])
    expect(plan.retainedEventIds).toEqual([A])
    expect(plan.addedEventIds).toEqual([C])
    expect(plan.updatedEventIds).toEqual([B])
    expect(plan.upserts.map((link) => link.event_id)).toEqual([B, C])
    expect(plan.upserts.map((link) => link.ordinal)).toEqual([0, 1])
    expect(plan.orderChanged).toBe(true)
  })

  it("merge mode keeps omitted links and never detaches", () => {
    const plan = planTourStopReconciliation({
      mode: "merge",
      current: [
        { event_id: A, ordinal: 0 },
        { event_id: B, ordinal: 1 },
      ],
      desired: [{ event_id: C, ordinal: 0 }],
    })

    expect(plan.detachEventIds).toEqual([])
    expect(plan.upserts.map((link) => link.event_id).sort()).toEqual([A, B, C].sort())
    expect(plan.addedEventIds).toEqual([C])
  })

  it("attach_only upserts desired without detach or rewriting kept links in upsert set", () => {
    const plan = planTourStopReconciliation({
      mode: "attach_only",
      current: [
        { event_id: A, ordinal: 0 },
        { event_id: B, ordinal: 1 },
      ],
      desired: [{ event_id: C, ordinal: 0 }],
    })

    expect(plan.detachEventIds).toEqual([])
    expect(plan.upserts.map((link) => link.event_id)).toEqual([C])
    expect(plan.addedEventIds).toEqual([C])
  })
})
