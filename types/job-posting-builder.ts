import type { HiringEntity } from "@/types/hiring-entity"

export type ApplicationFormFieldType =
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

export type JobPostingStatus = "draft" | "published" | "closed" | "archived"

export type JobEmploymentType = "full_time" | "part_time" | "contractor" | "volunteer" | "intern"

export type JobSalaryType = "hourly" | "salary" | "daily" | "flat"

export interface ApplicationFormFieldValidation {
  min?: number
  max?: number
  regex?: string
  fileTypes?: string[]
  maxFileSizeMb?: number
}

export interface ApplicationFormFieldDefinition {
  id?: string
  name: string
  label: string
  type: ApplicationFormFieldType
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
  validation?: ApplicationFormFieldValidation
  order: number
  // When true the field is auto-filled from the applicant's general profile and
  // hidden from the screening step of the Quick Apply flow.
  profileField?: boolean
}

export interface ApplicationFormTemplateDefinition {
  fields: ApplicationFormFieldDefinition[]
}

export interface JobSalaryRange {
  min?: number | null
  max?: number | null
  type?: JobSalaryType | null
}

export interface JobPostingFormValues {
  id?: string
  title: string
  description: string
  department: string
  position: string
  employment_type: JobEmploymentType
  location?: string
  role_type?: string
  number_of_positions: number
  salary_range?: JobSalaryRange | null
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  skills: string[]
  experience_level?: "entry" | "mid" | "senior" | "executive" | "any"
  remote: boolean
  urgent: boolean
  required_certifications: string[]
  application_form_template: ApplicationFormTemplateDefinition
  onboarding_template_id?: string | null
  event_id?: string | null
  tour_id?: string | null
  event_date?: string | null
  status: JobPostingStatus
}

export interface JobPostingTemplateOption {
  id: string
  name: string
  department?: string | null
  position?: string | null
  isDefault?: boolean | null
}

export interface JobPostingBuilderProps {
  employer: HiringEntity
  initialData?: Partial<JobPostingFormValues>
  mode?: "create" | "edit"
  onboardingTemplates?: JobPostingTemplateOption[]
  submitEndpoint?: string
  onCancel?: () => void
  onCreated?: (posting: Record<string, unknown>) => void
  onUpdated?: (posting: Record<string, unknown>) => void
}

export interface CreateJobPostingActionInput extends JobPostingFormValues {
  employer_entity_type: HiringEntity["entityType"]
  employer_entity_id: string
  venue_id?: string | null
  event_id?: string | null
  tour_id?: string | null
  event_date?: string | null
}
