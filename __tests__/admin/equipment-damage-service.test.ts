import { describe, expect, it } from "vitest"

import {
  assertDamageReportTransition,
  assertServiceStatusTransition,
  attachEvidence,
  buildIncidentSummary,
  buildServiceHistory,
  canTransitionDamageReportStatus,
  canTransitionServiceStatus,
  completeServiceEvent,
  computeServiceCost,
  DamageReportTransitionError,
  resolveReport,
  ServiceStatusTransitionError,
  type DamageLossReport,
  type EvidenceRef,
  type ServiceEvent,
} from "@/lib/admin/equipment-damage-service"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<DamageLossReport> = {}): DamageLossReport {
  return {
    id: "rpt-1",
    org_id: "org-1",
    tour_id: "tour-1",
    catalog_item_id: "item-1",
    case_id: null,
    item_label: "Shure SM58",
    report_type: "damage",
    severity: "functional",
    loss_type: null,
    condition_at_report: "minor_damage",
    description: "Rear panel dented; XLR socket loose",
    incident_location: "Stage Right, Chicago",
    incident_at_utc: "2025-06-10T21:00:00Z",
    evidence: [],
    triggering_custody_event_id: "cev-1",
    custody_holder_at_incident_id: "user-a1",
    custody_holder_at_incident_name: "A1",
    owner_user_id: "user-pm",
    owner_user_name: "Tour PM",
    vendor_id: null,
    insurance_policy_ref: null,
    insurance_claim_ref: null,
    finance_record_id: null,
    service_event_id: null,
    status: "open",
    resolution: null,
    previous_asset_status: "deployed",
    new_asset_status: "damaged",
    reported_by_user_id: "user-a1",
    reported_at_utc: "2025-06-10T21:30:00Z",
    updated_at_utc: "2025-06-10T21:30:00Z",
    ...overrides,
  }
}

function makeServiceEvent(overrides: Partial<ServiceEvent> = {}): ServiceEvent {
  return {
    id: "svc-1",
    org_id: "org-1",
    tour_id: "tour-1",
    catalog_item_id: overrides.catalog_item_id ?? "item-1",
    case_id: overrides.case_id ?? null,
    item_label: "Shure SM58",
    service_type: "reactive_repair",
    status: overrides.status ?? "scheduled",
    damage_report_id: "rpt-1",
    service_provider: "Audio Repair Co.",
    service_provider_vendor_id: null,
    scheduled_date: "2025-06-12",
    started_at_utc: null,
    completed_at_utc: null,
    description: "Replace XLR socket, repair rear panel",
    findings: null,
    parts_used: overrides.parts_used ?? [],
    labor_cost: overrides.labor_cost ?? 80,
    total_parts_cost: null,
    currency: "USD",
    finance_record_id: null,
    evidence: [],
    post_service_asset_status: null,
    next_service_due_date: null,
    created_by_user_id: "user-pm",
    created_at_utc: "2025-06-11T09:00:00Z",
    updated_at_utc: "2025-06-11T09:00:00Z",
    ...overrides,
  }
}

function makeEvidenceRef(overrides: Partial<EvidenceRef> = {}): EvidenceRef {
  return {
    evidence_token: "tok_abc123",
    mime_type: "image/jpeg",
    label: "Impact photo",
    uploaded_at_utc: "2025-06-10T21:35:00Z",
    uploaded_by_user_id: "user-a1",
    ...overrides,
  }
}

// ============================================================================
// Damage report transitions
// ============================================================================

describe("EQUIP-306 damage report transitions", () => {
  it("allows open → under_review → resolved → closed", () => {
    expect(canTransitionDamageReportStatus("open", "under_review")).toBe(true)
    expect(canTransitionDamageReportStatus("under_review", "resolved")).toBe(true)
    expect(canTransitionDamageReportStatus("resolved", "closed")).toBe(true)
  })

  it("allows open → disputed → under_review", () => {
    expect(canTransitionDamageReportStatus("open", "disputed")).toBe(true)
    expect(canTransitionDamageReportStatus("disputed", "under_review")).toBe(true)
  })

  it("allows re-opening under_review → open (new information)", () => {
    expect(canTransitionDamageReportStatus("under_review", "open")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionDamageReportStatus("open", "open")).toBe(true)
  })

  it("rejects closed → any (terminal)", () => {
    expect(canTransitionDamageReportStatus("closed", "open")).toBe(false)
    expect(() => assertDamageReportTransition("closed", "open")).toThrow(DamageReportTransitionError)
  })
})

// ============================================================================
// Evidence attachment
// ============================================================================

describe("EQUIP-306 evidence attachment", () => {
  it("attaches an evidence ref to an open report (immutable)", () => {
    const rpt = makeReport()
    const ref = makeEvidenceRef()
    const updated = attachEvidence(rpt, ref, "2025-06-10T21:40:00Z")
    expect(updated.evidence).toHaveLength(1)
    expect(updated.evidence[0].evidence_token).toBe("tok_abc123")
    // Original unchanged
    expect(rpt.evidence).toHaveLength(0)
  })

  it("stores only evidence_token — no raw URL fields", () => {
    const ref = makeEvidenceRef({ evidence_token: "tok_secure" })
    expect("url" in ref).toBe(false)
    expect("file_path" in ref).toBe(false)
    expect(ref.evidence_token).toBe("tok_secure")
  })

  it("throws when attaching evidence to a closed report", () => {
    const rpt = makeReport({ status: "closed" })
    expect(() => attachEvidence(rpt, makeEvidenceRef(), "2025-06-11T00:00:00Z")).toThrow(/closed/)
  })
})

// ============================================================================
// Report resolution
// ============================================================================

describe("EQUIP-306 resolveReport", () => {
  it("resolves a report with outcome and notes", () => {
    const rpt = makeReport({ status: "under_review" })
    const resolved = resolveReport(
      rpt,
      {
        outcome: "repaired",
        resolved_by_user_id: "user-pm",
        resolved_at_utc: "2025-06-15T12:00:00Z",
        resolution_notes: "XLR socket replaced; item returned to service",
        replacement_catalog_item_id: null,
        insurance_claim_ref: null,
        finance_record_id: "fin-001",
      },
      "available",
    )
    expect(resolved.status).toBe("resolved")
    expect(resolved.resolution?.outcome).toBe("repaired")
    expect(resolved.new_asset_status).toBe("available")
    expect(resolved.resolution?.finance_record_id).toBe("fin-001")
  })

  it("throws when resolution notes are blank", () => {
    const rpt = makeReport({ status: "open" })
    expect(() =>
      resolveReport(rpt, {
        outcome: "no_action",
        resolved_by_user_id: "user-pm",
        resolved_at_utc: "2025-06-15T12:00:00Z",
        resolution_notes: "   ",
        replacement_catalog_item_id: null,
        insurance_claim_ref: null,
        finance_record_id: null,
      }, null),
    ).toThrow(/notes/)
  })

  it("throws when trying to resolve an already-resolved or closed report", () => {
    const rpt = makeReport({ status: "resolved" })
    expect(() =>
      resolveReport(rpt, {
        outcome: "no_action",
        resolved_by_user_id: "u",
        resolved_at_utc: "2025-06-15T12:00:00Z",
        resolution_notes: "Notes",
        replacement_catalog_item_id: null,
        insurance_claim_ref: null,
        finance_record_id: null,
      }, null),
    ).toThrow(/resolved/)
  })

  it("links replacement catalog item for replaced outcome", () => {
    const rpt = makeReport({ status: "open" })
    const resolved = resolveReport(
      rpt,
      {
        outcome: "replaced",
        resolved_by_user_id: "user-pm",
        resolved_at_utc: "2025-06-15T12:00:00Z",
        resolution_notes: "Replaced with new unit",
        replacement_catalog_item_id: "item-new-1",
        insurance_claim_ref: null,
        finance_record_id: null,
      },
      "retired",
    )
    expect(resolved.resolution?.replacement_catalog_item_id).toBe("item-new-1")
    expect(resolved.new_asset_status).toBe("retired")
  })
})

// ============================================================================
// Service event
// ============================================================================

describe("EQUIP-306 service event transitions", () => {
  it("allows scheduled → in_progress → completed", () => {
    expect(canTransitionServiceStatus("scheduled", "in_progress")).toBe(true)
    expect(canTransitionServiceStatus("in_progress", "completed")).toBe(true)
  })

  it("allows awaiting_parts detour", () => {
    expect(canTransitionServiceStatus("in_progress", "awaiting_parts")).toBe(true)
    expect(canTransitionServiceStatus("awaiting_parts", "in_progress")).toBe(true)
  })

  it("allows re-schedule after cancel", () => {
    expect(canTransitionServiceStatus("cancelled", "scheduled")).toBe(true)
  })

  it("rejects completed → any (terminal)", () => {
    expect(canTransitionServiceStatus("completed", "scheduled")).toBe(false)
    expect(() => assertServiceStatusTransition("completed", "scheduled")).toThrow(
      ServiceStatusTransitionError,
    )
  })
})

describe("EQUIP-306 computeServiceCost", () => {
  it("sums labor and parts correctly", () => {
    const svc = makeServiceEvent({
      labor_cost: 80,
      parts_used: [
        { description: "XLR socket", quantity: 1, unit_cost: 12, currency: "USD" },
        { description: "Panel screw set", quantity: 4, unit_cost: 0.5, currency: "USD" },
      ],
    })
    expect(computeServiceCost(svc)).toBeCloseTo(80 + 12 + 2)
  })

  it("handles null unit_cost as zero", () => {
    const svc = makeServiceEvent({
      labor_cost: 50,
      parts_used: [{ description: "Part", quantity: 2, unit_cost: null, currency: "USD" }],
    })
    expect(computeServiceCost(svc)).toBe(50)
  })

  it("handles no parts or labor", () => {
    const svc = makeServiceEvent({ labor_cost: null, parts_used: [] })
    expect(computeServiceCost(svc)).toBe(0)
  })
})

describe("EQUIP-306 completeServiceEvent", () => {
  it("transitions to completed and stamps findings and next service date", () => {
    const svc = makeServiceEvent({ status: "in_progress" })
    const completed = completeServiceEvent(svc, {
      findings: "XLR socket replaced; casing repaired",
      completedAtUtc: "2025-06-13T15:00:00Z",
      postServiceAssetStatus: "available",
      nextServiceDueDate: "2026-06-13",
    })
    expect(completed.status).toBe("completed")
    expect(completed.findings).toBe("XLR socket replaced; casing repaired")
    expect(completed.post_service_asset_status).toBe("available")
    expect(completed.next_service_due_date).toBe("2026-06-13")
  })

  it("throws if not in a valid state to complete", () => {
    const svc = makeServiceEvent({ status: "scheduled" }) // must be in_progress first
    expect(() =>
      completeServiceEvent(svc, {
        findings: "Done", completedAtUtc: "2025-06-13T15:00:00Z",
        postServiceAssetStatus: null, nextServiceDueDate: null,
      }),
    ).toThrow(ServiceStatusTransitionError)
  })
})

// ============================================================================
// Service history
// ============================================================================

describe("EQUIP-306 buildServiceHistory", () => {
  const events: ServiceEvent[] = [
    makeServiceEvent({ id: "svc-1", status: "completed", scheduled_date: "2024-01-10", labor_cost: 100, parts_used: [], completed_at_utc: "2024-01-12T10:00:00Z", next_service_due_date: "2025-01-10" }),
    makeServiceEvent({ id: "svc-2", status: "completed", scheduled_date: "2025-01-15", labor_cost: 60,  parts_used: [{ description: "Part", quantity: 1, unit_cost: 20, currency: "USD" }], completed_at_utc: "2025-01-17T10:00:00Z", next_service_due_date: "2026-01-15" }),
    makeServiceEvent({ id: "svc-3", status: "scheduled", scheduled_date: "2025-06-12", labor_cost: 80,  parts_used: [] }),
  ]

  it("builds a full history with cost aggregation", () => {
    const history = buildServiceHistory("item-1", false, "SM58", events, false)
    expect(history.total_service_events).toBe(3)
    expect(history.completed_service_events).toBe(2)
    expect(history.total_cost_all_time).toBe(260) // 100 + (60+20) + 80
    expect(history.last_serviced_date).toBe("2025-01-15")
    expect(history.next_service_due_date).toBe("2026-01-15")
    expect(history.has_open_damage_reports).toBe(false)
  })

  it("flags has_open_damage_reports", () => {
    const history = buildServiceHistory("item-1", false, "SM58", events, true)
    expect(history.has_open_damage_reports).toBe(true)
  })

  it("filters by case_id when isCase=true", () => {
    const caseEvent = makeServiceEvent({ id: "svc-c1", catalog_item_id: null, case_id: "case-1", status: "scheduled" })
    const history = buildServiceHistory("case-1", true, "FOH Case", [caseEvent, ...events], false)
    expect(history.entries).toHaveLength(1)
    expect(history.case_id).toBe("case-1")
    expect(history.catalog_item_id).toBeNull()
  })

  it("returns empty history for new item", () => {
    const history = buildServiceHistory("item-new", false, "New Item", [], false)
    expect(history.total_service_events).toBe(0)
    expect(history.total_cost_all_time).toBe(0)
    expect(history.next_service_due_date).toBeNull()
  })
})

// ============================================================================
// Incident summary
// ============================================================================

describe("EQUIP-306 buildIncidentSummary", () => {
  const reports: DamageLossReport[] = [
    makeReport({ id: "r1", report_type: "damage",  status: "open",     severity: "critical",   insurance_claim_ref: null, new_asset_status: "damaged" }),
    makeReport({ id: "r2", report_type: "loss",    status: "under_review", severity: null, insurance_claim_ref: "CLM-001", new_asset_status: null }),
    makeReport({ id: "r3", report_type: "damage",  status: "resolved", severity: "functional", insurance_claim_ref: null, new_asset_status: "available" }),
    makeReport({ id: "r4", report_type: "damage",  status: "closed",   severity: "cosmetic",   insurance_claim_ref: null, new_asset_status: null }),
  ]
  const serviceEvents: ServiceEvent[] = [
    makeServiceEvent({ id: "s1", status: "in_progress" }),
    makeServiceEvent({ id: "s2", status: "scheduled" }),
    makeServiceEvent({ id: "s3", status: "completed" }),
  ]

  it("counts open reports by type", () => {
    const summary = buildIncidentSummary(reports, serviceEvents)
    expect(summary.open_damage_reports).toBe(1)  // r1 only (r3 resolved, r4 closed)
    expect(summary.open_loss_reports).toBe(1)    // r2
  })

  it("counts critical severity", () => {
    const summary = buildIncidentSummary(reports, serviceEvents)
    expect(summary.critical_severity_count).toBe(1)  // r1 (open + critical)
  })

  it("counts unresolved insurance claims", () => {
    const summary = buildIncidentSummary(reports, serviceEvents)
    expect(summary.unresolved_insurance_claims).toBe(1)  // r2 (claim ref + not closed)
  })

  it("counts pending service events", () => {
    const summary = buildIncidentSummary(reports, serviceEvents)
    expect(summary.pending_service_events).toBe(2)  // s1 (in_progress) + s2 (scheduled)
  })

  it("counts unique items in service/damaged", () => {
    const summary = buildIncidentSummary(reports, serviceEvents)
    expect(summary.items_in_service).toBe(1)  // item-1 from r1 (damaged)
  })
})
