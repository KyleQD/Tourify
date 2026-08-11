import { describe, expect, it } from "vitest"

import { buildEventSetupChecklist } from "@/lib/admin/event-setup-checklist"
import {
  assertNoSilentTicketDefaults,
  normalizeExplicitTicketTypeDrafts,
  resolveEventTicketingSetupMode,
} from "@/lib/admin/event-ticketing-setup"

describe("TIX-105 explicit ticketing setup", () => {
  it("rejects silent GA name and default quantity 100", () => {
    expect(
      normalizeExplicitTicketTypeDrafts([{ price: 25, quantity: 100 }]).ok,
    ).toBe(false)
    expect(
      normalizeExplicitTicketTypeDrafts([{ name: "GA", price: 25 }]).ok,
    ).toBe(false)
    expect(assertNoSilentTicketDefaults({ name: "", quantity: 100 })).toMatch(/required/i)
    expect(assertNoSilentTicketDefaults({ name: "GA", quantity: null })).toMatch(/explicit/i)
  })

  it("accepts explicit name + positive quantity", () => {
    const result = normalizeExplicitTicketTypeDrafts([
      { name: "Floor", price: 40, quantity: 200, type: "general" },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0].name).toBe("Floor")
      expect(result.data[0].quantity_available).toBe(200)
    }
  })

  it("marks checklist ready when not_ticketed", () => {
    expect(resolveEventTicketingSetupMode({ ticketing_setup: "not_ticketed" })).toBe(
      "not_ticketed",
    )
    const checklist = buildEventSetupChecklist({
      eventId: "11111111-1111-4111-8111-111111111111",
      event: { settings: { ticketing_setup: "not_ticketed" } },
      counts: { ticketTypes: 0 },
    })
    const ticketing = checklist.items.find((i) => i.domain === "ticketing")
    expect(ticketing?.status).toBe("ready")
    expect(ticketing?.summary).toMatch(/not ticketed/i)
    expect(checklist.pendingDomains).not.toContain("ticketing")
  })
})
