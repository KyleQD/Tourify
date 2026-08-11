import { describe, it, expect } from "vitest"
import {
  computeAvailabilityPreview,
  validateTicketingConfig,
  reconstructInventoryState,
  canReserve,
  buildAllocationMatrix,
  getAllocationsAtRiskOfExpiry,
  approveCompRequest,
  denyCompRequest,
  issueComp,
  computePromoDiscount,
  isPromoRedeemable,
  canPerformOperation,
  createTicketOperation,
  buildTourTicketingWorkspace,
  type EventTicketingConfig,
  type InventoryLedgerEntry,
  type AllocationRecord,
  type CompRequest,
  type PromoCampaign,
  type PromoCode,
  type StopTicketingSummary,
} from "@/lib/admin/ticketing-domain"

// ---------------------------------------------------------------------------
// TIX-501 — Ticketing setup
// ---------------------------------------------------------------------------

const BASE_CONFIG: EventTicketingConfig = {
  event_id: "ev-1",
  capacity_source: "manual",
  total_capacity: 1000,
  currency: "USD",
  sales_open_at: "2025-08-01T00:00:00Z",
  sales_close_at: "2025-08-10T00:00:00Z",
  tax_fee_policies: [],
  ticket_types: [{ ticket_type_id: "tt-1", name: "GA", capacity: 800, price_minor_units: 5000, currency: "USD", channels: ["web"], is_active: true, max_per_order: 4, restrictions: null }],
  is_ticketed: true,
}

describe("TIX-501 — Ticketing setup", () => {
  it("computes availability preview", () => {
    const r = computeAvailabilityPreview(BASE_CONFIG, 200)
    expect(r.available).toBe(800)
    expect(r.allocated).toBe(200)
    expect(r.total).toBe(1000)
  })

  it("validates valid config", () => {
    expect(validateTicketingConfig(BASE_CONFIG)).toHaveLength(0)
  })

  it("validates missing currency", () => {
    expect(validateTicketingConfig({ ...BASE_CONFIG, currency: "" })).toContain("currency is required")
  })

  it("validates ticket type capacities exceeding total", () => {
    const config = { ...BASE_CONFIG, total_capacity: 100, ticket_types: [{ ...BASE_CONFIG.ticket_types[0], capacity: 150 }] }
    const errors = validateTicketingConfig(config)
    expect(errors.some((e) => e.includes("exceed"))).toBe(true)
  })

  it("non-ticketed config is always valid", () => {
    expect(validateTicketingConfig({ ...BASE_CONFIG, is_ticketed: false, currency: "" })).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TIX-502 — Inventory ledger
// ---------------------------------------------------------------------------

describe("TIX-502 — Inventory ledger", () => {
  const BASE_ENTRY: InventoryLedgerEntry = { entry_id: "e-1", event_id: "ev-1", ticket_type_id: "tt-1", movement_type: "sell", quantity: 10, idempotency_key: "k-1", actor_id: "u", reason: null, created_at: "T" }

  it("reconstructs state from ledger", () => {
    const entries: InventoryLedgerEntry[] = [
      { ...BASE_ENTRY, movement_type: "sell", quantity: 100 },
      { ...BASE_ENTRY, entry_id: "e-2", idempotency_key: "k-2", movement_type: "hold", quantity: 50 },
      { ...BASE_ENTRY, entry_id: "e-3", idempotency_key: "k-3", movement_type: "refund", quantity: 5 },
    ]
    const state = reconstructInventoryState("tt-1", 1000, entries)
    expect(state.sold).toBe(100)
    expect(state.held).toBe(50)
    expect(state.refunded).toBe(5)
    expect(state.available).toBe(850) // 1000 - (100 + 50)
  })

  it("canReserve returns true when enough available", () => {
    const state = reconstructInventoryState("tt-1", 100, [])
    expect(canReserve(state, 50)).toBe(true)
  })

  it("canReserve prevents oversell", () => {
    const entries: InventoryLedgerEntry[] = [{ ...BASE_ENTRY, movement_type: "sell", quantity: 95 }]
    const state = reconstructInventoryState("tt-1", 100, entries)
    expect(canReserve(state, 10)).toBe(false) // only 5 available
  })

  it("release reduces reserved count", () => {
    const entries: InventoryLedgerEntry[] = [
      { ...BASE_ENTRY, movement_type: "reserve", quantity: 30 },
      { ...BASE_ENTRY, entry_id: "e-2", idempotency_key: "k-2", movement_type: "release", quantity: 10 },
    ]
    const state = reconstructInventoryState("tt-1", 100, entries)
    expect(state.reserved).toBe(20)
    expect(state.available).toBe(80)
  })
})

// ---------------------------------------------------------------------------
// TIX-503 — Allocations/holds matrix
// ---------------------------------------------------------------------------

const BASE_ALLOC: AllocationRecord = {
  allocation_id: "a-1", tour_id: "t-1", stop_id: "s-1", ticket_type_id: "tt-1",
  category: "venue", requested_quantity: 100, held_quantity: 80, issued_quantity: 60,
  released_quantity: 10, status: "held", deadline: "2025-08-05T00:00:00Z",
  release_rule: "deadline", created_by: "u", created_at: "T",
}

describe("TIX-503 — Allocations matrix", () => {
  it("builds matrix cells", () => {
    const cells = buildAllocationMatrix([BASE_ALLOC])
    expect(cells).toHaveLength(1)
    expect(cells[0].held).toBe(80)
    expect(cells[0].issued).toBe(60)
  })

  it("identifies allocations at risk of expiry", () => {
    const at_risk = getAllocationsAtRiskOfExpiry([BASE_ALLOC], "2025-08-04T12:00:00Z")
    expect(at_risk).toHaveLength(1) // within 24h of deadline
  })

  it("does not flag far-future deadlines", () => {
    const far = { ...BASE_ALLOC, deadline: "2025-09-01T00:00:00Z" }
    expect(getAllocationsAtRiskOfExpiry([far], "2025-08-01T00:00:00Z")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TIX-504 — Comp/guest approval
// ---------------------------------------------------------------------------

const BASE_COMP: CompRequest = {
  request_id: "cr-1", event_id: "ev-1", recipient_name: "VIP Guest",
  recipient_email: "vip@example.com", host_id: "u-host", category: "comp",
  ticket_type_id: "tt-1", quantity: 2, plus_one_allowed: false,
  credential_required: null, notes: null, privacy_notes: null,
  status: "pending", approved_by: null, approved_at: null, denial_reason: null,
  issued_ticket_ids: [], attended: null, created_at: "T",
}

describe("TIX-504 — Comp/guest approval", () => {
  it("approves a pending request", () => {
    const r = approveCompRequest(BASE_COMP, "approver", "T")
    expect(r.ok).toBe(true)
    expect(r.request?.status).toBe("approved")
  })

  it("denies with reason", () => {
    const r = denyCompRequest(BASE_COMP, "approver", "Budget exceeded", "T")
    expect(r.ok).toBe(true)
    expect(r.request?.status).toBe("denied")
    expect(r.request?.denial_reason).toBe("Budget exceeded")
  })

  it("denial requires non-empty reason", () => {
    expect(denyCompRequest(BASE_COMP, "a", "  ", "T").ok).toBe(false)
  })

  it("cannot approve non-pending request", () => {
    const denied = denyCompRequest(BASE_COMP, "a", "reason", "T").request!
    expect(approveCompRequest(denied, "a", "T").ok).toBe(false)
  })

  it("issues comp after approval", () => {
    const approved = approveCompRequest(BASE_COMP, "a", "T").request!
    const r = issueComp(approved, ["tix-1", "tix-2"])
    expect(r.ok).toBe(true)
    expect(r.request?.status).toBe("issued")
    expect(r.request?.issued_ticket_ids).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// TIX-505 — Campaigns/promos
// ---------------------------------------------------------------------------

const BASE_CAMPAIGN: PromoCampaign = {
  campaign_id: "camp-1", event_id: "ev-1", name: "Early Bird",
  discount_type: "percent", discount_value: 20,
  eligible_ticket_type_ids: [], max_total_redemptions: 100,
  budget_minor_units: 50000, total_redeemed: 0,
  status: "active", valid_from: "2025-07-01T00:00:00Z", valid_until: "2025-08-20T00:00:00Z",
  codes: [], created_by: "u",
}

const BASE_CODE: PromoCode = {
  code_id: "pc-1", campaign_id: "camp-1", code: "EARLY20",
  redemption_count: 0, max_redemptions: 50, is_active: true,
}

describe("TIX-505 — Campaigns/promos", () => {
  it("computes percent discount", () => {
    const discount = computePromoDiscount(BASE_CAMPAIGN, 10000)
    expect(discount).toBe(2000) // 20%
  })

  it("computes fixed discount", () => {
    const camp = { ...BASE_CAMPAIGN, discount_type: "fixed" as const, discount_value: 500 }
    expect(computePromoDiscount(camp, 10000)).toBe(500)
  })

  it("computes free (full face value)", () => {
    const camp = { ...BASE_CAMPAIGN, discount_type: "free" as const, discount_value: 0 }
    expect(computePromoDiscount(camp, 10000)).toBe(10000)
  })

  it("redeemable when all conditions met", () => {
    expect(isPromoRedeemable(BASE_CAMPAIGN, BASE_CODE, "2025-08-01T00:00:00Z")).toBe(true)
  })

  it("not redeemable when paused", () => {
    const paused = { ...BASE_CAMPAIGN, status: "paused" as const }
    expect(isPromoRedeemable(paused, BASE_CODE, "2025-08-01T00:00:00Z")).toBe(false)
  })

  it("not redeemable when max_total_redemptions hit", () => {
    const maxed = { ...BASE_CAMPAIGN, total_redeemed: 100 }
    expect(isPromoRedeemable(maxed, BASE_CODE, "2025-08-01T00:00:00Z")).toBe(false)
  })

  it("not redeemable when code max_redemptions hit", () => {
    const maxedCode = { ...BASE_CODE, redemption_count: 50 }
    expect(isPromoRedeemable(BASE_CAMPAIGN, maxedCode, "2025-08-01T00:00:00Z")).toBe(false)
  })

  it("not redeemable outside validity window", () => {
    expect(isPromoRedeemable(BASE_CAMPAIGN, BASE_CODE, "2025-06-01T00:00:00Z")).toBe(false)
    expect(isPromoRedeemable(BASE_CAMPAIGN, BASE_CODE, "2025-09-01T00:00:00Z")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TIX-506 — Ticket operations
// ---------------------------------------------------------------------------

describe("TIX-506 — Ticket operations", () => {
  it("allows void on active ticket", () => {
    expect(canPerformOperation("active", "void")).toBe(true)
  })

  it("blocks void on voided ticket", () => {
    expect(canPerformOperation("voided", "void")).toBe(false)
  })

  it("only allows void on transferred ticket", () => {
    expect(canPerformOperation("transferred", "void")).toBe(true)
    expect(canPerformOperation("transferred", "refund")).toBe(false)
  })

  it("creates a ticket operation with reason", () => {
    const r = createTicketOperation({
      operation_id: "op-1", ticket_id: "tix-1",
      ticket_status: "active", operation_type: "refund",
      actor_id: "u", reason: "Customer request",
      financial_impact_minor_units: -5000, now: "T",
    })
    expect(r.ok).toBe(true)
    expect(r.operation?.status).toBe("pending")
    expect(r.operation?.financial_impact_minor_units).toBe(-5000)
  })

  it("requires reason", () => {
    const r = createTicketOperation({
      operation_id: "op-1", ticket_id: "tix-1", ticket_status: "active",
      operation_type: "void", actor_id: "u", reason: "  ", now: "T",
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/[Rr]eason/)
  })
})

// ---------------------------------------------------------------------------
// TIX-507 — Tour ticketing workspace
// ---------------------------------------------------------------------------

describe("TIX-507 — Tour ticketing workspace", () => {
  const SUMMARY: StopTicketingSummary = {
    stop_id: "s-1", total_capacity: 1000, sold: 500, held: 100,
    comped: 20, refunded: 10, checked_in: 480, exceptions: 3,
    provider_data_fresh: true, provider_last_synced_at: "T",
  }

  it("builds tour workspace", () => {
    const ws = buildTourTicketingWorkspace("tour-1", [SUMMARY])
    expect(ws.total_sold).toBe(500)
    expect(ws.total_comped).toBe(20)
    expect(ws.total_exceptions).toBe(3)
    expect(ws.has_stale_provider_data).toBe(false)
  })

  it("flags stale provider data", () => {
    const stale = { ...SUMMARY, stop_id: "s-2", provider_data_fresh: false }
    const ws = buildTourTicketingWorkspace("t", [SUMMARY, stale])
    expect(ws.has_stale_provider_data).toBe(true)
  })
})
