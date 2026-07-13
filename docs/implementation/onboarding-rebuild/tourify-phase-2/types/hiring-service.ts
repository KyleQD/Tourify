import type { HiringActor, HiringEntity, HiringEntityType } from "@/types/hiring-entity"

export type HiringServiceErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "UNSUPPORTED"

export interface HiringServiceError {
  code: HiringServiceErrorCode
  message: string
  details?: unknown
}

export type HiringServiceResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: HiringServiceError }

export interface HiringEntityScopeInput {
  entityType?: HiringEntityType
  entityId?: string
  venueId?: string
  eventId?: string
  tourId?: string
  displayName?: string
}

export interface HiringListFilters {
  status?: string
  jobPostingId?: string
  department?: string
  position?: string
  query?: string
  limit?: number
  offset?: number
}

export interface CreateJobPostingInput {
  title: string
  description: string
  department: string
  position: string
  employment_type: string
  location?: string
  role_type?: string
  number_of_positions?: number
  salary_range?: Record<string, unknown> | null
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  skills?: string[]
  experience_level?: string
  remote?: boolean
  urgent?: boolean
  required_certifications?: string[]
  application_form_template?: Record<string, unknown>
  onboarding_template_id?: string | null
  status?: "draft" | "published" | "closed" | "archived"
}

export interface ApplicationDecisionInput {
  applicationId: string
  actor: HiringActor
  reason?: string
  note?: string
}

export interface DirectInviteInput {
  actor: HiringActor
  email: string
  name?: string
  phone?: string
  position: string
  department?: string
  employmentType?: string
  templateId?: string | null
  jobPostingId?: string | null
}

export interface TokenOnboardingPayload {
  invitation: Record<string, unknown>
  candidate: Record<string, unknown>
  employer: HiringEntity
  template: Record<string, unknown> | null
  existingResponses: Record<string, unknown> | null
  progress: number
}

export interface DashboardStats {
  jobs: {
    total: number
    published: number
    draft: number
    closed: number
  }
  applications: {
    total: number
    pending: number
    approved: number
    rejected: number
    waitlisted: number
  }
  onboarding: {
    total: number
    pending: number
    inProgress: number
    completed: number
    rejected: number
    averageProgress: number
  }
  roster: {
    total: number
    active: number
    inactive: number
  }
}

export function ok<TData>(data: TData): HiringServiceResult<TData> {
  return { ok: true, data }
}

export function fail<TData = never>(error: HiringServiceError): HiringServiceResult<TData> {
  return { ok: false, error }
}
