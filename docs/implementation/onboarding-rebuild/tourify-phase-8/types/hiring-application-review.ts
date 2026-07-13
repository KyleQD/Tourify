import type { HiringEntity } from "@/types/hiring-entity"

export type HiringApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "approved"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "waitlisted"

export type HiringApplicationReviewAction =
  | "approve"
  | "reject"
  | "shortlist"
  | "waitlist"
  | "mark_reviewed"

export interface HiringApplicationApplicant {
  id: string
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
}

export interface HiringApplicationJobSummary {
  id: string
  title: string
  department?: string | null
  position?: string | null
  location?: string | null
  employerEntityType?: HiringEntity["entityType"]
  employerEntityId?: string
}

export interface HiringApplicationCandidateSummary {
  id: string
  status?: string | null
  stage?: string | null
  onboardingProgress?: number | null
  invitationToken?: string | null
  templateId?: string | null
}

export interface HiringEligibilitySummary {
  isEligible?: boolean | null
  mode?: "off" | "shadow" | "enforce" | string | null
  issues?: string[]
  checkedAt?: string | null
}

export interface HiringApplicationReviewItem {
  id: string
  status: HiringApplicationStatus | string
  appliedAt?: string | null
  reviewedAt?: string | null
  rating?: number | null
  reviewerNotes?: string | null
  formResponses: Record<string, unknown>
  applicant: HiringApplicationApplicant
  job: HiringApplicationJobSummary
  candidate?: HiringApplicationCandidateSummary | null
  eligibility?: HiringEligibilitySummary | null
  contractStatus?: string | null
  reReviewRequestedAt?: string | null
}

export interface HiringApplicationReviewFilters {
  status?: HiringApplicationStatus | "all"
  jobId?: string
  search?: string
  department?: string
}

export interface HiringApplicationReviewPanelProps {
  employer: HiringEntity
  initialStatus?: HiringApplicationStatus | "all"
  initialJobId?: string
  className?: string
}

export interface HiringApplicationDecisionPayload {
  action: HiringApplicationReviewAction
  employer_entity_type: HiringEntity["entityType"]
  employer_entity_id: string
  reason?: string
  message?: string
  rating?: number
}

export interface BulkHiringApplicationDecisionPayload extends HiringApplicationDecisionPayload {
  applicationIds: string[]
}

export interface HiringApplicationListResponse {
  data?: HiringApplicationReviewItem[]
  applications?: HiringApplicationReviewItem[]
  error?: string
}

export interface HiringApplicationDecisionResponse {
  data?: unknown
  error?: string
  message?: string
}
