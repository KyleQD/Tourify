import { describe, it, expect } from "vitest"
import {
  createLiveTask,
  transitionLiveTask,
  assignLiveTaskOwner,
  changeLiveTaskPriority,
  setLiveTaskDue,
  addLiveTaskRef,
  removeLiveTaskRef,
  addLiveTaskNote,
  summarizeLiveTasks,
  isLiveTaskDomain,
  type LiveTask,
} from "@/lib/admin/live-task"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Parameters<typeof createLiveTask>[0]> = {}): LiveTask {
  return createLiveTask({
    task_id: "task-1",
    org_id: "org-1",
    event_id: "event-1",
    domain: "live_ops",
    title: "Test task",
    actor_id: "user-1",
    now: "2025-08-01T10:00:00Z",
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// isLiveTaskDomain
// ---------------------------------------------------------------------------

describe("isLiveTaskDomain", () => {
  it("accepts live_ops", () => {
    expect(isLiveTaskDomain("live_ops")).toBe(true)
  })

  it("accepts all logistics domains", () => {
    const domains = ["transportation", "equipment", "lodging", "catering", "communication", "backline", "rental"]
    for (const d of domains) {
      expect(isLiveTaskDomain(d)).toBe(true)
    }
  })

  it("rejects unknown domain", () => {
    expect(isLiveTaskDomain("unknown_domain")).toBe(false)
    expect(isLiveTaskDomain(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createLiveTask
// ---------------------------------------------------------------------------

describe("createLiveTask", () => {
  it("creates a task with defaults", () => {
    const t = makeTask()
    expect(t.task_id).toBe("task-1")
    expect(t.status).toBe("pending")
    expect(t.priority).toBe("normal")
    expect(t.owner_id).toBeNull()
    expect(t.blocked_reason).toBeNull()
    expect(t.refs).toHaveLength(0)
    expect(t.audit).toHaveLength(1)
    expect(t.audit[0].event_type).toBe("created")
  })

  it("stores domain and category", () => {
    const t = makeTask({ domain: "equipment", category: "setup" })
    expect(t.domain).toBe("equipment")
    expect(t.category).toBe("setup")
  })

  it("initialises refs from params", () => {
    const t = makeTask({
      refs: [{ ref_type: "ros_item", ref_id: "ros-1" }],
    })
    expect(t.refs).toHaveLength(1)
    expect(t.refs[0].ref_type).toBe("ros_item")
  })

  it("throws on invalid domain", () => {
    expect(() => makeTask({ domain: "bogus" as never })).toThrow(/Invalid live task domain/)
  })
})

// ---------------------------------------------------------------------------
// transitionLiveTask — normal cases
// ---------------------------------------------------------------------------

describe("transitionLiveTask", () => {
  it("transitions pending → in_progress", () => {
    const t = makeTask()
    const r = transitionLiveTask(t, "in_progress", "user-1", "2025-08-01T10:05:00Z")
    expect(r.ok).toBe(true)
    expect(r.task?.status).toBe("in_progress")
  })

  it("appends audit entry on transition", () => {
    const t = makeTask()
    const r = transitionLiveTask(t, "confirmed", "user-1", "2025-08-01T10:05:00Z")
    expect(r.ok).toBe(true)
    const entry = r.task!.audit.at(-1)!
    expect(entry.event_type).toBe("status_changed")
    expect(entry.detail).toContain("pending → confirmed")
  })

  it("rejects illegal transition", () => {
    const t = makeTask()
    const r = transitionLiveTask(t, "complete", "user-1", "2025-08-01T10:05:00Z")
    // pending → complete is not allowed (must pass through ready_for_review)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Cannot transition/)
  })

  it("requires blocked_reason when transitioning to blocked", () => {
    const t = makeTask()
    // missing reason
    const r = transitionLiveTask(t, "blocked", "user-1", "2025-08-01T10:05:00Z")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/blocked_reason is required/)
  })

  it("accepts blocked transition with reason", () => {
    const t = makeTask()
    const r = transitionLiveTask(t, "blocked", "user-1", "2025-08-01T10:05:00Z", {
      blocked_reason: "Waiting for venue confirmation",
    })
    expect(r.ok).toBe(true)
    expect(r.task?.blocked_reason).toBe("Waiting for venue confirmation")
  })

  it("clears blocked_reason when leaving blocked state", () => {
    const t = makeTask()
    const blocked = transitionLiveTask(t, "blocked", "u", "T1", { blocked_reason: "reason" })
    const unblocked = transitionLiveTask(blocked.task!, "in_progress", "u", "T2")
    expect(unblocked.ok).toBe(true)
    expect(unblocked.task?.blocked_reason).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// assignLiveTaskOwner
// ---------------------------------------------------------------------------

describe("assignLiveTaskOwner", () => {
  it("assigns an owner", () => {
    const t = makeTask()
    const updated = assignLiveTaskOwner(t, "user-99", "admin", "2025-08-01T11:00:00Z")
    expect(updated.owner_id).toBe("user-99")
    expect(updated.audit.at(-1)?.event_type).toBe("owner_changed")
  })

  it("can clear owner (set to null)", () => {
    const t = makeTask({ owner_id: "user-99" })
    const updated = assignLiveTaskOwner(t, null, "admin", "2025-08-01T11:00:00Z")
    expect(updated.owner_id).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// changeLiveTaskPriority
// ---------------------------------------------------------------------------

describe("changeLiveTaskPriority", () => {
  it("changes priority and records audit", () => {
    const t = makeTask()
    const updated = changeLiveTaskPriority(t, "critical", "user-1", "2025-08-01T11:00:00Z")
    expect(updated.priority).toBe("critical")
    expect(updated.audit.at(-1)?.event_type).toBe("priority_changed")
    expect(updated.audit.at(-1)?.detail).toContain("normal → critical")
  })
})

// ---------------------------------------------------------------------------
// setLiveTaskDue
// ---------------------------------------------------------------------------

describe("setLiveTaskDue", () => {
  it("sets due date", () => {
    const t = makeTask()
    const updated = setLiveTaskDue(t, "2025-08-05T18:00:00Z", "user-1", "2025-08-01T11:00:00Z")
    expect(updated.due_at).toBe("2025-08-05T18:00:00Z")
    expect(updated.audit.at(-1)?.event_type).toBe("due_changed")
  })

  it("clears due date", () => {
    const t = makeTask({ due_at: "2025-08-05T18:00:00Z" } as never)
    const updated = setLiveTaskDue(t as unknown as LiveTask, null, "user-1", "2025-08-01T11:00:00Z")
    expect(updated.due_at).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// addLiveTaskRef / removeLiveTaskRef — all five ref types
// ---------------------------------------------------------------------------

describe("addLiveTaskRef", () => {
  it.each([
    "ros_item",
    "map_marker",
    "equipment_asset",
    "person",
    "vendor",
  ] as const)("links ref type %s", (ref_type) => {
    const t = makeTask()
    const updated = addLiveTaskRef(t, { ref_type, ref_id: "x-1" }, "user-1", "T")
    expect(updated.refs).toHaveLength(1)
    expect(updated.refs[0].ref_type).toBe(ref_type)
  })

  it("is idempotent on duplicate ref", () => {
    const t = makeTask()
    const ref = { ref_type: "person" as const, ref_id: "p-1" }
    const t1 = addLiveTaskRef(t, ref, "user-1", "T1")
    const t2 = addLiveTaskRef(t1, ref, "user-1", "T2")
    expect(t2.refs).toHaveLength(1)
    // No new audit entry for duplicate
    expect(t2.audit).toHaveLength(t1.audit.length)
  })

  it("allows multiple distinct refs", () => {
    let t = makeTask()
    t = addLiveTaskRef(t, { ref_type: "ros_item", ref_id: "r-1" }, "u", "T1")
    t = addLiveTaskRef(t, { ref_type: "map_marker", ref_id: "m-1" }, "u", "T2")
    t = addLiveTaskRef(t, { ref_type: "equipment_asset", ref_id: "e-1" }, "u", "T3")
    expect(t.refs).toHaveLength(3)
  })
})

describe("removeLiveTaskRef", () => {
  it("removes an existing ref", () => {
    const t = makeTask()
    const linked = addLiveTaskRef(t, { ref_type: "vendor", ref_id: "v-1" }, "u", "T1")
    const unlinked = removeLiveTaskRef(linked, "vendor", "v-1", "u", "T2")
    expect(unlinked.refs).toHaveLength(0)
    expect(unlinked.audit.at(-1)?.event_type).toBe("ref_removed")
  })

  it("is a no-op if ref does not exist", () => {
    const t = makeTask()
    const result = removeLiveTaskRef(t, "vendor", "v-999", "u", "T")
    expect(result).toBe(t) // same reference (no mutation)
  })
})

// ---------------------------------------------------------------------------
// addLiveTaskNote
// ---------------------------------------------------------------------------

describe("addLiveTaskNote", () => {
  it("appends note to audit", () => {
    const t = makeTask()
    const updated = addLiveTaskNote(t, "Load-in delayed by 20 min", "user-1", "T")
    const entry = updated.audit.at(-1)!
    expect(entry.event_type).toBe("note_added")
    expect(entry.detail).toBe("Load-in delayed by 20 min")
  })
})

// ---------------------------------------------------------------------------
// summarizeLiveTasks
// ---------------------------------------------------------------------------

describe("summarizeLiveTasks", () => {
  it("returns zeroes for empty list", () => {
    const s = summarizeLiveTasks([], "2025-08-01T12:00:00Z")
    expect(s.total).toBe(0)
    expect(s.blocked_count).toBe(0)
    expect(s.critical_open_count).toBe(0)
    expect(s.overdue_count).toBe(0)
    expect(s.unowned_count).toBe(0)
  })

  it("counts by_status correctly", () => {
    const t1 = makeTask()
    const r = transitionLiveTask(t1, "in_progress", "u", "T")
    const t2 = r.task!
    const s = summarizeLiveTasks([t1, t2], "2025-08-01T12:00:00Z")
    expect(s.by_status["pending"]).toBe(1)
    expect(s.by_status["in_progress"]).toBe(1)
    expect(s.total).toBe(2)
  })

  it("counts blocked tasks", () => {
    const t = makeTask()
    const blocked = transitionLiveTask(t, "blocked", "u", "T", { blocked_reason: "r" }).task!
    const s = summarizeLiveTasks([blocked], "2025-08-01T12:00:00Z")
    expect(s.blocked_count).toBe(1)
  })

  it("counts critical open tasks", () => {
    const t = makeTask()
    const critical = changeLiveTaskPriority(t, "critical", "u", "T")
    const s = summarizeLiveTasks([critical], "2025-08-01T12:00:00Z")
    expect(s.critical_open_count).toBe(1)
  })

  it("does not count critical complete tasks in critical_open_count", () => {
    let t = makeTask()
    t = changeLiveTaskPriority(t, "critical", "u", "T1")
    // advance to complete: pending→confirmed→in_progress→ready_for_review→complete
    t = transitionLiveTask(t, "confirmed", "u", "T2").task!
    t = transitionLiveTask(t, "in_progress", "u", "T3").task!
    t = transitionLiveTask(t, "ready_for_review", "u", "T4").task!
    t = transitionLiveTask(t, "complete", "u", "T5").task!
    const s = summarizeLiveTasks([t], "2025-08-01T12:00:00Z")
    expect(s.critical_open_count).toBe(0)
  })

  it("counts overdue tasks", () => {
    const t = makeTask({ due_at: "2025-07-31T00:00:00Z" } as never)
    const s = summarizeLiveTasks([t as unknown as LiveTask], "2025-08-01T12:00:00Z")
    expect(s.overdue_count).toBe(1)
  })

  it("does not count future due tasks as overdue", () => {
    const t = makeTask({ due_at: "2025-08-10T00:00:00Z" } as never)
    const s = summarizeLiveTasks([t as unknown as LiveTask], "2025-08-01T12:00:00Z")
    expect(s.overdue_count).toBe(0)
  })

  it("counts unowned open tasks", () => {
    const t = makeTask() // owner_id is null
    const s = summarizeLiveTasks([t], "2025-08-01T12:00:00Z")
    expect(s.unowned_count).toBe(1)
  })

  it("does not count completed unowned tasks as unowned", () => {
    let t = makeTask()
    t = transitionLiveTask(t, "confirmed", "u", "T2").task!
    t = transitionLiveTask(t, "in_progress", "u", "T3").task!
    t = transitionLiveTask(t, "ready_for_review", "u", "T4").task!
    t = transitionLiveTask(t, "complete", "u", "T5").task!
    const s = summarizeLiveTasks([t], "2025-08-01T12:00:00Z")
    expect(s.unowned_count).toBe(0)
  })
})
