/**
 * LOG-301 — Logistics task dependencies, checklist, and completion validation tests.
 */

import { describe, it, expect } from "vitest"
import {
  getCompletionBlockers,
  transitionTask,
  checkItem,
  uncheckItem,
  allRequiredItemsChecked,
  canTransitionTask,
  type LogisticsTask,
} from "@/lib/admin/logistics-task"

const NOW = "2026-08-01T10:00:00.000Z"
const ACTOR = "user-1"

function makeTask(overrides: Partial<LogisticsTask> = {}): LogisticsTask {
  return {
    task_id: "t1",
    org_id: "org1",
    domain: "equipment",
    category: "load-in",
    title: "Load gear",
    assignee_ids: [],
    priority: "normal",
    status: "in_progress",
    blocker_task_ids: [],
    dependency_task_ids: [],
    checklist: [],
    created_by: ACTOR,
    created_at: NOW,
    updated_by: ACTOR,
    updated_at: NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getCompletionBlockers
// ---------------------------------------------------------------------------

describe("getCompletionBlockers", () => {
  it("no blockers for clean task", () => {
    expect(getCompletionBlockers(makeTask(), new Set())).toHaveLength(0)
  })

  it("blocks when required checklist items unchecked", () => {
    const task = makeTask({
      checklist: [{ item_id: "c1", label: "Check cables", checked: false, required: true, repeat_policy: "none" }],
    })
    const blockers = getCompletionBlockers(task, new Set())
    expect(blockers.some((b) => b.code === "unchecked_required_items")).toBe(true)
  })

  it("no blocker when required items are checked", () => {
    const task = makeTask({
      checklist: [{ item_id: "c1", label: "Check cables", checked: true, required: true, repeat_policy: "none" }],
    })
    expect(getCompletionBlockers(task, new Set())).toHaveLength(0)
  })

  it("blocks when open blockers exist", () => {
    const task = makeTask({ blocker_task_ids: ["t2"] })
    const blockers = getCompletionBlockers(task, new Set())
    expect(blockers.some((b) => b.code === "open_blockers")).toBe(true)
  })

  it("no blocker when all blockers are resolved", () => {
    const task = makeTask({ blocker_task_ids: ["t2"] })
    expect(getCompletionBlockers(task, new Set(["t2"]))).toHaveLength(0)
  })

  it("blocks when dependencies not met", () => {
    const task = makeTask({ dependency_task_ids: ["t3"] })
    const blockers = getCompletionBlockers(task, new Set())
    expect(blockers.some((b) => b.code === "unmet_dependencies")).toBe(true)
  })

  it("blocks when domain validator pending", () => {
    const task = makeTask({ completion_validator: "equipment.manifest" })
    const blockers = getCompletionBlockers(task, new Set())
    expect(blockers.some((b) => b.code === "domain_validator_pending")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// transitionTask
// ---------------------------------------------------------------------------

describe("transitionTask", () => {
  it("allows valid transition", () => {
    const task = makeTask({ status: "planned" })
    const r = transitionTask(task, "in_progress", ACTOR, NOW, new Set())
    expect(r.status).toBe("ok")
    expect(r.task!.status).toBe("in_progress")
  })

  it("rejects invalid transition", () => {
    const task = makeTask({ status: "cancelled" })
    const r = transitionTask(task, "complete", ACTOR, NOW, new Set())
    expect(r.status).toBe("invalid_transition")
  })

  it("blocks complete when checklist incomplete", () => {
    const task = makeTask({
      checklist: [{ item_id: "c1", label: "Do it", checked: false, required: true, repeat_policy: "none" }],
    })
    const r = transitionTask(task, "complete", ACTOR, NOW, new Set())
    expect(r.status).toBe("blocked_by_completion")
    expect(r.blockers!.length).toBeGreaterThan(0)
  })

  it("allows complete when no blockers", () => {
    const task = makeTask()
    const r = transitionTask(task, "complete", ACTOR, NOW, new Set())
    expect(r.status).toBe("ok")
  })

  it("transitions to failed from in_progress", () => {
    const task = makeTask()
    const r = transitionTask(task, "failed", ACTOR, NOW, new Set())
    expect(r.status).toBe("ok")
    expect(r.task!.status).toBe("failed")
  })

  it("transitions to unknown → planned", () => {
    const task = makeTask({ status: "unknown" })
    const r = transitionTask(task, "planned", ACTOR, NOW, new Set())
    expect(r.status).toBe("ok")
  })
})

// ---------------------------------------------------------------------------
// Checklist helpers
// ---------------------------------------------------------------------------

describe("checkItem / uncheckItem", () => {
  it("checks an item", () => {
    const task = makeTask({
      checklist: [{ item_id: "c1", label: "Do it", checked: false, required: true, repeat_policy: "none" }],
    })
    const updated = checkItem(task, "c1", ACTOR, NOW)
    expect(updated.checklist[0].checked).toBe(true)
    expect(updated.checklist[0].checked_by).toBe(ACTOR)
  })

  it("unchecks an item", () => {
    const task = makeTask({
      checklist: [{ item_id: "c1", label: "Do it", checked: true, required: true, repeat_policy: "none", checked_by: ACTOR, checked_at: NOW }],
    })
    const updated = uncheckItem(task, "c1", ACTOR, NOW)
    expect(updated.checklist[0].checked).toBe(false)
    expect(updated.checklist[0].checked_by).toBeNull()
  })

  it("allRequiredItemsChecked returns true when all required are checked", () => {
    const task = makeTask({
      checklist: [
        { item_id: "c1", label: "A", checked: true, required: true, repeat_policy: "none" },
        { item_id: "c2", label: "B", checked: false, required: false, repeat_policy: "none" },
      ],
    })
    expect(allRequiredItemsChecked(task)).toBe(true)
  })
})
