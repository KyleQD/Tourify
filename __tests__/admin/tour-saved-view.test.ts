import { describe, expect, it } from "vitest"

import {
  normalizeTourPortfolioColumns,
  projectTourPortfolioRow,
} from "@/lib/admin/tour-portfolio-columns"
import {
  portfolioQueryFromSavedView,
  TourSavedViewError,
  validateTourSavedViewFilters,
  validateTourSavedViewPayload,
} from "@/lib/admin/tour-saved-view"

describe("TOUR-209 saved views", () => {
  it("validates filters against portfolio grammar and rejects unknown status", () => {
    const filters = validateTourSavedViewFilters({
      status: "draft,active",
      q: "  North  ",
      tag: "headliner,festival",
      owner: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    })
    expect(filters.status).toBe("draft,active")
    expect(filters.tag).toBe("headliner,festival")

    expect(() => validateTourSavedViewFilters({ status: "bogus" })).toThrow(TourSavedViewError)
  })

  it("allowlists columns and always includes name", () => {
    expect(normalizeTourPortfolioColumns(["status", "tags", "revenue"])).toEqual([
      "name",
      "status",
      "tags",
    ])
  })

  it("projects only allowlisted fields (no unauthorized name leakage via extras)", () => {
    const projected = projectTourPortfolioRow(
      {
        id: "t1",
        name: "Visible Tour",
        status: "active",
        secret_budget: 999999,
        owner_user_id: "u1",
        tags: [{ slug: "headliner" }],
      },
      ["name", "status", "owner", "tags"],
    )
    expect(projected).toEqual({
      id: "t1",
      name: "Visible Tour",
      status: "active",
      owner_user_id: "u1",
      tags: [{ slug: "headliner" }],
    })
    expect(projected).not.toHaveProperty("secret_budget")
  })

  it("builds a revalidated portfolio query from a saved view", () => {
    const query = portfolioQueryFromSavedView({
      filters: {
        status: "active",
        q: "Ada",
        sort: "name",
        order: "desc",
        tag: "festival",
        owner: null,
        lead: null,
        start_from: null,
        start_to: null,
      },
      limit: 25,
    })
    expect(query.status).toBe("active")
    expect(query.sort).toBe("name")
    expect(query.order).toBe("desc")
    expect(query.tag).toBe("festival")
    expect(query.limit).toBe(25)
  })

  it("requires name and valid scope on save", () => {
    expect(() =>
      validateTourSavedViewPayload({
        name: "  ",
        scope: "personal",
        filters: {},
        columns: ["name"],
      }),
    ).toThrow(TourSavedViewError)

    expect(() =>
      validateTourSavedViewPayload({
        name: "My view",
        scope: "team",
        filters: {},
        columns: ["name"],
      }),
    ).toThrow(TourSavedViewError)

    const ok = validateTourSavedViewPayload({
      name: "Festival active",
      scope: "organization",
      filters: { status: "active", tag: "festival" },
      columns: ["name", "status", "tags"],
      is_default: true,
    })
    expect(ok.scope).toBe("organization")
    expect(ok.is_default).toBe(true)
  })
})
