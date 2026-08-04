import { describe, it, expect } from "vitest"
import {
  reconcileWorkModeAssignments,
  type WorkModeAssignment,
  type WorkerRoleRef,
} from "@/lib/admin/pub-work-mode-assignments"

describe("reconcileWorkModeAssignments", () => {
  const NOW = "2025-08-02T10:00:00Z"

  it("creates assignments for new publication", () => {
    const r = reconcileWorkModeAssignments({
      publication_id: "pub-1",
      existing: [],
      incoming: [
        { worker_id: "w-1", role: "stage_manager", shift_id: null },
        { worker_id: "w-2", role: "crew", shift_id: "shift-1" },
      ],
      now: NOW,
    })
    expect(r.created_count).toBe(2)
    expect(r.withdrawn_count).toBe(0)
    expect(r.items.every((i) => i.action === "created")).toBe(true)
  })

  it("withdraws removed assignments", () => {
    const existing: WorkModeAssignment[] = [
      { assignment_id: "a-1", publication_id: "pub-old", worker_id: "w-1", role: "stage_manager", shift_id: null, status: "active", assigned_at: "T-old", withdrawn_at: null },
    ]
    const r = reconcileWorkModeAssignments({
      publication_id: "pub-2",
      existing,
      incoming: [],
      now: NOW,
    })
    expect(r.withdrawn_count).toBe(1)
    const withdrawn = r.items.find((i) => i.action === "withdrawn")!
    expect(withdrawn.assignment.status).toBe("withdrawn")
    expect(withdrawn.assignment.withdrawn_at).toBe(NOW)
  })

  it("updates assignment when publication changes", () => {
    const existing: WorkModeAssignment[] = [
      { assignment_id: "a-1", publication_id: "pub-old", worker_id: "w-1", role: "crew", shift_id: null, status: "active", assigned_at: "T-old", withdrawn_at: null },
    ]
    const r = reconcileWorkModeAssignments({
      publication_id: "pub-2",
      existing,
      incoming: [{ worker_id: "w-1", role: "crew", shift_id: null }],
      now: NOW,
    })
    expect(r.updated_count).toBe(1)
    const updated = r.items.find((i) => i.action === "updated")!
    expect(updated.assignment.publication_id).toBe("pub-2")
  })

  it("marks unchanged when same publication and worker-role", () => {
    const existing: WorkModeAssignment[] = [
      { assignment_id: "a-1", publication_id: "pub-1", worker_id: "w-1", role: "sound", shift_id: null, status: "active", assigned_at: "T-old", withdrawn_at: null },
    ]
    const r = reconcileWorkModeAssignments({
      publication_id: "pub-1",
      existing,
      incoming: [{ worker_id: "w-1", role: "sound", shift_id: null }],
      now: NOW,
    })
    expect(r.unchanged_count).toBe(1)
    expect(r.created_count).toBe(0)
  })

  it("is deterministic — same input same output", () => {
    const incoming: WorkerRoleRef[] = [{ worker_id: "w-1", role: "crew", shift_id: null }]
    const r1 = reconcileWorkModeAssignments({ publication_id: "pub-1", existing: [], incoming, now: NOW })
    const r2 = reconcileWorkModeAssignments({ publication_id: "pub-1", existing: [], incoming, now: NOW })
    expect(r1.created_count).toBe(r2.created_count)
  })
})
