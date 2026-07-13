import type { HiringEntity } from "@/types/hiring-entity"

export type HiringDocumentBucket =
  | "staff-documents"
  | "staff-certifications"
  | "staff-id-documents"
  | "staff-waivers"

export type HiringDocumentStatus =
  | "missing"
  | "uploaded"
  | "needs_review"
  | "approved"
  | "rejected"
  | "expired"

export type HiringDocumentType =
  | "general_document"
  | "certification"
  | "id_document"
  | "waiver"
  | "tax_document"
  | "payment_document"
  | "license"
  | "background_check"

export type SensitiveOnboardingFieldType =
  | "ssn"
  | "bank_info"
  | "tax_info"
  | "id_document"

export interface HiringUploadPolicy {
  bucket: HiringDocumentBucket
  maxBytes: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

export interface HiringUploadRequestContext {
  token?: string
  candidateId?: string
  staffMemberId?: string
  employer?: HiringEntity
  fieldId?: string
  documentType: HiringDocumentType
  label?: string
  credentialType?: string
  expiresAt?: string
}

export interface HiringStoredDocument {
  id: string
  employer: HiringEntity
  candidateId?: string | null
  staffMemberId?: string | null
  userId?: string | null
  fieldId?: string | null
  label: string
  documentType: HiringDocumentType
  credentialType?: string | null
  bucket: HiringDocumentBucket
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  status: HiringDocumentStatus
  signedUrl?: string | null
  expiresAt?: string | null
  reviewedAt?: string | null
  createdAt?: string | null
}

export interface HiringComplianceFieldRule {
  fieldId: string
  label: string
  type: string
  required: boolean
  blocking: boolean
  requiresAdminReview?: boolean
  credentialType?: string
  documentType?: HiringDocumentType
}

export interface HiringComplianceCheckInput {
  candidateId: string
  employer: HiringEntity
  templateFields: HiringComplianceFieldRule[]
  responses: Record<string, unknown>
  documents: HiringStoredDocument[]
}

export interface HiringComplianceIssue {
  fieldId: string
  label: string
  severity: "warning" | "blocking"
  reason: string
  requiresAdminReview: boolean
}

export interface HiringComplianceResult {
  candidateId: string
  employer: HiringEntity
  complete: boolean
  blocked: boolean
  progress: number
  issues: HiringComplianceIssue[]
  requiredCount: number
  completedRequiredCount: number
  needsReviewCount: number
}

export interface UploadHiringDocumentArgs {
  actorUserId?: string
  token?: string
  candidateId?: string
  staffMemberId?: string
  employer?: HiringEntity
  fieldId?: string
  label?: string
  credentialType?: string
  documentType: HiringDocumentType
  file: File
  expiresAt?: string
}

export interface ReviewHiringDocumentArgs {
  actorUserId: string
  documentId: string
  employer: HiringEntity
  status: Extract<HiringDocumentStatus, "approved" | "rejected" | "needs_review">
  reviewNotes?: string
}
