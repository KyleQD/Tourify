import { describe, expect, it } from "vitest"

import {
  collectHiringAuditReferenceIds,
  presentHiringAuditActivity,
  type AuditApplicationSummary,
  type AuditCandidateSummary,
  type AuditJobSummary,
  type AuditRosterMemberSummary,
} from "@/lib/hiring/audit-activity-presenter"

const applicationId = "9b511767-d698-424f-8fe1-6391d7c5bb97"
const candidateId = "2f57c37e-b7ac-45cc-8bc6-8f8ab802a14f"
const documentId = "7e3c0fb0-aa54-41dd-a652-f1242937b4ed"
const rosterMemberId = "5de39e50-01f2-47b4-bdae-9720003f7674"
const jobId = "be102511-0b88-4ee7-adc9-41976ec8bbf4"

const applicationsById = new Map<string, AuditApplicationSummary>([
  [applicationId, { id: applicationId, applicantName: "Kyle Daley", applicantEmail: "kyle@example.com", jobId }],
])

const candidatesById = new Map<string, AuditCandidateSummary>([
  [candidateId, { id: candidateId, name: "Kyle Daley", email: "kyle@example.com", jobId, position: "Bartender" }],
])

const candidateIdByDocumentId = new Map([[documentId, candidateId]])

const rosterMembersById = new Map<string, AuditRosterMemberSummary>([
  [rosterMemberId, { id: rosterMemberId, name: "Kyle Daley", email: "kyle@example.com" }],
])

const jobsById = new Map<string, AuditJobSummary>([
  [jobId, { id: jobId, title: "Bartender" }],
])

const context = {
  applicationsById,
  candidatesById,
  candidateIdByDocumentId,
  rosterMembersById,
  jobsById,
}

describe("presentHiringAuditActivity", () => {
  it("turns legacy approval rows into readable activity without UUID-heavy content", () => {
    const activity = presentHiringAuditActivity(
      {
        id: "evt_1",
        action: "approve",
        application_id: applicationId,
        job_id: jobId,
        content: `Application ${applicationId} moved from approved to approved via approve.`,
        created_at: "2026-07-09T00:00:00.000Z",
      },
      context
    )

    expect(activity.action).toBe("Application approved")
    expect(activity.description).toBe("Kyle Daley was approved for Bartender.")
    expect(activity.description).not.toContain(applicationId)
    expect(activity.description).not.toContain("via approve")
    expect(activity.description).not.toContain("moved from")
  })

  it("turns newer application approval events into readable activity", () => {
    const activity = presentHiringAuditActivity(
      {
        id: "evt_2",
        action: "application_approved",
        application_id: applicationId,
        metadata: { entity_table: "job_applications", entity_id: applicationId },
        created_at: "2026-07-09T00:00:00.000Z",
      },
      context
    )

    expect(activity.action).toBe("Application approved")
    expect(activity.description).toBe("Kyle Daley was approved for Bartender.")
  })

  it("describes onboarding review decisions in plain English", () => {
    const activity = presentHiringAuditActivity(
      {
        id: "evt_3",
        action: "onboarding_candidate_changes_requested",
        metadata: { entity_table: "staff_onboarding_candidates", entity_id: candidateId },
        created_at: "2026-07-09T00:00:00.000Z",
      },
      context
    )

    expect(activity.action).toBe("Onboarding changes requested")
    expect(activity.description).toBe("Kyle Daley was asked to update their onboarding information.")
    expect(activity.subjectName).toBe("Kyle Daley")
  })

  it("describes document events through the linked candidate", () => {
    const activity = presentHiringAuditActivity(
      {
        id: "evt_4",
        event_type: "document_verified",
        subject_type: "staff_document",
        subject_id: documentId,
        created_at: "2026-07-09T00:00:00.000Z",
      },
      context
    )

    expect(activity.action).toBe("Document approved")
    expect(activity.description).toBe("A document was approved for Kyle Daley.")
    expect(activity.description).not.toContain(documentId)
  })

  it("describes roster changes in plain English", () => {
    const activity = presentHiringAuditActivity(
      {
        id: "evt_5",
        event_type: "roster_member_assigned",
        subject_type: "staff_member",
        subject_id: rosterMemberId,
        created_at: "2026-07-09T00:00:00.000Z",
      },
      context
    )

    expect(activity.action).toBe("Team assignment updated")
    expect(activity.description).toBe("Kyle Daley's team assignment was updated.")
  })

  it("cleans unknown event labels and hides technical descriptions", () => {
    const activity = presentHiringAuditActivity({
      id: "evt_6",
      action: "custom_workflow_started",
      content: `custom_workflow_started on job_applications (${applicationId})`,
      created_at: "2026-07-09T00:00:00.000Z",
    })

    expect(activity.action).toBe("Custom Workflow Started")
    expect(activity.action).not.toContain("_")
    expect(activity.description).toBe("A hiring activity was recorded.")
    expect(activity.description).not.toContain(applicationId)
  })
})

describe("collectHiringAuditReferenceIds", () => {
  it("collects IDs from legacy columns, subjects, and metadata", () => {
    expect(
      collectHiringAuditReferenceIds([
        { application_id: applicationId, job_id: jobId },
        { subject_type: "staff_document", subject_id: documentId },
        { subject_type: "staff_member", subject_id: rosterMemberId },
        { metadata: { entity_table: "staff_onboarding_candidates", entity_id: candidateId } },
      ])
    ).toEqual({
      applicationIds: [applicationId],
      candidateIds: [candidateId],
      documentIds: [documentId],
      rosterMemberIds: [rosterMemberId],
      jobIds: [jobId],
    })
  })
})
