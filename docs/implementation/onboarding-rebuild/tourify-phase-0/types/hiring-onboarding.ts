import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

export const APPLICATION_STATUSES = [
  "pending",
  "reviewed",
  "shortlisted",
  "approved",
  "accepted",
  "rejected",
  "withdrawn",
  "waitlisted",
] as const

export const CANDIDATE_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "completed",
  "rejected",
] as const

export const CANDIDATE_STAGES = [
  "invitation",
  "onboarding",
  "review",
  "approved",
  "rejected",
] as const

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contractor",
  "volunteer",
  "intern",
] as const

export const HIRING_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "date",
  "select",
  "multiselect",
  "file",
  "checkbox",
  "number",
  "address",
  "emergency_contact",
  "bank_info",
  "tax_info",
  "id_document",
  "waiver",
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]
export type HiringFieldType = (typeof HIRING_FIELD_TYPES)[number]

export interface EmployerScopedRecord {
  employer_entity_type: HiringEntityType
  employer_entity_id: string
  /** Legacy compatibility. Keep during venue-only migration window. */
  venue_id?: string | null
}

export interface HiringBaseRecord extends EmployerScopedRecord {
  id: string
  created_at: string
  updated_at?: string | null
}

export interface HiringFieldValidation {
  min?: number
  max?: number
  regex?: string
  fileTypes?: string[]
  maxFileSizeMb?: number
  minAge?: number
  customMessage?: string
}

export interface HiringFormField {
  id: string
  name: string
  label: string
  type: HiringFieldType
  required: boolean
  order: number
  placeholder?: string
  help_text?: string
  options?: string[]
  section?: string
  validation?: HiringFieldValidation
  blocking?: boolean
  requires_admin_review?: boolean
  credential_type?: string
  pii?: boolean
}

export interface HiringFormTemplate {
  fields: HiringFormField[]
  version?: number
  sections?: string[]
}

export interface SalaryRange {
  min?: number
  max?: number
  type?: "hourly" | "salary" | "daily" | "flat"
  currency?: string
}

export interface JobPostingTemplate extends HiringBaseRecord {
  title: string
  description: string
  department: string
  position: string
  role_type?: string | null
  employment_type: EmploymentType
  location?: string | null
  number_of_positions?: number | null
  salary_range?: SalaryRange | null
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  skills?: string[]
  required_certifications?: string[]
  application_form_template: HiringFormTemplate
  onboarding_template_id?: string | null
  status: "draft" | "published" | "closed" | "archived"
  published_at?: string | null
  created_by?: string | null
}

export interface JobApplication extends HiringBaseRecord {
  job_posting_id: string
  applicant_id: string
  status: ApplicationStatus
  form_responses: Record<string, unknown>
  rating?: number | null
  reviewer_id?: string | null
  reviewed_at?: string | null
  decision_message?: string | null
  auto_screening_result?: Record<string, unknown> | null
  screening_issues?: string[] | null
  re_review_requested_at?: string | null
}

export interface StaffOnboardingCandidate extends HiringBaseRecord {
  application_id?: string | null
  job_posting_id?: string | null
  user_id?: string | null
  name: string
  email: string
  phone?: string | null
  position: string
  department: string
  employment_type: EmploymentType
  status: CandidateStatus
  stage: CandidateStage
  onboarding_progress: number
  template_id?: string | null
  invitation_token?: string | null
  onboarding_responses?: Record<string, unknown> | null
  review_notes?: string | null
  approved_by?: string | null
  approved_at?: string | null
}

export interface StaffInvitation extends HiringBaseRecord {
  candidate_id: string
  token: string
  email: string
  status: "pending" | "opened" | "completed" | "expired" | "revoked"
  template_id?: string | null
  expires_at?: string | null
  completed_at?: string | null
}

export interface StaffOnboardingTemplate extends HiringBaseRecord {
  name: string
  description?: string | null
  department?: string | null
  position?: string | null
  employment_type?: EmploymentType | null
  fields: HiringFormField[]
  estimated_days?: number | null
  required_documents?: string[]
  assignees?: string[]
  tags?: string[]
  is_default?: boolean
  parent_template_id?: string | null
  use_count?: number
}

export interface OnboardingWorkflow extends HiringBaseRecord {
  candidate_id: string
  job_posting_id?: string | null
  current_stage: string
  status: "active" | "paused" | "completed" | "cancelled"
  estimated_completion?: string | null
  actual_completion?: string | null
  metadata?: Record<string, unknown> | null
}

export interface HiringAuditEvent extends HiringBaseRecord {
  actor_id?: string | null
  subject_user_id?: string | null
  application_id?: string | null
  candidate_id?: string | null
  event_type: string
  previous_status?: string | null
  next_status?: string | null
  metadata?: Record<string, unknown> | null
}

export interface HiringEligibilitySnapshot extends HiringBaseRecord {
  application_id?: string | null
  candidate_id?: string | null
  is_eligible: boolean
  mode: "off" | "shadow" | "enforce"
  checklist: Record<string, unknown>
  blocking_reasons?: string[]
}

export interface StaffMember extends HiringBaseRecord {
  user_id: string
  onboarding_candidate_id?: string | null
  position: string
  department: string
  employment_type: EmploymentType
  status: "active" | "inactive" | "pending" | "suspended"
  compliance_status: "not_started" | "incomplete" | "in_review" | "complete" | "blocked"
  started_at?: string | null
  notes?: string | null
}

export interface EmploymentAssignment extends HiringBaseRecord {
  user_id: string
  role_template_id?: string | null
  position: string
  department?: string | null
  permissions: Record<string, unknown>
  status: "pending" | "active" | "inactive" | "revoked"
  source: "hiring_onboarding" | "manual" | "import"
}

export interface HiringDashboardStats {
  employer: HiringEntity
  jobs: {
    total: number
    draft: number
    published: number
    closed: number
  }
  applications: {
    total: number
    pending: number
    reviewed: number
    shortlisted: number
    approved: number
    rejected: number
    waitlisted: number
  }
  onboarding: {
    total: number
    pending: number
    in_progress: number
    submitted: number
    completed: number
    rejected: number
    average_progress: number
  }
  roster: {
    total: number
    active: number
    pending: number
    blocked: number
  }
}
