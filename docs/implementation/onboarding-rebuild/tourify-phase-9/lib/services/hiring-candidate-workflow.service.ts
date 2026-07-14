import { canManageHiring } from "@/lib/auth/hiring-permissions"
import { getHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringCandidate, HiringCandidateDocument, HiringCandidateWorkflowStep } from "@/types/hiring-candidate-workflow"

interface ListCandidatesArgs {
  actorUserId: string
  employer: HiringEntity
}

interface ReviewCandidateDocumentArgs {
  actorUserId: string
  employer: HiringEntity
  documentId: string
  status: "verified" | "rejected"
  rejectionReason?: string
}

interface RawCandidateRow {
  id: string
  user_id?: string | null
  application_id?: string | null
  invitation_id?: string | null
  invitation_token?: string | null
  name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  position?: string | null
  department?: string | null
  employment_type?: string | null
  status?: string | null
  stage?: string | null
  onboarding_progress?: number | null
  compliance_status?: string | null
  missing_required_count?: number | null
  blocking_issue_count?: number | null
  assigned_manager_name?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
  approved_at?: string | null
  completed_at?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  job_posting_id?: string | null
  template_id?: string | null
  applications?: {
    id: string
    status?: string | null
    rating?: number | null
    created_at?: string | null
    form_responses?: Record<string, unknown> | null
  } | null
  job_posting_templates?: {
    id: string
    title?: string | null
    department?: string | null
    position?: string | null
    location?: string | null
    employment_type?: string | null
  } | null
  staff_onboarding_templates?: {
    id: string
    name?: string | null
    description?: string | null
    required_documents?: string[] | null
  } | null
  staff_documents?: RawDocumentRow[] | null
  onboarding_workflows?: RawWorkflowRow[] | null
  staff_members?: Array<{ id: string; status?: string | null }> | null
  employment_assignments?: Array<{ id: string; status?: string | null; zone?: string | null; start_date?: string | null }> | null
}

interface RawDocumentRow {
  id: string
  candidate_id?: string | null
  label?: string | null
  document_type?: string | null
  file_name?: string | null
  mime_type?: string | null
  storage_path?: string | null
  signed_url?: string | null
  status?: string | null
  uploaded_at?: string | null
  reviewed_at?: string | null
  reviewer_name?: string | null
  rejection_reason?: string | null
  expires_at?: string | null
  required?: boolean | null
  blocking?: boolean | null
}

interface RawWorkflowRow {
  id: string
  current_stage?: string | null
  status?: string | null
  steps?: HiringCandidateWorkflowStep[] | null
}

function normalizeDocument(row: RawDocumentRow): HiringCandidateDocument {
  return {
    id: row.id,
    candidateId: row.candidate_id ?? "",
    label: row.label ?? row.document_type ?? "Document",
    documentType: row.document_type ?? "document",
    fileName: row.file_name,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    signedUrl: row.signed_url,
    status: row.status === "verified" || row.status === "rejected" || row.status === "expired" ? row.status : "pending",
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    reviewerName: row.reviewer_name,
    rejectionReason: row.rejection_reason,
    expiresAt: row.expires_at,
    required: Boolean(row.required),
    blocking: Boolean(row.blocking),
  }
}

function normalizeWorkflowSteps(row: RawCandidateRow): HiringCandidateWorkflowStep[] {
  const workflow = row.onboarding_workflows?.[0]
  if (Array.isArray(workflow?.steps) && workflow.steps.length > 0) return workflow.steps

  return []
}

function normalizeCandidate(row: RawCandidateRow, employer: HiringEntity): HiringCandidate {
  const staffMember = row.staff_members?.[0]
  const employmentAssignment = row.employment_assignments?.[0]

  return {
    id: row.id,
    employer,
    userId: row.user_id,
    applicationId: row.application_id,
    invitationId: row.invitation_id,
    invitationToken: row.invitation_token,
    onboardingUrl: row.invitation_token ? `/onboarding/hire/${row.invitation_token}` : null,
    name: row.name ?? row.full_name ?? row.email ?? "Unnamed candidate",
    email: row.email ?? "",
    phone: row.phone,
    avatarUrl: row.avatar_url,
    position: row.position ?? row.job_posting_templates?.position ?? row.job_posting_templates?.title,
    department: row.department ?? row.job_posting_templates?.department,
    employmentType: row.employment_type ?? row.job_posting_templates?.employment_type,
    status: row.status === "in_progress" || row.status === "submitted" || row.status === "completed" || row.status === "rejected" || row.status === "approved" ? row.status : "pending",
    stage: row.stage === "onboarding" || row.stage === "documents" || row.stage === "review" || row.stage === "approved" || row.stage === "rejected" ? row.stage : "invitation",
    onboardingProgress: Number(row.onboarding_progress ?? 0),
    complianceStatus: row.compliance_status === "pending_review" || row.compliance_status === "approved" || row.compliance_status === "blocked" ? row.compliance_status : "missing",
    missingRequiredCount: Number(row.missing_required_count ?? 0),
    blockingIssueCount: Number(row.blocking_issue_count ?? 0),
    assignedManagerName: row.assigned_manager_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    completedAt: row.completed_at,
    application: row.applications
      ? {
          id: row.applications.id,
          status: row.applications.status ?? "pending",
          rating: row.applications.rating,
          appliedAt: row.applications.created_at,
          formResponses: row.applications.form_responses,
        }
      : null,
    job: row.job_posting_templates
      ? {
          id: row.job_posting_templates.id,
          title: row.job_posting_templates.title,
          department: row.job_posting_templates.department,
          position: row.job_posting_templates.position,
          location: row.job_posting_templates.location,
          employmentType: row.job_posting_templates.employment_type,
        }
      : null,
    template: row.staff_onboarding_templates
      ? {
          id: row.staff_onboarding_templates.id,
          name: row.staff_onboarding_templates.name,
          description: row.staff_onboarding_templates.description,
          requiredDocuments: row.staff_onboarding_templates.required_documents ?? [],
        }
      : null,
    documents: row.staff_documents?.map(normalizeDocument) ?? [],
    workflowSteps: normalizeWorkflowSteps(row),
    roster: {
      staffMemberId: staffMember?.id,
      employmentAssignmentId: employmentAssignment?.id,
      workModeStatus: employmentAssignment?.status === "active" ? "active" : employmentAssignment?.status === "inactive" ? "inactive" : employmentAssignment?.id ? "pending" : "not_created",
      zone: employmentAssignment?.zone,
      startDate: employmentAssignment?.start_date,
    },
  }
}

export class HiringCandidateWorkflowService {
  static async listCandidates({ actorUserId, employer }: ListCandidatesArgs): Promise<{ data?: HiringCandidate[]; error?: string }> {
    const permission = await canManageHiring({ userId: actorUserId, employer })
    if (!permission.allowed) return { error: permission.reason ?? "You do not have permission to manage onboarding candidates." }

    const supabase = getHiringServiceClient()
    const query = supabase
      .from("staff_onboarding_candidates")
      .select(`
        *,
        applications:job_applications(id,status,rating,created_at,form_responses),
        job_posting_templates(id,title,department,position,location,employment_type),
        staff_onboarding_templates(id,name,description,required_documents),
        staff_documents(*),
        onboarding_workflows(id,current_stage,status,steps),
        staff_members(id,status),
        employment_assignments(id,status,zone,start_date)
      `)
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)
      .order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) return { error: error.message }

    return { data: ((data ?? []) as RawCandidateRow[]).map((row) => normalizeCandidate(row, employer)) }
  }

  static async reviewDocument({ actorUserId, employer, documentId, status, rejectionReason }: ReviewCandidateDocumentArgs): Promise<{ ok: true } | { ok: false; error: string }> {
    const permission = await canManageHiring({ userId: actorUserId, employer })
    if (!permission.allowed) return { ok: false, error: permission.reason ?? "You do not have permission to review documents." }

    const supabase = getHiringServiceClient()

    const { data: documentRow, error: documentError } = await supabase
      .from("staff_documents")
      .select("id,candidate_id,staff_onboarding_candidates!inner(employer_entity_type,employer_entity_id)")
      .eq("id", documentId)
      .single()

    if (documentError) return { ok: false, error: documentError.message }

    const candidateScope = Array.isArray(documentRow.staff_onboarding_candidates)
      ? documentRow.staff_onboarding_candidates[0]
      : documentRow.staff_onboarding_candidates

    if (candidateScope?.employer_entity_type !== employer.entityType || candidateScope?.employer_entity_id !== employer.entityId) {
      return { ok: false, error: "Document does not belong to the active hiring entity." }
    }

    const { error } = await supabase
      .from("staff_documents")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorUserId,
      })
      .eq("id", documentId)

    if (error) return { ok: false, error: error.message }

    await supabase.from("hiring_audit_events").insert({
      employer_entity_type: employer.entityType,
      employer_entity_id: employer.entityId,
      actor_id: actorUserId,
      event_type: status === "verified" ? "document_verified" : "document_rejected",
      subject_type: "staff_document",
      subject_id: documentId,
      metadata: { rejectionReason },
    })

    return { ok: true }
  }
}
