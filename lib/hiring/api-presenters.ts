import type {
  HiringAuditActivity,
  HiringApplicationListItem,
  HiringDashboardStats,
  HiringJobListItem,
  HiringRosterMemberListItem,
  HiringTemplateListItem,
} from "@/types/hiring-dashboard"
import type { ApplicantProfileSnapshot, HiringApplicationReviewItem } from "@/types/hiring-application-review"
import type { DashboardStats } from "@/types/hiring-service"

type RawRecord = Record<string, unknown>

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {}
}

function asProfileSnapshot(value: unknown): ApplicantProfileSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as Partial<ApplicantProfileSnapshot>
  if (!candidate.basics || typeof candidate.basics !== "object") return null
  return candidate as ApplicantProfileSnapshot
}

function getFirstString(record: RawRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) return value
  }

  return fallback
}

export function presentDashboardStats({
  stats,
  recentActivity = [],
}: {
  stats: DashboardStats
  recentActivity?: HiringAuditActivity[]
}): HiringDashboardStats {
  return {
    totalJobs: stats.jobs.total,
    publishedJobs: stats.jobs.published,
    totalApplications: stats.applications.total,
    pendingApplications: stats.applications.pending,
    approvedApplications: stats.applications.approved,
    rejectedApplications: stats.applications.rejected,
    onboardingTotal: stats.onboarding.total,
    onboardingInProgress: stats.onboarding.inProgress,
    onboardingCompleted: stats.onboarding.completed,
    rosterTotal: stats.roster.total,
    rosterActive: stats.roster.active,
    averageOnboardingProgress: stats.onboarding.averageProgress,
    recentActivity,
  }
}

export function presentJobListItem(row: RawRecord): HiringJobListItem {
  return {
    id: getFirstString(row, ["id"]),
    title: getFirstString(row, ["title"], "Untitled job"),
    department: asString(row.department),
    position: asString(row.position),
    status: asString(row.status),
    numberOfPositions: asNumber(row.number_of_positions),
    createdAt: asString(row.created_at),
    publishedAt: asString(row.published_at),
  }
}

export function presentApplicationReviewItem(row: RawRecord): HiringApplicationReviewItem & HiringApplicationListItem {
  const formResponses = asRecord(row.form_responses)
  const applicantName = getFirstString(row, ["applicant_name", "name", "full_name"], "Unknown applicant")
  const applicantEmail = asString(row.applicant_email) ?? asString(row.email)
  const jobTitle = getFirstString(row, ["job_title", "title", "position"], "Unknown job")
  const jobId = asString(row.job_posting_id) ?? asString(row.job_id) ?? "unknown-job"
  const candidateId = asString(row.candidate_id) ?? asString(row.onboarding_candidate_id)
  const onboardingProgress = asNumber(row.onboarding_progress)
  const isEligible = asBoolean(row.is_eligible)
  const snapshot = asProfileSnapshot(row.profile_snapshot)

  return {
    id: getFirstString(row, ["id"]),
    status: getFirstString(row, ["status"], "pending"),
    appliedAt: asString(row.applied_at) ?? asString(row.created_at),
    reviewedAt: asString(row.reviewed_at),
    rating: asNumber(row.rating),
    reviewerNotes: asString(row.reviewer_notes),
    formResponses,
    applicant: {
      id: asString(row.applicant_id) ?? asString(row.user_id) ?? getFirstString(row, ["id"]),
      name: applicantName,
      email: applicantEmail ?? "",
      phone: asString(row.applicant_phone) ?? asString(row.phone),
      avatarUrl: asString(row.avatar_url) ?? snapshot?.basics.avatarUrl ?? null,
    },
    job: {
      id: jobId,
      title: jobTitle,
      department: asString(row.department),
      position: asString(row.position),
      location: asString(row.location),
      employerEntityType: row.employer_entity_type as HiringApplicationReviewItem["job"]["employerEntityType"],
      employerEntityId: asString(row.employer_entity_id) ?? undefined,
    },
    candidate: candidateId
      ? {
          id: candidateId,
          status: asString(row.candidate_status) ?? asString(row.onboarding_status),
          stage: asString(row.onboarding_stage),
          onboardingProgress,
          invitationToken: asString(row.invitation_token),
          templateId: asString(row.onboarding_template_id),
        }
      : null,
    eligibility: {
      isEligible,
      mode: asString(row.eligibility_mode),
      issues: Array.isArray(row.eligibility_issues) ? row.eligibility_issues.filter((issue): issue is string => typeof issue === "string") : [],
      checkedAt: asString(row.eligibility_checked_at),
    },
    contractStatus: asString(row.contract_status),
    reReviewRequestedAt: asString(row.re_review_requested_at),
    profileSnapshot: snapshot,
    profileSharedAt: asString(row.profile_shared_at),
    isStarred: row.is_starred === true,
    starredAt: asString(row.starred_at),
    applicantName,
    applicantEmail,
    jobTitle,
    department: asString(row.department),
    onboardingStage: asString(row.onboarding_stage),
    isEligible,
  }
}

export function presentRosterMemberListItem(row: RawRecord): HiringRosterMemberListItem {
  const profile = asRecord(row.profile)
  const name = getFirstString(row, ["name", "full_name"], getFirstString(profile, ["fullName", "full_name", "name"], "Unknown worker"))

  return {
    id: getFirstString(row, ["id"]),
    userId: asString(row.user_id),
    name,
    email: asString(row.email) ?? asString(profile.email),
    position: asString(row.position) ?? asString(row.role),
    department: asString(row.department),
    status: getFirstString(row, ["status"], "inactive"),
    complianceStatus: asString(row.compliance_status),
    startedAt: asString(row.started_at) ?? asString(row.created_at),
  }
}

export function presentTemplateListItem(row: RawRecord): HiringTemplateListItem {
  const fields = Array.isArray(row.fields) ? (row.fields as Array<Record<string, unknown>>) : []
  const requiredDocuments = Array.isArray(row.required_documents)
    ? (row.required_documents as unknown[]).map((value) => String(value))
    : []
  const agreementCount = fields.filter(
    (field) => field.type === "waiver" || field.type === "training_acknowledgement"
  ).length

  return {
    id: getFirstString(row, ["id"]),
    name: getFirstString(row, ["name"], "Untitled template"),
    description: asString(row.description),
    department: asString(row.department),
    position: asString(row.position),
    employmentType: asString(row.employment_type),
    isDefault: asBoolean(row.is_default),
    scope: row.scope === "employer" || row.scope === "global"
      ? (row.scope as "employer" | "global")
      : asString(row.employer_entity_type)
        ? "employer"
        : "global",
    parentTemplateId: asString(row.parent_template_id),
    fieldCount: fields.length,
    requiredDocuments,
    agreementCount,
    estimatedDays: asNumber(row.estimated_days),
    updatedAt: asString(row.updated_at) ?? asString(row.created_at),
  }
}
