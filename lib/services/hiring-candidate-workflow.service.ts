import { canManageHiring } from "@/lib/auth/hiring-permissions"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { buildWorkflowStepsFromCandidate, deriveWorkflowStageId } from "@/lib/hiring/candidate-workflow-utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringCandidate, HiringCandidateDocument, HiringCandidateWorkflowStep, WorkflowStageId } from "@/types/hiring-candidate-workflow"

const VALID_WORKFLOW_STAGES: WorkflowStageId[] = [
  "job_posted",
  "application_received",
  "screening",
  "invitation_sent",
  "onboarding_started",
  "onboarding_completed",
  "review_pending",
  "approved",
  "team_assigned",
]

function isValidWorkflowStage(value?: string | null): value is WorkflowStageId {
  return Boolean(value) && VALID_WORKFLOW_STAGES.includes(value as WorkflowStageId)
}

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
  job_application_id?: string | null
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
  assigned_manager_id?: string | null
  intended_event_id?: string | null
  intended_shift_id?: string | null
  role_template_id?: string | null
  onboarding_notification_sent_at?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
  approved_at?: string | null
  completed_at?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  job_posting_id?: string | null
  template_id?: string | null
  onboarding_responses?: Record<string, unknown> | null
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
    onboarding_template_id?: string | null
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
  field_id?: string | null
  label?: string | null
  document_type?: string | null
  file_name?: string | null
  mime_type?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  signed_url?: string | null
  status?: string | null
  uploaded_at?: string | null
  created_at?: string | null
  reviewed_at?: string | null
  reviewer_name?: string | null
  rejection_reason?: string | null
  review_notes?: string | null
  expires_at?: string | null
  required?: boolean | null
  blocking?: boolean | null
  metadata?: Record<string, unknown> | null
}

interface RawWorkflowRow {
  id: string
  current_stage?: string | null
  status?: string | null
  steps?: HiringCandidateWorkflowStep[] | null
}

function normalizeDocumentStatus(status?: string | null): HiringCandidateDocument["status"] {
  if (status === "verified" || status === "approved") return "verified"
  if (status === "rejected") return "rejected"
  if (status === "expired") return "expired"
  return "pending"
}

function readDocumentSide(metadata?: Record<string, unknown> | null): "front" | "back" | null {
  const side = metadata?.side
  if (side === "front" || side === "back") return side
  return null
}

function normalizeDocument(row: RawDocumentRow, signedUrl?: string | null): HiringCandidateDocument {
  const side = readDocumentSide(row.metadata)
  return {
    id: row.id,
    candidateId: row.candidate_id ?? "",
    label: row.label ?? row.document_type ?? "Document",
    documentType: row.document_type ?? "document",
    fieldId: row.field_id,
    side,
    fileName: row.file_name,
    mimeType: row.mime_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    signedUrl: signedUrl ?? row.signed_url ?? null,
    status: normalizeDocumentStatus(row.status),
    uploadedAt: row.uploaded_at ?? row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerName: row.reviewer_name,
    rejectionReason: row.review_notes ?? row.rejection_reason ?? null,
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

function deriveTemplateState(row: RawCandidateRow): "explicit" | "employerResolved" | "pending" {
  if (row.template_id) return "explicit"
  if (row.job_posting_templates?.onboarding_template_id) return "employerResolved"
  return "pending"
}

function deriveDeliveryStatus(row: RawCandidateRow): "not_sent" | "sent" | "in_progress" | "completed" {
  const status = row.status ?? ""
  const progress = Number(row.onboarding_progress ?? 0)
  if (status === "completed" || status === "submitted" || row.stage === "approved" || row.stage === "review" || progress >= 100) {
    return "completed"
  }
  if (progress > 0 || status === "in_progress") return "in_progress"
  if (row.invitation_token) return "sent"
  return "not_sent"
}

function normalizeCandidate(row: RawCandidateRow, employer: HiringEntity): HiringCandidate {
  const staffMember = row.staff_members?.[0]
  const employmentAssignment = row.employment_assignments?.[0]

  const candidate: HiringCandidate = {
    id: row.id,
    employer,
    userId: row.user_id,
    applicationId: row.job_application_id ?? row.application_id,
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
    documents: row.staff_documents?.map((document) => normalizeDocument(document)) ?? [],
    onboardingResponses:
      row.onboarding_responses && typeof row.onboarding_responses === "object"
        ? row.onboarding_responses
        : null,
    workflowSteps: [],
    roster: {
      staffMemberId: staffMember?.id,
      employmentAssignmentId: employmentAssignment?.id,
      workModeStatus: employmentAssignment?.status === "active" ? "active" : employmentAssignment?.status === "inactive" ? "inactive" : employmentAssignment?.id ? "pending" : "not_created",
      zone: employmentAssignment?.zone,
      startDate: employmentAssignment?.start_date,
    },
    templateState: deriveTemplateState(row),
    onboardingDeliveryStatus: deriveDeliveryStatus(row),
    onboardingNotificationSentAt: row.onboarding_notification_sent_at ?? null,
    assignment: {
      managerId: row.assigned_manager_id ?? null,
      managerName: row.assigned_manager_name ?? null,
      eventId: row.intended_event_id ?? null,
      shiftId: row.intended_shift_id ?? null,
      roleTemplateId: row.role_template_id ?? null,
    },
  }

  // Prefer a valid persisted stage; otherwise derive from candidate signals.
  const persistedStage = row.onboarding_workflows?.[0]?.current_stage
  const currentStage = isValidWorkflowStage(persistedStage)
    ? persistedStage
    : deriveWorkflowStageId(candidate)

  // Use persisted step records when present; otherwise synthesize from the stage.
  const persistedSteps = normalizeWorkflowSteps(row)
  candidate.workflowCurrentStage = currentStage
  candidate.workflowSteps = persistedSteps.length
    ? persistedSteps
    : buildWorkflowStepsFromCandidate(candidate, currentStage)

  return candidate
}

function collectIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

// Related hiring tables are linked by a mix of legacy and canonical keys (and some
// have no declared FK to candidates at all), so PostgREST embed joins are unreliable
// across environments. We fetch candidates first, then hydrate related rows in batch.
async function enrichCandidateRows(
  supabase: ReturnType<typeof createHiringServiceClient>,
  rows: RawCandidateRow[]
): Promise<RawCandidateRow[]> {
  const candidateIds = collectIds(rows.map((row) => row.id))
  const jobApplicationIds = collectIds(rows.map((row) => row.job_application_id))
  const jobPostingIds = collectIds(rows.map((row) => row.job_posting_id))
  const templateIds = collectIds(rows.map((row) => row.template_id))
  const userIds = collectIds(rows.map((row) => row.user_id))

  const [applications, jobPostings, templates, documents, workflows, staffMembers, assignments] = await Promise.all([
    jobApplicationIds.length
      ? supabase.from("job_applications").select("id,status,rating,created_at,form_responses").in("id", jobApplicationIds)
      : Promise.resolve({ data: [] as RawCandidateRow["applications"][] }),
    jobPostingIds.length
      ? supabase.from("job_posting_templates").select("id,title,department,position,location,employment_type,onboarding_template_id").in("id", jobPostingIds)
      : Promise.resolve({ data: [] as RawCandidateRow["job_posting_templates"][] }),
    templateIds.length
      ? supabase.from("staff_onboarding_templates").select("id,name,description,required_documents").in("id", templateIds)
      : Promise.resolve({ data: [] as RawCandidateRow["staff_onboarding_templates"][] }),
    candidateIds.length
      ? supabase.from("staff_documents").select("*").in("candidate_id", candidateIds)
      : Promise.resolve({ data: [] as RawDocumentRow[] }),
    candidateIds.length
      ? supabase.from("onboarding_workflows").select("id,current_stage,status,steps,candidate_id").in("candidate_id", candidateIds)
      : Promise.resolve({ data: [] as Array<RawWorkflowRow & { candidate_id?: string | null }> }),
    userIds.length
      ? supabase.from("staff_members").select("id,status,user_id").in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; status?: string | null; user_id?: string | null }> }),
    userIds.length
      ? supabase.from("employment_assignments").select("id,status,starts_at,user_id").in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; status?: string | null; starts_at?: string | null; user_id?: string | null }> }),
  ])

  const applicationById = new Map((applications.data ?? []).map((item) => [item!.id, item]))
  const jobPostingById = new Map((jobPostings.data ?? []).map((item) => [item!.id, item]))
  const templateById = new Map((templates.data ?? []).map((item) => [item!.id, item]))

  const documentsByCandidate = new Map<string, RawDocumentRow[]>()
  const documentRows = (documents.data ?? []) as RawDocumentRow[]
  const signedUrlEntries = await Promise.all(
    documentRows.map(async (doc) => {
      if (!doc.storage_bucket || !doc.storage_path) return [doc.id, null] as const
      const { data } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 60 * 30)
      return [doc.id, data?.signedUrl ?? null] as const
    })
  )
  const signedUrlByDocumentId = new Map(signedUrlEntries)

  for (const doc of documentRows) {
    if (!doc.candidate_id) continue
    const list = documentsByCandidate.get(doc.candidate_id) ?? []
    list.push({
      ...doc,
      signed_url: signedUrlByDocumentId.get(doc.id) ?? doc.signed_url ?? null,
    })
    documentsByCandidate.set(doc.candidate_id, list)
  }

  const workflowsByCandidate = new Map<string, RawWorkflowRow[]>()
  for (const workflow of workflows.data ?? []) {
    if (!workflow.candidate_id) continue
    const list = workflowsByCandidate.get(workflow.candidate_id) ?? []
    list.push(workflow)
    workflowsByCandidate.set(workflow.candidate_id, list)
  }

  const staffMembersByUser = new Map<string, Array<{ id: string; status?: string | null }>>()
  for (const member of staffMembers.data ?? []) {
    if (!member.user_id) continue
    const list = staffMembersByUser.get(member.user_id) ?? []
    list.push({ id: member.id, status: member.status })
    staffMembersByUser.set(member.user_id, list)
  }

  const assignmentsByUser = new Map<string, Array<{ id: string; status?: string | null; zone?: string | null; start_date?: string | null }>>()
  for (const assignment of assignments.data ?? []) {
    if (!assignment.user_id) continue
    const list = assignmentsByUser.get(assignment.user_id) ?? []
    list.push({ id: assignment.id, status: assignment.status, start_date: assignment.starts_at })
    assignmentsByUser.set(assignment.user_id, list)
  }

  return rows.map((row) => ({
    ...row,
    applications: row.job_application_id ? applicationById.get(row.job_application_id) ?? null : null,
    job_posting_templates: row.job_posting_id ? jobPostingById.get(row.job_posting_id) ?? null : null,
    staff_onboarding_templates: row.template_id ? templateById.get(row.template_id) ?? null : null,
    staff_documents: documentsByCandidate.get(row.id) ?? [],
    onboarding_workflows: workflowsByCandidate.get(row.id) ?? [],
    staff_members: row.user_id ? staffMembersByUser.get(row.user_id) ?? [] : [],
    employment_assignments: row.user_id ? assignmentsByUser.get(row.user_id) ?? [] : [],
  }))
}

export class HiringCandidateWorkflowService {
  static async listCandidates({ actorUserId, employer }: ListCandidatesArgs): Promise<{ data?: HiringCandidate[]; error?: string }> {
    const supabase = createHiringServiceClient()
    const permission = await canManageHiring({ supabase, userId: actorUserId, employer })
    if (!permission.ok || !permission.data.allowed) {
      return { error: permission.ok ? permission.data.reason ?? "Forbidden" : permission.error.message }
    }

    const { data, error } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)
      .order("created_at", { ascending: false })

    if (error) return { error: error.message }

    const rows = (data ?? []) as RawCandidateRow[]
    if (rows.length === 0) return { data: [] }

    const enrichedRows = await enrichCandidateRows(supabase, rows)
    return { data: enrichedRows.map((row) => normalizeCandidate(row, employer)) }
  }

  static async reviewDocument({ actorUserId, employer, documentId, status, rejectionReason }: ReviewCandidateDocumentArgs): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = createHiringServiceClient()
    const permission = await canManageHiring({ supabase, userId: actorUserId, employer })
    if (!permission.ok || !permission.data.allowed) {
      return { ok: false, error: permission.ok ? permission.data.reason ?? "Forbidden" : permission.error.message }
    }

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
