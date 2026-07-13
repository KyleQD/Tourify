#!/usr/bin/env tsx
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import { createClient } from "@supabase/supabase-js"

import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import type { HiringActor, HiringEntityType } from "@/types/hiring-entity"

interface FlowConfig {
  key: string
  entityType: HiringEntityType
  entityId: string
  actorUserId: string
  applicantUserId: string
  venueScopeId?: string
}

interface FlowResult {
  key: string
  status: "pass" | "fail"
  steps: Array<{ name: string; status: "pass" | "fail"; detail?: string }>
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function buildActor(flow: FlowConfig): HiringActor {
  return {
    userId: flow.actorUserId,
    employer: {
      entityType: flow.entityType,
      entityId: flow.entityId,
      displayName: `${flow.key} staging validation`,
      scope: flow.venueScopeId ? { venueId: flow.venueScopeId } : undefined,
    },
  }
}

function buildMinimalResponses(): Record<string, unknown> {
  return {
    legal_name: "Staging Test Worker",
    phone: "555-0100",
    work_authorization: true,
    government_id: { submitted: true, redacted: true },
    w9_or_tax_form: { submitted: true, redacted: true },
    worker_waiver: true,
  }
}

async function ensureApplicantEligibilityFixtures(args: {
  supabase: ReturnType<typeof createClient>
  applicantUserId: string
  venueId: string
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { supabase, applicantUserId, venueId } = args

  const { data: existingDocument } = await supabase
    .from("staff_documents")
    .select("id")
    .eq("owner_user_id", applicantUserId)
    .eq("verified_status", "approved")
    .limit(1)
    .maybeSingle()

  if (!existingDocument) {
    let teamMemberId: string | null = null
    const { data: existingTeamMember } = await supabase
      .from("venue_team_members")
      .select("id")
      .eq("venue_id", venueId)
      .eq("user_id", applicantUserId)
      .maybeSingle()

    teamMemberId = existingTeamMember?.id ?? null

    if (!teamMemberId) {
      const { data: createdTeamMember, error: teamMemberError } = await supabase
        .from("venue_team_members")
        .insert({
          venue_id: venueId,
          user_id: applicantUserId,
          name: "Staging Applicant",
          email: `staging+eligibility@example.test`,
          role: "staff",
          status: "inactive",
        })
        .select("id")
        .single()

      if (teamMemberError || !createdTeamMember) {
        return { ok: false, detail: teamMemberError?.message ?? "Unable to create venue team member fixture." }
      }

      teamMemberId = String(createdTeamMember.id)
    }

    const { error: documentError } = await supabase.from("staff_documents").insert({
      staff_member_id: teamMemberId,
      venue_id: venueId,
      owner_user_id: applicantUserId,
      employer_entity_type: "venue",
      employer_entity_id: venueId,
      document_name: "Staging eligibility ID",
      document_type: "id",
      file_url: "private://staging/eligibility/id.pdf",
      upload_date: new Date().toISOString().slice(0, 10),
      verified_status: "approved",
      storage_bucket: "staff-documents-private",
      storage_path: `staging/${applicantUserId}/id.pdf`,
    })

    if (documentError) return { ok: false, detail: documentError.message }
  }

  const { data: existingAgreement } = await supabase
    .from("agreement_acceptances")
    .select("id")
    .eq("user_id", applicantUserId)
    .limit(1)
    .maybeSingle()

  if (!existingAgreement) {
    const { error: agreementError } = await supabase.from("agreement_acceptances").insert({
      template_version: 1,
      user_id: applicantUserId,
      accepted_at: new Date().toISOString(),
      metadata: { source: "phase13_staging_e2e" },
    })

    if (agreementError) return { ok: false, detail: agreementError.message }
  }

  return { ok: true }
}

async function runFlow(flow: FlowConfig): Promise<FlowResult> {
  const supabase = createClient(readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const actor = buildActor(flow)
  const steps: FlowResult["steps"] = []

  const jobResult = await HiringOnboardingService.createJobPosting({
    supabase,
    actor,
    data: {
      title: `[STAGING-E2E] ${flow.key} ${Date.now()}`,
      description: "Staging validation job posting",
      department: flow.entityType === "artist" ? "Tour Crew" : "Security",
      position: flow.entityType === "artist" ? "FOH Engineer" : "Security Guard",
      employment_type: "contractor",
      location: "TBD",
      status: "published",
      required_certifications: [],
    },
  })

  if (!jobResult.ok) {
    const detail =
      typeof jobResult.error.details === "object" &&
      jobResult.error.details &&
      "message" in jobResult.error.details
        ? String((jobResult.error.details as { message?: string }).message)
        : jobResult.error.message
    steps.push({ name: "create job posting", status: "fail", detail })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "create job posting", status: "pass" })

  const jobId = String(jobResult.data.id)
  const employerColumns = {
    employer_entity_type: flow.entityType,
    employer_entity_id: flow.entityId,
    venue_id: flow.entityType === "venue" ? flow.entityId : flow.venueScopeId ?? null,
  }

  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .insert({
      ...employerColumns,
      job_posting_id: jobId,
      applicant_id: flow.applicantUserId,
      applicant_name: "Staging Applicant",
      applicant_email: `staging+${flow.key}@example.test`,
      status: "pending",
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (applicationError || !application) {
    steps.push({ name: "submit application", status: "fail", detail: applicationError?.message })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "submit application", status: "pass" })

  const venueId = flow.entityType === "venue" ? flow.entityId : flow.venueScopeId ?? flow.entityId
  const eligibilityFixtures = await ensureApplicantEligibilityFixtures({
    supabase,
    applicantUserId: flow.applicantUserId,
    venueId,
  })

  if (!eligibilityFixtures.ok) {
    steps.push({ name: "seed eligibility fixtures", status: "fail", detail: eligibilityFixtures.detail })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "seed eligibility fixtures", status: "pass" })

  const approvalResult = await HiringOnboardingService.approveApplication({
    supabase,
    actor,
    applicationId: String(application.id),
    note: "Staging validation approval",
  })

  if (!approvalResult.ok) {
    const detail =
      typeof approvalResult.error.details === "object" &&
      approvalResult.error.details &&
      "message" in approvalResult.error.details
        ? String((approvalResult.error.details as { message?: string }).message)
        : approvalResult.error.message
    steps.push({ name: "approve application", status: "fail", detail })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "approve application", status: "pass" })

  const candidate = approvalResult.data.candidate as Record<string, unknown>
  const invitation = approvalResult.data.invitation as Record<string, unknown>
  const token = typeof invitation.token === "string" ? invitation.token : null

  if (!token) {
    steps.push({ name: "invitation token created", status: "fail", detail: "Missing invitation token" })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "invitation token created", status: "pass" })

  const payloadResult = await HiringOnboardingService.getTokenOnboardingPayload({ supabase, token })
  if (!payloadResult.ok) {
    steps.push({ name: "token onboarding payload", status: "fail", detail: payloadResult.error.message })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "token onboarding payload", status: "pass" })

  const submitResult = await HiringOnboardingService.submitTokenOnboarding({
    supabase,
    token,
    responses: buildMinimalResponses(),
    completedByUserId: flow.applicantUserId,
    completed: true,
  })

  if (!submitResult.ok) {
    steps.push({ name: "complete onboarding", status: "fail", detail: submitResult.error.message })
    return { key: flow.key, status: "fail", steps }
  }
  steps.push({ name: "complete onboarding", status: "pass" })

  const staffMember = submitResult.data.staffMember as Record<string, unknown> | null
  const employmentAssignment = submitResult.data.employmentAssignment as Record<string, unknown> | null
  const candidateRow = submitResult.data.candidate as Record<string, unknown> | null

  if (!staffMember?.id) {
    steps.push({ name: "staff_members row", status: "fail", detail: "No staff member created" })
  } else {
    steps.push({ name: "staff_members row", status: "pass" })
  }

  const permissions = employmentAssignment?.permissions
  const hasPermissions =
    permissions &&
    typeof permissions === "object" &&
    !Array.isArray(permissions) &&
    Object.keys(permissions as Record<string, unknown>).length > 0

  if (!employmentAssignment?.id || !hasPermissions) {
    steps.push({
      name: "employment_assignments + Work Mode permissions",
      status: "fail",
      detail: "Missing assignment or empty permissions",
    })
  } else {
    steps.push({ name: "employment_assignments + Work Mode permissions", status: "pass" })
  }

  const storedResponses = candidateRow?.onboarding_responses as Record<string, unknown> | undefined
  const govId = storedResponses?.government_id
  const piiRedacted =
    govId &&
    typeof govId === "object" &&
    (govId as Record<string, unknown>).redacted === true &&
    !(govId as Record<string, unknown>).value

  if (!piiRedacted) {
    steps.push({ name: "PII redacted in onboarding JSON", status: "fail", detail: "Sensitive field not redacted" })
  } else {
    steps.push({ name: "PII redacted in onboarding JSON", status: "pass" })
  }

  if (
    candidateRow?.employer_entity_type !== flow.entityType ||
    candidateRow?.employer_entity_id !== flow.entityId
  ) {
    steps.push({ name: "employer scope correct", status: "fail", detail: "Candidate employer scope mismatch" })
  } else {
    steps.push({ name: "employer scope correct", status: "pass" })
  }

  const failed = steps.some((step) => step.status === "fail")
  return { key: flow.key, status: failed ? "fail" : "pass", steps }
}

async function main() {
  const flows: FlowConfig[] = [
    {
      key: "venue",
      entityType: "venue" as const,
      entityId: readRequiredEnv("PHASE13_VENUE_SECURITY_ENTITY_ID"),
      actorUserId: process.env.PHASE13_VENUE_SECURITY_ACTOR_USER_ID || "",
      applicantUserId: process.env.PHASE13_STAGING_APPLICANT_USER_ID || "",
    },
    {
      key: "organization",
      entityType: "organization" as const,
      entityId: readRequiredEnv("PHASE13_ORG_STAFFING_ENTITY_ID"),
      actorUserId: process.env.PHASE13_ORG_STAFFING_ACTOR_USER_ID || "",
      applicantUserId: process.env.PHASE13_STAGING_APPLICANT_USER_ID || "",
      venueScopeId: process.env.PHASE13_ORG_STAFFING_VENUE_ID,
    },
    {
      key: "artist",
      entityType: "artist" as const,
      entityId: readRequiredEnv("PHASE13_ARTIST_CREW_ENTITY_ID"),
      actorUserId: process.env.PHASE13_ARTIST_CREW_ACTOR_USER_ID || "",
      applicantUserId: process.env.PHASE13_STAGING_APPLICANT_USER_ID || "",
      venueScopeId: process.env.PHASE13_ARTIST_CREW_VENUE_ID || process.env.PHASE13_VENUE_SECURITY_ENTITY_ID,
    },
  ].filter((flow) => flow.actorUserId && flow.applicantUserId)

  if (flows.length === 0) {
    throw new Error("Configure PHASE13_* entity IDs plus PHASE13_*_ACTOR_USER_ID and PHASE13_STAGING_APPLICANT_USER_ID")
  }

  const results = []
  for (const flow of flows) {
    results.push(await runFlow(flow))
  }

  console.log(JSON.stringify({ results }, null, 2))
  if (results.some((result) => result.status === "fail")) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
