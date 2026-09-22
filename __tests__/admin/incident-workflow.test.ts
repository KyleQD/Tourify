import { describe, it, expect } from "vitest"
import {
  createIncident,
  transitionIncidentStatus,
  changeIncidentSeverity,
  assignIncidentResponseOwner,
  addIncidentParticipant,
  removeIncidentParticipant,
  escalateIncident,
  acknowledgeEscalation,
  recordIncidentResolution,
  addFollowUpAction,
  completeFollowUpAction,
  addEvidenceFile,
  recordEmergencyCopyReview,
  projectIncidentAudit,
  summarizeIncident,
  SENSITIVE_AUDIT_REDACTED_DETAIL,
  type Incident,
} from "@/lib/admin/incident-workflow"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIncident(overrides: Partial<Parameters<typeof createIncident>[0]> = {}): Incident {
  return createIncident({
    incident_id: "inc-1",
    org_id: "org-1",
    event_id: "event-1",
    title: "Stage left speaker fell",
    description: "Speaker stack became unstable during load-in",
    severity: "high",
    privacy_class: "standard",
    reporter_id: "person-reporter",
    actor_id: "user-1",
    now: "2025-08-01T14:00:00Z",
    ...overrides,
  })
}

function withResolution(incident: Incident): Incident {
  return recordIncidentResolution(incident, {
    resolved_by: "user-1",
    resolved_at: "2025-08-01T16:00:00Z",
    summary: "Speaker stack secured and cleared",
    root_cause: "Improper stacking technique",
    preventive_action: "Updated load-in SOP",
  })
}

// ---------------------------------------------------------------------------
// createIncident
// ---------------------------------------------------------------------------

describe("createIncident", () => {
  it("creates incident with correct defaults", () => {
    const i = makeIncident()
    expect(i.incident_id).toBe("inc-1")
    expect(i.status).toBe("open")
    expect(i.severity).toBe("high")
    expect(i.privacy_class).toBe("standard")
    expect(i.resolution).toBeNull()
    expect(i.emergency_copy_review).toBeNull()
    expect(i.escalations).toHaveLength(0)
    expect(i.follow_up_actions).toHaveLength(0)
    expect(i.evidence_files).toHaveLength(0)
  })

  it("auto-adds reporter as participant", () => {
    const i = makeIncident()
    expect(i.participants).toHaveLength(1)
    expect(i.participants[0].role).toBe("reporter")
    expect(i.participants[0].person_id).toBe("person-reporter")
  })

  it("initial audit entry is 'created'", () => {
    const i = makeIncident()
    expect(i.audit).toHaveLength(1)
    expect(i.audit[0].event_type).toBe("created")
  })

  it("marks audit as sensitive for medical/legal privacy class", () => {
    const medical = makeIncident({ privacy_class: "medical" })
    expect(medical.audit[0].is_sensitive).toBe(true)
    const legal = makeIncident({ privacy_class: "legal" })
    expect(legal.audit[0].is_sensitive).toBe(true)
    const standard = makeIncident({ privacy_class: "standard" })
    expect(standard.audit[0].is_sensitive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// transitionIncidentStatus
// ---------------------------------------------------------------------------

describe("transitionIncidentStatus", () => {
  it("transitions open → under_review", () => {
    const i = makeIncident()
    const r = transitionIncidentStatus(i, "under_review", "u", "T")
    expect(r.ok).toBe(true)
    expect(r.incident?.status).toBe("under_review")
  })

  it("rejects illegal transition (open → closed)", () => {
    const i = makeIncident()
    const r = transitionIncidentStatus(i, "closed", "u", "T")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Cannot transition/)
  })

  it("requires resolution before resolving", () => {
    const i = makeIncident()
    // Advance to under_review first
    const reviewed = transitionIncidentStatus(i, "under_review", "u", "T").incident!
    const r = transitionIncidentStatus(reviewed, "resolved", "u", "T")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/resolution record/)
  })

  it("resolves successfully when resolution is set", () => {
    const i = makeIncident()
    const reviewed = transitionIncidentStatus(i, "under_review", "u", "T1").incident!
    const resolved = withResolution(reviewed)
    const r = transitionIncidentStatus(resolved, "resolved", "u", "T2")
    expect(r.ok).toBe(true)
    expect(r.incident?.status).toBe("resolved")
  })

  it("requires void_reason when voiding", () => {
    const i = makeIncident()
    const r = transitionIncidentStatus(i, "voided", "u", "T")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/void_reason/)
  })

  it("allows void with reason", () => {
    const i = makeIncident()
    const r = transitionIncidentStatus(i, "voided", "u", "T", { void_reason: "Duplicate report" })
    expect(r.ok).toBe(true)
    expect(r.incident?.status).toBe("voided")
  })

  it("allows re-open: resolved → open", () => {
    const i = makeIncident()
    const reviewed = transitionIncidentStatus(i, "under_review", "u", "T1").incident!
    const resolved = withResolution(reviewed)
    const r1 = transitionIncidentStatus(resolved, "resolved", "u", "T2")
    const r2 = transitionIncidentStatus(r1.incident!, "open", "u", "T3")
    expect(r2.ok).toBe(true)
    expect(r2.incident?.status).toBe("open")
  })

  it("no transitions from closed", () => {
    const i = makeIncident()
    const reviewed = transitionIncidentStatus(i, "under_review", "u", "T1").incident!
    const resolved = withResolution(reviewed)
    const r1 = transitionIncidentStatus(resolved, "resolved", "u", "T2").incident!
    const closed = transitionIncidentStatus(r1, "closed", "u", "T3").incident!
    expect(closed.status).toBe("closed")
    const r2 = transitionIncidentStatus(closed, "open", "u", "T4")
    expect(r2.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// changeIncidentSeverity
// ---------------------------------------------------------------------------

describe("changeIncidentSeverity", () => {
  it("changes severity and records audit", () => {
    const i = makeIncident()
    const updated = changeIncidentSeverity(i, "critical", "u", "T")
    expect(updated.severity).toBe("critical")
    expect(updated.audit.at(-1)?.event_type).toBe("severity_changed")
    expect(updated.audit.at(-1)?.detail).toContain("high → critical")
  })
})

// ---------------------------------------------------------------------------
// assignIncidentResponseOwner
// ---------------------------------------------------------------------------

describe("assignIncidentResponseOwner", () => {
  it("assigns a response owner", () => {
    const i = makeIncident()
    const updated = assignIncidentResponseOwner(i, "user-prod", "u", "T")
    expect(updated.response_owner_id).toBe("user-prod")
    expect(updated.audit.at(-1)?.event_type).toBe("owner_changed")
  })

  it("clears owner", () => {
    const i = makeIncident({ response_owner_id: "user-prod" })
    const updated = assignIncidentResponseOwner(i, null, "u", "T")
    expect(updated.response_owner_id).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

describe("addIncidentParticipant / removeIncidentParticipant", () => {
  it("adds a subject participant", () => {
    const i = makeIncident()
    const updated = addIncidentParticipant(
      i,
      { participant_id: "p-2", person_id: "person-2", role: "subject", is_sensitive: false },
      "u",
      "T",
    )
    expect(updated.participants).toHaveLength(2)
  })

  it("is idempotent on duplicate participant_id", () => {
    const i = makeIncident()
    const p = { participant_id: "p-2", person_id: "person-2", role: "witness" as const, is_sensitive: false }
    const t1 = addIncidentParticipant(i, p, "u", "T1")
    const t2 = addIncidentParticipant(t1, p, "u", "T2")
    expect(t2.participants).toHaveLength(2)
    expect(t2.audit).toHaveLength(t1.audit.length)
  })

  it("marks sensitive participant audit as sensitive", () => {
    const i = makeIncident()
    const updated = addIncidentParticipant(
      i,
      { participant_id: "p-3", person_id: "person-3", role: "subject", is_sensitive: true },
      "u",
      "T",
    )
    const entry = updated.audit.at(-1)!
    expect(entry.is_sensitive).toBe(true)
  })

  it("removes participant and records audit", () => {
    const i = makeIncident()
    const added = addIncidentParticipant(
      i,
      { participant_id: "p-4", person_id: "person-4", role: "witness", is_sensitive: false },
      "u",
      "T1",
    )
    const removed = removeIncidentParticipant(added, "p-4", "u", "T2")
    expect(removed.participants).toHaveLength(1)
    expect(removed.audit.at(-1)?.event_type).toBe("participant_removed")
  })

  it("no-op remove for unknown participant_id", () => {
    const i = makeIncident()
    const result = removeIncidentParticipant(i, "nonexistent", "u", "T")
    expect(result).toBe(i)
  })
})

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

describe("escalateIncident / acknowledgeEscalation", () => {
  it("escalates incident and sets status to escalated", () => {
    const i = makeIncident()
    const r = escalateIncident(i, {
      escalation_id: "esc-1",
      escalated_to_person_id: "mgr-1",
      reason: "Medical attention required",
      actor: "u",
      now: "T",
    })
    expect(r.ok).toBe(true)
    expect(r.incident?.status).toBe("escalated")
    expect(r.incident?.escalations).toHaveLength(1)
    expect(r.incident?.escalations[0].acknowledged).toBe(false)
  })

  it("requires non-empty reason for escalation", () => {
    const i = makeIncident()
    const r = escalateIncident(i, {
      escalation_id: "esc-1",
      escalated_to_person_id: "mgr-1",
      reason: "  ",
      actor: "u",
      now: "T",
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/reason is required/)
  })

  it("cannot escalate a closed incident", () => {
    let i = makeIncident()
    i = transitionIncidentStatus(i, "under_review", "u", "T1").incident!
    i = withResolution(i)
    i = transitionIncidentStatus(i, "resolved", "u", "T2").incident!
    i = transitionIncidentStatus(i, "closed", "u", "T3").incident!
    const r = escalateIncident(i, { escalation_id: "e", escalated_to_person_id: "m", reason: "x", actor: "u", now: "T4" })
    expect(r.ok).toBe(false)
  })

  it("acknowledges an escalation", () => {
    const i = makeIncident()
    const escalated = escalateIncident(i, {
      escalation_id: "esc-1",
      escalated_to_person_id: "mgr-1",
      reason: "Needs manager",
      actor: "u",
      now: "T1",
    }).incident!
    const ack = acknowledgeEscalation(escalated, "esc-1", "mgr-1", "T2")
    expect(ack.escalations[0].acknowledged).toBe(true)
    expect(ack.escalations[0].acknowledged_at).toBe("T2")
  })
})

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe("recordIncidentResolution", () => {
  it("sets resolution and records audit", () => {
    const i = makeIncident()
    const r = withResolution(i)
    expect(r.resolution).not.toBeNull()
    expect(r.resolution?.summary).toContain("secured")
    expect(r.audit.at(-1)?.event_type).toBe("resolution_recorded")
  })
})

// ---------------------------------------------------------------------------
// Follow-up actions
// ---------------------------------------------------------------------------

describe("addFollowUpAction / completeFollowUpAction", () => {
  it("adds a follow-up action", () => {
    const i = makeIncident()
    const updated = addFollowUpAction(
      i,
      { action_id: "fu-1", description: "File incident report", owner_id: "user-1", due_at: "2025-08-03T00:00:00Z" },
      "u",
      "T",
    )
    expect(updated.follow_up_actions).toHaveLength(1)
    expect(updated.follow_up_actions[0].status).toBe("open")
  })

  it("completes a follow-up action", () => {
    const i = makeIncident()
    const added = addFollowUpAction(
      i,
      { action_id: "fu-1", description: "Send report", owner_id: null, due_at: null },
      "u",
      "T1",
    )
    const completed = completeFollowUpAction(added, "fu-1", "u", "T2")
    expect(completed.follow_up_actions[0].status).toBe("complete")
    expect(completed.follow_up_actions[0].completed_at).toBe("T2")
  })
})

// ---------------------------------------------------------------------------
// Evidence files
// ---------------------------------------------------------------------------

describe("addEvidenceFile", () => {
  it("adds an evidence file", () => {
    const i = makeIncident()
    const updated = addEvidenceFile(
      i,
      {
        file_id: "f-1",
        file_type: "photo",
        storage_path: "/evidence/inc-1/photo.jpg",
        is_restricted: false,
        uploaded_by: "u",
        uploaded_at: "T",
      },
      "u",
      "T",
    )
    expect(updated.evidence_files).toHaveLength(1)
    expect(updated.audit.at(-1)?.event_type).toBe("evidence_added")
  })

  it("marks audit as sensitive for restricted files", () => {
    const i = makeIncident()
    const updated = addEvidenceFile(
      i,
      {
        file_id: "f-2",
        file_type: "document",
        storage_path: "/evidence/inc-1/medical.pdf",
        is_restricted: true,
        uploaded_by: "u",
        uploaded_at: "T",
      },
      "u",
      "T",
    )
    expect(updated.audit.at(-1)?.is_sensitive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Emergency copy review
// ---------------------------------------------------------------------------

describe("recordEmergencyCopyReview", () => {
  it("records approved review", () => {
    const i = makeIncident()
    const updated = recordEmergencyCopyReview(i, {
      reviewed_by: "user-1",
      reviewed_at: "T",
      outcome: "approved",
      notes: null,
    })
    expect(updated.emergency_copy_review?.outcome).toBe("approved")
    expect(updated.audit.at(-1)?.event_type).toBe("emergency_copy_reviewed")
  })

  it("records needs_revision outcome", () => {
    const i = makeIncident()
    const updated = recordEmergencyCopyReview(i, {
      reviewed_by: "user-1",
      reviewed_at: "T",
      outcome: "needs_revision",
      notes: "Add casualty count",
    })
    expect(updated.emergency_copy_review?.outcome).toBe("needs_revision")
  })
})

// ---------------------------------------------------------------------------
// projectIncidentAudit — restricted audit projection
// ---------------------------------------------------------------------------

describe("projectIncidentAudit", () => {
  it("returns full audit for caller with sensitive_access", () => {
    const i = makeIncident({ privacy_class: "medical" })
    const audit = projectIncidentAudit(i, true)
    expect(audit[0].detail).not.toBe(SENSITIVE_AUDIT_REDACTED_DETAIL)
  })

  it("redacts sensitive entry detail for caller without sensitive_access", () => {
    const i = makeIncident({ privacy_class: "medical" })
    const audit = projectIncidentAudit(i, false)
    // Created entry is sensitive for medical class
    expect(audit[0].detail).toBe(SENSITIVE_AUDIT_REDACTED_DETAIL)
  })

  it("does not redact non-sensitive entries", () => {
    const i = makeIncident({ privacy_class: "standard" })
    // Add a non-sensitive transition
    const updated = transitionIncidentStatus(i, "under_review", "u", "T").incident!
    const audit = projectIncidentAudit(updated, false)
    const statusEntry = audit.find((e) => e.event_type === "status_changed")!
    expect(statusEntry.detail).not.toBe(SENSITIVE_AUDIT_REDACTED_DETAIL)
  })

  it("keeps entry in audit list even when redacted (existence visible)", () => {
    const i = makeIncident({ privacy_class: "medical" })
    const audit = projectIncidentAudit(i, false)
    expect(audit).toHaveLength(1)
    expect(audit[0].event_type).toBe("created") // type visible
    expect(audit[0].detail).toBe(SENSITIVE_AUDIT_REDACTED_DETAIL) // content hidden
  })
})

// ---------------------------------------------------------------------------
// summarizeIncident
// ---------------------------------------------------------------------------

describe("summarizeIncident", () => {
  it("summarizes an open incident correctly", () => {
    const i = makeIncident()
    const s = summarizeIncident(i)
    expect(s.status).toBe("open")
    expect(s.severity).toBe("high")
    expect(s.has_response_owner).toBe(false)
    expect(s.participant_count).toBe(1)
    expect(s.escalation_count).toBe(0)
    expect(s.unacknowledged_escalations).toBe(0)
    expect(s.open_follow_up_count).toBe(0)
    expect(s.evidence_file_count).toBe(0)
    expect(s.emergency_copy_reviewed).toBe(false)
    expect(s.is_resolved).toBe(false)
  })

  it("counts unacknowledged escalations", () => {
    const i = makeIncident()
    const escalated = escalateIncident(i, {
      escalation_id: "esc-1",
      escalated_to_person_id: "mgr-1",
      reason: "Critical",
      actor: "u",
      now: "T",
    }).incident!
    const s = summarizeIncident(escalated)
    expect(s.unacknowledged_escalations).toBe(1)
  })

  it("marks is_resolved for resolved and closed", () => {
    let i = makeIncident()
    i = transitionIncidentStatus(i, "under_review", "u", "T1").incident!
    i = withResolution(i)
    i = transitionIncidentStatus(i, "resolved", "u", "T2").incident!
    const s = summarizeIncident(i)
    expect(s.is_resolved).toBe(true)

    const closed = transitionIncidentStatus(i, "closed", "u", "T3").incident!
    expect(summarizeIncident(closed).is_resolved).toBe(true)
  })

  it("counts open follow-up actions", () => {
    let i = makeIncident()
    i = addFollowUpAction(i, { action_id: "fu-1", description: "File report", owner_id: null, due_at: null }, "u", "T1")
    i = addFollowUpAction(i, { action_id: "fu-2", description: "Brief crew", owner_id: null, due_at: null }, "u", "T2")
    i = completeFollowUpAction(i, "fu-1", "u", "T3")
    const s = summarizeIncident(i)
    expect(s.open_follow_up_count).toBe(1)
  })
})
