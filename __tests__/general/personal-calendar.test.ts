import { describe, expect, it } from "vitest"

import { addCalendarConflicts, type PersonalCalendarItem } from "@/lib/general/personal-calendar"

function item(
  id: string,
  startAt: string,
  endAt: string,
): PersonalCalendarItem {
  return {
    id,
    source: "assignment",
    sourceId: id,
    eventId: null,
    title: id,
    subtitle: null,
    startAt,
    endAt,
    href: "/calendar",
    status: "confirmed",
    conflictIds: [],
  }
}

describe("personal calendar conflicts", () => {
  it("marks overlapping commitments without treating adjacent times as conflicts", () => {
    const result = addCalendarConflicts([
      item("one", "2026-07-28T10:00:00.000Z", "2026-07-28T12:00:00.000Z"),
      item("two", "2026-07-28T11:00:00.000Z", "2026-07-28T13:00:00.000Z"),
      item("three", "2026-07-28T13:00:00.000Z", "2026-07-28T14:00:00.000Z"),
    ])

    expect(result[0].conflictIds).toEqual(["two"])
    expect(result[1].conflictIds).toEqual(["one"])
    expect(result[2].conflictIds).toEqual([])
  })
})
