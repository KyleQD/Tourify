/**
 * LIVE-408 — Incident workflow.
 *
 * Covers: severity, privacy class, reporter, participants, response owner,
 * escalation, resolution, follow-up, file evidence, and restricted audit.
 * Emergency-copy review is modelled as an explicit step.
 *
 * Audit entries capture every state change and participant mutation.
 * Privacy-sensitive audit entries (medical/personnel) require the
 * `incident.sensitive_access` capability to read; only the existence of the
 * entry (not its content) is surfaced to standard roles.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

/**
 * Privacy classification controls what data is accessible to which roles.
 *  - standard:   all operational staff with incident.view
 *  - personnel:  HR/management only (employment/conduct issues)
 *  - medical:    medic/designated manager + subject's explicit consent
 *  - legal:      legal counsel + senior management only
 */
export const INCIDENT_PRIVACY_CLASSES = [
  "standard",
  "personnel",
  "medical",
  "legal",
] as const
export type IncidentPrivacyClass = (typeof INCIDENT_PRIVACY_CLASSES)[number]

/** Non-terminal → terminal progression. */
export const INCIDENT_STATUSES = [
  "open",
  "under_review",
  "escalated",
  "resolved",
  "closed",
  "voided",
] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_STATUS_TRANSITIONS: Record<
  IncidentStatus,
  readonly IncidentStatus[]
> = {
  open: ["under_review", "resolved", "voided"],
  under_review: ["escalated", "resolved", "voided"],
  escalated: ["under_review", "resolved", "voided"],
  resolved: ["closed", "open"], // re-open allowed
  closed: [],
  voided: [],
}

export function canTransitionIncidentStatus(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return (INCIDENT_STATUS_TRANSITIONS[from] as readonly IncidentStatus[]).includes(to)
}

// ---------------------------------------------------------------------------
// Participant
// ---------------------------------------------------------------------------

export type IncidentParticipantRole =
  | "reporter"
  | "subject"
  | "witness"
  | "responder"
  | "escalation_contact"

export interface IncidentParticipant {
  participant_id: string
  person_id: string
  role: IncidentParticipantRole
  /** Whether this participant's record is privacy-protected (e.g. medical subject). */
  is_sensitive: boolean
  added_at: string
  added_by: string
}

// ---------------------------------------------------------------------------
// Evidence file
// ---------------------------------------------------------------------------

export interface IncidentEvidenceFile {
  file_id: string
  file_type: string   // e.g. "photo", "video", "document", "audio"
  storage_path: string
  /** Restricted to sensitive-access roles when privacy_class is medical/legal/personnel. */
  is_restricted: boolean
  uploaded_by: string
  uploaded_at: string
}

// ---------------------------------------------------------------------------
// Follow-up action
// ---------------------------------------------------------------------------

export type FollowUpStatus = "open" | "in_progress" | "complete" | "cancelled"

export interface IncidentFollowUpAction {
  action_id: string
  description: string
  owner_id: string | null
  due_at: string | null
  status: FollowUpStatus
  completed_at: string | null
  completed_by: string | null
}

// ---------------------------------------------------------------------------
// Escalation record
// ---------------------------------------------------------------------------

export interface EscalationRecord {
  escalation_id: string
  escalated_to_person_id: string
  escalated_by: string
  escalated_at: string
  reason: string
  acknowledged: boolean
  acknowledged_at: string | null
}

// ---------------------------------------------------------------------------
// Restricted audit entry
// ---------------------------------------------------------------------------

/**
 * Audit entries with `is_sensitive = true` must only be returned to callers
 * who have `incident.sensitive_access`. Callers without that capability receive
 * only the fact that a sensitive entry exists (redacted placeholder).
 */
export interface IncidentAuditEntry {
  entry_id: string
  event_type:
    | "created"
    | "status_changed"
    | "severity_changed"
    | "participant_added"
    | "participant_removed"
    | "owner_changed"
    | "escalated"
    | "escalation_acknowledged"
    | "resolution_recorded"
    | "follow_up_added"
    | "follow_up_updated"
    | "evidence_added"
    | "emergency_copy_reviewed"
    | "note_added"
  actor_id: string
  occurred_at: string
  detail: string
  is_sensitive: boolean
}

// ---------------------------------------------------------------------------
// Emergency copy review
// ---------------------------------------------------------------------------

export interface EmergencyCopyReview {
  reviewed_by: string
  reviewed_at: string
  /**
   * Outcome: approved = copy is accurate and can be distributed;
   * needs_revision = draft requires edit before distribution;
   * not_applicable = no emergency copy required for this incident.
   */
  outcome: "approved" | "needs_revision" | "not_applicable"
  notes: string | null
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface IncidentResolution {
  resolved_by: string
  resolved_at: string
  summary: string
  root_cause: string | null
  preventive_action: string | null
}

// ---------------------------------------------------------------------------
// Incident record
// ---------------------------------------------------------------------------

export interface Incident {
  incident_id: string
  org_id: string
  event_id: string
  title: string
  description: string
  status: IncidentStatus
  severity: IncidentSeverity
  privacy_class: IncidentPrivacyClass
  /** Person responsible for coordinating the response. */
  response_owner_id: string | null
  reporter_id: string
  reported_at: string
  participants: IncidentParticipant[]
  evidence_files: IncidentEvidenceFile[]
  follow_up_actions: IncidentFollowUpAction[]
  escalations: EscalationRecord[]
  resolution: IncidentResolution | null
  emergency_copy_review: EmergencyCopyReview | null
  audit: IncidentAuditEntry[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createIncident(params: {
  incident_id: string
  org_id: string
  event_id: string
  title: string
  description: string
  severity: IncidentSeverity
  privacy_class: IncidentPrivacyClass
  reporter_id: string
  response_owner_id?: string | null
  actor_id: string
  now: string
}): Incident {
  const auditEntry: IncidentAuditEntry = {
    entry_id: `${params.incident_id}-created`,
    event_type: "created",
    actor_id: params.actor_id,
    occurred_at: params.now,
    detail: `Incident reported: severity=${params.severity} privacy=${params.privacy_class}`,
    is_sensitive: params.privacy_class === "medical" || params.privacy_class === "legal",
  }

  // Reporter is automatically a participant
  const reporter: IncidentParticipant = {
    participant_id: `${params.incident_id}-reporter`,
    person_id: params.reporter_id,
    role: "reporter",
    is_sensitive: false,
    added_at: params.now,
    added_by: params.actor_id,
  }

  return {
    incident_id: params.incident_id,
    org_id: params.org_id,
    event_id: params.event_id,
    title: params.title,
    description: params.description,
    status: "open",
    severity: params.severity,
    privacy_class: params.privacy_class,
    response_owner_id: params.response_owner_id ?? null,
    reporter_id: params.reporter_id,
    reported_at: params.now,
    participants: [reporter],
    evidence_files: [],
    follow_up_actions: [],
    escalations: [],
    resolution: null,
    emergency_copy_review: null,
    audit: [auditEntry],
    created_at: params.now,
    updated_at: params.now,
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export interface IncidentTransitionResult {
  ok: boolean
  incident: Incident | null
  error?: string
}

export function transitionIncidentStatus(
  incident: Incident,
  toStatus: IncidentStatus,
  actor: string,
  now: string,
  opts?: {
    /** Required for 'voided' transitions (must explain why). */
    void_reason?: string
  },
): IncidentTransitionResult {
  if (!canTransitionIncidentStatus(incident.status, toStatus)) {
    return {
      ok: false,
      incident: null,
      error: `Cannot transition incident from '${incident.status}' to '${toStatus}'.`,
    }
  }

  if (toStatus === "voided" && !opts?.void_reason?.trim()) {
    return {
      ok: false,
      incident: null,
      error: "void_reason is required when voiding an incident.",
    }
  }

  if (toStatus === "resolved" && !incident.resolution) {
    return {
      ok: false,
      incident: null,
      error: "A resolution record must be set before resolving the incident.",
    }
  }

  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-status`,
    event_type: "status_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `${incident.status} → ${toStatus}${opts?.void_reason ? `: ${opts.void_reason}` : ""}`,
    is_sensitive: false,
  }

  return {
    ok: true,
    incident: {
      ...incident,
      status: toStatus,
      audit: [...incident.audit, entry],
      updated_at: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Severity change
// ---------------------------------------------------------------------------

export function changeIncidentSeverity(
  incident: Incident,
  severity: IncidentSeverity,
  actor: string,
  now: string,
): Incident {
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-severity`,
    event_type: "severity_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `severity ${incident.severity} → ${severity}`,
    is_sensitive: false,
  }
  return {
    ...incident,
    severity,
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Response owner
// ---------------------------------------------------------------------------

export function assignIncidentResponseOwner(
  incident: Incident,
  owner_id: string | null,
  actor: string,
  now: string,
): Incident {
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-owner`,
    event_type: "owner_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `response_owner ${incident.response_owner_id ?? "none"} → ${owner_id ?? "none"}`,
    is_sensitive: false,
  }
  return {
    ...incident,
    response_owner_id: owner_id,
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export function addIncidentParticipant(
  incident: Incident,
  participant: Omit<IncidentParticipant, "added_at" | "added_by">,
  actor: string,
  now: string,
): Incident {
  // Idempotent on participant_id
  if (incident.participants.some((p) => p.participant_id === participant.participant_id)) {
    return incident
  }
  const fullParticipant: IncidentParticipant = {
    ...participant,
    added_at: now,
    added_by: actor,
  }
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-padd`,
    event_type: "participant_added",
    actor_id: actor,
    occurred_at: now,
    detail: `added participant ${participant.person_id} as ${participant.role}`,
    is_sensitive: participant.is_sensitive,
  }
  return {
    ...incident,
    participants: [...incident.participants, fullParticipant],
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

export function removeIncidentParticipant(
  incident: Incident,
  participant_id: string,
  actor: string,
  now: string,
): Incident {
  const existing = incident.participants.find((p) => p.participant_id === participant_id)
  if (!existing) return incident

  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-premove`,
    event_type: "participant_removed",
    actor_id: actor,
    occurred_at: now,
    detail: `removed participant ${existing.person_id} (${existing.role})`,
    is_sensitive: existing.is_sensitive,
  }
  return {
    ...incident,
    participants: incident.participants.filter((p) => p.participant_id !== participant_id),
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

export function escalateIncident(
  incident: Incident,
  params: {
    escalation_id: string
    escalated_to_person_id: string
    reason: string
    actor: string
    now: string
  },
): IncidentTransitionResult {
  if (incident.status === "closed" || incident.status === "voided") {
    return {
      ok: false,
      incident: null,
      error: `Cannot escalate a ${incident.status} incident.`,
    }
  }
  if (!params.reason.trim()) {
    return { ok: false, incident: null, error: "Escalation reason is required." }
  }

  const escalation: EscalationRecord = {
    escalation_id: params.escalation_id,
    escalated_to_person_id: params.escalated_to_person_id,
    escalated_by: params.actor,
    escalated_at: params.now,
    reason: params.reason,
    acknowledged: false,
    acknowledged_at: null,
  }

  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${params.now}-esc`,
    event_type: "escalated",
    actor_id: params.actor,
    occurred_at: params.now,
    detail: `escalated to ${params.escalated_to_person_id}: ${params.reason}`,
    is_sensitive: false,
  }

  return {
    ok: true,
    incident: {
      ...incident,
      status: "escalated",
      escalations: [...incident.escalations, escalation],
      audit: [...incident.audit, entry],
      updated_at: params.now,
    },
  }
}

export function acknowledgeEscalation(
  incident: Incident,
  escalation_id: string,
  actor: string,
  now: string,
): Incident {
  const escalations = incident.escalations.map((e) =>
    e.escalation_id === escalation_id
      ? { ...e, acknowledged: true, acknowledged_at: now }
      : e,
  )
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-ack-esc`,
    event_type: "escalation_acknowledged",
    actor_id: actor,
    occurred_at: now,
    detail: `escalation ${escalation_id} acknowledged`,
    is_sensitive: false,
  }
  return {
    ...incident,
    escalations,
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function recordIncidentResolution(
  incident: Incident,
  resolution: IncidentResolution,
): Incident {
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${resolution.resolved_at}-resolution`,
    event_type: "resolution_recorded",
    actor_id: resolution.resolved_by,
    occurred_at: resolution.resolved_at,
    detail: `Resolution recorded: ${resolution.summary}`,
    is_sensitive: false,
  }
  return {
    ...incident,
    resolution,
    audit: [...incident.audit, entry],
    updated_at: resolution.resolved_at,
  }
}

// ---------------------------------------------------------------------------
// Follow-up actions
// ---------------------------------------------------------------------------

export function addFollowUpAction(
  incident: Incident,
  action: Omit<IncidentFollowUpAction, "status" | "completed_at" | "completed_by">,
  actor: string,
  now: string,
): Incident {
  const fullAction: IncidentFollowUpAction = {
    ...action,
    status: "open",
    completed_at: null,
    completed_by: null,
  }
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-fu-add`,
    event_type: "follow_up_added",
    actor_id: actor,
    occurred_at: now,
    detail: `Follow-up added: ${action.description}`,
    is_sensitive: false,
  }
  return {
    ...incident,
    follow_up_actions: [...incident.follow_up_actions, fullAction],
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

export function completeFollowUpAction(
  incident: Incident,
  action_id: string,
  actor: string,
  now: string,
): Incident {
  const follow_up_actions = incident.follow_up_actions.map((a) =>
    a.action_id === action_id
      ? { ...a, status: "complete" as const, completed_at: now, completed_by: actor }
      : a,
  )
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-fu-complete`,
    event_type: "follow_up_updated",
    actor_id: actor,
    occurred_at: now,
    detail: `Follow-up ${action_id} marked complete`,
    is_sensitive: false,
  }
  return {
    ...incident,
    follow_up_actions,
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Evidence files
// ---------------------------------------------------------------------------

export function addEvidenceFile(
  incident: Incident,
  file: IncidentEvidenceFile,
  actor: string,
  now: string,
): Incident {
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${now}-evidence`,
    event_type: "evidence_added",
    actor_id: actor,
    occurred_at: now,
    detail: `Evidence file added: ${file.file_type} (${file.file_id})`,
    is_sensitive: file.is_restricted,
  }
  return {
    ...incident,
    evidence_files: [...incident.evidence_files, file],
    audit: [...incident.audit, entry],
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Emergency copy review
// ---------------------------------------------------------------------------

export function recordEmergencyCopyReview(
  incident: Incident,
  review: EmergencyCopyReview,
): Incident {
  const entry: IncidentAuditEntry = {
    entry_id: `${incident.incident_id}-${review.reviewed_at}-emcopy`,
    event_type: "emergency_copy_reviewed",
    actor_id: review.reviewed_by,
    occurred_at: review.reviewed_at,
    detail: `Emergency copy review outcome: ${review.outcome}`,
    is_sensitive: false,
  }
  return {
    ...incident,
    emergency_copy_review: review,
    audit: [...incident.audit, entry],
    updated_at: review.reviewed_at,
  }
}

// ---------------------------------------------------------------------------
// Restricted audit projection
// ---------------------------------------------------------------------------

export const SENSITIVE_AUDIT_REDACTED_DETAIL = "[sensitive — requires incident.sensitive_access]"

/**
 * Project the audit trail for a caller.
 * Without `has_sensitive_access`, sensitive entry details are replaced with
 * a redacted placeholder (the entry itself is still returned so the caller
 * knows an event occurred without seeing its content).
 */
export function projectIncidentAudit(
  incident: Incident,
  has_sensitive_access: boolean,
): IncidentAuditEntry[] {
  if (has_sensitive_access) return incident.audit
  return incident.audit.map((e) =>
    e.is_sensitive ? { ...e, detail: SENSITIVE_AUDIT_REDACTED_DETAIL } : e,
  )
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface IncidentSummary {
  incident_id: string
  status: IncidentStatus
  severity: IncidentSeverity
  privacy_class: IncidentPrivacyClass
  has_response_owner: boolean
  participant_count: number
  escalation_count: number
  unacknowledged_escalations: number
  open_follow_up_count: number
  evidence_file_count: number
  emergency_copy_reviewed: boolean
  is_resolved: boolean
}

export function summarizeIncident(incident: Incident): IncidentSummary {
  return {
    incident_id: incident.incident_id,
    status: incident.status,
    severity: incident.severity,
    privacy_class: incident.privacy_class,
    has_response_owner: incident.response_owner_id !== null,
    participant_count: incident.participants.length,
    escalation_count: incident.escalations.length,
    unacknowledged_escalations: incident.escalations.filter((e) => !e.acknowledged).length,
    open_follow_up_count: incident.follow_up_actions.filter(
      (a) => a.status === "open" || a.status === "in_progress",
    ).length,
    evidence_file_count: incident.evidence_files.length,
    emergency_copy_reviewed: incident.emergency_copy_review !== null,
    is_resolved:
      incident.status === "resolved" || incident.status === "closed",
  }
}
