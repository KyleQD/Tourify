import { describe, expect, it } from "vitest"

import type { TourPortfolioRow } from "@/lib/admin/tour-portfolio-query"
import {
  actorCanViewAllOrgTours,
  buildAccessibleTourIdSet,
  filterTourPortfolioByAccess,
} from "@/lib/admin/tour-portfolio-visibility"

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"

function row(partial: Partial<TourPortfolioRow> & { id: string }): TourPortfolioRow {
  return {
    org_id: ORG,
    name: `Tour ${partial.id}`,
    status: "active",
    ...partial,
  }
}

describe("TOUR-209 portfolio visibility", () => {
  it("org managers see all org tours", () => {
    expect(actorCanViewAllOrgTours(["tour.manage"])).toBe(true)
    expect(actorCanViewAllOrgTours(["tour.view"])).toBe(false)

    const rows = [
      row({ id: "a", owner_user_id: OTHER }),
      row({ id: "b", owner_user_id: USER }),
    ]
    const set = buildAccessibleTourIdSet({
      rows,
      userId: USER,
      canViewAllOrgTours: true,
    })
    expect(set.size).toBe(2)
  })

  it("collaborators only see owned, led, team, or granted tours — no unauthorized names in filter output", () => {
    const rows = [
      row({ id: "owned", owner_user_id: USER, name: "Owned Tour" }),
      row({ id: "led", lead_user_id: USER, name: "Led Tour" }),
      row({ id: "team", owner_user_id: OTHER, name: "Team Tour" }),
      row({ id: "grant", owner_user_id: OTHER, name: "Granted Tour" }),
      row({ id: "secret", owner_user_id: OTHER, name: "Secret Unauthorized" }),
    ]

    const accessible = buildAccessibleTourIdSet({
      rows,
      userId: USER,
      canViewAllOrgTours: false,
      teamTourIds: ["team"],
      grantTourIds: ["grant"],
    })
    expect(accessible.has("secret")).toBe(false)

    const visible = filterTourPortfolioByAccess({ rows, accessibleTourIds: accessible })
    expect(visible.visibleCount).toBe(4)
    expect(visible.droppedUnauthorizedCount).toBe(1)
    expect(visible.rows.map((item) => item.name)).not.toContain("Secret Unauthorized")
    expect(visible.rows.map((item) => item.id).sort()).toEqual(["grant", "led", "owned", "team"])
  })

  it("null accessible set means already authorized (no silent drops)", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })]
    const visible = filterTourPortfolioByAccess({ rows, accessibleTourIds: null })
    expect(visible.droppedUnauthorizedCount).toBe(0)
    expect(visible.visibleCount).toBe(2)
  })
})
