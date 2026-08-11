import { describe, expect, it } from "vitest"

import {
  parseFinanceScopeKinds,
  searchFinanceCategories,
} from "@/lib/admin/finance-scope-search"

describe("FIN-104 finance scope search", () => {
  it("parses kind filters and defaults to all kinds", () => {
    expect(parseFinanceScopeKinds(undefined)).toEqual([
      "tour",
      "event",
      "vendor",
      "category",
      "po",
    ])
    expect(parseFinanceScopeKinds("event,tour")).toEqual(["event", "tour"])
    expect(parseFinanceScopeKinds("nope")).toEqual([
      "tour",
      "event",
      "vendor",
      "category",
      "po",
    ])
  })

  it("filters categories by query without exposing raw UUID entry", () => {
    const hits = searchFinanceCategories("ticket")
    expect(hits.some((h) => h.value === "ticket_revenue")).toBe(true)
    expect(hits.every((h) => h.kind === "category")).toBe(true)
    expect(hits.every((h) => !h.id.includes("-"))).toBe(true)
  })
})
