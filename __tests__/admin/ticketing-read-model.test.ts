import { describe, expect, it } from "vitest"

import {
  compareTicketingTotals,
  isTicketingReadModelEnabled,
  type TicketingSourceTotals,
} from "@/lib/admin/ticketing-read-model"

const empty: TicketingSourceTotals = {
  orderCount: 0,
  ticketsSold: 0,
  revenue: 0,
  quantityAvailable: 0,
  quantityReserved: 0,
  issuedTicketRows: 0,
}

describe("TIX-104 ticketing read model", () => {
  it("enables dual-read via FEATURE_ADMIN_TICKETING_READ_MODEL", () => {
    expect(
      isTicketingReadModelEnabled({
        FEATURE_ADMIN_TICKETING_READ_MODEL: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true)
    expect(isTicketingReadModelEnabled({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it("allows cutover when legacy and canonical totals match", () => {
    const totals: TicketingSourceTotals = {
      orderCount: 3,
      ticketsSold: 10,
      revenue: 250,
      quantityAvailable: 100,
      quantityReserved: 2,
      issuedTicketRows: 10,
    }
    const result = compareTicketingTotals({
      orgId: "org-a",
      eventId: null,
      legacy: totals,
      canonical: { ...totals },
    })
    expect(result.canCutover).toBe(true)
    expect(result.mismatches).toHaveLength(0)
  })

  it("blocks cutover and exposes causes when sold vs issued diverge", () => {
    const result = compareTicketingTotals({
      orgId: "org-a",
      eventId: "evt-1",
      legacy: { ...empty, ticketsSold: 10, revenue: 100, orderCount: 2, issuedTicketRows: 10 },
      canonical: { ...empty, ticketsSold: 8, revenue: 100, orderCount: 2, issuedTicketRows: 7 },
    })
    expect(result.canCutover).toBe(false)
    expect(result.mismatches.some((m) => m.code === "sold_vs_issued")).toBe(true)
    expect(result.cutoverBlockedReasons.length).toBeGreaterThan(0)
    expect(result.cutoverBlockedReasons[0]).toMatch(/sold_vs_issued/)
  })

  it("flags reservation book mismatches", () => {
    const result = compareTicketingTotals({
      orgId: "org-a",
      legacy: { ...empty, quantityReserved: 5 },
      canonical: { ...empty, quantityReserved: 1 },
    })
    const reserved = result.mismatches.find((m) => m.code === "reserved")
    expect(reserved).toBeTruthy()
    expect(reserved?.cause).toMatch(/reservations/i)
  })
})
