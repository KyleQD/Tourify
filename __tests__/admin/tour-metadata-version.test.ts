import { describe, expect, it } from "vitest"
import {
  buildTourMetadataConflictDiff,
  summarizeTourMetadataConflictDiff,
  TourMetadataVersionConflictError,
} from "@/lib/admin/tour-metadata-version-diff"

describe("TOUR-201 tour metadata versioning", () => {
  it("builds field diffs for conflicting metadata", () => {
    const diff = buildTourMetadataConflictDiff({
      expectedVersion: 2,
      server: {
        metadataVersion: 3,
        name: "Summer Run",
        description: "A",
        status: "active",
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        budget: "1000",
        revenue: "2000",
        expenses: "500",
        main_artist: "Ada",
        genre: "rock",
      },
      client: {
        metadataVersion: 2,
        name: "Summer Run v2",
        description: "A",
        status: "active",
        start_date: "2026-06-01",
        end_date: "2026-07-01",
        budget: "1000",
        revenue: "2000",
        expenses: "500",
        main_artist: "Ada",
        genre: "indie",
      },
    })

    expect(diff.expectedVersion).toBe(2)
    expect(diff.currentVersion).toBe(3)
    expect(diff.fields.map((field) => field.path).sort()).toEqual([
      "end_date",
      "genre",
      "name",
    ])
  })

  it("summarizes conflict with reload/reapply guidance", () => {
    const diff = buildTourMetadataConflictDiff({
      expectedVersion: 1,
      server: {
        metadataVersion: 2,
        name: "A",
        description: null,
        status: "planning",
        start_date: null,
        end_date: null,
        budget: null,
        revenue: null,
        expenses: null,
        main_artist: null,
        genre: null,
      },
      client: {
        name: "B",
      },
    })
    const summary = summarizeTourMetadataConflictDiff(diff)
    expect(summary).toMatch(/Expected tour metadata version 1/)
    expect(summary).toMatch(/Reload the tour or reapply/)
  })

  it("throws typed 409 conflict error", () => {
    const err = new TourMetadataVersionConflictError({
      currentVersion: 4,
      expectedVersion: 3,
      diff: {
        expectedVersion: 3,
        currentVersion: 4,
        fields: [{ path: "name", server: "A", client: "B" }],
      },
      serverTour: { id: "t1", metadata_version: 4 },
    })
    expect(err.status).toBe(409)
    expect(err.code).toBe("version_conflict")
    expect(err.serverTour?.metadata_version).toBe(4)
  })
})
