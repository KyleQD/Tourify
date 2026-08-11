import { describe, expect, it } from "vitest"

import {
  assertChecklistStatusTransition,
  buildChecklistFromManifest,
  buildChecklistSummary,
  canTransitionChecklistStatus,
  checkEntry,
  ChecklistStatusTransitionError,
  closeChecklist,
  evaluateCloseoutReadiness,
  raiseException,
  resolveException,
  waiveEntry,
  type ChecklistEntry,
  type EquipmentChecklist,
  type ManifestLineItem,
  type VenueAdvanceItem,
} from "@/lib/admin/equipment-checklist"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeLineItem(overrides: Partial<ManifestLineItem> = {}): ManifestLineItem {
  return {
    id: overrides.id ?? "line-1",
    source_id: "item-1",
    source_type: "org_catalog",
    label: overrides.label ?? "Shure SM58",
    quantity_required: overrides.quantity_required ?? 4,
    quantity_sourced: 4,
    alternates: [],
    department: "FOH Audio",
    responsible_role: "A1",
    notes: null,
    is_sourced: true,
    ...overrides,
  }
}

function makeAdvanceItem(overrides: Partial<VenueAdvanceItem> = {}): VenueAdvanceItem {
  return {
    id: overrides.id ?? "adv-1",
    label: overrides.label ?? "House PA Check",
    catalog_item_id: overrides.catalog_item_id ?? "item-house-1",
    case_id: null,
    quantity: overrides.quantity ?? 1,
    advance_notes: null,
    ...overrides,
  }
}

function makeChecklist(overrides: Partial<EquipmentChecklist> = {}): EquipmentChecklist {
  return {
    id: "cl-1",
    org_id: "org-1",
    tour_id: "tour-1",
    stop_id: "stop-1",
    manifest_id: "manifest-1",
    direction: "load_in",
    status: "in_progress",
    entries: overrides.entries ?? [
      {
        id: "entry-1",
        manifest_line_item_id: "line-1",
        source_type: "manifest",
        label: "Shure SM58",
        catalog_item_id: "item-1",
        case_id: null,
        quantity_expected: 4,
        quantity_checked: null,
        status: "pending",
        actioned_at_utc: null,
        actioned_by_user_id: null,
        notes: null,
        photo_evidence_ref: null,
        exception_assigned_to_user_id: null,
        exception_assigned_to_name: null,
        exception_resolved_at_utc: null,
        exception_resolution_notes: null,
      },
    ],
    opened_at_utc: "2025-06-01T08:00:00Z",
    closed_at_utc: null,
    closed_by_user_id: null,
    created_at: "2025-06-01T07:00:00Z",
    updated_at: "2025-06-01T08:00:00Z",
    ...overrides,
  }
}

// ============================================================================
// Status transitions
// ============================================================================

describe("EQUIP-305 checklist status transitions", () => {
  it("allows draft → in_progress", () => {
    expect(canTransitionChecklistStatus("draft", "in_progress")).toBe(true)
  })

  it("allows in_progress → ready_for_closeout → closed", () => {
    expect(canTransitionChecklistStatus("in_progress", "ready_for_closeout")).toBe(true)
    expect(canTransitionChecklistStatus("ready_for_closeout", "closed")).toBe(true)
  })

  it("allows in_progress → draft (re-open)", () => {
    expect(canTransitionChecklistStatus("in_progress", "draft")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionChecklistStatus("in_progress", "in_progress")).toBe(true)
  })

  it("rejects closed → any (terminal)", () => {
    expect(canTransitionChecklistStatus("closed", "in_progress")).toBe(false)
    expect(() => assertChecklistStatusTransition("closed", "in_progress")).toThrow(
      ChecklistStatusTransitionError,
    )
  })
})

// ============================================================================
// Template derivation
// ============================================================================

describe("EQUIP-305 template derivation from manifest", () => {
  it("creates one pending entry per manifest line", () => {
    const checklist = buildChecklistFromManifest({
      checklistId: "cl-1",
      orgId: "org-1",
      tourId: "tour-1",
      stopId: "stop-1",
      manifestId: "manifest-1",
      direction: "load_in",
      manifestLineItems: [
        makeLineItem({ id: "l1", label: "SM58", quantity_required: 4 }),
        makeLineItem({ id: "l2", label: "DI Box", source_id: "item-2", quantity_required: 2 }),
      ],
      createdAt: "2025-06-01T00:00:00Z",
    })
    expect(checklist.entries).toHaveLength(2)
    expect(checklist.entries.every((e) => e.status === "pending")).toBe(true)
    expect(checklist.entries[0].source_type).toBe("manifest")
    expect(checklist.entries[0].quantity_expected).toBe(4)
  })

  it("appends venue advance items not already covered by manifest", () => {
    const checklist = buildChecklistFromManifest({
      checklistId: "cl-1",
      orgId: "org-1",
      tourId: "tour-1",
      stopId: "stop-1",
      manifestId: "manifest-1",
      direction: "load_in",
      manifestLineItems: [makeLineItem({ source_id: "item-1" })],
      venueAdvanceItems: [
        makeAdvanceItem({ catalog_item_id: "item-house-1" }), // not in manifest
        makeAdvanceItem({ id: "adv-dup", catalog_item_id: "item-1" }), // already covered
      ],
      createdAt: "2025-06-01T00:00:00Z",
    })
    expect(checklist.entries).toHaveLength(2)  // manifest entry + one new advance item
    expect(checklist.entries[1].source_type).toBe("venue_advance")
    expect(checklist.entries[1].catalog_item_id).toBe("item-house-1")
  })

  it("starts as draft", () => {
    const checklist = buildChecklistFromManifest({
      checklistId: "cl-1", orgId: "org-1", tourId: "tour-1", stopId: "stop-1",
      manifestId: "m1", direction: "load_out",
      manifestLineItems: [], createdAt: "2025-06-01T00:00:00Z",
    })
    expect(checklist.status).toBe("draft")
    expect(checklist.direction).toBe("load_out")
  })
})

// ============================================================================
// Entry mutations
// ============================================================================

describe("EQUIP-305 checkEntry", () => {
  it("marks an entry as checked with quantity and actor", () => {
    const cl = makeChecklist()
    const updated = checkEntry(cl, "entry-1", {
      quantityChecked: 4,
      actionedByUserId: "user-a1",
      actionedAtUtc: "2025-06-01T09:00:00Z",
    })
    const entry = updated.entries[0]
    expect(entry.status).toBe("checked")
    expect(entry.quantity_checked).toBe(4)
    expect(entry.actioned_by_user_id).toBe("user-a1")
  })

  it("is immutable — original checklist unchanged", () => {
    const cl = makeChecklist()
    checkEntry(cl, "entry-1", { quantityChecked: 4, actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z" })
    expect(cl.entries[0].status).toBe("pending")
  })

  it("no-ops for an unknown entry id", () => {
    const cl = makeChecklist()
    const updated = checkEntry(cl, "does-not-exist", { quantityChecked: 1, actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z" })
    expect(updated.entries[0].status).toBe("pending")
  })
})

describe("EQUIP-305 raiseException", () => {
  it("marks entry as exception with reason, assignment, and optional photo", () => {
    const cl = makeChecklist()
    const updated = raiseException(cl, "entry-1", {
      reason: "Case not offloaded from truck",
      assignedToUserId: "user-pm",
      assignedToName: "Tour PM",
      photoEvidenceRef: "media://evidence-1.jpg",
      actionedByUserId: "user-a1",
      actionedAtUtc: "2025-06-01T09:30:00Z",
    })
    const entry = updated.entries[0]
    expect(entry.status).toBe("exception")
    expect(entry.notes).toBe("Case not offloaded from truck")
    expect(entry.exception_assigned_to_user_id).toBe("user-pm")
    expect(entry.photo_evidence_ref).toBe("media://evidence-1.jpg")
    // Exception remains OPEN — not auto-resolved
    expect(entry.exception_resolved_at_utc).toBeNull()
  })

  it("throws when reason is blank", () => {
    const cl = makeChecklist()
    expect(() =>
      raiseException(cl, "entry-1", {
        reason: "  ",
        assignedToUserId: "user-pm",
        assignedToName: "PM",
        actionedByUserId: "u",
        actionedAtUtc: "2025-06-01T09:30:00Z",
      }),
    ).toThrow(/reason/)
  })

  it("throws when assignee is blank", () => {
    const cl = makeChecklist()
    expect(() =>
      raiseException(cl, "entry-1", {
        reason: "Not found",
        assignedToUserId: "",
        assignedToName: "",
        actionedByUserId: "u",
        actionedAtUtc: "2025-06-01T09:30:00Z",
      }),
    ).toThrow(/assigned/)
  })
})

describe("EQUIP-305 resolveException", () => {
  it("stamps exception_resolved_at_utc and preserves exception status", () => {
    let cl = makeChecklist()
    cl = raiseException(cl, "entry-1", {
      reason: "Missing", assignedToUserId: "user-pm", assignedToName: "PM",
      actionedByUserId: "user-a1", actionedAtUtc: "2025-06-01T09:30:00Z",
    })
    const resolved = resolveException(cl, "entry-1", {
      resolutionNotes: "Found in truck bay 3",
      resolvedByUserId: "user-pm",
      resolvedAtUtc: "2025-06-01T10:00:00Z",
    })
    const entry = resolved.entries[0]
    expect(entry.status).toBe("exception")  // status preserved (audit trail)
    expect(entry.exception_resolved_at_utc).toBe("2025-06-01T10:00:00Z")
    expect(entry.exception_resolution_notes).toBe("Found in truck bay 3")
  })
})

describe("EQUIP-305 waiveEntry", () => {
  it("marks entry as waived with reason", () => {
    const cl = makeChecklist()
    const updated = waiveEntry(cl, "entry-1", {
      reason: "Item excluded from this stop per TM",
      actionedByUserId: "user-tm",
      actionedAtUtc: "2025-06-01T08:30:00Z",
    })
    expect(updated.entries[0].status).toBe("waived")
    expect(updated.entries[0].notes).toBe("Item excluded from this stop per TM")
  })
})

// ============================================================================
// Closeout validation
// ============================================================================

describe("EQUIP-305 closeout readiness", () => {
  it("is ready when all entries checked or waived", () => {
    let cl = makeChecklist()
    cl = checkEntry(cl, "entry-1", { quantityChecked: 4, actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z" })
    const readiness = evaluateCloseoutReadiness(cl)
    expect(readiness.ready).toBe(true)
  })

  it("is blocked by unresolved exceptions", () => {
    let cl = makeChecklist()
    cl = raiseException(cl, "entry-1", {
      reason: "Not found", assignedToUserId: "user-pm", assignedToName: "PM",
      actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z",
    })
    const readiness = evaluateCloseoutReadiness(cl)
    expect(readiness.ready).toBe(false)
    expect(readiness.issues.some((i) => i.code === "unresolved_exceptions")).toBe(true)
    expect(readiness.issues[0].entry_ids).toContain("entry-1")
  })

  it("is ready when exceptions are resolved", () => {
    let cl = makeChecklist()
    cl = raiseException(cl, "entry-1", {
      reason: "Not found", assignedToUserId: "user-pm", assignedToName: "PM",
      actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z",
    })
    cl = resolveException(cl, "entry-1", {
      resolutionNotes: "Located", resolvedByUserId: "user-pm", resolvedAtUtc: "2025-06-01T10:00:00Z",
    })
    expect(evaluateCloseoutReadiness(cl).ready).toBe(true)
  })

  it("is blocked by pending items", () => {
    const cl = makeChecklist() // entry-1 still pending
    const readiness = evaluateCloseoutReadiness(cl)
    expect(readiness.ready).toBe(false)
    expect(readiness.issues.some((i) => i.code === "unchecked_required_items")).toBe(true)
  })

  it("is blocked when checklist is draft or closed", () => {
    const draft = makeChecklist({ status: "draft" })
    expect(evaluateCloseoutReadiness(draft).issues[0].code).toBe("checklist_not_in_progress")
    const closed = makeChecklist({ status: "closed" })
    expect(evaluateCloseoutReadiness(closed).issues[0].code).toBe("checklist_not_in_progress")
  })
})

describe("EQUIP-305 closeChecklist", () => {
  it("closes a ready checklist", () => {
    let cl = makeChecklist()
    cl = checkEntry(cl, "entry-1", { quantityChecked: 4, actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z" })
    const closed = closeChecklist(cl, { closedByUserId: "user-tm", closedAtUtc: "2025-06-01T11:00:00Z" })
    expect(closed.status).toBe("closed")
    expect(closed.closed_at_utc).toBe("2025-06-01T11:00:00Z")
  })

  it("throws when unresolved exceptions exist", () => {
    let cl = makeChecklist()
    cl = raiseException(cl, "entry-1", {
      reason: "Missing", assignedToUserId: "user-pm", assignedToName: "PM",
      actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z",
    })
    expect(() => closeChecklist(cl, { closedByUserId: "u", closedAtUtc: "2025-06-01T11:00:00Z" })).toThrow()
  })
})

// ============================================================================
// Summary
// ============================================================================

describe("EQUIP-305 buildChecklistSummary", () => {
  it("counts correctly and computes completion_pct", () => {
    const entries: ChecklistEntry[] = [
      { ...makeChecklist().entries[0], id: "e1", status: "checked" },
      { ...makeChecklist().entries[0], id: "e2", status: "checked" },
      { ...makeChecklist().entries[0], id: "e3", status: "exception", exception_resolved_at_utc: null },
      { ...makeChecklist().entries[0], id: "e4", status: "waived" },
      { ...makeChecklist().entries[0], id: "e5", status: "pending" },
    ]
    const cl = makeChecklist({ entries })
    const summary = buildChecklistSummary(cl)
    expect(summary.total).toBe(5)
    expect(summary.checked).toBe(2)
    expect(summary.exceptions).toBe(1)
    expect(summary.exceptions_unresolved).toBe(1)
    expect(summary.waived).toBe(1)
    expect(summary.pending).toBe(1)
    // (2 checked + 1 waived) / 5 = 60%
    expect(summary.completion_pct).toBe(60)
    expect(summary.is_closeout_ready).toBe(false)
  })

  it("returns 100% when fully checked", () => {
    let cl = makeChecklist()
    cl = checkEntry(cl, "entry-1", { quantityChecked: 4, actionedByUserId: "u", actionedAtUtc: "2025-06-01T09:00:00Z" })
    const summary = buildChecklistSummary(cl)
    expect(summary.completion_pct).toBe(100)
    expect(summary.is_closeout_ready).toBe(true)
  })
})
