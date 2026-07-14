import type { HiringEntity } from "@/types/hiring-entity"

export type OnboardingFlowType = "application" | "onboarding" | "workflow" | "role"

export type OnboardingFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "multiselect"
  | "file"
  | "checkbox"
  | "number"
  | "address"
  | "emergency_contact"
  | "bank_info"
  | "tax_info"
  | "id_document"
  | "waiver"
  | "training_acknowledgement"

export interface OnboardingFieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  fileTypes?: string[]
  maxFileSizeMb?: number
  minimumAge?: number
}

export interface OnboardingFormField {
  id: string
  name: string
  label: string
  type: OnboardingFieldType
  section: string
  order: number
  required: boolean
  blocking?: boolean
  requiresAdminReview?: boolean
  credentialType?: string
  placeholder?: string
  helpText?: string
  options?: string[]
  validation?: OnboardingFieldValidation
  metadata?: Record<string, unknown>
}

export interface StaffOnboardingTemplate {
  id: string
  name: string
  description?: string | null
  employer_entity_type?: HiringEntity["entityType"] | null
  employer_entity_id?: string | null
  venue_id?: string | null
  department?: string | null
  position?: string | null
  employment_type?: "full_time" | "part_time" | "contractor" | "volunteer" | "intern" | null
  fields: OnboardingFormField[]
  estimated_days?: number | null
  required_documents?: string[] | null
  assignees?: string[] | null
  tags?: string[] | null
  is_default?: boolean | null
  parent_template_id?: string | null
  use_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ResolveOnboardingTemplateArgs {
  employer: HiringEntity
  flowType: OnboardingFlowType
  templateId?: string | null
  position?: string | null
  department?: string | null
}

export type ResolvedOnboardingTemplateSource =
  | "explicit_template"
  | "employer_position_match"
  | "employer_default"
  | "global_position_match"
  | "global_default"
  | "static_safe_fallback"

export interface ResolvedOnboardingTemplate {
  template: StaffOnboardingTemplate
  source: ResolvedOnboardingTemplateSource
  shouldSeedTemplate: boolean
}

export interface TokenOnboardingPayload {
  token: string
  invitation: Record<string, unknown>
  candidate: Record<string, unknown>
  employer: HiringEntity
  position?: string | null
  department?: string | null
  template: StaffOnboardingTemplate
  templateSource: ResolvedOnboardingTemplateSource
  existingResponses?: Record<string, unknown> | null
  /** Where existingResponses came from for UX hints. */
  prefillSource?: "draft" | "saved_profile" | "none"
  progress: number
}
