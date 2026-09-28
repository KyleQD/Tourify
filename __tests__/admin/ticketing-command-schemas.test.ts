import { describe, expect, it } from "vitest"

import {
  parseTicketingCommand,
  TICKETING_COMMAND_CAPABILITIES,
} from "@/lib/admin/ticketing-command-schemas"

const EVENT_ID = "11111111-1111-4111-8111-111111111111"
const TYPE_ID = "22222222-2222-4222-8222-222222222222"
const SALE_ID = "33333333-3333-4333-8333-333333333333"

describe("TIX-103 ticketing command schemas", () => {
  it("rejects unknown fields on create_ticket_type", () => {
    const result = parseTicketingCommand({
      action: "create_ticket_type",
      event_id: EVENT_ID,
      name: "GA",
      price: 25,
      quantity_available: 100,
      category: "general",
      is_transferable: true,
      transfer_fee: 0,
      refund_policy: "No refunds",
      requires_id: false,
      featured: false,
      priority_order: 0,
      is_active: true,
      visibility: "public",
      access_level: "general",
      min_per_order: 1,
      surprise: true,
    })
    expect(result.ok).toBe(false)
  })

  it("requires reason for inventory and refund commands", () => {
    expect(
      parseTicketingCommand({
        action: "reserve_inventory",
        ticket_type_id: TYPE_ID,
        quantity: 2,
      }).ok,
    ).toBe(false)

    expect(
      parseTicketingCommand({
        action: "refund_sale",
        sale_id: SALE_ID,
      }).ok,
    ).toBe(false)

    const reserve = parseTicketingCommand({
      action: "reserve_inventory",
      ticket_type_id: TYPE_ID,
      quantity: 2,
      reason: "box office hold",
    })
    expect(reserve.ok).toBe(true)

    const refund = parseTicketingCommand({
      action: "refund_sale",
      sale_id: SALE_ID,
      reason: "customer request",
    })
    expect(refund.ok).toBe(true)
  })

  it("maps each action to a ticketing capability", () => {
    expect(TICKETING_COMMAND_CAPABILITIES.create_ticket_type).toBe("ticketing.manage")
    expect(TICKETING_COMMAND_CAPABILITIES.refund_sale).toBe("ticketing.refund")
    expect(TICKETING_COMMAND_CAPABILITIES.reserve_inventory).toBe("ticketing.manage")
    expect(TICKETING_COMMAND_CAPABILITIES.delete_ticket_type).toBe("ticketing.manage")
  })

  it("accepts upsert config and delete with reason", () => {
    const config = parseTicketingCommand({
      action: "upsert_ticketing_config",
      event_id: EVENT_ID,
      reason: "enable sales window",
      ticketing_enabled: true,
      capacity: 500,
    })
    expect(config.ok).toBe(true)

    const del = parseTicketingCommand({
      action: "delete_ticket_type",
      id: TYPE_ID,
      reason: "duplicate tier",
    })
    expect(del.ok).toBe(true)
  })
})
