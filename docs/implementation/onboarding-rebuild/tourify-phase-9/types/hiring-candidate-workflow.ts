import type { HiringEntity } from "@/types/hiring-entity"

export type CandidateStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "completed"
  | "rejected"
  | "approved"

export type CandidateStage =
  | "invitation"
  | "onboarding"
  | "documents"
  | "review"
  | "approved"
  | "rejected"

export type CandidateKanbanColumnId =
  | "invitation_sent"
  | "started"
  | "needs_documents"
  | "submitted"
  | "in_review"
  | "completed"
  | "rejected"

export type WorkflowStageId =
  | "job_posted"
  | "application_received"
  | "screening"
  | "invitation_sent"
  | "onboarding_started"
  | "onboarding_completed"
  | "review_pending"
  | "approved"
  | "team_assigned"

export type WorkflowStepStatus = "completed" | "active" | "pending" | "blocked"

export type StaffDocumentStatus = "pending" | "verified" | "rejected" | "expired"

export interface HiringCandidateDocument {
  id: string
  candidateId: string
  label: string
  documentType: string
  fileName?: string | null
  mimeType?: string | null
  storagePath?: string | null
  signedUrl?: string | null
  status: StaffDocumentStatus
  uploadedAt?: string | null
  reviewedAt?: string | null
  reviewerName?: string | null
  rejectionReason?: string | null
  expiresAt?: string | null
  required?: boolean
  blocking?: boolean
}

export interface HiringCandidateWorkflowStep {
  id: WorkflowStageId
  label: string
  description: string
  status: WorkflowStepStatus
  timestamp?: string | null
  actorName?: string | null
  metadata?: Record<string, unknown> | null
}

export interface HiringCandidateApplicationSummary {
  id: string
  status: string
  rating?: number | null
  appliedAt?: string | null
  formResponses?: Record<string, unknown> | null
}

export interface HiringCandidateJobSummary {
  id?: string | null
  title?: string | null
  department?: string | null
  position?: string | null
  location?: string | null
  employmentType?: string | null
}

export interface HiringCandidateTemplateSummary {
  id?: string | null
  name?: string | null
  description?: string | null
  requiredDocuments?: string[]
}

export interface HiringCandidateRosterSummary {
  staffMemberId?: string | null
  employmentAssignmentId?: string | null
  workModeStatus?: "not_created" | "pending" | "active" | "inactive" | "suspended"
  shiftCount?: number
  zone?: string | null
  startDate?: string | null
}

export interface HiringCandidate {
  id: string
  employer: HiringEntity
  userId?: string | null
  applicationId?: string | null
  invitationId?: string | null
  invitationToken?: string | null
  onboardingUrl?: string | null
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  position?: string | null
  department?: string | null
  employmentType?: string | null
  status: CandidateStatus
  stage: CandidateStage
  onboardingProgress: number
  complianceStatus?: "missing" | "pending_review" | "approved" | "blocked"
  missingRequiredCount?: number
  blockingIssueCount?: number
  assignedManagerName?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
  approvedAt?: string | null
  completedAt?: string | null
  application?: HiringCandidateApplicationSummary | null
  job?: HiringCandidateJobSummary | null
  template?: HiringCandidateTemplateSummary | null
  documents?: HiringCandidateDocument[]
  workflowSteps?: HiringCandidateWorkflowStep[]
  roster?: HiringCandidateRosterSummary | null
}

export interface CandidateKanbanColumn {
  id: CandidateKanbanColumnId
  title: string
  description: string
  candidates: HiringCandidate[]
}

export interface CandidateKanbanFilters {
  search: string
  department: string
  position: string
  complianceStatus: string
  status: string
}

export interface CandidateKanbanApiResponse {
  data: HiringCandidate[]
  meta?: {
    total: number
    employer: HiringEntity
  }
}

export interface UpdateCandidateStatusInput {
  candidateId: string
  nextStatus: CandidateStatus
  nextStage?: CandidateStage
  note?: string
}

export interface ReviewCandidateDocumentInput {
  documentId: string
  status: Extract<StaffDocumentStatus, "verified" | "rejected">
  rejectionReason?: string
}
