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
import type { HiringAuditActivity } from "@/types/hiring-dashboard"
import { fail, ok } from "@/types/hiring-service"
import { assertCanManageHiring } from "@/lib/auth/hiring-permissions"
import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"
import { buildFieldTypeMap, redactSensitiveResponses } from "@/lib/hiring/sensitive-field-utils"
import { buildOnboardingTemplateSnapshot } from "@/lib/hiring/template-snapshot"
import { publishJobTemplateToBoardSurfaces } from "@/lib/job-board/publish-template-to-board"
import { StaffOnboardingSensitiveVaultService } from "@/lib/services/staff-onboarding-sensitive-vault.service"
import {
  collectHiringAuditReferenceIds,
  presentHiringAuditActivity,
  type AuditApplicationSummary,
  type AuditCandidateSummary,
  type AuditJobSummary,
  type AuditRosterMemberSummary,
} from "@/lib/hiring/audit-activity-presenter"
import { WorkerOnboardingProfileService } from "@/lib/services/worker-onboarding-profile.service"
import { resolveOnboardingTemplate } from "@/lib/services/onboarding-template-resolver.service"
import { getTemplateById } from "@/lib/services/hiring-onboarding-templates.service"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { resolveHiringEntityDisplayName } from "@/lib/auth/hiring-entity-resolver"
import { sendRosterAddedNotification } from "@/lib/rebuild/hiring-roster-notify"
import { sendOnboardingChangesRequestedNotification } from "@/lib/rebuild/hiring-onboarding-changes-notify"

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function filterUuidIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id && UUID_PATTERN.test(id)))))
}

const ALLOWED_EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "volunteer"] as const
const ALLOWED_EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive"] as const
const ALLOWED_ROLE_TYPES = ["security", "bartender", "street_team", "production", "management", "other"] as const

function normalizeEmploymentType(value?: string | null): string {
  if (value && (ALLOWED_EMPLOYMENT_TYPES as readonly string[]).includes(value)) return value
  return "contractor"
}

function normalizeExperienceLevel(value?: string | null): string {
  if (value && (ALLOWED_EXPERIENCE_LEVELS as readonly string[]).includes(value)) return value
  return "entry"
}

function normalizeRoleType(value?: string | null): string | null {
  if (value && (ALLOWED_ROLE_TYPES as readonly string[]).includes(value)) return value
  return null
}

function generateInvitationToken(): string {
  return crypto.randomUUID().replaceAll("-", "")
}

function getNowIso(): string {
  return new Date().toISOString()
}

// Absolute onboarding link for notifications; falls back to a relative path when
// no public app URL is configured (e.g. local dev without NEXT_PUBLIC_APP_URL).
function buildAbsoluteOnboardingUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "")
  if (!appUrl) return `/onboarding/hire/${encodeURIComponent(token)}`
  const base = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`
  return `${base}/onboarding/hire/${encodeURIComponent(token)}`
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
  applicationId,
  jobId,
  fromStatus,
  toStatus,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  eventType: string
  entityTable: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  applicationId?: string | null
  jobId?: string | null
  fromStatus?: string
  toStatus?: string
}): Promise<void> {
  const resolvedApplicationId =
    applicationId ??
    (typeof metadata?.applicationId === "string" ? metadata.applicationId : null) ??
    (entityTable === "job_applications" && entityId ? entityId : null)

  if (!resolvedApplicationId) return

  await supabase.from("hiring_audit_events").insert({
    ...getEmployerColumns(actor.employer),
    application_id: resolvedApplicationId,
    job_id: jobId ?? (typeof metadata?.jobPostingId === "string" ? metadata.jobPostingId : null),
    venue_id: actor.employer.entityType === "venue" ? actor.employer.entityId : actor.employer.scope?.venueId ?? null,
    actor_user_id: actor.userId,
    action: eventType,
    from_status: fromStatus ?? "n/a",
    to_status: toStatus ?? eventType,
    title: `${eventType.replaceAll("_", " ")}`,
    content: `${eventType} on ${entityTable}${entityId ? ` (${entityId})` : ""}`,
    metadata: {
      entity_table: entityTable,
      entity_id: entityId ?? null,
      ...(metadata ?? {}),
    },
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
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("employer_entity_type", employer.entityType)
        .eq("employer_entity_id", employer.entityId)
        .eq(statusColumn, status)

      return [status, count ?? 0] as const
    })
  )

  return Object.fromEntries(results)
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
  jobPosting,
  templateId,
  templateSnapshot,
  templateVersion,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  application: Record<string, unknown>
  jobPosting?: Record<string, unknown> | null
  templateId?: string | null
  templateSnapshot?: Record<string, unknown> | null
  templateVersion?: string | null
}): Promise<HiringServiceResult<Record<string, unknown>>> {
  const applicationId = String(application.id)

  const applicantUserId = application.applicant_id ?? application.user_id
  const existing = applicantUserId
    ? await supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("user_id", applicantUserId)
        .eq("employer_entity_type", actor.employer.entityType)
        .eq("employer_entity_id", actor.employer.entityId)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("job_application_id", applicationId)
        .maybeSingle()

  if (existing.error) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to check existing candidate.", details: existing.error })
  }

  if (existing.data) {
    // Re-approval can carry a newly resolved template. Persist it on the existing
    // candidate row so the onboarding tab reflects the choice (the invitation sync
    // happens separately in createInvitationForCandidate).
    const existingTemplateId = typeof existing.data.template_id === "string" ? existing.data.template_id : null
    const shouldPatchTemplate = Boolean(templateId && templateId !== existingTemplateId)
    const shouldPatchSnapshot = Boolean(templateSnapshot) && !existing.data.template_snapshot
    if (shouldPatchTemplate || shouldPatchSnapshot) {
      const { data: patched, error: patchError } = await supabase
        .from("staff_onboarding_candidates")
        .update({
          ...(templateId ? { template_id: templateId } : {}),
          ...(templateSnapshot ? { template_snapshot: templateSnapshot } : {}),
          ...(templateVersion ? { template_version: templateVersion } : {}),
          updated_at: getNowIso(),
        })
        .eq("id", existing.data.id)
        .select("*")
        .single()

      if (patchError) {
        return fail({ code: "DATABASE_ERROR", message: "Unable to update candidate template.", details: patchError })
      }

      return ok(patched as Record<string, unknown>)
    }

    return ok(existing.data as Record<string, unknown>)
  }

  const applicantName =
    (typeof application.applicant_name === "string" && application.applicant_name) ||
    (typeof application.name === "string" && application.name) ||
    "Pending applicant"

  const position =
    (typeof application.position === "string" && application.position) ||
    (typeof application.job_position === "string" && application.job_position) ||
    (jobPosting && typeof jobPosting.position === "string" ? jobPosting.position : null) ||
    "Staff"
  const department =
    (typeof application.department === "string" && application.department) ||
    (jobPosting && typeof jobPosting.department === "string" ? jobPosting.department : null) ||
    "General"

  // Legacy application_id references staff_applications(id) on some databases, so the
  // canonical job application link lives in job_application_id. notes retains the id for
  // backward-compatible audit/backfill; application_id stays null to avoid FK violations.
  const jobPostingId =
    (jobPosting && typeof jobPosting.id === "string" ? jobPosting.id : null) ??
    (typeof application.job_posting_id === "string" ? application.job_posting_id : null)

  const insertPayload = {
    ...getEmployerColumns(actor.employer),
    application_id: null,
    job_application_id: applicationId,
    job_posting_id: jobPostingId,
    user_id: application.applicant_id ?? application.user_id ?? null,
    name: applicantName,
    email: application.applicant_email ?? application.email ?? null,
    phone: application.applicant_phone ?? application.phone ?? null,
    position,
    department,
    employment_type: application.employment_type ?? "contractor",
    status: "pending",
    stage: "invitation",
    onboarding_progress: 0,
    compliance_issues: [],
    template_id: templateId ?? null,
    template_snapshot: templateSnapshot ?? null,
    template_version: templateVersion ?? null,
    notes: `job_application_id:${applicationId}`,
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

async function buildSnapshotForTemplateId({
  supabase,
  templateId,
}: {
  supabase: SupabaseClient
  templateId?: string | null
}): Promise<{ templateSnapshot: Record<string, unknown> | null; templateVersion: string | null }> {
  if (!templateId) return { templateSnapshot: null, templateVersion: null }
  const templateResult = await getTemplateById({ supabase, id: templateId })
  if (!templateResult.data) return { templateSnapshot: null, templateVersion: null }

  const snapshot = buildOnboardingTemplateSnapshot({
    id: String(templateResult.data.id),
    name: String(templateResult.data.name ?? "Onboarding template"),
    description: typeof templateResult.data.description === "string" ? templateResult.data.description : null,
    department: typeof templateResult.data.department === "string" ? templateResult.data.department : null,
    position: typeof templateResult.data.position === "string" ? templateResult.data.position : null,
    employment_type:
      templateResult.data.employment_type === "full_time" ||
      templateResult.data.employment_type === "part_time" ||
      templateResult.data.employment_type === "contractor" ||
      templateResult.data.employment_type === "volunteer" ||
      templateResult.data.employment_type === "intern"
        ? templateResult.data.employment_type
        : null,
    fields: Array.isArray(templateResult.data.fields) ? (templateResult.data.fields as never[]) : [],
    required_documents: Array.isArray(templateResult.data.required_documents)
      ? (templateResult.data.required_documents as string[])
      : [],
    estimated_days: typeof templateResult.data.estimated_days === "number" ? templateResult.data.estimated_days : null,
    version: typeof templateResult.data.version === "number" ? templateResult.data.version : 1,
  })

  return {
    templateSnapshot: snapshot as unknown as Record<string, unknown>,
    templateVersion: `v${snapshot.version}`,
  }
}

async function createInvitationForCandidate({
  supabase,
  actor,
  candidate,
  templateId,
  templateSnapshot,
  templateVersion,
}: {
  supabase: SupabaseClient
  actor: HiringActor
  candidate: Record<string, unknown>
  templateId?: string | null
  templateSnapshot?: Record<string, unknown> | null
  templateVersion?: string | null
}): Promise<HiringServiceResult<Record<string, unknown>>> {
  const positionDetails = {
    candidate_id: candidate.id,
    application_id: candidate.application_id ?? null,
    position: candidate.position ?? null,
    department: candidate.department ?? null,
    employment_type: candidate.employment_type ?? "contractor",
  }

  const candidateEmail = typeof candidate.email === "string" ? candidate.email : null

  // Approval can be retried; reuse an existing pending invitation for the same
  // candidate/email in this employer scope instead of creating duplicates.
  let existingInvitationQuery = supabase
    .from("staff_invitations")
    .select("*")
    .eq("employer_entity_type", actor.employer.entityType)
    .eq("employer_entity_id", actor.employer.entityId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)

  existingInvitationQuery = candidateEmail
    ? existingInvitationQuery.eq("email", candidateEmail)
    : existingInvitationQuery.contains("position_details", { candidate_id: candidate.id })

  const { data: existingInvitation } = await existingInvitationQuery.maybeSingle()

  if (existingInvitation?.token) {
    const reuseToken = existingInvitation.token as string

    const patched = await supabase
      .from("staff_invitations")
      .update({
        position_details: positionDetails,
        template_id: templateId ?? candidate.template_id ?? existingInvitation.template_id ?? null,
        ...(templateSnapshot ? { template_snapshot: templateSnapshot } : {}),
        ...(templateVersion ? { template_version: templateVersion } : {}),
        updated_at: getNowIso(),
      })
      .eq("id", existingInvitation.id)
      .select("*")
      .single()

    const invitation = patched.error ? existingInvitation : patched.data

    const reuseUpdate = await supabase
      .from("staff_onboarding_candidates")
      .update({
        invitation_token: reuseToken,
        stage: "invitation",
        ...(templateId ? { template_id: templateId } : {}),
        ...(templateSnapshot ? { template_snapshot: templateSnapshot } : {}),
        ...(templateVersion ? { template_version: templateVersion } : {}),
        updated_at: getNowIso(),
      })
      .eq("id", candidate.id)

    if (reuseUpdate.error) {
      return fail({
        code: "DATABASE_ERROR",
        message: "Invitation was reused but candidate token stamping failed.",
        details: reuseUpdate.error,
      })
    }

    return ok(invitation as Record<string, unknown>)
  }

  const token = generateInvitationToken()

  const { data, error } = await supabase
    .from("staff_invitations")
    .insert({
      employer_entity_type: actor.employer.entityType,
      employer_entity_id: actor.employer.entityId,
      token,
      email: candidate.email ?? "onboarding@example.test",
      phone: candidate.phone ?? null,
      position_details: positionDetails,
      role: typeof candidate.position === "string" ? candidate.position : "staff",
      origin: "hiring_onboarding",
      status: "pending",
      template_id: templateId ?? candidate.template_id ?? null,
      template_snapshot: templateSnapshot ?? null,
      template_version: templateVersion ?? null,
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
      ...(templateId ? { template_id: templateId } : {}),
      ...(templateSnapshot ? { template_snapshot: templateSnapshot } : {}),
      ...(templateVersion ? { template_version: templateVersion } : {}),
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
  const probe = await supabase.from("onboarding_workflows").select("candidate_id").limit(1)
  if (
    probe.error?.message?.includes("Could not find the 'candidate_id' column") ||
    probe.error?.message?.includes("column onboarding_workflows.candidate_id does not exist")
  ) {
    return ok(null)
  }

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

async function resolveAssignmentEventId({
  supabase,
  application,
}: {
  supabase: SupabaseClient
  application: Record<string, unknown>
}): Promise<string | null> {
  const context = await resolveAssignmentJobContext({ supabase, application })
  return context.eventId
}

async function resolveAssignmentJobContext({
  supabase,
  application,
  jobPosting,
}: {
  supabase: SupabaseClient
  application: Record<string, unknown>
  jobPosting?: Record<string, unknown> | null
}): Promise<{ eventId: string | null; tourId: string | null }> {
  const jobPostingId = typeof application.job_posting_id === "string" ? application.job_posting_id : null

  let posting = jobPosting ?? null
  if (!posting && jobPostingId) {
    const { data } = await supabase
      .from("job_posting_templates")
      .select("event_id, tour_id")
      .eq("id", jobPostingId)
      .maybeSingle()
    posting = (data as Record<string, unknown> | null) ?? null
  }

  const postingEventId = posting && typeof posting.event_id === "string" ? posting.event_id : null
  const postingTourId = posting && typeof posting.tour_id === "string" ? posting.tour_id : null

  let eventId: string | null = null
  if (postingEventId) {
    // employment_assignments.event_id references the `events` table; skip when the
    // posting's event is not present there to keep the insert safe.
    const { data: eventRow } = await supabase.from("events").select("id").eq("id", postingEventId).maybeSingle()
    eventId = eventRow?.id ? postingEventId : null
  }

  let tourId: string | null = null
  if (postingTourId) {
    const { data: tourRow } = await supabase.from("tours").select("id").eq("id", postingTourId).maybeSingle()
    tourId = tourRow?.id ? postingTourId : null
  }

  return { eventId, tourId }
}

async function projectHireToTourCrew({
  supabase,
  tourId,
  userId,
  role,
  name,
  email,
}: {
  supabase: SupabaseClient
  tourId: string
  userId: string
  role: string
  name?: string | null
  email?: string | null
}): Promise<{ ok: boolean; warning?: string }> {
  const { data: existing } = await supabase
    .from("tour_team_members")
    .select("id, role, status")
    .eq("tour_id", tourId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("tour_team_members")
      .update({
        role: existing.role || role,
        name: name ?? null,
        email: email ?? null,
        contact_email: email ?? null,
        status: existing.status || "confirmed",
        is_active: true,
        updated_at: getNowIso(),
      })
      .eq("id", existing.id)

    if (updateError) {
      return { ok: false, warning: `Tour crew sync failed: ${updateError.message}` }
    }
    return { ok: true }
  }

  // Prefer attaching to an existing crew team; create a default Crew team when missing.
  let teamId: string | null = null
  const { data: crewTeam } = await supabase
    .from("tour_teams")
    .select("id")
    .eq("tour_id", tourId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (crewTeam?.id) {
    teamId = crewTeam.id as string
  } else {
    const { data: createdTeam, error: teamError } = await supabase
      .from("tour_teams")
      .insert({
        tour_id: tourId,
        name: "Crew",
        description: "Auto-created from hiring approvals",
      })
      .select("id")
      .single()

    if (teamError || !createdTeam?.id) {
      return {
        ok: false,
        warning: `Tour crew sync failed: ${teamError?.message || "unable to create crew team"}`,
      }
    }
    teamId = createdTeam.id as string
  }

  const { error: insertError } = await supabase.from("tour_team_members").insert({
    tour_id: tourId,
    team_id: teamId,
    user_id: userId,
    role,
    name: name ?? null,
    email: email ?? null,
    contact_email: email ?? null,
    status: "confirmed",
    is_active: true,
  })

  if (insertError) {
    return { ok: false, warning: `Tour crew sync failed: ${insertError.message}` }
  }

  return { ok: true }
}

export async function resolveOrganizerId({
  supabase,
  actor,
}: {
  supabase: SupabaseClient
  actor: HiringActor
}): Promise<string | null> {
  if (actor.employer.entityType !== "organization") return null

  // employment_assignments.organizer_id has a FK to organizer_accounts(id).
  // The employer scope id may be the auth user id rather than an organizer row,
  // so only set organizer_id when a matching account actually exists.
  const byId = await supabase
    .from("organizer_accounts")
    .select("id")
    .eq("id", actor.employer.entityId)
    .maybeSingle()
  if (byId.data?.id) return byId.data.id as string

  const byUser = await supabase
    .from("organizer_accounts")
    .select("id")
    .eq("user_id", actor.employer.entityId)
    .maybeSingle()
  if (byUser.data?.id) return byUser.data.id as string

  return null
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

  const position =
    (typeof application.position === "string" && application.position) ||
    (typeof application.job_position === "string" && application.job_position) ||
    null
  const department = typeof application.department === "string" ? application.department : null
  const permissions = resolveWorkModePermissions({ position, department })

  // Pre-scope the assignment to the job posting's event/tour so approved hires land
  // on the roster already attached to the right ops context.
  const { eventId, tourId } = await resolveAssignmentJobContext({ supabase, application })

  const { data: existing } = await supabase
    .from("employment_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("employer_entity_type", actor.employer.entityType)
    .eq("employer_entity_id", actor.employer.entityId)
    .maybeSingle()

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("employment_assignments")
      .update({
        permissions,
        status: "invited",
        ...(eventId && !existing.event_id ? { event_id: eventId } : {}),
        ...(tourId && !existing.tour_id ? { tour_id: tourId } : {}),
        updated_at: getNowIso(),
      })
      .eq("id", existing.id)
      .select("*")
      .single()

    if (updateError) {
      return fail({
        code: "DATABASE_ERROR",
        message: "Unable to update existing employment assignment.",
        details: updateError,
      })
    }

    return ok(updated as Record<string, unknown>)
  }

  const organizerId = await resolveOrganizerId({ supabase, actor })

  const payload = {
    ...getEmployerColumns(actor.employer),
    user_id: userId,
    role_title: position || department || "Staff",
    department,
    status: "invited",
    permissions,
    organizer_id: organizerId,
    ...(eventId ? { event_id: eventId } : {}),
    ...(tourId ? { tour_id: tourId } : {}),
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

    const status = data.status ?? "draft"
    const onboardingTemplateId =
      typeof data.onboarding_template_id === "string" && data.onboarding_template_id
        ? data.onboarding_template_id
        : null

    if (status === "published" && !onboardingTemplateId) {
      return fail({
        code: "BAD_REQUEST",
        message: "An onboarding template is required before publishing a job posting.",
      })
    }

    const payload = {
      ...getEmployerColumns(actor.employer),
      title: data.title,
      description: data.description,
      department: data.department || null,
      position: data.position || null,
      employment_type: normalizeEmploymentType(data.employment_type),
      location: data.location ?? "TBD",
      role_type: normalizeRoleType(data.role_type),
      number_of_positions: data.number_of_positions ?? 1,
      salary_range: data.salary_range ?? null,
      requirements: data.requirements ?? [],
      responsibilities: data.responsibilities ?? [],
      benefits: data.benefits ?? [],
      skills: data.skills ?? [],
      experience_level: normalizeExperienceLevel(data.experience_level),
      remote: data.remote ?? false,
      urgent: data.urgent ?? false,
      required_certifications: data.required_certifications ?? [],
      application_form_template: data.application_form_template ?? { fields: [] },
      onboarding_template_id: onboardingTemplateId,
      event_id: data.event_id ?? actor.employer.scope?.eventId ?? null,
      tour_id: data.tour_id ?? actor.employer.scope?.tourId ?? null,
      event_date: data.event_date ?? null,
      status,
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

    if (status === "published") {
      const displayName = await resolveHiringEntityDisplayName({
        supabase,
        entityType: actor.employer.entityType,
        entityId: actor.employer.entityId,
        fallback: actor.employer.displayName,
      })

      await publishJobTemplateToBoardSurfaces(supabase, {
        template: {
          id: String(inserted.id),
          venue_id: typeof inserted.venue_id === "string" ? inserted.venue_id : null,
          title: String(inserted.title),
          description: typeof inserted.description === "string" ? inserted.description : null,
          department: typeof inserted.department === "string" ? inserted.department : null,
          position: typeof inserted.position === "string" ? inserted.position : null,
          employment_type: typeof inserted.employment_type === "string" ? inserted.employment_type : null,
          location: typeof inserted.location === "string" ? inserted.location : null,
          number_of_positions:
            typeof inserted.number_of_positions === "number" ? inserted.number_of_positions : null,
          salary_range:
            inserted.salary_range && typeof inserted.salary_range === "object"
              ? (inserted.salary_range as Record<string, unknown>)
              : null,
          requirements: Array.isArray(inserted.requirements) ? (inserted.requirements as string[]) : null,
          responsibilities: Array.isArray(inserted.responsibilities)
            ? (inserted.responsibilities as string[])
            : null,
          benefits: Array.isArray(inserted.benefits) ? (inserted.benefits as string[]) : null,
          skills: Array.isArray(inserted.skills) ? (inserted.skills as string[]) : null,
          experience_level: typeof inserted.experience_level === "string" ? inserted.experience_level : null,
          remote: Boolean(inserted.remote),
          urgent: Boolean(inserted.urgent),
          required_certifications: Array.isArray(inserted.required_certifications)
            ? (inserted.required_certifications as string[])
            : null,
          role_type: typeof inserted.role_type === "string" ? inserted.role_type : null,
          status: typeof inserted.status === "string" ? inserted.status : "published",
        },
        userId: actor.userId,
        organizationId: actor.employer.entityId,
        organizationName: displayName,
      })

      if (onboardingTemplateId) {
        const existingTemplate = await getTemplateById({ supabase, id: onboardingTemplateId })
        const nextUseCount = (Number(existingTemplate.data?.use_count) || 0) + 1
        await supabase
          .from("staff_onboarding_templates")
          .update({ use_count: nextUseCount, updated_at: getNowIso() })
          .eq("id", onboardingTemplateId)
      }
    }

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
    if (filters?.department) query = query.eq("department", filters.department)
    if (filters?.starredOnly) query = query.eq("is_starred", true)
    if (filters?.query) {
      query = query.or(
        `applicant_name.ilike.%${filters.query}%,applicant_email.ilike.%${filters.query}%,job_title.ilike.%${filters.query}%`
      )
    }

    const { data, error } = await query

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to list applications.", details: error })

    const rows = (data ?? []) as Record<string, unknown>[]
    const jobPostingIds = [
      ...new Set(
        rows
          .map((row) => (typeof row.job_posting_id === "string" ? row.job_posting_id : null))
          .filter((id): id is string => Boolean(id))
      ),
    ]

    if (jobPostingIds.length === 0) return ok(rows)

    const { data: jobPostings } = await supabase
      .from("job_posting_templates")
      .select("id, title, department, position, location")
      .in("id", jobPostingIds)

    const jobById = new Map(
      (jobPostings ?? []).map((job) => [job.id as string, job as Record<string, unknown>])
    )

    const enriched = rows.map((row) => {
      const jobPostingId = typeof row.job_posting_id === "string" ? row.job_posting_id : null
      const job = jobPostingId ? jobById.get(jobPostingId) : null
      if (!job) return row

      return {
        ...row,
        job_title: job.title ?? row.job_title,
        title: job.title ?? row.title,
        department: job.department ?? row.department,
        position: job.position ?? row.position,
        location: job.location ?? row.location,
      }
    })

    return ok(enriched)
  },

  async approveApplication({
    supabase,
    applicationId,
    actor,
    note,
    onboardingTemplateId,
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
        feedback: note ?? null,
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (updateResult.error) {
      const gateMessage =
        typeof updateResult.error.message === "string" &&
        updateResult.error.message.includes("HIRING_GATE_BLOCKED")
          ? updateResult.error.message.replace("HIRING_GATE_BLOCKED: ", "")
          : null

      if (gateMessage) {
        return fail({
          code: "CONFLICT",
          message: `Application cannot be approved: ${gateMessage.replace(/_/g, " ")}`,
          details: updateResult.error,
        })
      }

      return fail({ code: "DATABASE_ERROR", message: "Unable to approve application.", details: updateResult.error })
    }

    const warnings: string[] = []

    // Load the source job posting so the candidate inherits its role details and
    // any onboarding template the creator selected on the posting.
    const jobPostingId =
      typeof updateResult.data.job_posting_id === "string" ? updateResult.data.job_posting_id : null

    let jobPosting: Record<string, unknown> | null = null
    if (jobPostingId) {
      const { data: postingRow } = await supabase
        .from("job_posting_templates")
        .select("id, title, department, position, onboarding_template_id, event_id, tour_id, employment_type")
        .eq("id", jobPostingId)
        .maybeSingle()
      jobPosting = (postingRow as Record<string, unknown> | null) ?? null
    }

    // Admin may attach an onboarding template during approval. Persist it on the
    // job posting so future hires inherit it, then treat it as the explicit choice.
    const attachTemplateId = typeof onboardingTemplateId === "string" && onboardingTemplateId ? onboardingTemplateId : null
    if (attachTemplateId && jobPostingId) {
      const { error: attachError } = await supabase
        .from("job_posting_templates")
        .update({ onboarding_template_id: attachTemplateId, updated_at: getNowIso() })
        .eq("id", jobPostingId)
      if (attachError) {
        warnings.push("Selected onboarding template could not be saved to the job posting.")
      } else if (jobPosting) {
        jobPosting.onboarding_template_id = attachTemplateId
      }
    }

    const explicitTemplateId =
      attachTemplateId ||
      (jobPosting && typeof jobPosting.onboarding_template_id === "string" ? jobPosting.onboarding_template_id : null)

    const resolvedTemplate = await resolveOnboardingTemplate({
      supabase,
      employer: actor.employer,
      flowType: "onboarding",
      templateId: explicitTemplateId,
      position: jobPosting && typeof jobPosting.position === "string" ? jobPosting.position : null,
      department: jobPosting && typeof jobPosting.department === "string" ? jobPosting.department : null,
    })

    // The safe fallback is an in-memory template with a synthetic id; only stamp a
    // real database template id (the template_id column has a FK to the templates table).
    const persistableTemplateId =
      resolvedTemplate.source === "static_safe_fallback" ? null : resolvedTemplate.template.id

    const templateSnapshot = persistableTemplateId
      ? (buildOnboardingTemplateSnapshot(resolvedTemplate.template) as unknown as Record<string, unknown>)
      : null
    const templateVersion = templateSnapshot
      ? `v${typeof templateSnapshot.version === "number" ? templateSnapshot.version : 1}`
      : null

    // Classify template state so callers can prompt the admin when no employer
    // template is actually configured for this hire yet.
    const templateState: "explicit" | "employerResolved" | "pending" = explicitTemplateId
      ? "explicit"
      : persistableTemplateId
        ? "employerResolved"
        : "pending"
    const isPendingTemplate = templateState === "pending"

    // If a downstream step fails, revert the application to its prior status so we never
    // leave an "approved" application without an onboarding candidate (compensating action).
    const revertApproval = async () => {
      await supabase
        .from("job_applications")
        .update({ status: currentStatus, updated_at: getNowIso() })
        .eq("id", applicationId)
        .eq("employer_entity_type", actor.employer.entityType)
        .eq("employer_entity_id", actor.employer.entityId)
    }

    const candidateResult = await getOrCreateCandidateFromApplication({
      supabase,
      actor,
      application: updateResult.data as Record<string, unknown>,
      jobPosting,
      templateId: persistableTemplateId,
      templateSnapshot,
      templateVersion,
    })
    if (!candidateResult.ok) {
      await revertApproval()
      return candidateResult
    }

    const invitationResult = await createInvitationForCandidate({
      supabase,
      actor,
      candidate: candidateResult.data,
      templateId: persistableTemplateId,
      templateSnapshot,
      templateVersion,
    })
    if (!invitationResult.ok) {
      await revertApproval()
      return invitationResult
    }

    const workflowResult = await bootstrapWorkflowForCandidate({ supabase, actor, candidate: candidateResult.data })
    if (!workflowResult.ok) {
      await revertApproval()
      return workflowResult
    }

    // Create/update staff_members + employment_assignments so the hire appears on
    // Roster and ops pickers immediately. This is required when a user account is linked.
    const approvedApplication = updateResult.data as Record<string, unknown>
    const rosterUserId =
      (typeof approvedApplication.applicant_id === "string" && approvedApplication.applicant_id) ||
      (typeof approvedApplication.user_id === "string" && approvedApplication.user_id) ||
      (typeof candidateResult.data.user_id === "string" && candidateResult.data.user_id) ||
      (typeof candidateResult.data.applicant_id === "string" && candidateResult.data.applicant_id) ||
      null

    const jobContext = await resolveAssignmentJobContext({
      supabase,
      application: approvedApplication,
      jobPosting,
    })

    const jobPosition =
      (typeof jobPosting?.position === "string" && jobPosting.position) ||
      (typeof candidateResult.data.position === "string" && candidateResult.data.position) ||
      (typeof jobPosting?.title === "string" && jobPosting.title) ||
      "Staff"
    const jobDepartment =
      (typeof jobPosting?.department === "string" && jobPosting.department) ||
      (typeof candidateResult.data.department === "string" && candidateResult.data.department) ||
      null

    let employmentAssignment: Record<string, unknown> | null = null
    let rosterMemberId: string | null = null

    if (rosterUserId) {
      try {
        const rosterService = new HiringRosterService({ supabase })
        const member = await rosterService.upsertRosterFromApproval({
          employer: actor.employer,
          actorUserId: actor.userId,
          userId: rosterUserId,
          candidateId: typeof candidateResult.data.id === "string" ? candidateResult.data.id : null,
          name:
            (typeof candidateResult.data.name === "string" && candidateResult.data.name) ||
            (typeof approvedApplication.applicant_name === "string" && approvedApplication.applicant_name) ||
            null,
          email:
            (typeof candidateResult.data.email === "string" && candidateResult.data.email) ||
            (typeof approvedApplication.contact_email === "string" && approvedApplication.contact_email) ||
            null,
          phone:
            (typeof candidateResult.data.phone === "string" && candidateResult.data.phone) ||
            (typeof approvedApplication.contact_phone === "string" && approvedApplication.contact_phone) ||
            null,
          position: jobPosition,
          department: jobDepartment,
          employmentType:
            (typeof jobPosting?.employment_type === "string" && jobPosting.employment_type) ||
            (typeof approvedApplication.employment_type === "string" && approvedApplication.employment_type) ||
            null,
          completed: false,
          eventId: jobContext.eventId,
          tourId: jobContext.tourId,
          jobApplicationId: applicationId,
          jobPostingId:
            (typeof approvedApplication.job_posting_id === "string" && approvedApplication.job_posting_id) ||
            null,
        })

        rosterMemberId = member?.id ?? null

        const assignmentQuery = supabase
          .from("employment_assignments")
          .select("*")
          .eq("job_application_id", applicationId)
          .order("created_at", { ascending: false })
          .limit(1)
        const { data: assignmentRow } = await assignmentQuery.maybeSingle()
        employmentAssignment = (assignmentRow as Record<string, unknown> | null) ?? null

        if (jobContext.tourId) {
          const tourProjection = await projectHireToTourCrew({
            supabase,
            tourId: jobContext.tourId,
            userId: rosterUserId,
            role: jobPosition,
            name:
              (typeof candidateResult.data.name === "string" && candidateResult.data.name) ||
              (typeof approvedApplication.applicant_name === "string" && approvedApplication.applicant_name) ||
              null,
            email:
              (typeof candidateResult.data.email === "string" && candidateResult.data.email) ||
              (typeof approvedApplication.contact_email === "string" && approvedApplication.contact_email) ||
              null,
          })
          if (!tourProjection.ok && tourProjection.warning) warnings.push(tourProjection.warning)
        }
      } catch (rosterError) {
        console.error("[approveApplication] roster upsert failed", rosterError)
        warnings.push(
          "Applicant approved, but adding them to the team roster failed. Open the Roster tab to add them manually, then retry assignment."
        )
        // Fallback shell so event/tour context is not completely lost.
        const assignmentResult = await createEmploymentAssignmentShell({
          supabase,
          actor,
          application: approvedApplication,
        })
        if (assignmentResult.ok) employmentAssignment = assignmentResult.data
      }
    } else {
      warnings.push(
        "Applicant approved, but no user account was linked — they will not appear on the roster until they complete onboarding with an account."
      )
      const assignmentResult = await createEmploymentAssignmentShell({
        supabase,
        actor,
        application: approvedApplication,
      })
      if (assignmentResult.ok) employmentAssignment = assignmentResult.data
      else if (!assignmentResult.ok) {
        warnings.push("Applicant approved, but adding them to the roster failed. You can add them manually.")
      }
    }

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "application_approved",
      entityTable: "job_applications",
      entityId: applicationId,
      applicationId,
      jobId: jobPostingId,
      fromStatus: currentStatus,
      toStatus: "approved",
      metadata: {
        candidateId: candidateResult.data.id,
        invitationId: invitationResult.data.id,
        workflowId: workflowResult.data?.id,
        employmentAssignmentId: employmentAssignment?.id ?? null,
        rosterMemberId,
        eventId: jobContext.eventId,
        tourId: jobContext.tourId,
        onboardingTemplateId: persistableTemplateId,
        onboardingTemplateSource: resolvedTemplate.source,
        onboardingTemplateState: templateState,
      },
    })

    return ok({
      application: updateResult.data,
      candidate: candidateResult.data,
      invitation: invitationResult.data,
      workflow: workflowResult.data,
      employmentAssignment,
      rosterMemberId,
      jobPosting,
      onboardingTemplate: {
        id: persistableTemplateId,
        name: resolvedTemplate.template.name,
        source: resolvedTemplate.source,
        state: templateState,
        isPending: isPendingTemplate,
      },
      warnings,
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
        feedback: reason,
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

  async shortlistApplication({
    supabase,
    applicationId,
    actor,
  }: ServiceArgs & ApplicationDecisionInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("job_applications")
      .update({
        status: "shortlisted",
        reviewed_by: actor.userId,
        reviewed_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to shortlist application.", details: error })

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "application_shortlisted",
      entityTable: "job_applications",
      entityId: applicationId,
    })

    return ok(data as Record<string, unknown>)
  },

  async markApplicationReviewed({
    supabase,
    applicationId,
    actor,
  }: ServiceArgs & ApplicationDecisionInput): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("job_applications")
      .update({
        status: "reviewed",
        reviewed_by: actor.userId,
        reviewed_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to mark application as reviewed.", details: error })

    return ok(data as Record<string, unknown>)
  },

  async setApplicationStar({
    supabase,
    actor,
    applicationId,
    isStarred,
  }: EmployerScopedArgs & { applicationId: string; isStarred: boolean }): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("job_applications")
      .update({
        is_starred: isStarred,
        starred_at: isStarred ? getNowIso() : null,
        starred_by: isStarred ? actor.userId : null,
      })
      .eq("id", applicationId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .select("*")
      .single()

    if (error) return fail({ code: "DATABASE_ERROR", message: "Unable to update star.", details: error })

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

    const snapshotFields = await buildSnapshotForTemplateId({ supabase, templateId })
    if (snapshotFields.templateSnapshot) {
      await supabase
        .from("staff_onboarding_candidates")
        .update({
          template_snapshot: snapshotFields.templateSnapshot,
          template_version: snapshotFields.templateVersion,
          updated_at: getNowIso(),
        })
        .eq("id", candidate.id)
    }

    const invitationResult = await createInvitationForCandidate({
      supabase,
      actor,
      candidate: candidate as Record<string, unknown>,
      templateId,
      templateSnapshot: snapshotFields.templateSnapshot,
      templateVersion: snapshotFields.templateVersion,
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

  // Assign (or change) an onboarding template on an existing candidate from the
  // Candidates page, sync the invitation, and notify the applicant's account.
  async assignOnboardingTemplateToCandidate({
    supabase,
    actor,
    candidateId,
    templateId,
    sendNotification = true,
    isResend = false,
  }: ServiceArgs & {
    actor: HiringActor
    candidateId: string
    templateId?: string | null
    sendNotification?: boolean
    isResend?: boolean
  }): Promise<HiringServiceResult<Record<string, unknown>>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data: candidate, error: candidateError } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .maybeSingle()

    if (candidateError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load candidate.", details: candidateError })
    }
    if (!candidate) return fail({ code: "NOT_FOUND", message: "Candidate not found." })

    // Validate the requested template belongs to this employer or is a global one.
    let resolvedTemplateId: string | null = typeof candidate.template_id === "string" ? candidate.template_id : null
    let templateName: string | null = null
    if (templateId) {
      const templateResult = await getTemplateById({ supabase, id: templateId })
      if (templateResult.error || !templateResult.data) {
        return fail({ code: "NOT_FOUND", message: templateResult.error ?? "Template not found." })
      }
      const template = templateResult.data
      const scopeMatches =
        template.scope === "global" ||
        (template.employer_entity_type === actor.employer.entityType &&
          template.employer_entity_id === actor.employer.entityId)
      if (!scopeMatches) {
        return fail({ code: "FORBIDDEN", message: "Template does not belong to the active hiring entity." })
      }

      resolvedTemplateId = templateId
      templateName = typeof template.name === "string" ? template.name : null
    }

    const snapshotFields = await buildSnapshotForTemplateId({ supabase, templateId: resolvedTemplateId })

    if (templateId || snapshotFields.templateSnapshot) {
      const { error: updateError } = await supabase
        .from("staff_onboarding_candidates")
        .update({
          ...(resolvedTemplateId ? { template_id: resolvedTemplateId } : {}),
          ...(snapshotFields.templateSnapshot
            ? {
                template_snapshot: snapshotFields.templateSnapshot,
                template_version: snapshotFields.templateVersion,
              }
            : {}),
          updated_at: getNowIso(),
        })
        .eq("id", candidateId)

      if (updateError) {
        return fail({ code: "DATABASE_ERROR", message: "Unable to assign template.", details: updateError })
      }
    }

    // Reuse/create the invitation so the token + template stay in sync.
    const invitationResult = await createInvitationForCandidate({
      supabase,
      actor,
      candidate: { ...candidate, template_id: resolvedTemplateId } as Record<string, unknown>,
      templateId: resolvedTemplateId,
      templateSnapshot: snapshotFields.templateSnapshot,
      templateVersion: snapshotFields.templateVersion,
    })
    if (!invitationResult.ok) return invitationResult

    const invitation = invitationResult.data
    const token = typeof invitation.token === "string" ? invitation.token : null
    const onboardingUrl = token ? buildAbsoluteOnboardingUrl(token) : null

    const candidateUserId = typeof candidate.user_id === "string" ? candidate.user_id : null
    let notificationSent = false

    if (sendNotification && candidateUserId && onboardingUrl) {
      const employerName = await resolveHiringEntityDisplayName({
        supabase,
        entityType: actor.employer.entityType,
        entityId: actor.employer.entityId,
      }).catch(() => null)

      // Lazy import keeps the notification's server-only dependency chain out of
      // this module's top-level graph (so it stays importable in unit tests).
      const { sendOnboardingInviteNotification } = await import("@/lib/rebuild/hiring-onboarding-notify")
      const result = await sendOnboardingInviteNotification({
        applicantUserId: candidateUserId,
        candidateId,
        applicationId: typeof candidate.job_application_id === "string" ? candidate.job_application_id : null,
        hiringManagerUserId: actor.userId,
        onboardingUrl,
        templateName,
        jobTitle: typeof candidate.position === "string" ? candidate.position : null,
        employerName: employerName && !employerName.includes(":") ? employerName : null,
        isResend,
      })
      notificationSent = result.sent

      if (notificationSent) {
        await supabase
          .from("staff_onboarding_candidates")
          .update({ onboarding_notification_sent_at: getNowIso(), updated_at: getNowIso() })
          .eq("id", candidateId)
      }
    }

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: isResend ? "onboarding_invite_resent" : "onboarding_template_assigned",
      entityTable: "staff_onboarding_candidates",
      entityId: candidateId,
      metadata: { templateId: resolvedTemplateId, notificationSent },
    })

    return ok({
      candidate: { ...candidate, template_id: resolvedTemplateId },
      invitation,
      onboardingUrl,
      templateName,
      notificationSent,
    })
  },

  async getTokenOnboardingPayload({
    supabase,
    token,
    allowCompleted = false,
  }: GetTokenPayloadArgs & { allowCompleted?: boolean }): Promise<HiringServiceResult<TokenOnboardingPayload>> {
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

    // Load candidate early so needs_revision can reopen a completed invite for the worker.
    let candidate: Record<string, unknown> | null = null

    if (typeof invitation.candidate_id === "string") {
      const { data, error: candidateError } = await supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("id", invitation.candidate_id)
        .maybeSingle()

      if (candidateError) {
        return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: candidateError })
      }
      candidate = (data as Record<string, unknown> | null) ?? null
    }

    if (!candidate) {
      const byToken = await supabase
        .from("staff_onboarding_candidates")
        .select("*")
        .eq("invitation_token", token)
        .maybeSingle()

      if (byToken.error) {
        return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: byToken.error })
      }

      candidate = (byToken.data as Record<string, unknown> | null) ?? null
    }

    if (!candidate) {
      const positionDetails = invitation.position_details as Record<string, unknown> | null
      const linkedCandidateId = positionDetails?.candidate_id
      if (typeof linkedCandidateId === "string") {
        const linked = await supabase
          .from("staff_onboarding_candidates")
          .select("*")
          .eq("id", linkedCandidateId)
          .maybeSingle()

        if (linked.error) {
          return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: linked.error })
        }

        candidate = (linked.data as Record<string, unknown> | null) ?? null
      }
    }

    if (!candidate) return fail({ code: "NOT_FOUND", message: "Onboarding candidate was not found." })

    const candidateNeedsRevision = candidate.status === "needs_revision"
    if (invitation.status === "completed" && !allowCompleted && !candidateNeedsRevision) {
      return fail({ code: "CONFLICT", message: "This onboarding invitation has already been completed." })
    }

    if (
      invitation.expires_at &&
      new Date(String(invitation.expires_at)).getTime() < Date.now() &&
      invitation.status !== "completed" &&
      !candidateNeedsRevision
    ) {
      return fail({ code: "CONFLICT", message: "This onboarding invitation has expired." })
    }

    const template = await resolveTemplateForCandidate({ supabase, candidate: candidate as Record<string, unknown> })

    const { data: existingResponse, error: existingResponseError } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const existingResponses =
      existingResponseError?.message?.includes("Could not find the table")
        ? null
        : existingResponse
          ? (existingResponse as Record<string, unknown>)
          : null

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
      existingResponses,
      progress: Number(candidate.onboarding_progress ?? 0),
    })
  },

  async submitTokenOnboarding({
    supabase,
    token,
    responses,
    completedByUserId,
    completed = true,
  }: SubmitTokenOnboardingArgs & { completed?: boolean }): Promise<HiringServiceResult<Record<string, unknown>>> {
    // allowCompleted so retries after partial success can resolve to alreadySubmitted instead of 409.
    const payloadResult = await this.getTokenOnboardingPayload({
      supabase,
      token,
      allowCompleted: completed,
    })
    if (!payloadResult.ok) return payloadResult

    const { invitation, candidate, employer, template, existingResponses } = payloadResult.data
    const candidateId = String(candidate.id)
    const userId = completedByUserId || (typeof candidate.user_id === "string" ? candidate.user_id : null)
    const warnings: string[] = []

    const candidateStatus = typeof candidate.status === "string" ? candidate.status : ""
    const candidateProgress = Number(candidate.onboarding_progress ?? 0)
    const existingCompletedAt =
      existingResponses && typeof existingResponses === "object"
        ? (existingResponses as Record<string, unknown>).completed_at
        : null
    // needs_revision means admin reopened the loop — allow resubmit even if invite/responses look complete.
    const isRevisionResubmit = candidateStatus === "needs_revision"
    const alreadySubmitted =
      completed &&
      !isRevisionResubmit &&
      (invitation.status === "completed" ||
        candidateStatus === "submitted" ||
        candidateStatus === "completed" ||
        candidateProgress >= 100 ||
        Boolean(existingCompletedAt))

    if (alreadySubmitted) {
      // Heal partial failures where invitation/responses completed but candidate row never reached review.
      const needsHeal =
        candidateStatus !== "submitted" &&
        candidateStatus !== "completed" &&
        candidateStatus !== "approved" &&
        candidateStatus !== "needs_revision"

      let healedCandidate = candidate
      if (needsHeal) {
        const healPayload: Record<string, unknown> = {
          status: "submitted",
          stage: "review",
          onboarding_progress: 100,
          compliance_status: "pending_review",
          updated_at: getNowIso(),
        }
        if (
          existingResponses &&
          typeof existingResponses === "object" &&
          (existingResponses as Record<string, unknown>).responses
        ) {
          healPayload.onboarding_responses = (existingResponses as Record<string, unknown>).responses
        }

        const healed = await supabase
          .from("staff_onboarding_candidates")
          .update(healPayload)
          .eq("id", candidateId)
          .select("*")
          .single()

        if (!healed.error && healed.data) {
          healedCandidate = healed.data as Record<string, unknown>
        }
      }

      return ok({
        response: existingResponses ?? null,
        candidate: healedCandidate,
        staffMember: null,
        employmentAssignment: null,
        alreadySubmitted: true,
        warnings,
      })
    }

    const templateFields = Array.isArray((template as Record<string, unknown> | null)?.fields)
      ? ((template as Record<string, unknown>).fields as Array<{ id?: string; name?: string; type?: string }>)
      : []
    const fieldTypeById = buildFieldTypeMap(templateFields)
    const redactedResponses = redactSensitiveResponses({ responses, fieldTypeById })

    try {
      const vaultResult = await StaffOnboardingSensitiveVaultService.upsertFromResponses({
        supabase,
        candidateId,
        employer,
        responses,
        fieldTypeById,
      })
      if (!vaultResult.ok) warnings.push("sensitive_vault_upsert_failed")
    } catch (vaultError) {
      console.error("[submitTokenOnboarding] sensitive vault upsert failed", vaultError)
      warnings.push("sensitive_vault_upsert_failed")
    }

    const requiredFieldNames = templateFields
      .filter((field) => {
        const typed = field as { required?: boolean; blocking?: boolean }
        return Boolean(typed.required || typed.blocking)
      })
      .map((field) => field.name)
      .filter((name): name is string => Boolean(name))

    const completedRequiredCount = requiredFieldNames.filter((name) => {
      const value = responses[name]
      if (value === null || value === undefined) return false
      if (typeof value === "string") return value.trim().length > 0
      if (typeof value === "boolean") return value === true
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(Boolean)
      return Boolean(value)
    }).length

    const draftProgress =
      requiredFieldNames.length === 0
        ? 100
        : Math.round((completedRequiredCount / requiredFieldNames.length) * 100)

    const { data: existingResponse } = await supabase
      .from("onboarding_responses")
      .select("id")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let responseRow: Record<string, unknown> | null = null
    let responseError: { message?: string } | null = null

    if (existingResponse?.id) {
      const updated = await supabase
        .from("onboarding_responses")
        .update({
          responses: redactedResponses,
          completed_at: completed ? getNowIso() : null,
          submitted_at: getNowIso(),
          user_id: userId,
        })
        .eq("id", existingResponse.id)
        .select("*")
        .single()
      responseRow = updated.data as Record<string, unknown> | null
      responseError = updated.error
    } else {
      const inserted = await supabase
        .from("onboarding_responses")
        .insert({
          candidate_id: candidateId,
          invitation_id: invitation.id,
          user_id: userId,
          responses: redactedResponses,
          completed_at: completed ? getNowIso() : null,
          submitted_at: getNowIso(),
          created_at: getNowIso(),
        })
        .select("*")
        .single()
      responseRow = inserted.data as Record<string, unknown> | null
      responseError = inserted.error
    }

    if (responseError && !responseError.message?.includes("Could not find the table")) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to save onboarding responses.", details: responseError })
    }

    // Land in admin review — not auto-approved — so Candidates tools can review answers/docs.
    // Resubmit after needs_revision clears the revision flag and returns to pending_review.
    const candidateUpdatePayload: Record<string, unknown> = {
      status: completed ? "submitted" : isRevisionResubmit ? "needs_revision" : "in_progress",
      stage: completed ? "review" : "onboarding",
      onboarding_progress: completed ? 100 : draftProgress,
      onboarding_responses: redactedResponses,
      compliance_status: completed ? "pending_review" : candidate.compliance_status ?? "missing",
      updated_at: getNowIso(),
    }

    const candidateUpdate = await supabase
      .from("staff_onboarding_candidates")
      .update(candidateUpdatePayload)
      .eq("id", candidateId)
      .select("*")
      .single()

    if (candidateUpdate.error) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to update onboarding candidate.", details: candidateUpdate.error })
    }

    // Persist reusable answers to the private worker profile (vaulted sensitive fields).
    // Best-effort: never block employer-visible onboarding completion on profile upsert failure.
    if (userId) {
      try {
        await WorkerOnboardingProfileService.upsertFromResponses({
          supabase,
          userId,
          responses,
          fieldTypeById,
        })
      } catch (profileError) {
        console.error("[submitTokenOnboarding] worker profile upsert failed", profileError)
        warnings.push("worker_profile_upsert_failed")
      }
    }

    if (completed) {
      await supabase
        .from("staff_invitations")
        .update({ status: "completed", updated_at: getNowIso() })
        .eq("id", invitation.id)
    }

    // Do not activate roster on worker submit — admin must approve first (View details → Approve).
    // Application approve may already have created an invited shell (completed: false).

    return ok({
      response: responseRow ?? null,
      candidate: candidateUpdate.data,
      staffMember: null,
      employmentAssignment: null,
      alreadySubmitted: false,
      warnings,
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
      countByStatus({
        supabase,
        tableName: "staff_onboarding_candidates",
        employer: actor.employer,
        statuses: ["pending", "in_progress", "submitted", "needs_revision", "completed", "approved", "rejected"],
      }),
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
        inProgress: (onboarding.in_progress ?? 0) + (onboarding.submitted ?? 0) + (onboarding.needs_revision ?? 0),
        completed: (onboarding.completed ?? 0) + (onboarding.approved ?? 0),
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

  async listAuditEvents({
    supabase,
    actor,
    limit = 50,
  }: GetDashboardStatsArgs & { limit?: number }): Promise<HiringServiceResult<HiringAuditActivity[]>> {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data, error } = await supabase
      .from("hiring_audit_events")
      .select("*")
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100))

    if (error) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load hiring audit events.", details: error })
    }

    const rows = ((data ?? []) as Record<string, unknown>[]).filter((row) => row.id)
    const referenceIds = collectHiringAuditReferenceIds(rows)
    const uuidReferenceIds = {
      applicationIds: filterUuidIds(referenceIds.applicationIds),
      candidateIds: filterUuidIds(referenceIds.candidateIds),
      documentIds: filterUuidIds(referenceIds.documentIds),
      rosterMemberIds: filterUuidIds(referenceIds.rosterMemberIds),
      jobIds: filterUuidIds(referenceIds.jobIds),
    }

    const [applicationsResult, documentsResult, rosterMembersResult] = await Promise.all([
      uuidReferenceIds.applicationIds.length
        ? supabase
            .from("job_applications")
            .select("id, applicant_name, applicant_email, job_posting_id")
            .in("id", uuidReferenceIds.applicationIds)
        : Promise.resolve({ data: [] }),
      uuidReferenceIds.documentIds.length
        ? supabase.from("staff_documents").select("id, candidate_id").in("id", uuidReferenceIds.documentIds)
        : Promise.resolve({ data: [] }),
      uuidReferenceIds.rosterMemberIds.length
        ? supabase.from("staff_members").select("id, name, full_name, email").in("id", uuidReferenceIds.rosterMemberIds)
        : Promise.resolve({ data: [] }),
    ])

    const documents = (documentsResult.data ?? []) as Record<string, unknown>[]
    const candidateIdByDocumentId = new Map<string, string>(
      documents
        .filter((row) => typeof row.id === "string" && typeof row.candidate_id === "string")
        .map((row) => [String(row.id), String(row.candidate_id)])
    )
    const documentCandidateIds = documents
      .map((row) => (typeof row.candidate_id === "string" ? row.candidate_id : null))
      .filter((id): id is string => Boolean(id))

    const candidateIds = filterUuidIds([...uuidReferenceIds.candidateIds, ...documentCandidateIds])
    const candidatesResult = candidateIds.length
      ? await supabase
          .from("staff_onboarding_candidates")
          .select("id, name, full_name, email, application_id, job_application_id, job_posting_id, position")
          .in("id", candidateIds)
      : { data: [] }

    const applications = (applicationsResult.data ?? []) as Record<string, unknown>[]
    const candidates = (candidatesResult.data ?? []) as Record<string, unknown>[]
    const rosterMembers = (rosterMembersResult.data ?? []) as Record<string, unknown>[]
    const hydratedJobIds = filterUuidIds([
      ...uuidReferenceIds.jobIds,
      ...applications.map((row) => (typeof row.job_posting_id === "string" ? row.job_posting_id : null)),
      ...candidates.map((row) => (typeof row.job_posting_id === "string" ? row.job_posting_id : null)),
    ])

    const jobsResult = hydratedJobIds.length
      ? await supabase.from("job_posting_templates").select("id, title, position").in("id", hydratedJobIds)
      : { data: [] }

    const applicationsById = new Map<string, AuditApplicationSummary>(
      applications.map((row) => [
        String(row.id),
        {
          id: String(row.id),
          applicantName: typeof row.applicant_name === "string" ? row.applicant_name : null,
          applicantEmail: typeof row.applicant_email === "string" ? row.applicant_email : null,
          jobId: typeof row.job_posting_id === "string" ? row.job_posting_id : null,
        },
      ])
    )

    const candidatesById = new Map<string, AuditCandidateSummary>(
      candidates.map((row) => [
        String(row.id),
        {
          id: String(row.id),
          name: typeof row.name === "string" ? row.name : typeof row.full_name === "string" ? row.full_name : null,
          email: typeof row.email === "string" ? row.email : null,
          applicationId:
            typeof row.job_application_id === "string"
              ? row.job_application_id
              : typeof row.application_id === "string"
                ? row.application_id
                : null,
          jobId: typeof row.job_posting_id === "string" ? row.job_posting_id : null,
          position: typeof row.position === "string" ? row.position : null,
        },
      ])
    )

    const rosterMembersById = new Map<string, AuditRosterMemberSummary>(
      rosterMembers.map((row) => [
        String(row.id),
        {
          id: String(row.id),
          name: typeof row.name === "string" ? row.name : typeof row.full_name === "string" ? row.full_name : null,
          email: typeof row.email === "string" ? row.email : null,
        },
      ])
    )

    const jobsById = new Map<string, AuditJobSummary>(
      ((jobsResult.data ?? []) as Record<string, unknown>[]).map((row) => [
        String(row.id),
        {
          id: String(row.id),
          title: typeof row.title === "string" ? row.title : null,
          position: typeof row.position === "string" ? row.position : null,
        },
      ])
    )

    const events: HiringAuditActivity[] = rows.map((row) =>
      presentHiringAuditActivity(row, {
        applicationsById,
        candidatesById,
        candidateIdByDocumentId,
        rosterMembersById,
        jobsById,
      })
    )

    return ok(events)
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

  async approveOnboardingCandidate({
    supabase,
    actor,
    candidateId,
    notes,
  }: EmployerScopedArgs & { candidateId: string; notes?: string | null }): Promise<
    HiringServiceResult<{
      candidate: Record<string, unknown>
      rosterMember: Record<string, unknown> | null
      notificationSent: boolean
    }>
  > {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data: candidate, error: lookupError } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .maybeSingle()

    if (lookupError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: lookupError })
    }
    if (!candidate) {
      return fail({ code: "NOT_FOUND", message: "Onboarding candidate was not found." })
    }

    const status = typeof candidate.status === "string" ? candidate.status : ""
    const stage = typeof candidate.stage === "string" ? candidate.stage : ""
    const alreadyApproved = status === "completed" || stage === "approved" || status === "approved"
    const isSubmittedForReview = status === "submitted" || stage === "review"

    if (!alreadyApproved && !isSubmittedForReview) {
      return fail({
        code: "VALIDATION_ERROR",
        message: "Candidate must submit onboarding before approval.",
        details: { status, stage },
      })
    }

    const { data: documents, error: documentsError } = await supabase
      .from("staff_documents")
      .select("id, status, required, label, document_type")
      .eq("candidate_id", candidateId)

    if (documentsError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding documents.", details: documentsError })
    }

    const documentRows = (documents ?? []) as Array<{
      id: string
      status?: string | null
      required?: boolean | null
      label?: string | null
      document_type?: string | null
    }>

    const blockingDocs = documentRows.filter((doc) => {
      if (!doc.required) return false
      const docStatus = typeof doc.status === "string" ? doc.status : "missing"
      return docStatus === "missing" || docStatus === "rejected" || docStatus === "expired"
    })

    if (blockingDocs.length > 0) {
      return fail({
        code: "VALIDATION_ERROR",
        message: "Resolve required document issues before approving.",
        details: {
          documents: blockingDocs.map((doc) => ({
            id: doc.id,
            status: doc.status,
            label: doc.label ?? doc.document_type ?? "Document",
          })),
        },
      })
    }

    const pendingDocIds = documentRows
      .filter((doc) => {
        const docStatus = typeof doc.status === "string" ? doc.status : ""
        return docStatus === "uploaded" || docStatus === "needs_review" || docStatus === "pending"
      })
      .map((doc) => doc.id)

    if (pendingDocIds.length > 0) {
      const { error: bulkApproveError } = await supabase
        .from("staff_documents")
        .update({
          status: "approved",
          reviewed_by: actor.userId,
          reviewed_at: getNowIso(),
        })
        .in("id", pendingDocIds)

      if (bulkApproveError) {
        return fail({
          code: "DATABASE_ERROR",
          message: "Unable to approve pending onboarding documents.",
          details: bulkApproveError,
        })
      }
    }

    const now = getNowIso()
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      stage: "approved",
      onboarding_progress: 100,
      compliance_status: "approved",
      approved_by: actor.userId,
      approved_at: now,
      updated_at: now,
    }
    if (notes?.trim()) updatePayload.notes = notes.trim()

    const { data: updated, error: updateError } = await supabase
      .from("staff_onboarding_candidates")
      .update(updatePayload)
      .eq("id", candidateId)
      .select("*")
      .single()

    if (updateError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to approve onboarding candidate.", details: updateError })
    }

    const userId =
      (typeof updated.user_id === "string" && updated.user_id) ||
      (typeof updated.applicant_id === "string" && updated.applicant_id) ||
      null

    let rosterMember: Record<string, unknown> | null = null
    let notificationSent = false

    if (userId) {
      try {
        const rosterService = new HiringRosterService({ supabase })
        const member = await rosterService.upsertRosterFromCompletedOnboarding({
          employer: actor.employer,
          actorUserId: actor.userId,
          candidateId,
        })

        if (member) {
          rosterMember = {
            id: member.id,
            userId: member.userId,
            status: member.status,
            complianceStatus: member.complianceStatus,
            position: member.position,
            department: member.department,
          }
        }

        const employerName =
          actor.employer.displayName ||
          (await resolveHiringEntityDisplayName({
            supabase,
            entityType: actor.employer.entityType,
            entityId: actor.employer.entityId,
          }))

        const notifyResult = await sendRosterAddedNotification({
          workerUserId: userId,
          candidateId,
          staffMemberId: member?.id ?? null,
          jobTitle:
            (typeof updated.position === "string" && updated.position) ||
            (typeof updated.role === "string" && updated.role) ||
            null,
          employerName,
          employerEntityType: actor.employer.entityType,
          employerEntityId: actor.employer.entityId,
        })
        notificationSent = notifyResult.sent
      } catch (rosterError) {
        console.error("[approveOnboardingCandidate] roster finalize failed", rosterError)
        return fail({
          code: "DATABASE_ERROR",
          message: "Onboarding was approved, but adding the worker to the roster failed.",
          details: rosterError,
        })
      }
    }

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "onboarding_candidate_approved",
      entityTable: "staff_onboarding_candidates",
      entityId: candidateId,
      applicationId:
        (typeof updated.job_application_id === "string" && updated.job_application_id) ||
        (typeof updated.application_id === "string" && updated.application_id) ||
        null,
      metadata: {
        roster_member_id: rosterMember && typeof rosterMember.id === "string" ? rosterMember.id : null,
        notification_sent: notificationSent,
        user_id: userId,
        documents_auto_approved: pendingDocIds.length,
      },
    })

    return ok({
      candidate: updated as Record<string, unknown>,
      rosterMember,
      notificationSent,
    })
  },

  async requestOnboardingChanges({
    supabase,
    actor,
    candidateId,
    notes,
  }: EmployerScopedArgs & { candidateId: string; notes?: string | null }): Promise<
    HiringServiceResult<{ candidate: Record<string, unknown>; notificationSent: boolean; onboardingUrl: string | null }>
  > {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const trimmedNotes = notes?.trim() ?? ""
    if (!trimmedNotes) {
      return fail({ code: "VALIDATION_ERROR", message: "Notes are required when requesting changes." })
    }

    const { data: candidate, error: lookupError } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .maybeSingle()

    if (lookupError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: lookupError })
    }
    if (!candidate) {
      return fail({ code: "NOT_FOUND", message: "Onboarding candidate was not found." })
    }

    const status = typeof candidate.status === "string" ? candidate.status : ""
    const stage = typeof candidate.stage === "string" ? candidate.stage : ""
    const isSubmittedForReview = status === "submitted" || stage === "review"
    if (!isSubmittedForReview) {
      return fail({
        code: "VALIDATION_ERROR",
        message: "Only submitted onboarding can be sent back for changes.",
        details: { status, stage },
      })
    }

    const now = getNowIso()
    const { data: updated, error: updateError } = await supabase
      .from("staff_onboarding_candidates")
      .update({
        status: "needs_revision",
        stage: "onboarding",
        compliance_status: "blocked",
        notes: trimmedNotes,
        updated_at: now,
      })
      .eq("id", candidateId)
      .select("*")
      .single()

    if (updateError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to request onboarding changes.", details: updateError })
    }

    let invitationToken =
      (typeof updated.invitation_token === "string" && updated.invitation_token) ||
      (typeof candidate.invitation_token === "string" && candidate.invitation_token) ||
      null

    let invitationId: string | null = null
    if (invitationToken) {
      const byToken = await supabase
        .from("staff_invitations")
        .select("id, token")
        .eq("token", invitationToken)
        .maybeSingle()
      if (byToken.data && typeof (byToken.data as { id?: string }).id === "string") {
        invitationId = (byToken.data as { id: string }).id
      }
    }

    if (!invitationId && typeof candidate.id === "string") {
      const byCandidate = await supabase
        .from("staff_invitations")
        .select("id, token")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (byCandidate.data) {
        const row = byCandidate.data as { id?: string; token?: string }
        if (typeof row.id === "string") invitationId = row.id
        if (!invitationToken && typeof row.token === "string") invitationToken = row.token
      }
    }

    if (invitationId) {
      await supabase
        .from("staff_invitations")
        .update({ status: "pending", updated_at: now })
        .eq("id", invitationId)
    }

    // Clear completed_at on response rows so resubmit is not treated as already submitted.
    await supabase
      .from("onboarding_responses")
      .update({ completed_at: null, updated_at: now })
      .eq("candidate_id", candidateId)

    const onboardingUrl = invitationToken ? buildAbsoluteOnboardingUrl(invitationToken) : null

    const workerUserId =
      (typeof updated.user_id === "string" && updated.user_id) ||
      (typeof updated.applicant_id === "string" && updated.applicant_id) ||
      null

    let notificationSent = false
    if (workerUserId) {
      const employerName =
        actor.employer.displayName ||
        (await resolveHiringEntityDisplayName({
          supabase,
          entityType: actor.employer.entityType,
          entityId: actor.employer.entityId,
        }))

      const notifyResult = await sendOnboardingChangesRequestedNotification({
        workerUserId,
        candidateId,
        notes: trimmedNotes,
        onboardingUrl,
        jobTitle:
          (typeof updated.position === "string" && updated.position) ||
          (typeof updated.role === "string" && updated.role) ||
          null,
        employerName,
        employerEntityType: actor.employer.entityType,
        employerEntityId: actor.employer.entityId,
      })
      notificationSent = notifyResult.sent
    }

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "onboarding_candidate_changes_requested",
      entityTable: "staff_onboarding_candidates",
      entityId: candidateId,
      applicationId:
        (typeof updated.job_application_id === "string" && updated.job_application_id) ||
        (typeof updated.application_id === "string" && updated.application_id) ||
        null,
      metadata: {
        notes: trimmedNotes,
        notification_sent: notificationSent,
        onboarding_url: onboardingUrl,
      },
      fromStatus: status,
      toStatus: "needs_revision",
    })

    return ok({
      candidate: updated as Record<string, unknown>,
      notificationSent,
      onboardingUrl,
    })
  },

  async rejectOnboardingCandidate({
    supabase,
    actor,
    candidateId,
    notes,
  }: EmployerScopedArgs & { candidateId: string; notes?: string | null }): Promise<
    HiringServiceResult<{ candidate: Record<string, unknown> }>
  > {
    const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
    if (!permission.ok) return permission

    const { data: candidate, error: lookupError } = await supabase
      .from("staff_onboarding_candidates")
      .select("id, status, stage, application_id, job_application_id")
      .eq("id", candidateId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .maybeSingle()

    if (lookupError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding candidate.", details: lookupError })
    }
    if (!candidate) {
      return fail({ code: "NOT_FOUND", message: "Onboarding candidate was not found." })
    }

    const now = getNowIso()
    const updatePayload: Record<string, unknown> = {
      status: "rejected",
      stage: "rejected",
      compliance_status: "rejected",
      updated_at: now,
    }
    if (notes?.trim()) updatePayload.notes = notes.trim()

    const { data: updated, error: updateError } = await supabase
      .from("staff_onboarding_candidates")
      .update(updatePayload)
      .eq("id", candidateId)
      .select("*")
      .single()

    if (updateError) {
      return fail({ code: "DATABASE_ERROR", message: "Unable to reject onboarding candidate.", details: updateError })
    }

    await insertHiringAuditEvent({
      supabase,
      actor,
      eventType: "onboarding_candidate_rejected",
      entityTable: "staff_onboarding_candidates",
      entityId: candidateId,
      applicationId:
        (typeof candidate.job_application_id === "string" && candidate.job_application_id) ||
        (typeof candidate.application_id === "string" && candidate.application_id) ||
        null,
      metadata: { notes: notes?.trim() || null },
    })

    return ok({ candidate: updated as Record<string, unknown> })
  },
}
