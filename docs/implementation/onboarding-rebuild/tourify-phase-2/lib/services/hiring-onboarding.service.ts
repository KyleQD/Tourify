import type { SupabaseClient } from "@supabase/supabase-js"
import type { HiringActor, HiringEntity } from "@/types/hiring-entity"
import type {
  ApplicationDecisionInput,
  CreateJobPostingInput,
  DashboardStats,
  DirectInviteInput,
  HiringListFilters,
  HiringServiceResult,
  TokenOnboardingPayload,
} from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"
import { assertCanManageHiring } from "@/lib/auth/hiring-permissions"

interface ServiceArgs {
  supabase: SupabaseClient
}

interface EmployerScopedArgs extends ServiceArgs {
  actor: HiringActor
}

interface ListByEmployerArgs extends ServiceArgs {
  actor: HiringActor
  filters?: HiringListFilters
}

interface CreateJobPostingArgs extends EmployerScopedArgs {
  data: CreateJobPostingInput
}

interface GetDashboardStatsArgs extends EmployerScopedArgs {}

interface GetTokenPayloadArgs extends ServiceArgs {
  token: string
}

interface SubmitTokenOnboardingArgs extends ServiceArgs {
  token: string
  responses: Record<string, unknown>
  completedByUserId?: string
}

interface ListRosterArgs extends ListByEmployerArgs {}

function getEmployerColumns(employer: HiringEntity): Record<string, unknown> {
  return {
    employer_entity_type: employer.entityType,
    employer_entity_id: employer.entityId,
    venue_id: employer.entityType === "venue" ? employer.entityId : employer.scope?.venueId ?? null,
  }
}

function generateInvitationToken(): string {
  return crypto.randomUUID().replaceAll("-", "")
}

function getNowIso(): string {
  return new Date().toISOString()
}

function normalizeLimit(limit?: number): number {
  if (!limit) return 50
  if (limit < 1) return 25
  if (limit > 250) return 250
  return limit
}

function normalizeOffset(offset?: number): number {
  if (!offset || offset < 0) return 0
  return offset
}

async function insertHiringAuditEvent({
  supabase,
  actor,
  eventType,
  entityTable,
  entityId,
  metadata,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  eventType: string
  entityTable: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  await supabase.from("hiring_audit_events").insert({
    ...getEmployerColumns(actor.employer),
    actor_id: actor.userId,
    event_type: eventType,
    entity_table: entityTable,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
    created_at: getNowIso(),
  })
}

async function countByStatus({
  supabase,
  tableName,
  employer,
  statusColumn = "status",
  statuses,
}: {
  supabase: SupabaseClient
  tableName: string
  employer: HiringEntity
  statusColumn?: string
  statuses: string[]
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const { count } = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true })
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)
      .eq(statusColumn, status)

    counts[status] = count ?? 0
  }

  return counts
}

async function getTotalCount({
  supabase,
  tableName,
  employer,
}: {
  supabase: SupabaseClient
  tableName: string
  employer: HiringEntity
}): Promise<number> {
  const { count } = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)

  return count ?? 0
}

async function getApplicationById({
  supabase,
  applicationId,
  employer,
}: {
  supabase: SupabaseClient
  applicationId: string
  employer: HiringEntity
}): Promise<HiringServiceResult<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .maybeSingle()

  if (error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to load application.", details: error })
  }

  if (!data) {
    return fail({ code: "NOT_FOUND", message: "Application was not found for this employer." })
  }

  return ok(data as Record<string, unknown>)
}

async function getOrCreateCandidateFromApplication({
  supabase,
  actor,
  application,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  application: Record<string, unknown>
}): Promise<HiringServiceResult<Record<string, unknown>>> {
  const applicationId = String(application.id)

  const existing = await supabase
    .from("staff_onboarding_candidates")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle()

  if (existing.error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to check existing candidate.", details: existing.error })
  }

  if (existing.data) return ok(existing.data as Record<string, unknown>)

  const applicantName =
    (typeof application.applicant_name === "string" && application.applicant_name) ||
    (typeof application.name === "string" && application.name) ||
    "Pending applicant"

  const insertPayload = {
    ...getEmployerColumns(actor.employer),
    application_id: applicationId,
    applicant_id: application.applicant_id ?? application.user_id ?? null,
    job_posting_id: application.job_posting_id ?? null,
    name: applicantName,
    email: application.applicant_email ?? application.email ?? null,
    phone: application.applicant_phone ?? application.phone ?? null,
    position: application.position ?? application.job_position ?? null,
    department: application.department ?? null,
    employment_type: application.employment_type ?? "contractor",
    status: "pending",
    stage: "invitation",
    onboarding_progress: 0,
    created_at: getNowIso(),
    updated_at: getNowIso(),
  }

  const { data, error } = await supabase
    .from("staff_onboarding_candidates")
    .insert(insertPayload)
    .select("*")
    .single()

  if (error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to create onboarding candidate.", details: error })
  }

  await insertHiringAuditEvent({
    supabase,
    actor,
    eventType: "candidate_created_from_application",
    entityTable: "staff_onboarding_candidates",
    entityId: String(data.id),
    metadata: { applicationId },
  })

  return ok(data as Record<string, unknown>)
}

async function createInvitationForCandidate({
  supabase,
  actor,
  candidate,
  templateId,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  candidate: Record<string, unknown>
  templateId?: string | null
}): Promise<HiringServiceResult<Record<string, unknown>>> {
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()

  const { data, error } = await supabase
    .from("staff_invitations")
    .insert({
      ...getEmployerColumns(actor.employer),
      candidate_id: candidate.id,
      application_id: candidate.application_id ?? null,
      job_posting_id: candidate.job_posting_id ?? null,
      template_id: templateId ?? candidate.template_id ?? null,
      token,
      email: candidate.email ?? null,
      status: "pending",
      expires_at: expiresAt,
      created_by: actor.userId,
      created_at: getNowIso(),
      updated_at: getNowIso(),
    })
    .select("*")
    .single()

  if (error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to create staff invitation.", details: error })
  }

  const updateResult = await supabase
    .from("staff_onboarding_candidates")
    .update({
      invitation_token: token,
      stage: "invitation",
      updated_at: getNowIso(),
    })
    .eq("id", candidate.id)

  if (updateResult.error) {
    return fail({
      code: "DATABASE_ERROR",
      message: "Invitation was created but candidate token stamping failed.",
      details: updateResult.error,
    })
  }

  await insertHiringAuditEvent({
    supabase,
    actor,
    eventType: "staff_invitation_created",
    entityTable: "staff_invitations",
    entityId: String(data.id),
    metadata: { candidateId: candidate.id, tokenCreated: true },
  })

  return ok(data as Record<string, unknown>)
}

async function bootstrapWorkflowForCandidate({
  supabase,
  actor,
  candidate,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  candidate: Record<string, unknown>
}): Promise<HiringServiceResult<Record<string, unknown> | null>> {
  const existing = await supabase
    .from("onboarding_workflows")
    .select("*")
    .eq("candidate_id", candidate.id)
    .maybeSingle()

  if (existing.error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to check onboarding workflow.", details: existing.error })
  }

  if (existing.data) return ok(existing.data as Record<string, unknown>)

  const { data, error } = await supabase
    .from("onboarding_workflows")
    .insert({
      ...getEmployerColumns(actor.employer),
      candidate_id: candidate.id,
      job_posting_id: candidate.job_posting_id ?? null,
      current_stage: "invitation_sent",
      status: "active",
      steps: [],
      created_at: getNowIso(),
      updated_at: getNowIso(),
    })
    .select("*")
    .single()

  if (error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to bootstrap onboarding workflow.", details: error })
  }

  return ok(data as Record<string, unknown>)
}

async function createEmploymentAssignmentShell({
  supabase,
  actor,
  application,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  application: Record<string, unknown>
}): Promise<HiringServiceResult<Record<string, unknown> | null>> {
  const userId = application.applicant_id ?? application.user_id
  if (!userId || typeof userId !== "string") return ok(null)

  const payload = {
    ...getEmployerColumns(actor.employer),
    user_id: userId,
    application_id: application.id,
    job_posting_id: application.job_posting_id ?? null,
    position: application.position ?? application.job_position ?? null,
    department: application.department ?? null,
    status: "pending_onboarding",
    source: "hiring_onboarding",
    permissions: {},
    created_at: getNowIso(),
    updated_at: getNowIso(),
  }

  const { data, error } = await supabase
    .from("employment_assignments")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    return fail({
      code: "DATABASE_ERROR",
      message: "Application was approved but employment assignment shell failed.",
      details: error,
    })
  }

  return ok(data as Record<string, unknown>)
}

async function resolveTemplateForCandidate({
  supabase,
  candidate,
}: {
  supabase: SupabaseClient
  candidate: Record<string, unknown>
}): Promise<Record<string, unknown> | null> {
  const explicitTemplateId = candidate.template_id

  if (typeof explicitTemplateId === "string" && explicitTemplateId.length > 0) {
    const { data } = await supabase
      .from("staff_onboarding_templates")
      .select("*")
      .eq("id", explicitTemplateId)
      .maybeSingle()

    if (data) return data as Record<string, unknown>
  }

  const employerEntityType = candidate.employer_entity_type
  const employerEntityId = candidate.employer_entity_id

  if (typeof employerEntityType === "string" && typeof employerEntityId === "string") {
    const query = supabase
      .from("staff_onboarding_templates")
      .select("*")
      .eq("employer_entity_type", employerEntityType)
      .eq("employer_entity_id", employerEntityId)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle()

    const { data } = await query
    if (data) return data as Record<string, unknown>
  }

  return null
}

export const HiringOnboardingService = {
  async createJobPosting({ supabase, actor, data }: CreateJobPostingArgs): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const payload = {
      ...getEmployerColumns(actor.employer),
      title: data.title,
      description: data.description,
      department: data.department,
      position: data.position,
      employment_type: data.employment_type,
      location: data.location ?? null,
      role_type: data.role_type ?? null,
      number_of_positions: data.number_of_positions ?? 1,
      salary_range: data.salary_range ?? null,
      requirements: data.requirements ?? [],
      responsibilities: data.responsibilities ?? [],
      benefits: data.benefits ?? [],
      skills: data.skills ?? [],
      experience_level: data.experience_level ?? null,
      remote: data.remote ?? false,
      urgent: data.urgent ?? false,
      required_certifications: data.required_certifications ?? [],
      application_form_template: data.application_form_template ?? { fields: [] },
      onboarding_template_id: data.onboarding_template_id ?? null,
      status: data.status ?? "draft",
      published_at: data.status === "published" ? getNowIso() : null,
      created_by: actor.userId,
      created_at: getNowIso(),
      updated_at: getNowIso(),
    }

    const { data: inserted, error } = await supabase
      .from("job_posting_templates")
      .insert(payload)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to create job posting.", details: error })

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "job_posting_created",
      entityTable: "job_posting_templates",
      entityId: String(inserted.id),
      metadata: { status: payload.status },
    })

    return ok(inserted as Record<string, unknown>)
  },

  async listJobPostings({ supabase, actor, filters }: ListByEmployerArgs): Promise<HiringServiceResult<Record<string, unknown>[]>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const limit = normalizeLimit(filters?.limit)
    const offset = normalizeOffset(filters?.offset)

    let query = supabase
      .from("job_posting_templates")
      .select("*")
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status) query = query.eq("status", filters.status)
    if (filters?.department) query = query.eq("department", filters.department)
    if (filters?.position) query = query.eq("position", filters.position)
    if (filters?.query) query = query.ilike("title", `%${filters.query}%`)

    const { data, error } = await query

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to list job postings.", details: error })

    return ok((data ?? []) as Record<string, unknown>[])
  },

  async listApplications({ supabase, actor, filters }: ListByEmployerArgs): Promise<HiringServiceResult<Record<string, unknown>[]>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const limit = normalizeLimit(filters?.limit)
    const offset = normalizeOffset(filters?.offset)

    let query = supabase
      .from("job_applications")
      .select("*")
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status) query = query.eq("status", filters.status)
    if (filters?.jobPostingId) query = query.eq("job_posting_id", filters.jobPostingId)

    const { data, error } = await query

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to list applications.", details: error })

    return ok((data ?? []) as Record<string, unknown>[])
  },

  async approveApplication({
    supabase,
    applicationId,
    actor,
    note,
  }: ServiceArgs & ApplicationDecisionInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const applicationResult = await getApplicationById({ supabase, applicationId, employer: actor.employer })
    if (!applicationResult.ok) return applicationResult

    const application = applicationResult.data
    const currentStatus = typeof application.status === "string" ? application.status : "pending"

    if (["rejected", "withdrawn"].includes(currentStatus)) {
      return fail({
        code: "CONFLICT",
        message: `Application cannot be approved from status ${currentStatus}.`,
      })
    }

    const updateResult = await supabase
      .from("job_applications")
      .update({
        status: "approved",
        reviewed_by: actor.userId,
        reviewed_at: getNowIso(),
        decision_note: note ?? null,
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (updateResult.error) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to approve application.", details: updateResult.error })
    }

    const candidateResult = await getOrCreateCandidateFromApplication({
      supabase,
      actor,
      application: updateResult.data as Record<string, unknown>,
    })
    if (!candidateResult.ok) return candidateResult

    const invitationResult = await createInvitationForCandidate({
      supabase,
      actor,
      candidate: candidateResult.data,
      templateId:
        typeof updateResult.data.onboarding_template_id === "string" ? updateResult.data.onboarding_template_id : null,
    })
    if (!invitationResult.ok) return invitationResult

    const workflowResult = await bootstrapWorkflowForCandidate({ supabase, actor, candidate: candidateResult.data })
    if (!workflowResult.ok) return workflowResult

    const assignmentResult = await createEmploymentAssignmentShell({
      supabase,
      actor,
      application: updateResult.data as Record<string, unknown>,
    })
    if (!assignmentResult.ok) return assignmentResult

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "application_approved",
      entityTable: "job_applications",
      entityId: applicationId,
      metadata: {
        candidateId: candidateResult.data.id,
        invitationId: invitationResult.data.id,
        workflowId: workflowResult.data?.id,
        employmentAssignmentId: assignmentResult.data?.id,
      },
    })

    return ok({
      application: updateResult.data,
      candidate: candidateResult.data,
      invitation: invitationResult.data,
      workflow: workflowResult.data,
      employmentAssignment: assignmentResult.data,
    })
  },

  async rejectApplication({
    supabase,
    applicationId,
    actor,
    reason,
  }: ServiceArgs & ApplicationDecisionInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    if (!reason?.trim()) {
      return fail({ code: "VALIDATION_ERROR", message: "A rejection reason is required." })
    }

    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("job_applications")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewed_by: actor.userId,
        reviewed_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to reject application.", details: error })

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "application_rejected",
      entityTable: "job_applications",
      entityId: applicationId,
      metadata: { reason },
    })

    return ok(data as Record<string, unknown>)
  },

  async waitlistApplication({
    supabase,
    applicationId,
    actor,
    note,
  }: ServiceArgs & ApplicationDecisionInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("job_applications")
      .update({
        status: "waitlisted",
        decision_note: note ?? null,
        reviewed_by: actor.userId,
        reviewed_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to waitlist application.", details: error })

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "application_waitlisted",
      entityTable: "job_applications",
      entityId: applicationId,
      metadata: { note },
    })

    return ok(data as Record<string, unknown>)
  },

  async createDirectInvite({
    supabase,
    actor,
    email,
    name,
    phone,
    position,
    department,
    employmentType,
    templateId,
    jobPostingId,
  }: ServiceArgs & DirectInviteInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data: candidate, error } = await supabase
      .from("staff_onboarding_candidates")
      .insert({
        ...getEmployerColumns(actor.employer),
        application_id: null,
        job_posting_id: jobPostingId ?? null,
        name: name ?? email,
        email,
        phone: phone ?? null,
        position,
        department: department ?? null,
        employment_type: employmentType ?? "contractor",
        template_id: templateId ?? null,
        status: "pending",
        stage: "invitation",
        onboarding_progress: 0,
        created_by: actor.userId,
        created_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to create direct invite candidate.", details: error })

    const invitationResult = await createInvitationForCandidate({
      supabase,
      actor,
      candidate: candidate as Record<string, unknown>,
      templateId,
    })
    if (!invitationResult.ok) return invitationResult

    const workflowResult = await bootstrapWorkflowForCandidate({
      supabase,
      actor,
      candidate: candidate as Record<string, unknown>,
    })
    if (!workflowResult.ok) return workflowResult

    return ok({ candidate, invitation: invitationResult.data, workflow: workflowResult.data })
  },

  async getTokenOnboardingPayload({ supabase, token }: GetTokenPayloadArgs): Promise<HiringServiceResult<TokenOnboardingPayload>> {
    if (!token?.trim()) return fail({ code: "BAD_REQUEST", message: "Onboarding token is required." })

    const { data: invitation, error: invitationError } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle()

    if (invitationError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding invitation.", details: invitationError })
    }

    if (!invitation) return fail({ code: "NOT_FOUND", message: "Onboarding invitation was not found." })

    if (invitation.status === "completed") {
      return fail({ code: "CONFLICT", message: "This onboarding invitation has already been completed." })
    }

    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
      return fail({ code: "CONFLICT", message: "This onboarding invitation has expired." })
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", invitation.candidate_id)
      .maybeSingle()

    if (candidateError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: candidateError })
    }

    if (!candidate) return fail({ code: "NOT_FOUND", message: "Onboarding candidate was not found." })

    const template = await resolveTemplateForCandidate({ supabase, candidate: candidate as Record<string, unknown> })

    const { data: existingResponse } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return ok({
      invitation: invitation as Record<string, unknown>,
      candidate: candidate as Record<string, unknown>,
      employer: {
        entityType: candidate.employer_entity_type,
        entityId: candidate.employer_entity_id,
        displayName: String(candidate.employer_display_name ?? invitation.employer_display_name ?? "Hiring team"),
        scope: {
          venueId: typeof candidate.venue_id === "string" ? candidate.venue_id : undefined,
        },
      } as HiringEntity,
      template,
      existingResponses: existingResponse ? (existingResponse as Record<string, unknown>) : null,
      progress: Number(candidate.onboarding_progress ?? 0),
    })
  },

  async submitTokenOnboarding({
    supabase,
    token,
    responses,
    completedByUserId,
  }: SubmitTokenOnboardingArgs): Promise<HiringServiceResult<Record<string, unknown>>> {
    const payloadResult = await this.getTokenOnboardingPayload({ supabase, token })
    if (!payloadResult.ok) return payloadResult

    const { invitation, candidate, employer } = payloadResult.data
    const candidateId = String(candidate.id)
    const userId = completedByUserId || (typeof candidate.applicant_id === "string" ? candidate.applicant_id : null)

    const { data: responseRow, error: responseError } = await supabase
      .from("onboarding_responses")
      .insert({
        candidate_id: candidateId,
        invitation_id: invitation.id,
        user_id: userId,
        responses,
        submitted_at: getNowIso(),
        created_at: getNowIso(),
      })
      .select("*")
      .single()

    if (responseError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to save onboarding responses.", details: responseError })
    }

    const candidateUpdate = await supabase
      .from("staff_onboarding_candidates")
      .update({
        status: "completed",
        stage: "approved",
        onboarding_progress: 100,
        onboarding_responses: responses,
        completed_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .eq("id", candidateId)
      .select("*")
      .single()

    if (candidateUpdate.error) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to mark candidate as completed.", details: candidateUpdate.error })
    }

    await supabase
      .from("staff_invitations")
      .update({ status: "completed", completed_at: getNowIso(), updated_at: getNowIso() })
      .eq("id", invitation.id)

    let staffMember: Record<string, unknown> | null = null
    if (userId) {
      const staffResult = await supabase
        .from("staff_members")
        .insert({
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
          venue_id: employer.entityType === "venue" ? employer.entityId : employer.scope?.venueId ?? null,
          user_id: userId,
          onboarding_candidate_id: candidateId,
          application_id: candidate.application_id ?? null,
          position: candidate.position ?? null,
          department: candidate.department ?? null,
          employment_type: candidate.employment_type ?? "contractor",
          status: "active",
          compliance_status: "submitted",
          started_at: getNowIso(),
          created_at: getNowIso(),
          updated_at: getNowIso(),
        })
        .select("*")
        .single()

      if (staffResult.error) {
        return fail({ code: "DATABASE_ERROR", message: "Onboarding saved but roster creation failed.", details: staffResult.error })
      }

      staffMember = staffResult.data as Record<string, unknown>

      await supabase
        .from("employment_assignments")
        .update({ status: "active", updated_at: getNowIso() })
        .eq("user_id", userId)
        .eq("employer_entity_type", employer.entityType)
        .eq("employer_entity_id", employer.entityId)
        .eq("source", "hiring_onboarding")
    }

    return ok({
      response: responseRow,
      candidate: candidateUpdate.data,
      staffMember,
    })
  },

  async getDashboardStats({ supabase, actor }: GetDashboardStatsArgs): Promise<HiringServiceResult<DashboardStats>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const [jobTotal, applicationTotal, candidateTotal, rosterTotal] = await Promise.all([
      getTotalCount({ supabase, tableName: "job_posting_templates", employer: actor.employer }),
      getTotalCount({ supabase, tableName: "job_applications", employer: actor.employer }),
      getTotalCount({ supabase, tableName: "staff_onboarding_candidates", employer: actor.employer }),
      getTotalCount({ supabase, tableName: "staff_members", employer: actor.employer }),
    ])

    const [jobs, applications, onboarding, roster] = await Promise.all([
      countByStatus({ supabase, tableName: "job_posting_templates", employer: actor.employer, statuses: ["published", "draft", "closed"] }),
      countByStatus({ supabase, tableName: "job_applications", employer: actor.employer, statuses: ["pending", "approved", "rejected", "waitlisted"] }),
      countByStatus({ supabase, tableName: "staff_onboarding_candidates", employer: actor.employer, statuses: ["pending", "in_progress", "completed", "rejected"] }),
      countByStatus({ supabase, tableName: "staff_members", employer: actor.employer, statuses: ["active", "inactive"] }),
    ])

    const { data: progressRows } = await supabase
      .from("staff_onboarding_candidates")
      .select("onboarding_progress")
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)

    const progressValues = (progressRows ?? [])
      .map((row: { onboarding_progress?: number | null }) => Number(row.onboarding_progress ?? 0))
      .filter((value) => Number.isFinite(value))

    const averageProgress =
      progressValues.length === 0
        ? 0
        : Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)

    return ok({
      jobs: {
        total: jobTotal,
        published: jobs.published ?? 0,
        draft: jobs.draft ?? 0,
        closed: jobs.closed ?? 0,
      },
      applications: {
        total: applicationTotal,
        pending: applications.pending ?? 0,
        approved: applications.approved ?? 0,
        rejected: applications.rejected ?? 0,
        waitlisted: applications.waitlisted ?? 0,
      },
      onboarding: {
        total: candidateTotal,
        pending: onboarding.pending ?? 0,
        inProgress: onboarding.in_progress ?? 0,
        completed: onboarding.completed ?? 0,
        rejected: onboarding.rejected ?? 0,
        averageProgress,
      },
      roster: {
        total: rosterTotal,
        active: roster.active ?? 0,
        inactive: roster.inactive ?? 0,
      },
    })
  },

  async listRoster({ supabase, actor, filters }: ListRosterArgs): Promise<HiringServiceResult<Record<string, unknown>[]>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const limit = normalizeLimit(filters?.limit)
    const offset = normalizeOffset(filters?.offset)

    let query = supabase
      .from("staff_members")
      .select("*")
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status) query = query.eq("status", filters.status)
    if (filters?.department) query = query.eq("department", filters.department)
    if (filters?.position) query = query.eq("position", filters.position)

    const { data, error } = await query
    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to list roster.", details: error })

    return ok((data ?? []) as Record<string, unknown>[])
  },
}
