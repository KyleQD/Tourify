/**
 * ADV-405 — Add section ownership and approval
 *
 * Each advance section has:
 *   - owner, contributors, reviewers
 *   - a status lifecycle (not_started → in_progress → submitted → needs_changes → approved)
 *   - threaded comments and change requests
 *   - approval record with reopen path
 *   - immutable audit history
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Section state machine
// ---------------------------------------------------------------------------

export type AdvanceSectionApprovalStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "reopened"

export const SECTION_APPROVAL_TRANSITIONS: Record<
  AdvanceSectionApprovalStatus,
  AdvanceSectionApprovalStatus[]
> = {
  not_started: ["in_progress"],
  in_progress: ["submitted", "not_started"],
  submitted: ["needs_changes", "approved", "in_progress"],
  needs_changes: ["in_progress"],
  approved: ["reopened"],
  reopened: ["in_progress"],
}

export interface SectionStatusTransitionResult {
  ok: boolean
  status: AdvanceSectionApprovalStatus
  error?: string
}

export function transitionSectionStatus(
  current: AdvanceSectionApprovalStatus,
  next: AdvanceSectionApprovalStatus,
  opts: { reopen_reason?: string } = {},
): SectionStatusTransitionResult {
  if (!SECTION_APPROVAL_TRANSITIONS[current].includes(next)) {
    return {
      ok: false,
      status: current,
      error: `Transition ${current} → ${next} is not allowed.`,
    }
  }
  if (next === "reopened" && !opts.reopen_reason?.trim()) {
    return { ok: false, status: current, error: "reopen_reason is required when reopening." }
  }
  return { ok: true, status: next }
}

// ---------------------------------------------------------------------------
// Participant roles
// ---------------------------------------------------------------------------

export type SectionParticipantRole = "owner" | "contributor" | "reviewer"

export interface SectionParticipant {
  user_id: string
  role: SectionParticipantRole
  added_at: string
  added_by: string
}

// ---------------------------------------------------------------------------
// Comments and change requests
// ---------------------------------------------------------------------------

export type CommentType = "comment" | "change_request" | "change_resolved"

export interface AdvanceSectionComment {
  id: string
  advance_section_id: string
  author_id: string
  type: CommentType
  body: string
  /** For change_resolved: links back to the original change_request comment */
  resolves_comment_id?: string
  created_at: string
  edited_at?: string
  deleted_at?: string   // soft delete
}

export function addSectionComment(
  existing: AdvanceSectionComment[],
  comment: Omit<AdvanceSectionComment, "created_at"> & { now?: string },
): AdvanceSectionComment[] {
  const { now, ...rest } = comment
  const ts = now ?? new Date().toISOString()
  return [...existing, { ...rest, created_at: ts }]
}

export function resolveChangeRequest(
  existing: AdvanceSectionComment[],
  resolution: Omit<AdvanceSectionComment, "created_at" | "type"> & { now?: string },
): AdvanceSectionComment[] {
  // The change_request comment being resolved must exist
  const original = existing.find(
    (c) => c.id === resolution.resolves_comment_id && c.type === "change_request" && !c.deleted_at,
  )
  if (!original) {
    throw new Error(
      `Change request comment '${resolution.resolves_comment_id}' not found or already deleted.`,
    )
  }
  const { now, ...rest } = resolution
  const ts = now ?? new Date().toISOString()
  return [...existing, { ...rest, type: "change_resolved" as CommentType, created_at: ts }]
}

export function hasOpenChangeRequests(comments: AdvanceSectionComment[]): boolean {
  return comments.some((c) => {
    if (c.type !== "change_request" || c.deleted_at) return false
    return !comments.some(
      (r) => r.type === "change_resolved" && r.resolves_comment_id === c.id,
    )
  })
}

// ---------------------------------------------------------------------------
// Approval record
// ---------------------------------------------------------------------------

export interface AdvanceSectionApproval {
  id: string
  advance_section_id: string
  approved_by: string
  approved_at: string
  version_snapshot_id?: string   // links to section-level version at approval time
  notes?: string
}

// ---------------------------------------------------------------------------
// Audit event
// ---------------------------------------------------------------------------

export type SectionAuditEventType =
  | "status_changed"
  | "owner_assigned"
  | "contributor_added"
  | "reviewer_added"
  | "participant_removed"
  | "comment_added"
  | "change_request_added"
  | "change_request_resolved"
  | "approved"
  | "reopened"
  | "due_date_changed"

export interface SectionAuditEvent {
  id: string
  advance_section_id: string
  event_type: SectionAuditEventType
  actor_id: string
  occurred_at: string
  details: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Advance section record
// ---------------------------------------------------------------------------

export interface AdvanceSectionRecord {
  id: string
  advance_id: string
  event_id: string
  org_id: string
  template_section_id: string
  title: string

  status: AdvanceSectionApprovalStatus
  due_date?: string

  participants: SectionParticipant[]
  comments: AdvanceSectionComment[]
  approvals: AdvanceSectionApproval[]
  audit_events: SectionAuditEvent[]

  reopen_reason?: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Assign owner
// ---------------------------------------------------------------------------

export function assignSectionOwner(
  section: AdvanceSectionRecord,
  userId: string,
  assignedBy: string,
  now?: string,
): AdvanceSectionRecord {
  const ts = now ?? new Date().toISOString()
  const participants = section.participants.filter((p) => p.role !== "owner")
  const audit = appendAudit(section.audit_events, {
    advance_section_id: section.id,
    event_type: "owner_assigned",
    actor_id: assignedBy,
    occurred_at: ts,
    details: { owner_id: userId },
  })
  return {
    ...section,
    participants: [...participants, { user_id: userId, role: "owner", added_at: ts, added_by: assignedBy }],
    audit_events: audit,
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Add contributor / reviewer
// ---------------------------------------------------------------------------

export function addSectionParticipant(
  section: AdvanceSectionRecord,
  userId: string,
  role: "contributor" | "reviewer",
  addedBy: string,
  now?: string,
): AdvanceSectionRecord {
  const ts = now ?? new Date().toISOString()
  // Idempotent: don't add duplicate
  const already = section.participants.some((p) => p.user_id === userId && p.role === role)
  if (already) return section

  const eventType: SectionAuditEventType =
    role === "contributor" ? "contributor_added" : "reviewer_added"
  const audit = appendAudit(section.audit_events, {
    advance_section_id: section.id,
    event_type: eventType,
    actor_id: addedBy,
    occurred_at: ts,
    details: { user_id: userId, role },
  })
  return {
    ...section,
    participants: [...section.participants, { user_id: userId, role, added_at: ts, added_by: addedBy }],
    audit_events: audit,
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Transition status
// ---------------------------------------------------------------------------

export function changeSectionStatus(
  section: AdvanceSectionRecord,
  next: AdvanceSectionApprovalStatus,
  actorId: string,
  opts: { reopen_reason?: string; notes?: string; version_snapshot_id?: string; now?: string } = {},
): AdvanceSectionRecord {
  const ts = opts.now ?? new Date().toISOString()
  const result = transitionSectionStatus(section.status, next, opts)
  if (!result.ok) throw new Error(result.error)

  let approvals = section.approvals
  if (next === "approved") {
    const approval: AdvanceSectionApproval = {
      id: `approval-${ts}`,
      advance_section_id: section.id,
      approved_by: actorId,
      approved_at: ts,
      version_snapshot_id: opts.version_snapshot_id,
      notes: opts.notes,
    }
    approvals = [...approvals, approval]
  }

  const audit = appendAudit(section.audit_events, {
    advance_section_id: section.id,
    event_type: next === "approved" ? "approved" : next === "reopened" ? "reopened" : "status_changed",
    actor_id: actorId,
    occurred_at: ts,
    details: { from: section.status, to: next, reopen_reason: opts.reopen_reason },
  })

  return {
    ...section,
    status: next,
    reopen_reason: next === "reopened" ? opts.reopen_reason : section.reopen_reason,
    approvals,
    audit_events: audit,
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Change due date
// ---------------------------------------------------------------------------

export function changeSectionDueDate(
  section: AdvanceSectionRecord,
  newDueDate: string,
  actorId: string,
  now?: string,
): AdvanceSectionRecord {
  const ts = now ?? new Date().toISOString()
  const audit = appendAudit(section.audit_events, {
    advance_section_id: section.id,
    event_type: "due_date_changed",
    actor_id: actorId,
    occurred_at: ts,
    details: { from: section.due_date, to: newDueDate },
  })
  return { ...section, due_date: newDueDate, audit_events: audit, updated_at: ts }
}

// ---------------------------------------------------------------------------
// canApprove — checks open change requests
// ---------------------------------------------------------------------------

export function canApproveSection(section: AdvanceSectionRecord): { can: boolean; reason?: string } {
  if (section.status !== "submitted") {
    return { can: false, reason: "Section must be in submitted status to approve." }
  }
  if (hasOpenChangeRequests(section.comments)) {
    return { can: false, reason: "There are open change requests that must be resolved first." }
  }
  return { can: true }
}

// ---------------------------------------------------------------------------
// Internal audit append helper
// ---------------------------------------------------------------------------

function appendAudit(
  events: SectionAuditEvent[],
  entry: Omit<SectionAuditEvent, "id">,
): SectionAuditEvent[] {
  return [...events, { ...entry, id: `aud-${entry.occurred_at}-${entry.event_type}` }]
}
