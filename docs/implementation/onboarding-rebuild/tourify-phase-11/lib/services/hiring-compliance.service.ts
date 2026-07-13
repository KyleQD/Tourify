import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  HiringComplianceCheckInput,
  HiringComplianceFieldRule,
  HiringComplianceIssue,
  HiringComplianceResult,
  HiringStoredDocument,
} from "@/types/hiring-compliance"
import type { HiringEntity } from "@/types/hiring-entity"
import { canManageHiring } from "@/lib/auth/hiring-permissions"

interface HiringComplianceServiceArgs {
  supabase: SupabaseClient
}

interface GetCandidateComplianceArgs {
  actorUserId: string
  candidateId: string
  employer: HiringEntity
}

function hasResponseValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

function getFieldResponse(responses: Record<string, unknown>, field: HiringComplianceFieldRule): unknown {
  return responses[field.fieldId]
}

function getMatchingDocument(
  documents: HiringStoredDocument[],
  field: HiringComplianceFieldRule
): HiringStoredDocument | undefined {
  return documents.find((document) => {
    if (field.fieldId && document.fieldId === field.fieldId) return true
    if (field.credentialType && document.credentialType === field.credentialType) return true
    if (field.documentType && document.documentType === field.documentType) return true
    return false
  })
}

function isDocumentField(field: HiringComplianceFieldRule): boolean {
  return ["file", "id_document"].includes(field.type) || Boolean(field.documentType || field.credentialType)
}

export class HiringComplianceService {
  private readonly supabase: SupabaseClient

  constructor({ supabase }: HiringComplianceServiceArgs) {
    this.supabase = supabase
  }

  evaluateCompliance(input: HiringComplianceCheckInput): HiringComplianceResult {
    const requiredFields = input.templateFields.filter((field) => field.required)
    const issues: HiringComplianceIssue[] = []
    let completedRequiredCount = 0
    let needsReviewCount = 0

    for (const field of requiredFields) {
      const matchingDocument = getMatchingDocument(input.documents, field)
      const responseValue = getFieldResponse(input.responses, field)
      const hasValue = isDocumentField(field)
        ? Boolean(matchingDocument && matchingDocument.status !== "rejected")
        : hasResponseValue(responseValue)

      if (!hasValue) {
        issues.push({
          fieldId: field.fieldId,
          label: field.label,
          severity: field.blocking ? "blocking" : "warning",
          reason: "Required onboarding item is missing.",
          requiresAdminReview: Boolean(field.requiresAdminReview),
        })
        continue
      }

      if (matchingDocument?.status === "expired") {
        issues.push({
          fieldId: field.fieldId,
          label: field.label,
          severity: field.blocking ? "blocking" : "warning",
          reason: "Uploaded document is expired.",
          requiresAdminReview: true,
        })
        continue
      }

      if (field.requiresAdminReview) {
        const approved = matchingDocument?.status === "approved"
        if (!approved) {
          needsReviewCount += 1
          issues.push({
            fieldId: field.fieldId,
            label: field.label,
            severity: field.blocking ? "blocking" : "warning",
            reason: "Required item needs admin review.",
            requiresAdminReview: true,
          })
          continue
        }
      }

      completedRequiredCount += 1
    }

    const requiredCount = requiredFields.length
    const blocked = issues.some((issue) => issue.severity === "blocking")
    const progress = requiredCount === 0 ? 100 : Math.round((completedRequiredCount / requiredCount) * 100)

    return {
      candidateId: input.candidateId,
      employer: input.employer,
      complete: !blocked && completedRequiredCount === requiredCount,
      blocked,
      progress,
      issues,
      requiredCount,
      completedRequiredCount,
      needsReviewCount,
    }
  }

  async getCandidateCompliance({
    actorUserId,
    candidateId,
    employer,
  }: GetCandidateComplianceArgs): Promise<{ data?: HiringComplianceResult; error?: string }> {
    const permission = await canManageHiring({ supabase: this.supabase, userId: actorUserId, employer })
    if (!permission.ok) return { error: permission.error.message }
    if (!permission.data.allowed) {
      return { error: permission.data.reason ?? "You do not have permission to view compliance." }
    }

    const { data: candidate, error: candidateError } = await this.supabase
      .from("staff_onboarding_candidates")
      .select("id, employer_entity_type, employer_entity_id, template_id, onboarding_responses, status")
      .eq("id", candidateId)
      .maybeSingle()

    if (candidateError) return { error: candidateError.message }
    if (!candidate) return { error: "Candidate not found." }
    if (candidate.employer_entity_type !== employer.entityType || candidate.employer_entity_id !== employer.entityId) {
      return { error: "Candidate does not belong to this employer scope." }
    }

    const { data: template } = await this.supabase
      .from("staff_onboarding_templates")
      .select("fields")
      .eq("id", candidate.template_id)
      .maybeSingle()

    const { data: documents } = await this.supabase
      .from("staff_documents")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)

    const templateFields = normalizeTemplateFields(template?.fields)
    const storedDocuments = (documents ?? []).map(mapStoredDocument)

    return {
      data: this.evaluateCompliance({
        candidateId,
        employer,
        templateFields,
        responses: (candidate.onboarding_responses as Record<string, unknown> | null) ?? {},
        documents: storedDocuments,
      }),
    }
  }
}

function normalizeTemplateFields(fields: unknown): HiringComplianceFieldRule[] {
  if (!Array.isArray(fields)) return []

  return fields.map((field: Record<string, unknown>, index) => ({
    fieldId: String(field.id ?? field.name ?? `field_${index}`),
    label: String(field.label ?? field.name ?? `Field ${index + 1}`),
    type: String(field.type ?? "text"),
    required: Boolean(field.required),
    blocking: Boolean(field.blocking ?? field.required),
    requiresAdminReview: Boolean(field.requiresAdminReview ?? field.requires_admin_review),
    credentialType: typeof field.credentialType === "string"
      ? field.credentialType
      : typeof field.credential_type === "string"
        ? field.credential_type
        : undefined,
    documentType: typeof field.documentType === "string"
      ? (field.documentType as HiringComplianceFieldRule["documentType"])
      : typeof field.document_type === "string"
        ? (field.document_type as HiringComplianceFieldRule["documentType"])
        : undefined,
  }))
}

function mapStoredDocument(row: Record<string, unknown>): HiringStoredDocument {
  return {
    id: String(row.id),
    employer: {
      entityType: row.employer_entity_type as HiringStoredDocument["employer"]["entityType"],
      entityId: String(row.employer_entity_id),
      displayName: "Employer",
    },
    candidateId: typeof row.candidate_id === "string" ? row.candidate_id : null,
    staffMemberId: typeof row.staff_member_id === "string" ? row.staff_member_id : null,
    userId: typeof row.user_id === "string" ? row.user_id : null,
    fieldId: typeof row.field_id === "string" ? row.field_id : null,
    label: String(row.label ?? row.file_name ?? "Document"),
    documentType: (row.document_type as HiringStoredDocument["documentType"]) ?? "general_document",
    credentialType: typeof row.credential_type === "string" ? row.credential_type : null,
    bucket: row.storage_bucket as HiringStoredDocument["bucket"],
    storagePath: String(row.storage_path ?? ""),
    fileName: String(row.file_name ?? "document"),
    mimeType: String(row.mime_type ?? "application/octet-stream"),
    sizeBytes: Number(row.size_bytes ?? 0),
    status: (row.status as HiringStoredDocument["status"]) ?? "uploaded",
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  }
}
