import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  HiringDocumentSide,
  HiringStoredDocument,
  ReviewHiringDocumentArgs,
  UploadHiringDocumentArgs,
} from "@/types/hiring-compliance"
import type { HiringEntity } from "@/types/hiring-entity"
import { canManageHiring } from "@/lib/auth/hiring-permissions"
import {
  buildHiringStoragePath,
  getUploadPolicy,
  validateHiringFile,
} from "@/lib/hiring/hiring-file-validation"

interface HiringOnboardingUploadServiceArgs {
  supabase: SupabaseClient
}

interface CandidateScopeRow {
  id: string
  user_id?: string | null
  applicant_id?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  venue_id?: string | null
  invitation_token?: string | null
  token?: string | null
}

interface InvitationRow {
  id: string
  token?: string | null
  invitation_token?: string | null
  candidate_id?: string | null
  user_id?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  venue_id?: string | null
  status?: string | null
  position_details?: Record<string, unknown> | null
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function getDocumentSideLabel({ label, side }: { label?: string; side?: HiringDocumentSide }): string | undefined {
  if (!side) return label
  const sideLabel = side === "front" ? "Front" : "Back"
  if (!label) return `Government ID — ${sideLabel}`
  if (/front|back/i.test(label)) return label
  return `${label} — ${sideLabel}`
}

function readDocumentSide(metadata: unknown): HiringDocumentSide | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const side = (metadata as Record<string, unknown>).side
  if (side === "front" || side === "back") return side
  return null
}

/**
 * Staging DB uses a legacy document_type enum:
 * ['id','tax_forms','contract','training_certificate','background_check','drug_test','medical_clearance','other']
 * Map from the canonical schema values to staging-compatible values.
 */
function toLegacyDocumentType(documentType: string): string {
  const map: Record<string, string> = {
    id_document: "id",
    certification: "training_certificate",
    waiver: "contract",
    tax_document: "tax_forms",
    payment_document: "other",
    license: "id",
    general_document: "other",
  }
  return map[documentType] ?? documentType
}

function mapDocumentRow(row: Record<string, unknown>, employer: HiringEntity): HiringStoredDocument {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null

  return {
    id: String(row.id),
    employer,
    candidateId: typeof row.candidate_id === "string" ? row.candidate_id : null,
    staffMemberId: typeof row.staff_member_id === "string" ? row.staff_member_id : null,
    userId: typeof row.user_id === "string" ? row.user_id : null,
    fieldId: typeof row.field_id === "string" ? row.field_id : null,
    label: String(row.label ?? row.file_name ?? "Document"),
    documentType: (row.document_type as HiringStoredDocument["documentType"]) ?? "general_document",
    credentialType: typeof row.credential_type === "string" ? row.credential_type : null,
    side: readDocumentSide(metadata),
    bucket: row.storage_bucket as HiringStoredDocument["bucket"],
    storagePath: String(row.storage_path),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes ?? 0),
    status: (row.status as HiringStoredDocument["status"]) ?? "uploaded",
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    metadata,
  }
}

function getEmployerFromCandidate(candidate: CandidateScopeRow): HiringEntity | null {
  const entityType = candidate.employer_entity_type ?? (candidate.venue_id ? "venue" : null)
  const entityId = candidate.employer_entity_id ?? candidate.venue_id ?? null
  if (!entityType || !entityId) return null

  return {
    entityType,
    entityId,
    displayName: "Employer",
  }
}

function getEmployerFromInvitation(invitation: InvitationRow): HiringEntity | null {
  const entityType = invitation.employer_entity_type ?? (invitation.venue_id ? "venue" : null)
  const entityId = invitation.employer_entity_id ?? invitation.venue_id ?? null
  if (!entityType || !entityId) return null

  return {
    entityType,
    entityId,
    displayName: "Employer",
  }
}

export class HiringOnboardingUploadService {
  private readonly supabase: SupabaseClient

  constructor({ supabase }: HiringOnboardingUploadServiceArgs) {
    this.supabase = supabase
  }

  async uploadDocument(args: UploadHiringDocumentArgs): Promise<{ data?: HiringStoredDocument; error?: string }> {
    const context = await this.resolveUploadContext(args)
    if (context.error || !context.employer) return { error: context.error ?? "Unable to resolve upload scope." }

    const arrayBuffer = await args.file.arrayBuffer()
    const sizeBytes = args.file.size
    const mimeType = args.file.type || "application/octet-stream"
    const validation = validateHiringFile({
      fileName: args.file.name,
      mimeType,
      sizeBytes,
      documentType: args.documentType,
    })

    if (!validation.valid || !validation.bucket) return { error: validation.error ?? "Invalid file." }

    const storagePath = buildHiringStoragePath({
      employerEntityType: context.employer.entityType,
      employerEntityId: context.employer.entityId,
      candidateId: context.candidateId,
      staffMemberId: args.staffMemberId,
      userId: context.userId ?? undefined,
      fileName: args.file.name,
      documentType: args.documentType,
    })

    const { error: uploadError } = await this.supabase.storage
      .from(validation.bucket)
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) return { error: uploadError.message }

    // Resolve a venue_team_member id when employer is a venue (legacy FK: staff_documents.staff_member_id → venue_team_members)
    // The FK expects the *candidate/worker* team member id, not the actor/employer.
    let resolvedStaffMemberId = args.staffMemberId ?? null
    let candidateUserId: string | null = null
    let lookupUserId: string | null = null
    let vtmLookupAttempted = false
    let vtmFound = false
    if (!resolvedStaffMemberId && context.employer.entityType === "venue") {
      // Try by candidate's user_id first, then by actor
      candidateUserId = await this.getCandidateUserId(context.candidateId)
      lookupUserId = candidateUserId ?? context.userId ?? null
      if (lookupUserId) {
        vtmLookupAttempted = true
        const { data: vtm } = await this.supabase
          .from("venue_team_members")
          .select("id")
          .eq("venue_id", context.employer.entityId)
          .eq("user_id", lookupUserId)
          .maybeSingle()
        if (vtm) {
          vtmFound = true
          resolvedStaffMemberId = (vtm as Record<string, unknown>).id as string
        }
      }
    }

    const documentLabel = getDocumentSideLabel({ label: args.label, side: args.side }) ?? args.file.name

    const row = {
      employer_entity_type: context.employer.entityType,
      employer_entity_id: context.employer.entityId,
      venue_id: context.employer.entityType === "venue" ? context.employer.entityId : null,
      candidate_id: context.candidateId ?? null,
      staff_member_id: resolvedStaffMemberId,
      user_id: context.userId ?? null,
      owner_user_id: context.userId ?? null,
      field_id: args.fieldId ?? null,
      label: documentLabel,
      // Legacy NOT NULL columns: provide safe defaults for staging schema compatibility
      document_name: documentLabel,
      file_url: storagePath,
      upload_date: new Date().toISOString(),
      document_type: toLegacyDocumentType(args.documentType),
      credential_type: args.credentialType ?? null,
      storage_bucket: validation.bucket,
      storage_path: storagePath,
      file_name: args.file.name,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      status: "uploaded",
      expires_at: args.expiresAt ?? null,
      metadata: {
        token_upload: Boolean(args.token),
        upload_source: args.token ? "token_onboarding" : "admin_or_worker_session",
        ...(args.side ? { side: args.side } : {}),
      },
    }


    const { data, error } = await this.supabase
      .from("staff_documents")
      .insert(row)
      .select("*")
      .single()

    if (error) {
      await this.supabase.storage.from(validation.bucket).remove([storagePath])
      return { error: error.message }
    }


    const signedUrl = await this.createSignedUrl({
      bucket: validation.bucket,
      storagePath,
    })

    return {
      data: {
        ...mapDocumentRow(data as Record<string, unknown>, context.employer),
        signedUrl,
      },
    }
  }

  async reviewDocument(args: ReviewHiringDocumentArgs): Promise<{ data?: HiringStoredDocument; error?: string }> {
    const permission = await canManageHiring({
      supabase: this.supabase,
      userId: args.actorUserId,
      employer: args.employer,
    })
    if (!permission.ok) return { error: permission.error.message }
    if (!permission.data.allowed) return { error: permission.data.reason ?? "You do not have permission to review documents." }

    const { data: existing, error: existingError } = await this.supabase
      .from("staff_documents")
      .select("*")
      .eq("id", args.documentId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (existingError) return { error: existingError.message }
    if (!existing) return { error: "Document not found for this employer." }

    const { data, error } = await this.supabase
      .from("staff_documents")
      .update({
        status: args.status,
        review_notes: args.reviewNotes ?? null,
        reviewed_by: args.actorUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", args.documentId)
      .select("*")
      .single()

    if (error) return { error: error.message }

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      venue_id: args.employer.entityType === "venue" ? args.employer.entityId : null,
      actor_user_id: args.actorUserId,
      event_type: "document_reviewed",
      subject_type: "staff_document",
      subject_id: args.documentId,
      metadata: {
        status: args.status,
        review_notes: args.reviewNotes ?? null,
      },
    })

    return { data: mapDocumentRow(data as Record<string, unknown>, args.employer) }
  }

  private async resolveUploadContext(args: UploadHiringDocumentArgs): Promise<{
    employer?: HiringEntity
    candidateId?: string
    userId?: string | null
    error?: string
  }> {
    if (args.token) {
      return this.resolveTokenContext(args.token)
    }

    if (!args.actorUserId) return { error: "A signed-in user or onboarding token is required." }
    if (!args.employer) return { error: "Employer scope is required for authenticated uploads." }

    const permission = await canManageHiring({
      supabase: this.supabase,
      userId: args.actorUserId,
      employer: args.employer,
    })
    if (!permission.ok) return { error: permission.error.message }
    if (!permission.data.allowed) return { error: permission.data.reason ?? "You do not have permission to upload documents." }

    return {
      employer: args.employer,
      candidateId: args.candidateId,
      userId: args.actorUserId,
    }
  }

  private async getCandidateUserId(candidateId?: string | null): Promise<string | null> {
    if (!candidateId) return null
    const { data } = await this.supabase
      .from("staff_onboarding_candidates")
      .select("user_id")
      .eq("id", candidateId)
      .maybeSingle()
    return data ? (data as Record<string, unknown>).user_id as string | null : null
  }

  private async resolveTokenContext(token: string): Promise<{
    employer?: HiringEntity
    candidateId?: string
    userId?: string | null
    error?: string
  }> {
    const { data: invitation, error: invitationError } = await this.supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle()

    if (invitationError) return { error: invitationError.message }
    if (!invitation) return { error: "Invalid or expired onboarding token." }
    if (["completed", "revoked", "expired"].includes(String(invitation.status ?? ""))) {
      return { error: "This onboarding token is no longer active." }
    }

    const invitationRow = invitation as InvitationRow
    let employer = getEmployerFromInvitation(invitationRow)
    let userId = invitationRow.user_id ?? null

    const invitationRecord = invitation as Record<string, unknown>
    const directCandidateId = readString(invitationRecord, "candidate_id")
    const positionDetails = invitationRow.position_details
    const nestedCandidateId =
      positionDetails && typeof positionDetails === "object"
        ? readString(positionDetails, "candidate_id")
        : null

    let candidateId = directCandidateId ?? nestedCandidateId
    let candidate: CandidateScopeRow | null = null

    if (candidateId) {
      const { data, error: candidateError } = await this.supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("id", candidateId)
        .maybeSingle()

      if (candidateError) return { error: candidateError.message }
      candidate = data ? (data as CandidateScopeRow) : null
    }

    if (!candidate) {
      const { data, error: candidateByTokenError } = await this.supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("invitation_token", token)
        .maybeSingle()

      if (candidateByTokenError) return { error: candidateByTokenError.message }
      if (data) {
        candidate = data as CandidateScopeRow
        candidateId = candidate.id
      }
    }

    if (candidate) {
      employer = getEmployerFromCandidate(candidate) ?? employer
      userId = candidate.user_id ?? candidate.applicant_id ?? userId
    }

    if (!employer) return { error: "Unable to resolve employer scope from onboarding token." }

    return {
      employer,
      candidateId: candidateId ?? undefined,
      userId,
    }
  }

  private async createSignedUrl({
    bucket,
    storagePath,
  }: {
    bucket: string
    storagePath: string
  }): Promise<string | null> {
    const policy = getUploadPolicy("general_document")
    void policy

    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 10)
    if (error) return null
    return data.signedUrl
  }
}
