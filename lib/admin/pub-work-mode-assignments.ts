/**
 * PUB-401 — Work Mode assignment unification.
 *
 * When a publication is created, it creates/updates stable WorkModeAssignment
 * records for workers. Role/shift changes are reconciled deterministically:
 *  - existing assignment updated in-place (no duplicate)
 *  - removed role/shift = assignment withdrawn
 *  - added role/shift = assignment created
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkModeAssignmentStatus =
  | "active"
  | "withdrawn"
  | "superseded"

export interface WorkModeAssignment {
  assignment_id: string
  publication_id: string
  worker_id: string
  role: string
  shift_id: string | null
  status: WorkModeAssignmentStatus
  /** ISO-8601 when this assignment was created/last updated. */
  assigned_at: string
  withdrawn_at: string | null
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export type AssignmentReconcileAction = "created" | "updated" | "withdrawn" | "unchanged"

export interface AssignmentReconcileItem {
  worker_id: string
  role: string
  shift_id: string | null
  action: AssignmentReconcileAction
  assignment: WorkModeAssignment
}

export interface AssignmentReconcileResult {
  items: AssignmentReconcileItem[]
  created_count: number
  updated_count: number
  withdrawn_count: number
  unchanged_count: number
}

export interface WorkerRoleRef {
  worker_id: string
  role: string
  shift_id: string | null
}

/**
 * Reconcile existing assignments against the new publication's worker/role set.
 * Returns a diff of created/updated/withdrawn/unchanged assignments.
 * This is deterministic: the same inputs always yield the same result.
 */
export function reconcileWorkModeAssignments(params: {
  publication_id: string
  /** Current assignment snapshot (may be empty for first publication). */
  existing: readonly WorkModeAssignment[]
  /** The new authoritative worker+role+shift set from the publication. */
  incoming: readonly WorkerRoleRef[]
  now: string
}): AssignmentReconcileResult {
  const { publication_id, existing, incoming, now } = params

  const existingMap = new Map(
    existing
      .filter((a) => a.status === "active")
      .map((a) => [`${a.worker_id}|${a.role}|${a.shift_id ?? ""}`, a]),
  )

  const incomingKeys = new Set(incoming.map((r) => `${r.worker_id}|${r.role}|${r.shift_id ?? ""}`))
  const items: AssignmentReconcileItem[] = []
  let created_count = 0, updated_count = 0, withdrawn_count = 0, unchanged_count = 0

  // Process incoming
  let idCounter = 0
  for (const ref of incoming) {
    const key = `${ref.worker_id}|${ref.role}|${ref.shift_id ?? ""}`
    const existing_a = existingMap.get(key)
    if (!existing_a) {
      // Create
      const assignment: WorkModeAssignment = {
        assignment_id: `${publication_id}-assign-${++idCounter}`,
        publication_id,
        worker_id: ref.worker_id,
        role: ref.role,
        shift_id: ref.shift_id,
        status: "active",
        assigned_at: now,
        withdrawn_at: null,
      }
      items.push({ ...ref, action: "created", assignment })
      created_count += 1
    } else if (existing_a.publication_id !== publication_id) {
      // Update (new publication supersedes old)
      const assignment: WorkModeAssignment = { ...existing_a, publication_id, status: "active", assigned_at: now }
      items.push({ ...ref, action: "updated", assignment })
      updated_count += 1
    } else {
      items.push({ ...ref, action: "unchanged", assignment: existing_a })
      unchanged_count += 1
    }
  }

  // Withdraw removed roles
  for (const [key, a] of existingMap) {
    if (!incomingKeys.has(key)) {
      const assignment: WorkModeAssignment = { ...a, status: "withdrawn", withdrawn_at: now }
      items.push({ worker_id: a.worker_id, role: a.role, shift_id: a.shift_id, action: "withdrawn", assignment })
      withdrawn_count += 1
    }
  }

  return { items, created_count, updated_count, withdrawn_count, unchanged_count }
}
