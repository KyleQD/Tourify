import { describe, expect, it } from "vitest"

import {
  accessStateForSnapshot,
  buildPublicationLifecycleNotice,
  buildRetractionPatch,
  buildSupersedePatch,
  canRetractPublication,
  canSupersedePublication,
  isRetainedInPublicationHistory,
  validateRetractionReason,
} from "@/lib/admin/publication-lifecycle"

const committed = {
  id: "snap-1",
  orgId: "org-1",
  status: "committed" as const,
  publicationType: "tour_book",
  title: "Summer Run",
  sequence: 2,
  version: 2,
  tourId: "tour-1",
  checksum: "abc",
}

describe("PUB-207 retract / supersede lifecycle", () => {
  it("allows retract only for committed snapshots with a reason", () => {
    expect(canRetractPublication(committed).ok).toBe(true)
    expect(canRetractPublication({ ...committed, status: "superseded" })).toMatchObject({
      ok: false,
      reason: "already_superseded",
    })
    expect(canRetractPublication({ ...committed, status: "retracted" })).toMatchObject({
      ok: false,
      reason: "already_retracted",
    })
    expect(validateRetractionReason("ty")).toMatchObject({ ok: false })
    expect(validateRetractionReason("Incorrect itinerary published").ok).toBe(true)
  })

  it("allows supersede with a distinct successor", () => {
    expect(canSupersedePublication(committed, "snap-2").ok).toBe(true)
    expect(canSupersedePublication(committed, "snap-1")).toMatchObject({
      ok: false,
      reason: "invalid_successor",
    })
  })

  it("builds patches without mutating payload fields", () => {
    const retract = buildRetractionPatch({ reason: "Wrong version", at: "2026-07-20T12:00:00.000Z" })
    expect(retract).toEqual({
      status: "retracted",
      retracted_at: "2026-07-20T12:00:00.000Z",
      retracted_reason: "Wrong version",
      updated_at: "2026-07-20T12:00:00.000Z",
    })
    expect("payload" in retract).toBe(false)

    const supersede = buildSupersedePatch({
      successorSnapshotId: "snap-2",
      at: "2026-07-20T13:00:00.000Z",
    })
    expect(supersede.status).toBe("superseded")
    expect(supersede.superseded_by).toBe("snap-2")
  })

  it("builds recipient notices and retains history states", () => {
    const notice = buildPublicationLifecycleNotice({
      action: "retract",
      snapshot: committed,
      reason: "Wrong version",
      actorUserId: "user-1",
      correlationId: "corr-1",
    })
    expect(notice.kind).toBe("publication.retracted")
    expect(notice.accessInvalidated).toBe(true)
    expect(notice.historyRetained).toBe(true)
    expect(notice.payloadImmutable).toBe(true)

    expect(accessStateForSnapshot(committed)).toBe("active")
    expect(accessStateForSnapshot({ status: "superseded" })).toBe("superseded")
    expect(accessStateForSnapshot({ status: "retracted", retractedAt: "x" })).toBe("retracted")
    expect(isRetainedInPublicationHistory("superseded")).toBe(true)
    expect(isRetainedInPublicationHistory("draft")).toBe(false)
  })
})
