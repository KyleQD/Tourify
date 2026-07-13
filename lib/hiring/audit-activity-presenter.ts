import type { HiringAuditActivity } from "@/types/hiring-dashboard"

type RawRecord = Record<string, unknown>

export interface AuditApplicationSummary {
  id: string
  applicantName?: string | null
  applicantEmail?: string | null
  jobId?: string | null
}

export interface AuditCandidateSummary {
  id: string
  name?: string | null
  email?: string | null
  applicationId?: string | null
  jobId?: string | null
  position?: string | null
}

export interface AuditRosterMemberSummary {
  id: string
  name?: string | null
  email?: string | null
}

export interface AuditJobSummary {
  id: string
  title?: string | null
  position?: string | null
}

export interface HiringAuditPresenterContext {
  applicationsById?: Map<string, AuditApplicationSummary>
  candidatesById?: Map<string, AuditCandidateSummary>
  candidateIdByDocumentId?: Map<string, string>
  rosterMembersById?: Map<string, AuditRosterMemberSummary>
  jobsById?: Map<string, AuditJobSummary>
}

export interface HiringAuditReferenceIds {
  applicationIds: string[]
  candidateIds: string[]
  documentIds: string[]
  rosterMemberIds: string[]
  jobIds: string[]
}

const TECHNICAL_DESCRIPTION_PATTERNS = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /\bjob_applications\b/i,
  /\bstaff_onboarding_candidates\b/i,
  /\bstaff_members\b/i,
  /\b[a-z]+_[a-z0-9_]+\b/,
]

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const stringValue = asString(value)
    if (stringValue) return stringValue
  }
  return null
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function metadataFor(row: RawRecord): RawRecord {
  return asRecord(row.metadata)
}

function getEventKey(row: RawRecord): string {
  const metadata = metadataFor(row)
  return (
    firstString(row.event_type, row.action, metadata.event_type, metadata.action, row.title) ?? "hiring_event"
  ).toLowerCase()
}

function getApplicationId(row: RawRecord): string | null {
  const metadata = metadataFor(row)
  if (metadata.entity_table === "job_applications") return firstString(metadata.entity_id, row.application_id)
  return firstString(row.application_id, metadata.application_id, metadata.applicationId)
}

function getCandidateId(row: RawRecord): string | null {
  const metadata = metadataFor(row)
  if (metadata.entity_table === "staff_onboarding_candidates") return firstString(metadata.entity_id)
  if (row.subject_type === "staff_onboarding_candidate") return firstString(row.subject_id)
  return firstString(metadata.candidate_id, metadata.candidateId, metadata.onboarding_candidate_id)
}

function getRosterMemberId(row: RawRecord): string | null {
  const metadata = metadataFor(row)
  if (metadata.entity_table === "staff_members") return firstString(metadata.entity_id)
  if (row.subject_type === "staff_member") return firstString(row.subject_id)
  return firstString(metadata.roster_member_id, metadata.rosterMemberId, metadata.member_id, metadata.memberId)
}

function getDocumentId(row: RawRecord): string | null {
  const metadata = metadataFor(row)
  if (row.subject_type === "staff_document") return firstString(row.subject_id)
  return firstString(metadata.document_id, metadata.documentId, metadata.staff_document_id)
}

function getJobId(row: RawRecord): string | null {
  const metadata = metadataFor(row)
  return firstString(row.job_id, metadata.job_id, metadata.jobId, metadata.jobPostingId, metadata.job_posting_id)
}

export function collectHiringAuditReferenceIds(rows: RawRecord[]): HiringAuditReferenceIds {
  return {
    applicationIds: unique(rows.map(getApplicationId)),
    candidateIds: unique(rows.map(getCandidateId)),
    documentIds: unique(rows.map(getDocumentId)),
    rosterMemberIds: unique(rows.map(getRosterMemberId)),
    jobIds: unique(rows.map(getJobId)),
  }
}

function cleanLabel(value: string): string {
  return value
    .replace(/^job_/, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusLabel(value: string | null): string | null {
  if (!value || value === "n/a") return null
  return value.replaceAll("_", " ")
}

function isTechnicalDescription(value: string): boolean {
  return TECHNICAL_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(value))
}

function safeExistingDescription(row: RawRecord): string | null {
  const content = asString(row.content)
  if (!content || isTechnicalDescription(content)) return null
  return content
}

function displayName(name?: string | null, email?: string | null, fallback = "This person"): string {
  return firstString(name, email) ?? fallback
}

function getApplicationSummary(row: RawRecord, context: HiringAuditPresenterContext): AuditApplicationSummary | null {
  const applicationId = getApplicationId(row)
  return applicationId ? context.applicationsById?.get(applicationId) ?? null : null
}

function getCandidateSummary(row: RawRecord, context: HiringAuditPresenterContext): AuditCandidateSummary | null {
  const documentId = getDocumentId(row)
  const candidateId = getCandidateId(row) ?? (documentId ? context.candidateIdByDocumentId?.get(documentId) ?? null : null)
  return candidateId ? context.candidatesById?.get(candidateId) ?? null : null
}

function getRosterMemberSummary(row: RawRecord, context: HiringAuditPresenterContext): AuditRosterMemberSummary | null {
  const memberId = getRosterMemberId(row)
  return memberId ? context.rosterMembersById?.get(memberId) ?? null : null
}

function getJobTitle(row: RawRecord, context: HiringAuditPresenterContext): string | null {
  const application = getApplicationSummary(row, context)
  const candidate = getCandidateSummary(row, context)
  const jobId = firstString(getJobId(row), application?.jobId, candidate?.jobId)
  const job = jobId ? context.jobsById?.get(jobId) : null
  return firstString(job?.title, job?.position, candidate?.position)
}

function withJobSuffix(description: string, jobTitle: string | null): string {
  return jobTitle ? `${description} for ${jobTitle}.` : `${description}.`
}

function personForApplication(row: RawRecord, context: HiringAuditPresenterContext): string {
  const candidate = getCandidateSummary(row, context)
  const application = getApplicationSummary(row, context)
  return displayName(candidate?.name ?? application?.applicantName, candidate?.email ?? application?.applicantEmail, "The applicant")
}

function personForCandidate(row: RawRecord, context: HiringAuditPresenterContext): string {
  const candidate = getCandidateSummary(row, context)
  return displayName(candidate?.name, candidate?.email, "The candidate")
}

function personForRoster(row: RawRecord, context: HiringAuditPresenterContext): string {
  const member = getRosterMemberSummary(row, context)
  const candidate = getCandidateSummary(row, context)
  return displayName(member?.name ?? candidate?.name, member?.email ?? candidate?.email, "This team member")
}

export function presentHiringAuditActivity(
  row: RawRecord,
  context: HiringAuditPresenterContext = {}
): HiringAuditActivity {
  const eventKey = getEventKey(row)
  const createdAt = firstString(row.created_at) ?? new Date().toISOString()
  const jobTitle = getJobTitle(row, context)
  const fromStatus = statusLabel(firstString(row.from_status, metadataFor(row).from_status))
  const toStatus = statusLabel(firstString(row.to_status, metadataFor(row).to_status))

  let action: string
  let description: string | null
  let subjectName: string | null = null

  switch (eventKey) {
    case "approve":
    case "application_approved":
    case "job_application_approved": {
      const person = personForApplication(row, context)
      action = "Application approved"
      description = withJobSuffix(`${person} was approved`, jobTitle)
      subjectName = person
      break
    }
    case "reject":
    case "application_rejected": {
      const person = personForApplication(row, context)
      action = "Application rejected"
      description = withJobSuffix(`${person} was not selected`, jobTitle)
      subjectName = person
      break
    }
    case "request_evidence": {
      const person = personForApplication(row, context)
      action = "More information requested"
      description = `${person} was asked to provide more information.`
      subjectName = person
      break
    }
    case "onboarding_candidate_approved": {
      const person = personForCandidate(row, context)
      action = "Onboarding approved"
      description = `${person} completed onboarding and was added to the team.`
      subjectName = person
      break
    }
    case "onboarding_candidate_rejected": {
      const person = personForCandidate(row, context)
      action = "Onboarding rejected"
      description = `${person}'s onboarding was rejected.`
      subjectName = person
      break
    }
    case "onboarding_candidate_changes_requested": {
      const person = personForCandidate(row, context)
      action = "Onboarding changes requested"
      description = `${person} was asked to update their onboarding information.`
      subjectName = person
      break
    }
    case "onboarding_invite_resent": {
      const person = personForCandidate(row, context)
      action = "Onboarding invite resent"
      description = `${person} was sent another onboarding invite.`
      subjectName = person
      break
    }
    case "onboarding_template_assigned": {
      const person = personForCandidate(row, context)
      action = "Onboarding assigned"
      description = `${person} was assigned onboarding steps.`
      subjectName = person
      break
    }
    case "document_verified":
    case "document_reviewed": {
      const person = personForCandidate(row, context)
      const status = firstString(metadataFor(row).status)
      const approved = eventKey === "document_verified" || status === "approved" || status === "verified"
      action = approved ? "Document approved" : "Document reviewed"
      description = approved ? `A document was approved for ${person}.` : `A document was reviewed for ${person}.`
      subjectName = person
      break
    }
    case "document_rejected": {
      const person = personForCandidate(row, context)
      action = "Document needs attention"
      description = `A document needs attention for ${person}.`
      subjectName = person
      break
    }
    case "roster_member_assigned":
    case "candidate_assignment_updated": {
      const person = personForRoster(row, context)
      action = "Team assignment updated"
      description = `${person}'s team assignment was updated.`
      subjectName = person
      break
    }
    case "roster_member_status_updated": {
      const person = personForRoster(row, context)
      const status = statusLabel(firstString(metadataFor(row).status))
      action = "Team member status updated"
      description = status ? `${person} was marked ${status}.` : `${person}'s team status was updated.`
      subjectName = person
      break
    }
    case "roster_created_from_approval":
    case "roster_activated_from_onboarding": {
      const person = personForRoster(row, context)
      action = "Added to roster"
      description = `${person} was added to the team roster.`
      subjectName = person
      break
    }
    default: {
      action = cleanLabel(eventKey)
      if (fromStatus && toStatus) {
        description = `Status changed from ${fromStatus} to ${toStatus}.`
      } else {
        description = safeExistingDescription(row) ?? "A hiring activity was recorded."
      }
      break
    }
  }

  return {
    id: String(row.id),
    action,
    description,
    createdAt,
    actorName: null,
    subjectName,
  }
}
