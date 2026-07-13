import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

/**
 * Shared hiring/onboarding constants and form types.
 * Domain records (JobApplication, JobPostingTemplate, etc.) live in
 * types/admin-onboarding.ts — extend those with employer_entity_* fields.
 */

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
  "needs_revision",
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

/** Alias for universal hiring module compatibility. */
export type StaffOnboardingCandidate = import("@/types/admin-onboarding").OnboardingCandidate
