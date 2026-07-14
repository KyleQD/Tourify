import type { HiringEntity } from "@/types/hiring-entity"

export type OnboardingFieldType =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "multiselect"
  | "textarea"
  | "number"
  | "checkbox"
  | "file"
  | "address"
  | "emergency_contact"
  | "bank_info"
  | "tax_info"
  | "id_document"

export type OnboardingSectionKey =
  | "identity"
  | "contact"
  | "emergency_contact"
  | "work_eligibility"
  | "certifications"
  | "tax_payment"
  | "documents"
  | "waiver"
  | "review"
  | "custom"

export interface OnboardingFieldValidation {
  min?: number
  max?: number
  regex?: string
  message?: string
  acceptedFileTypes?: string[]
  maxFileSizeMb?: number
}

export interface OnboardingFieldOption {
  label: string
  value: string
}

export interface OnboardingField {
  id: string
  name: string
  label: string
  type: OnboardingFieldType
  section?: OnboardingSectionKey
  required?: boolean
  blocking?: boolean
  requiresAdminReview?: boolean
  credentialType?: string
  placeholder?: string
  helpText?: string
  options?: Array<string | OnboardingFieldOption>
  validation?: OnboardingFieldValidation
  order?: number
}

export interface OnboardingTemplate {
  id?: string
  name: string
  description?: string | null
  department?: string | null
  position?: string | null
  fields: OnboardingField[]
  required_documents?: string[]
  estimated_days?: number | null
}

export interface TokenOnboardingInvitation {
  id: string
  token: string
  status?: string | null
  expires_at?: string | null
  completed_at?: string | null
}

export interface TokenOnboardingCandidate {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  department?: string | null
  status?: string | null
  stage?: string | null
  onboarding_progress?: number | null
}

export interface TokenOnboardingPayload {
  invitation: TokenOnboardingInvitation
  candidate: TokenOnboardingCandidate
  employer: HiringEntity
  template: OnboardingTemplate
  position?: string | null
  department?: string | null
  existingResponses?: Record<string, unknown> | null
  progress?: number | null
}

export interface UploadedOnboardingDocument {
  documentId?: string
  bucket?: string
  path?: string
  signedUrl?: string
  fileName: string
  fileType: string
  fileSize: number
}

export type OnboardingResponseValue =
  | string
  | number
  | boolean
  | string[]
  | UploadedOnboardingDocument
  | Record<string, unknown>
  | null

export interface OnboardingSubmitPayload {
  responses: Record<string, OnboardingResponseValue>
}

export interface OnboardingUploadResult {
  ok: boolean
  document?: UploadedOnboardingDocument
  error?: string
}
