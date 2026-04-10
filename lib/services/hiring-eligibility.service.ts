import type { SupabaseClient } from '@supabase/supabase-js'
import {
  decryptCredentialRecords,
  summarizeCredentialRecords,
  type EmployeeCredentialSummary,
} from '@/lib/security/employee-credentials-vault'

export type HiringEligibilityMode = 'off' | 'shadow' | 'enforce'

export interface HiringChecklistItem {
  key:
    | 'verified_credentials'
    | 'required_certifications'
    | 'signed_agreements'
    | 'verified_endorsements'
    | 'work_history'
    | 'trusted_connections'
  label: string
  required: boolean
  is_passed: boolean
  reason_code?: string
  evidence: Record<string, unknown>
}

export interface HiringEligibilityAssessment {
  mode: HiringEligibilityMode
  is_eligible: boolean
  blocking_reasons: string[]
  checklist: HiringChecklistItem[]
  summary: {
    application_id: string
    applicant_id: string
    venue_id: string
    job_posting_id: string
    required_certifications: string[]
    verified_documents_count: number
    verified_endorsements_count: number
    accepted_agreements_count: number
    completed_achievements_count: number
    reward_tier: string | null
    reward_points: number
    followers_count: number
  }
}

export class HiringEligibilityGateError extends Error {
  status = 409
  code = 'HIRING_ELIGIBILITY_BLOCKED'
  assessment: HiringEligibilityAssessment

  constructor(assessment: HiringEligibilityAssessment) {
    super('Hiring eligibility gate blocked approval')
    this.assessment = assessment
  }
}

export function getHiringEligibilityMode(): HiringEligibilityMode {
  const raw = (process.env.FEATURE_HIRING_ELIGIBILITY_GATE || '').toLowerCase().trim()
  if (!raw || raw === '0' || raw === 'off' || raw === 'false') return 'off'
  if (raw === 'shadow') return 'shadow'
  return 'enforce'
}

export function isHiringEligibilityGateError(error: unknown): error is HiringEligibilityGateError {
  return Boolean(error && typeof error === 'object' && (error as any).code === 'HIRING_ELIGIBILITY_BLOCKED')
}

export async function evaluateHiringEligibility(args: {
  supabase: SupabaseClient
  applicationId: string
}): Promise<HiringEligibilityAssessment> {
  const mode = getHiringEligibilityMode()
  const { data: application, error: applicationError } = await args.supabase
    .from('job_applications')
    .select('id, applicant_id, venue_id, job_posting_id')
    .eq('id', args.applicationId)
    .single()

  if (applicationError || !application)
    throw new Error('Application not found for eligibility evaluation')

  const { data: posting } = await args.supabase
    .from('job_posting_templates')
    .select('id, required_certifications')
    .eq('id', application.job_posting_id)
    .maybeSingle()

  const requiredCertifications = (posting?.required_certifications || []).map((cert: string) => String(cert))

  const [documentsResult, agreementsResult, endorsementsResult, walletResult, achievementsResult, followersResult, candidateResult] =
    await Promise.all([
      args.supabase
        .from('staff_documents')
        .select('id, document_type, verified_status, expires_at, candidate_id, metadata, created_at')
        .eq('owner_user_id', application.applicant_id)
        .eq('verified_status', 'approved'),
      args.supabase
        .from('agreement_acceptances')
        .select('id, organization_id, accepted_at, template_id, template_version, context')
        .eq('user_id', application.applicant_id),
      args.supabase
        .from('endorsements')
        .select('id, skill, category, level, is_verified, is_active, created_at, event_id, job_id, project_id')
        .eq('endorsee_id', application.applicant_id)
        .eq('is_verified', true)
        .eq('is_active', true),
      args.supabase
        .from('user_reward_wallets')
        .select('tier, total_points')
        .eq('user_id', application.applicant_id)
        .maybeSingle(),
      args.supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', application.applicant_id)
        .eq('is_completed', true),
      args.supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', application.applicant_id),
      args.supabase
        .from('staff_onboarding_candidates')
        .select('id, onboarding_responses')
        .eq('application_id', args.applicationId)
        .maybeSingle(),
    ])

  const documentRows = (documentsResult.data || []).filter((doc: any) => {
    if (!doc.expires_at) return true
    return new Date(doc.expires_at).getTime() > Date.now()
  })

  const secureCredentialSummaries = extractSecureCredentialSummaries(candidateResult.data?.onboarding_responses)
  const secureVerifiedCount = secureCredentialSummaries.filter((summary) => summary.verified).length

  const normalizedDocTypes = new Set(
    documentRows.map((doc: any) => normalizeCertificationToken(doc.document_type || ''))
  )
  const matchedRequiredCertifications = requiredCertifications.filter((certification: string) =>
    normalizedDocTypes.has(normalizeCertificationToken(certification))
  )

  const validAgreements = (agreementsResult.data || []).filter((agreement: any) => {
    if (!agreement.organization_id) return true
    return agreement.organization_id === application.venue_id
  })

  const verifiedDocumentsCount = documentRows.length + secureVerifiedCount
  const verifiedEndorsementsCount = endorsementsResult.data?.length || 0
  const acceptedAgreementsCount = validAgreements.length
  const completedAchievementsCount = achievementsResult.data?.length || 0
  const followersCount = followersResult.count || 0

  const requiresEndorsement = process.env.FEATURE_HIRING_GATE_REQUIRE_ENDORSEMENT === '1'

  const checklist: HiringChecklistItem[] = [
    {
      key: 'verified_credentials',
      label: 'Verified credentials on file',
      required: true,
      is_passed: verifiedDocumentsCount > 0,
      reason_code: verifiedDocumentsCount > 0 ? undefined : 'missing_verified_document',
      evidence: {
        verified_documents_count: verifiedDocumentsCount,
        approved_document_rows: documentRows.length,
        secure_verified_credentials: secureVerifiedCount,
      },
    },
    {
      key: 'required_certifications',
      label: 'Required certifications verified',
      required: requiredCertifications.length > 0,
      is_passed:
        requiredCertifications.length === 0 ||
        matchedRequiredCertifications.length >= requiredCertifications.length,
      reason_code:
        requiredCertifications.length > 0 &&
        matchedRequiredCertifications.length < requiredCertifications.length
          ? 'required_certifications_missing'
          : undefined,
      evidence: {
        required_certifications: requiredCertifications,
        matched_certifications: matchedRequiredCertifications,
      },
    },
    {
      key: 'signed_agreements',
      label: 'Signed organization agreements',
      required: true,
      is_passed: acceptedAgreementsCount > 0,
      reason_code: acceptedAgreementsCount > 0 ? undefined : 'agreement_not_signed',
      evidence: {
        accepted_agreements_count: acceptedAgreementsCount,
      },
    },
    {
      key: 'verified_endorsements',
      label: 'Verified endorsements',
      required: requiresEndorsement,
      is_passed: verifiedEndorsementsCount > 0,
      reason_code:
        requiresEndorsement && verifiedEndorsementsCount === 0
          ? 'missing_verified_endorsements'
          : undefined,
      evidence: {
        verified_endorsements_count: verifiedEndorsementsCount,
      },
    },
    {
      key: 'work_history',
      label: 'Verified work achievement history',
      required: false,
      is_passed: completedAchievementsCount > 0 || Number(walletResult.data?.total_points || 0) > 0,
      evidence: {
        completed_achievements_count: completedAchievementsCount,
        reward_points: Number(walletResult.data?.total_points || 0),
        reward_tier: walletResult.data?.tier || null,
      },
    },
    {
      key: 'trusted_connections',
      label: 'Network reputation signals',
      required: false,
      is_passed: followersCount > 0,
      evidence: {
        followers_count: followersCount,
      },
    },
  ]

  const blockingReasons = checklist
    .filter((item) => item.required && !item.is_passed && item.reason_code)
    .map((item) => String(item.reason_code))

  return {
    mode,
    is_eligible: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
    checklist,
    summary: {
      application_id: application.id,
      applicant_id: application.applicant_id,
      venue_id: application.venue_id,
      job_posting_id: application.job_posting_id,
      required_certifications: requiredCertifications,
      verified_documents_count: verifiedDocumentsCount,
      verified_endorsements_count: verifiedEndorsementsCount,
      accepted_agreements_count: acceptedAgreementsCount,
      completed_achievements_count: completedAchievementsCount,
      reward_tier: walletResult.data?.tier || null,
      reward_points: Number(walletResult.data?.total_points || 0),
      followers_count: followersCount,
    },
  }
}

export async function enforceHiringEligibilityGate(args: {
  supabase: SupabaseClient
  applicationId: string
}) {
  const assessment = await evaluateHiringEligibility(args)
  if (assessment.mode !== 'enforce') return assessment
  if (assessment.is_eligible) return assessment
  throw new HiringEligibilityGateError(assessment)
}

export async function recordHiringEligibilitySnapshot(args: {
  supabase: SupabaseClient
  assessment: HiringEligibilityAssessment
  actorUserId?: string | null
}) {
  await args.supabase.from('hiring_eligibility_snapshots').insert({
    application_id: args.assessment.summary.application_id,
    applicant_id: args.assessment.summary.applicant_id,
    venue_id: args.assessment.summary.venue_id,
    job_posting_id: args.assessment.summary.job_posting_id,
    is_eligible: args.assessment.is_eligible,
    mode: args.assessment.mode,
    blocking_reasons: args.assessment.blocking_reasons,
    checklist: args.assessment.checklist,
    evidence: args.assessment.summary,
    actor_user_id: args.actorUserId || null,
  })
}

function normalizeCertificationToken(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/^certification:/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractSecureCredentialSummaries(
  onboardingResponses?: Record<string, any> | null
): EmployeeCredentialSummary[] {
  const secureCredentials = onboardingResponses?.secure_credentials
  if (!secureCredentials?.envelope) return []
  try {
    const records = decryptCredentialRecords(secureCredentials.envelope)
    return summarizeCredentialRecords(records)
  } catch {
    return []
  }
}
