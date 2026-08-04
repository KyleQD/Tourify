import { describe, expect, it } from "vitest"

import {
  acceptDelivery,
  acceptDeliveryItem,
  approveMenuProposal,
  buildCrewMealView,
  buildDeliveryChecklistSummary,
  buildHeadcountSnapshot,
  buildVarianceSummary,
  buildVendorDeliveryView,
  canTransitionMealServiceStatus,
  detectMealTimelineConflicts,
  MealServiceTransitionError,
  reportDeliveryIssue,
  type DeliveryChecklistItem,
  type HospitalityRequirement,
  type MealHeadcount,
  type MealService,
  type MenuProposal,
} from "@/lib/admin/catering-hospitality"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeRequirement(overrides: Partial<HospitalityRequirement> = {}): HospitalityRequirement {
  return {
    id: "req-1",
    org_id: "org-1",
    tour_id: "tour-1",
    stop_id: "stop-1",
    source: "rider",
    source_version: "v3",
    source_document_label: "Artist Rider v3.pdf",
    category: "dressing_room_catering",
    label: "Sparkling water",
    quantity: 12,
    unit: "bottles",
    notes: "Still only, no sparkling if unavailable",
    dietary_privacy_class: "none",
    is_local_variance: false,
    overrides_requirement_id: null,
    variance_reason: null,
    variance_approved_by_user_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeMealService(overrides: Partial<MealService> = {}): MealService {
  return {
    id: overrides.id ?? "svc-1",
    org_id: "org-1",
    tour_id: "tour-1",
    stop_id: overrides.stop_id ?? "stop-1",
    service_date: overrides.service_date ?? "2025-06-15",
    meal_type: overrides.meal_type ?? "dinner",
    status: overrides.status ?? "planned",
    window: overrides.window ?? {
      window_start_utc: "2025-06-15T17:00:00Z",
      window_end_utc:   "2025-06-15T19:00:00Z",
    },
    location_label: "Backstage Catering Room",
    stop_id_location: null,
    provider_name: "City Caterers",
    provider_vendor_id: null,
    menu_proposal_id: null,
    menu_notes: "No shellfish",
    headcount_snapshot_id: null,
    headcount_estimate: 40,
    cost_per_head: 25,
    flat_cost: null,
    currency: "USD",
    owner_user_id: "user-pm",
    owner_user_name: "Tour PM",
    created_at: "2025-05-01T00:00:00Z",
    updated_at: "2025-05-01T00:00:00Z",
    ...overrides,
  }
}

function makeProposal(overrides: Partial<MenuProposal> = {}): MenuProposal {
  return {
    id: "prop-1",
    meal_service_id: "svc-1",
    org_id: "org-1",
    status: "proposed",
    menu_description: "Grilled chicken, pasta, salad bar",
    proposed_cost_per_head: 25,
    proposed_flat_cost: null,
    currency: "USD",
    approved_by_user_id: null,
    approved_at: null,
    changes_requested: [],
    accepted_by_user_id: null,
    accepted_at: null,
    delivery_issues: [],
    actual_headcount: null,
    actual_cost: null,
    created_at: "2025-05-01T00:00:00Z",
    updated_at: "2025-05-01T00:00:00Z",
    ...overrides,
  }
}

function makeDeliveryItem(overrides: Partial<DeliveryChecklistItem> = {}): DeliveryChecklistItem {
  return {
    id: "del-1",
    requirement_id: "req-1",
    label: "Sparkling water",
    quantity_expected: 12,
    quantity_delivered: null,
    status: "pending",
    variance_notes: null,
    room_or_location: "Dressing Room A",
    delivery_window_start_utc: "2025-06-15T15:00:00Z",
    delivery_window_end_utc:   "2025-06-15T16:00:00Z",
    provider_name: "Venue Catering",
    accepted_by_user_id: null,
    accepted_at_utc: null,
    advance_item_id: null,
    site_map_ref: null,
    logistics_task_id: null,
    ...overrides,
  }
}

// ============================================================================
// CATER-301 — Hospitality requirements
// ============================================================================

describe("CATER-301 hospitality requirements", () => {
  it("preserves source, version, and document label", () => {
    const req = makeRequirement()
    expect(req.source).toBe("rider")
    expect(req.source_version).toBe("v3")
    expect(req.source_document_label).toBe("Artist Rider v3.pdf")
  })

  it("tracks local variance with approval", () => {
    const req = makeRequirement({
      source: "local",
      is_local_variance: true,
      overrides_requirement_id: "req-tour-std",
      variance_reason: "Venue only stocks still water",
      variance_approved_by_user_id: "user-pm",
    })
    expect(req.is_local_variance).toBe(true)
    expect(req.overrides_requirement_id).toBe("req-tour-std")
    expect(req.variance_approved_by_user_id).toBe("user-pm")
  })

  it("builds variance summary correctly", () => {
    const requirements: HospitalityRequirement[] = [
      makeRequirement({ source: "rider",         is_local_variance: false }),
      makeRequirement({ id: "r2", source: "advance",       is_local_variance: false }),
      makeRequirement({ id: "r3", source: "tour_standard", is_local_variance: false }),
      makeRequirement({ id: "r4", source: "local",         is_local_variance: true }),
      makeRequirement({ id: "r5", source: "local",         is_local_variance: true }),
    ]
    const summary = buildVarianceSummary(requirements)
    expect(summary.total_requirements).toBe(5)
    expect(summary.local_variance_count).toBe(2)
    expect(summary.rider_count).toBe(1)
    expect(summary.advance_count).toBe(1)
    expect(summary.tour_standard_count).toBe(1)
  })
})

// ============================================================================
// CATER-302 — Meal-service planner
// ============================================================================

describe("CATER-302 meal service transitions", () => {
  it("allows planned → confirmed → in_preparation → delivered", () => {
    expect(canTransitionMealServiceStatus("planned",        "confirmed")).toBe(true)
    expect(canTransitionMealServiceStatus("confirmed",      "in_preparation")).toBe(true)
    expect(canTransitionMealServiceStatus("in_preparation", "delivered")).toBe(true)
  })

  it("allows cancel and re-plan", () => {
    expect(canTransitionMealServiceStatus("planned",   "cancelled")).toBe(true)
    expect(canTransitionMealServiceStatus("cancelled", "planned")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionMealServiceStatus("delivered", "delivered")).toBe(true)
  })

  it("rejects delivered → any (terminal)", () => {
    expect(canTransitionMealServiceStatus("delivered", "planned")).toBe(false)
    expect(() => {
      const err = new MealServiceTransitionError("delivered", "planned")
      throw err
    }).toThrow(MealServiceTransitionError)
  })
})

describe("CATER-302 timeline conflict detection", () => {
  it("flags overlapping windows for same stop/date", () => {
    const services: MealService[] = [
      makeMealService({ id: "s1", meal_type: "lunch",  window: { window_start_utc: "2025-06-15T12:00:00Z", window_end_utc: "2025-06-15T13:30:00Z" } }),
      makeMealService({ id: "s2", meal_type: "dinner", window: { window_start_utc: "2025-06-15T13:00:00Z", window_end_utc: "2025-06-15T14:00:00Z" } }),
    ]
    const conflicts = detectMealTimelineConflicts(services)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].meal_service_id_a).toBe("s1")
  })

  it("does not flag non-overlapping windows", () => {
    const services: MealService[] = [
      makeMealService({ id: "s1", window: { window_start_utc: "2025-06-15T12:00:00Z", window_end_utc: "2025-06-15T13:00:00Z" } }),
      makeMealService({ id: "s2", window: { window_start_utc: "2025-06-15T13:00:00Z", window_end_utc: "2025-06-15T14:00:00Z" } }),
    ]
    expect(detectMealTimelineConflicts(services)).toHaveLength(0)
  })

  it("does not flag cancelled services", () => {
    const services: MealService[] = [
      makeMealService({ id: "s1", status: "cancelled", window: { window_start_utc: "2025-06-15T12:00:00Z", window_end_utc: "2025-06-15T13:30:00Z" } }),
      makeMealService({ id: "s2", window: { window_start_utc: "2025-06-15T13:00:00Z", window_end_utc: "2025-06-15T14:00:00Z" } }),
    ]
    expect(detectMealTimelineConflicts(services)).toHaveLength(0)
  })

  it("does not flag services on different dates", () => {
    const services: MealService[] = [
      makeMealService({ id: "s1", service_date: "2025-06-15" }),
      makeMealService({ id: "s2", service_date: "2025-06-16" }),
    ]
    expect(detectMealTimelineConflicts(services)).toHaveLength(0)
  })
})

// ============================================================================
// CATER-303 — Privacy-safe headcounts
// ============================================================================

describe("CATER-303 headcount snapshot", () => {
  it("aggregates dietary needs without names", () => {
    const snapshot = buildHeadcountSnapshot("svc-1", "snap-1", {
      source_group: "Band",
      members: [
        { dietary_notes: "Vegan", accessibility_notes: null, is_excluded: false, exclusion_reason: null },
        { dietary_notes: "Vegan", accessibility_notes: null, is_excluded: false, exclusion_reason: null },
        { dietary_notes: "Gluten-free", accessibility_notes: "wheelchair", is_excluded: false, exclusion_reason: null },
        { dietary_notes: null, accessibility_notes: null, is_excluded: true, exclusion_reason: "buyout" },
      ],
      hasCoordinatorCap: false,
    }, "2025-06-15T10:00:00Z")

    expect(snapshot.included_count).toBe(3)
    expect(snapshot.excluded_count).toBe(1)
    const veganEntry = snapshot.dietary_aggregates.find((d) => d.label === "vegan")
    expect(veganEntry?.count).toBe(2)
    expect(snapshot.accessibility_aggregates[0].label).toBe("wheelchair")
    // No individual names or IDs in output
    const serialized = JSON.stringify(snapshot)
    expect(serialized).not.toContain("person_id")
  })

  it("strips individual exceptions when coordinator cap not set", () => {
    const snapshot = buildHeadcountSnapshot("svc-1", "snap-1", {
      source_group: "Crew",
      members: [],
      hasCoordinatorCap: false,
      individualExceptions: [
        { person_id: "p-1", person_display_name: "Alice", dietary_note: "severe nut allergy", purpose: "EpiPen pre-staging" },
      ],
    }, "2025-06-15T10:00:00Z")
    expect(snapshot.individual_exceptions).toHaveLength(0)
    expect(snapshot.was_built_with_coordinator_cap).toBe(false)
  })

  it("includes individual exceptions when coordinator cap is set with purpose", () => {
    const snapshot = buildHeadcountSnapshot("svc-1", "snap-1", {
      source_group: "Crew",
      members: [],
      hasCoordinatorCap: true,
      individualExceptions: [
        { person_id: "p-1", person_display_name: "Alice", dietary_note: "severe nut allergy", purpose: "EpiPen pre-staging" },
      ],
    }, "2025-06-15T10:00:00Z")
    expect(snapshot.individual_exceptions).toHaveLength(1)
    expect(snapshot.was_built_with_coordinator_cap).toBe(true)
  })
})

// ============================================================================
// CATER-304 — Menu/delivery approval
// ============================================================================

describe("CATER-304 menu proposal workflow", () => {
  it("approves a proposed menu", () => {
    const proposal = makeProposal()
    const approved = approveMenuProposal(proposal, "user-pm", "2025-06-10T09:00:00Z")
    expect(approved.status).toBe("approved")
    expect(approved.approved_by_user_id).toBe("user-pm")
  })

  it("throws approval on wrong status", () => {
    const proposal = makeProposal({ status: "accepted" })
    expect(() => approveMenuProposal(proposal, "user-pm", "2025-06-10T09:00:00Z")).toThrow(/proposed/)
  })

  it("accepts delivery with actual headcount and cost", () => {
    const proposal = makeProposal({ status: "approved" })
    const accepted = acceptDelivery(proposal, "user-pm", "2025-06-15T18:30:00Z", 38, 950)
    expect(accepted.status).toBe("accepted")
    expect(accepted.actual_headcount).toBe(38)
    expect(accepted.actual_cost).toBe(950)
  })

  it("reports delivery issue and transitions to issue_reported", () => {
    const proposal = makeProposal({ status: "approved" })
    const withIssue = reportDeliveryIssue(proposal, {
      issue_type: "shortage",
      description: "Only 30 meals delivered, expected 40",
      reported_by_user_id: "user-pm",
      reported_at: "2025-06-15T17:45:00Z",
      quantity_affected: 10,
    })
    expect(withIssue.status).toBe("issue_reported")
    expect(withIssue.delivery_issues).toHaveLength(1)
  })

  it("allows acceptance after issue reported", () => {
    let proposal = makeProposal({ status: "approved" })
    proposal = reportDeliveryIssue(proposal, {
      issue_type: "shortage", description: "Short", reported_by_user_id: "u",
      reported_at: "2025-06-15T17:45:00Z", quantity_affected: 5,
    })
    const accepted = acceptDelivery(proposal, "user-pm", "2025-06-15T18:00:00Z", 35, 875)
    expect(accepted.status).toBe("accepted")
  })
})

// ============================================================================
// CATER-305 — Hospitality delivery checklist
// ============================================================================

describe("CATER-305 delivery checklist", () => {
  it("accepts an item in full quantity", () => {
    const item = makeDeliveryItem()
    const accepted = acceptDeliveryItem(item, 12, "user-pm", "2025-06-15T15:30:00Z")
    expect(accepted.status).toBe("accepted")
    expect(accepted.quantity_delivered).toBe(12)
    expect(accepted.variance_notes).toBeNull()
  })

  it("records variance when quantity short", () => {
    const item = makeDeliveryItem()
    const partial = acceptDeliveryItem(item, 8, "user-pm", "2025-06-15T15:30:00Z")
    expect(partial.status).toBe("variance")
    expect(partial.variance_notes).toContain("Expected 12, received 8")
  })

  it("computes checklist summary correctly", () => {
    const items: DeliveryChecklistItem[] = [
      makeDeliveryItem({ id: "d1", status: "accepted" }),
      makeDeliveryItem({ id: "d2", status: "accepted" }),
      makeDeliveryItem({ id: "d3", status: "variance" }),
      makeDeliveryItem({ id: "d4", status: "missing" }),
      makeDeliveryItem({ id: "d5", status: "pending" }),
    ]
    const summary = buildDeliveryChecklistSummary(items)
    expect(summary.total).toBe(5)
    expect(summary.accepted).toBe(2)
    expect(summary.variance).toBe(1)
    expect(summary.missing).toBe(1)
    expect(summary.pending).toBe(1)
    expect(summary.is_complete).toBe(false)
  })

  it("is complete when no pending or missing items", () => {
    const items: DeliveryChecklistItem[] = [
      makeDeliveryItem({ id: "d1", status: "accepted" }),
      makeDeliveryItem({ id: "d2", status: "variance" }),
    ]
    expect(buildDeliveryChecklistSummary(items).is_complete).toBe(true)
  })
})

// ============================================================================
// CATER-306 — Crew/vendor projections
// ============================================================================

describe("CATER-306 crew meal view", () => {
  it("includes meal details and personal dietary note only", () => {
    const service = makeMealService()
    const view = buildCrewMealView(service, "No red meat")
    expect(view.meal_type).toBe("dinner")
    expect(view.location_label).toBe("Backstage Catering Room")
    expect(view.provider_name).toBe("City Caterers")
    expect(view.personal_dietary_note).toBe("No red meat")
  })

  it("personal dietary note is null when not provided", () => {
    const service = makeMealService()
    const view = buildCrewMealView(service, null)
    expect(view.personal_dietary_note).toBeNull()
  })
})

describe("CATER-306 vendor delivery view", () => {
  it("includes authorized headcount and dietary aggregates only — no names", () => {
    const service = makeMealService()
    const headcount: MealHeadcount = {
      id: "snap-1",
      meal_service_id: "svc-1",
      source_group: "All",
      included_count: 38,
      excluded_count: 2,
      exclusion_notes: "buyout",
      dietary_aggregates: [{ label: "vegan", count: 4 }, { label: "gluten-free", count: 2 }],
      accessibility_aggregates: [],
      individual_exceptions: [
        { person_id: "p-1", person_display_name: "Alice", dietary_note: "nut allergy", purpose: "EpiPen" },
      ],
      was_built_with_coordinator_cap: true,
      snapshot_taken_at: "2025-06-15T10:00:00Z",
    }
    const view = buildVendorDeliveryView(service, headcount, "No shellfish; include vegan option", "Jane Catering Coord", "+1-555-9999")

    expect(view.authorized_headcount).toBe(38)
    expect(view.dietary_aggregates).toHaveLength(2)
    expect(view.contact_name).toBe("Jane Catering Coord")

    // Confirm no individual identifiers in vendor view
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain("person_id")
    expect(serialized).not.toContain("p-1")
    expect(serialized).not.toContain("Alice")
    expect(serialized).not.toContain("individual_exception")
  })
})
