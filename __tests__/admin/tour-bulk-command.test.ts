import { describe, expect, it } from "vitest"

import {
  parseTourBulkCommand,
  summarizeBulkExecuteResults,
  TourBulkCommandError,
  TOUR_BULK_MAX_IDS,
} from "@/lib/admin/tour-bulk-command"

describe("TOUR-210 bulk command contracts", () => {
  it("parses transition / delete_drafts / assign_tags commands", () => {
    const transition = parseTourBulkCommand({
      action: "transition",
      command: "archive",
      tour_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    })
    expect(transition.action).toBe("transition")
    if (transition.action === "transition") expect(transition.command).toBe("archive")

    const deletes = parseTourBulkCommand({
      action: "delete_drafts",
      tour_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    })
    expect(deletes.action).toBe("delete_drafts")

    const tags = parseTourBulkCommand({
      action: "assign_tags",
      tour_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      tag_ids: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
      mode: "merge",
    })
    expect(tags.action).toBe("assign_tags")
  })

  it("rejects unknown actions and oversize id lists", () => {
    expect(() => parseTourBulkCommand({ action: "explode", tour_ids: [] })).toThrow(
      TourBulkCommandError,
    )

    const tooMany = Array.from({ length: TOUR_BULK_MAX_IDS + 1 }, (_, index) => {
      const hex = index.toString(16).padStart(12, "0")
      return `00000000-0000-4000-8000-${hex}`
    })
    expect(() =>
      parseTourBulkCommand({
        action: "delete_drafts",
        tour_ids: tooMany,
      }),
    ).toThrow(TourBulkCommandError)
  })

  it("surfaces partial failure without hiding succeeded/failed counts", () => {
    const summary = summarizeBulkExecuteResults([
      { tourId: "a", ok: true },
      { tourId: "b", ok: false, error: "blocked", code: "tour_transition_blocked" },
      { tourId: "c", ok: true },
    ])
    expect(summary.succeeded).toBe(2)
    expect(summary.failed).toBe(1)
    expect(summary.partialFailure).toBe(true)
  })

  it("requires reason field shape for cancel when provided as null (execute path validates)", () => {
    const cancel = parseTourBulkCommand({
      action: "transition",
      command: "cancel",
      tour_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      reason: null,
    })
    expect(cancel.action).toBe("transition")
  })
})
