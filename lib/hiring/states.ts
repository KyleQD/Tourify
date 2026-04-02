export const JOB_POSTING_STATUSES = [
  'draft',
  'published',
  'paused',
  'closed',
  'filled',
] as const

export const JOB_APPLICATION_STATUSES = [
  'pending',
  'reviewed',
  'shortlisted',
  'approved',
  'rejected',
  'withdrawn',
] as const

export const HIRING_PIPELINE_STAGES = [
  'application_received',
  'under_review',
  'offer_sent',
  'offer_accepted',
  'onboarding_in_progress',
  'contract_sent',
  'contract_signed',
  'hired',
  'rejected',
] as const

export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number]
export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number]
export type HiringPipelineStage = (typeof HIRING_PIPELINE_STAGES)[number]

export interface HiringMilestone {
  key: HiringPipelineStage
  label: string
  completed: boolean
  completedAt: string | null
}

const milestoneLabels: Record<HiringPipelineStage, string> = {
  application_received: 'Application received',
  under_review: 'Under review',
  offer_sent: 'Offer sent',
  offer_accepted: 'Offer accepted',
  onboarding_in_progress: 'Onboarding in progress',
  contract_sent: 'Contract sent',
  contract_signed: 'Contract signed',
  hired: 'Hired',
  rejected: 'Not selected',
}

export function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return (JOB_APPLICATION_STATUSES as readonly string[]).includes(value)
}

export function buildHiringMilestones(input: {
  applicationStatus: string
  appliedAt?: string | null
  reviewedAt?: string | null
  respondedAt?: string | null
  onboardingStatus?: string | null
  contractStatus?: string | null
  contractUpdatedAt?: string | null
}): HiringMilestone[] {
  const {
    applicationStatus,
    appliedAt = null,
    reviewedAt = null,
    respondedAt = null,
    onboardingStatus = null,
    contractStatus = null,
    contractUpdatedAt = null,
  } = input

  const isReviewed = ['reviewed', 'shortlisted', 'approved', 'rejected'].includes(applicationStatus)
  const isOfferSent = ['shortlisted', 'approved'].includes(applicationStatus)
  const isAccepted = applicationStatus === 'approved'
  const isRejected = applicationStatus === 'rejected'
  const isOnboarding = ['in_progress', 'pending', 'approved'].includes(onboardingStatus || '')
  const isContractSent = contractStatus === 'sent' || contractStatus === 'signed'
  const isContractSigned = contractStatus === 'signed'
  const isHired = isAccepted && (isContractSigned || onboardingStatus === 'completed')

  const milestoneState: Record<HiringPipelineStage, { done: boolean; when: string | null }> = {
    application_received: { done: true, when: appliedAt },
    under_review: { done: isReviewed, when: reviewedAt || respondedAt },
    offer_sent: { done: isOfferSent, when: reviewedAt || respondedAt },
    offer_accepted: { done: isAccepted, when: respondedAt },
    onboarding_in_progress: { done: isOnboarding, when: reviewedAt || respondedAt },
    contract_sent: { done: isContractSent, when: contractUpdatedAt || respondedAt },
    contract_signed: { done: isContractSigned, when: contractUpdatedAt },
    hired: { done: isHired, when: contractUpdatedAt || respondedAt },
    rejected: { done: isRejected, when: respondedAt },
  }

  return HIRING_PIPELINE_STAGES.map((stage) => ({
    key: stage,
    label: milestoneLabels[stage],
    completed: milestoneState[stage].done,
    completedAt: milestoneState[stage].when,
  }))
}
