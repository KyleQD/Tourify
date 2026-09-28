import { describe, expect, it, vi } from "vitest"

import {
  buildGroupedBoardSummaries,
  buildTourLogisticsBoardView,
  executeBulkTransition,
  filterBoardTasks,
  groupBoardTasks,
  previewBulkTransition,
  type LogisticsBoardTask,
} from "@/lib/admin/logistics-board"

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<LogisticsBoardTask> = {}): LogisticsBoardTask {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Test task",
    status: overrides.status ?? "pending",
    priority: overrides.priority ?? "medium",
    domain: overrides.domain ?? "equipment",
    owner_user_id: overrides.owner_user_id ?? null,
    tour_id: overrides.tour_id ?? "tour-1",
    stop_id: overrides.stop_id ?? null,
    leg_id: overrides.leg_id ?? null,
    due_date: overrides.due_date ?? null,
    category: overrides.category ?? null,
    hard_blocked: overrides.hard_blocked ?? false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

const SAMPLE_TASKS: LogisticsBoardTask[] = [
  makeTask({ id: "t1", domain: "equipment", status: "pending", stop_id: "stop-a", owner_user_id: "user-1", due_date: "2025-06-01", tour_id: "tour-1" }),
  makeTask({ id: "t2", domain: "catering", status: "in_progress", stop_id: "stop-a", owner_user_id: "user-2", tour_id: "tour-1" }),
  makeTask({ id: "t3", domain: "lodging", status: "blocked", stop_id: "stop-b", hard_blocked: true, owner_user_id: "user-1", tour_id: "tour-1" }),
  makeTask({ id: "t4", domain: "equipment", status: "complete", stop_id: "stop-b", owner_user_id: "user-2", tour_id: "tour-1" }),
  makeTask({ id: "t5", domain: "transportation", status: "failed", stop_id: "stop-c", owner_user_id: null, tour_id: "tour-1" }),
  makeTask({ id: "t6", domain: "catering", status: "pending", stop_id: "stop-a", due_date: "2025-05-01", tour_id: "tour-2" }),
]

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

describe("LOG-302 filterBoardTasks", () => {
  it("filters by tour_id", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { tour_id: "tour-2" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t6")
  })

  it("filters by domain", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { tour_id: "tour-1", domains: ["catering"] })
    expect(result.every((t) => t.domain === "catering")).toBe(true)
  })

  it("filters by multiple statuses", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { statuses: ["pending", "in_progress"] })
    expect(result.every((t) => ["pending", "in_progress"].includes(t.status))).toBe(true)
  })

  it("filters blockers_only", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { blockers_only: true })
    expect(result.every((t) => t.status === "blocked" || t.hard_blocked)).toBe(true)
    expect(result).toHaveLength(1) // t3
  })

  it("filters active_only (excludes terminal states)", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { tour_id: "tour-1", active_only: true })
    const statuses = result.map((t) => t.status)
    expect(statuses).not.toContain("complete")
    expect(statuses).not.toContain("cancelled")
    expect(statuses).not.toContain("failed")
  })

  it("filters by due_before", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { due_before: "2025-05-31" })
    // t1 due 2025-06-01 is AFTER, t6 due 2025-05-01 qualifies
    // tasks without due_date are excluded by this filter when they have no due_date
    // task with due_date > due_before is excluded
    expect(result.every((t) => !t.due_date || t.due_date <= "2025-05-31")).toBe(true)
  })

  it("filters by owner_user_id", () => {
    const result = filterBoardTasks(SAMPLE_TASKS, { owner_user_id: "user-1" })
    expect(result.every((t) => t.owner_user_id === "user-1")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

describe("LOG-302 groupBoardTasks", () => {
  it("groups by domain", () => {
    const groups = groupBoardTasks(SAMPLE_TASKS, "domain")
    expect(Object.keys(groups)).toContain("equipment")
    expect(Object.keys(groups)).toContain("catering")
    expect(groups.equipment).toHaveLength(2)
    expect(groups.catering).toHaveLength(2)
  })

  it("groups by stop with __no_stop__ sentinel for null", () => {
    const tasks = [
      makeTask({ id: "x1", stop_id: "stop-a" }),
      makeTask({ id: "x2", stop_id: null }),
    ]
    const groups = groupBoardTasks(tasks, "stop")
    expect(groups["stop-a"]).toHaveLength(1)
    expect(groups["__no_stop__"]).toHaveLength(1)
  })

  it("groups by owner with __unassigned__ sentinel", () => {
    const groups = groupBoardTasks(SAMPLE_TASKS, "owner")
    expect(groups["__unassigned__"]).toBeDefined()
  })

  it("builds grouped summaries", () => {
    const groups = groupBoardTasks(SAMPLE_TASKS, "domain")
    const summaries = buildGroupedBoardSummaries(groups)
    expect(summaries.equipment.total).toBe(2)
    expect(summaries.catering.total).toBe(2)
    expect(summaries.lodging.total).toBe(1)
    expect(summaries.lodging.blocked_count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Bulk transition preview
// ---------------------------------------------------------------------------

describe("LOG-302 previewBulkTransition", () => {
  it("marks tasks eligible for valid transitions", () => {
    const preview = previewBulkTransition({
      taskIds: ["t1", "t2"],
      targetStatus: "in_progress",
      taskStatusMap: { t1: "pending", t2: "confirmed" },
    })
    expect(preview.eligible_count).toBe(2)
    expect(preview.ineligible_count).toBe(0)
  })

  it("marks terminal tasks ineligible", () => {
    const preview = previewBulkTransition({
      taskIds: ["t4"],
      targetStatus: "in_progress",
      taskStatusMap: { t4: "complete" },
    })
    expect(preview.eligible_count).toBe(0)
    expect(preview.eligible[0].reason).toBe("task_is_terminal")
  })

  it("marks tasks with illegal transitions ineligible", () => {
    const preview = previewBulkTransition({
      taskIds: ["t1"],
      targetStatus: "complete",
      taskStatusMap: { t1: "in_progress" }, // must go through ready_for_review
    })
    expect(preview.eligible[0].eligible).toBe(false)
    expect(preview.eligible[0].reason).toBe("illegal_status_transition")
  })

  it("marks access-denied tasks ineligible", () => {
    const preview = previewBulkTransition({
      taskIds: ["t1"],
      targetStatus: "in_progress",
      taskStatusMap: { t1: "pending" },
      accessDeniedIds: new Set(["t1"]),
    })
    expect(preview.eligible[0].reason).toBe("access_denied")
  })

  it("treats same-status as idempotent eligible", () => {
    const preview = previewBulkTransition({
      taskIds: ["t1"],
      targetStatus: "pending",
      taskStatusMap: { t1: "pending" },
    })
    expect(preview.eligible_count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Bulk transition executor
// ---------------------------------------------------------------------------

describe("LOG-302 executeBulkTransition", () => {
  it("executes eligible tasks and records results", async () => {
    const executor = vi.fn().mockResolvedValue(undefined)
    const preview = previewBulkTransition({
      taskIds: ["t1", "t2"],
      targetStatus: "in_progress",
      taskStatusMap: { t1: "pending", t2: "confirmed" },
    })
    const result = await executeBulkTransition({ preview, executor })
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
    expect(executor).toHaveBeenCalledTimes(2)
  })

  it("records partial failures without aborting", async () => {
    const executor = vi
      .fn()
      .mockResolvedValueOnce(undefined)        // t1 succeeds
      .mockRejectedValueOnce(new Error("DB error")) // t2 fails
    const preview = previewBulkTransition({
      taskIds: ["t1", "t2"],
      targetStatus: "in_progress",
      taskStatusMap: { t1: "pending", t2: "confirmed" },
    })
    const result = await executeBulkTransition({ preview, executor })
    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.results.find((r) => r.task_id === "t2")?.error).toBe("DB error")
  })

  it("skips ineligible tasks from preview (they appear as failed in results)", async () => {
    const executor = vi.fn()
    const preview = previewBulkTransition({
      taskIds: ["t4"],
      targetStatus: "in_progress",
      taskStatusMap: { t4: "complete" },
    })
    const result = await executeBulkTransition({ preview, executor })
    expect(executor).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Full board view
// ---------------------------------------------------------------------------

describe("LOG-302 buildTourLogisticsBoardView", () => {
  it("scopes view to the given tour_id", () => {
    const view = buildTourLogisticsBoardView("tour-1", SAMPLE_TASKS)
    expect(view.tour_id).toBe("tour-1")
    expect(view.tasks.every((t) => t.tour_id === "tour-1")).toBe(true)
    expect(view.total).toBe(5) // tour-2's task excluded
  })

  it("includes domain, stop, and owner breakdowns", () => {
    const view = buildTourLogisticsBoardView("tour-1", SAMPLE_TASKS)
    expect(view.by_domain).toHaveProperty("equipment")
    expect(view.by_domain).toHaveProperty("catering")
    expect(view.by_stop).toHaveProperty("stop-a")
    expect(view.by_owner).toHaveProperty("user-1")
    expect(view.by_owner).toHaveProperty("__unassigned__")
  })

  it("applies additional filter options", () => {
    const view = buildTourLogisticsBoardView("tour-1", SAMPLE_TASKS, {
      active_only: true,
    })
    expect(view.tasks.every((t) => !["complete", "cancelled", "failed"].includes(t.status))).toBe(true)
  })

  it("summary has_unresolved_hard_blockers when blocked/failed tasks present", () => {
    const view = buildTourLogisticsBoardView("tour-1", SAMPLE_TASKS)
    expect(view.summary.has_unresolved_hard_blockers).toBe(true)
  })
})
