import { describe, expect, it } from "vitest"

import {
  assertExtendedStatusTransition,
  buildChecklistFromTemplate,
  buildTaskBoardSummary,
  canTransitionExtendedStatus,
  evaluateDependencies,
  evaluateSourceEntityStaleness,
  ExtendedStatusTransitionError,
  isTerminalStatus,
  updateChecklistItem,
  validateTaskCompletion,
  type ChecklistItemTemplate,
  type ExtendedTaskStatus,
  type TaskDependencyLink,
} from "@/lib/admin/logistics-task-dependencies"

// ---------------------------------------------------------------------------
// Extended status transitions
// ---------------------------------------------------------------------------

describe("LOG-301 extended task status transitions", () => {
  it("allows canonical forward transitions", () => {
    expect(canTransitionExtendedStatus("pending", "in_progress")).toBe(true)
    expect(canTransitionExtendedStatus("in_progress", "ready_for_review")).toBe(true)
    expect(canTransitionExtendedStatus("ready_for_review", "complete")).toBe(true)
  })

  it("allows blocking transitions", () => {
    expect(canTransitionExtendedStatus("in_progress", "blocked")).toBe(true)
    expect(canTransitionExtendedStatus("blocked", "in_progress")).toBe(true)
  })

  it("allows failed and unknown states", () => {
    expect(canTransitionExtendedStatus("in_progress", "failed")).toBe(true)
    expect(canTransitionExtendedStatus("in_progress", "unknown")).toBe(true)
    expect(canTransitionExtendedStatus("unknown", "pending")).toBe(true)
    expect(canTransitionExtendedStatus("failed", "pending")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionExtendedStatus("blocked", "blocked")).toBe(true)
    expect(canTransitionExtendedStatus("complete", "complete")).toBe(true)
  })

  it("rejects transitions from terminal states", () => {
    expect(canTransitionExtendedStatus("complete", "pending")).toBe(false)
    expect(canTransitionExtendedStatus("cancelled", "in_progress")).toBe(false)
    expect(() =>
      assertExtendedStatusTransition("complete" as ExtendedTaskStatus, "pending" as ExtendedTaskStatus),
    ).toThrow(ExtendedStatusTransitionError)
  })

  it("identifies terminal statuses", () => {
    expect(isTerminalStatus("complete")).toBe(true)
    expect(isTerminalStatus("cancelled")).toBe(true)
    expect(isTerminalStatus("failed")).toBe(true)
    expect(isTerminalStatus("in_progress")).toBe(false)
    expect(isTerminalStatus("blocked")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Dependency evaluation
// ---------------------------------------------------------------------------

describe("LOG-301 dependency evaluation", () => {
  const links: TaskDependencyLink[] = [
    { dependency_task_id: "dep-1", relation: "depends_on" },
    { dependency_task_id: "dep-2", relation: "blocks" },
  ]

  it("returns ok when all dependencies are complete", () => {
    const result = evaluateDependencies(links, {
      "dep-1": "complete",
      "dep-2": "complete",
    })
    expect(result.ok).toBe(true)
    expect(result.unresolved).toHaveLength(0)
    expect(result.hard_blocked_by).toHaveLength(0)
  })

  it("reports unresolved in-progress dependencies", () => {
    const result = evaluateDependencies(links, {
      "dep-1": "complete",
      "dep-2": "in_progress",
    })
    expect(result.ok).toBe(false)
    expect(result.unresolved).toContain("dep-2")
  })

  it("reports hard-blocked by cancelled/failed dependencies", () => {
    const result = evaluateDependencies(links, {
      "dep-1": "failed",
      "dep-2": "complete",
    })
    expect(result.ok).toBe(false)
    expect(result.hard_blocked_by).toContain("dep-1")
  })

  it("treats missing/unknown status as unresolved", () => {
    const result = evaluateDependencies(links, { "dep-1": "unknown", "dep-2": "complete" })
    expect(result.ok).toBe(false)
    expect(result.unresolved).toContain("dep-1")
  })

  it("returns ok for empty dependency list", () => {
    expect(evaluateDependencies([], {}).ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

describe("LOG-301 checklist helpers", () => {
  const templates: ChecklistItemTemplate[] = [
    { id: "chk-1", label: "Confirm venue access", required: true },
    { id: "chk-2", label: "Notify team", required: false, category: "comms" },
  ]

  it("builds all-pending checklist from template", () => {
    const items = buildChecklistFromTemplate(templates)
    expect(items).toHaveLength(2)
    expect(items.every((i) => i.status === "pending")).toBe(true)
    expect(items[0].required).toBe(true)
    expect(items[1].category).toBe("comms")
  })

  it("updates a single item status immutably", () => {
    const items = buildChecklistFromTemplate(templates)
    const updated = updateChecklistItem(items, "chk-1", {
      status: "passed",
      completed_by: "user-abc",
      completed_at: "2025-01-01T10:00:00Z",
    })
    expect(updated[0].status).toBe("passed")
    expect(updated[0].completed_by).toBe("user-abc")
    // original unchanged
    expect(items[0].status).toBe("pending")
    // unrelated item unchanged
    expect(updated[1].status).toBe("pending")
  })

  it("is a no-op for an unknown item id", () => {
    const items = buildChecklistFromTemplate(templates)
    const updated = updateChecklistItem(items, "does-not-exist", { status: "failed" })
    expect(updated).toEqual(items)
  })
})

// ---------------------------------------------------------------------------
// Source entity staleness
// ---------------------------------------------------------------------------

describe("LOG-301 source entity staleness", () => {
  it("detects stale version", () => {
    const result = evaluateSourceEntityStaleness(
      { source_type: "lodging_bookings", source_id: "uuid-1", source_version: "v3" },
      "v5",
    )
    expect(result.is_stale).toBe(true)
    expect(result.task_version).toBe("v3")
    expect(result.current_version).toBe("v5")
  })

  it("reports not stale when versions match", () => {
    const result = evaluateSourceEntityStaleness(
      { source_type: "lodging_bookings", source_id: "uuid-1", source_version: "v5" },
      "v5",
    )
    expect(result.is_stale).toBe(false)
  })

  it("reports not stale when source version is null (unversioned task)", () => {
    const result = evaluateSourceEntityStaleness(
      { source_type: "equipment_reservations", source_id: "uuid-2", source_version: null },
      "v5",
    )
    expect(result.is_stale).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Completion validation
// ---------------------------------------------------------------------------

describe("LOG-301 completion validation", () => {
  const templates: ChecklistItemTemplate[] = [
    { id: "chk-a", label: "Gate check", required: true },
    { id: "chk-b", label: "Optional note", required: false },
  ]

  it("allows completion when all required checks pass and deps are met", () => {
    let items = buildChecklistFromTemplate(templates)
    items = updateChecklistItem(items, "chk-a", { status: "passed" })
    const result = validateTaskCompletion({
      currentStatus: "ready_for_review",
      targetStatus: "complete",
      checklist: items,
      dependencyLinks: [],
      dependencyStatusMap: {},
    })
    expect(result.allowed).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it("blocks completion when required checklist item not passed", () => {
    const items = buildChecklistFromTemplate(templates) // chk-a still pending
    const result = validateTaskCompletion({
      currentStatus: "ready_for_review",
      targetStatus: "complete",
      checklist: items,
      dependencyLinks: [],
      dependencyStatusMap: {},
    })
    expect(result.allowed).toBe(false)
    expect(result.issues.some((i) => i.code === "checklist_required_item_not_passed")).toBe(true)
    expect(result.issues[0].ref_id).toBe("chk-a")
  })

  it("blocks completion when transition is illegal", () => {
    const result = validateTaskCompletion({
      currentStatus: "in_progress", // must pass through ready_for_review
      targetStatus: "complete",
      checklist: [],
      dependencyLinks: [],
      dependencyStatusMap: {},
    })
    expect(result.allowed).toBe(false)
    expect(result.issues.some((i) => i.code === "status_transition_illegal")).toBe(true)
  })

  it("blocks completion when dependencies unresolved", () => {
    const links: TaskDependencyLink[] = [
      { dependency_task_id: "dep-x", relation: "depends_on" },
    ]
    const result = validateTaskCompletion({
      currentStatus: "ready_for_review",
      targetStatus: "complete",
      checklist: [],
      dependencyLinks: links,
      dependencyStatusMap: { "dep-x": "in_progress" },
    })
    expect(result.allowed).toBe(false)
    expect(result.issues.some((i) => i.code === "dependency_not_complete")).toBe(true)
  })

  it("incorporates domain validator issues", () => {
    const result = validateTaskCompletion({
      currentStatus: "ready_for_review",
      targetStatus: "complete",
      checklist: [],
      dependencyLinks: [],
      dependencyStatusMap: {},
      domainValidator: () => [
        { code: "domain_validator_rejected", message: "Manifest not approved" },
      ],
    })
    expect(result.allowed).toBe(false)
    expect(result.issues[0].code).toBe("domain_validator_rejected")
  })
})

// ---------------------------------------------------------------------------
// Board summary
// ---------------------------------------------------------------------------

describe("LOG-301 task board summary", () => {
  it("counts statuses and flags blockers correctly", () => {
    const tasks: Array<{ status: ExtendedTaskStatus }> = [
      { status: "pending" },
      { status: "in_progress" },
      { status: "in_progress" },
      { status: "blocked" },
      { status: "complete" },
      { status: "failed" },
    ]
    const summary = buildTaskBoardSummary(tasks)
    expect(summary.total).toBe(6)
    expect(summary.by_status.in_progress).toBe(2)
    expect(summary.by_status.blocked).toBe(1)
    expect(summary.complete_count).toBe(1)
    expect(summary.failed_count).toBe(1)
    expect(summary.has_unresolved_hard_blockers).toBe(true)
  })

  it("reports no hard blockers when all complete", () => {
    const summary = buildTaskBoardSummary([
      { status: "complete" },
      { status: "complete" },
    ])
    expect(summary.has_unresolved_hard_blockers).toBe(false)
  })
})
