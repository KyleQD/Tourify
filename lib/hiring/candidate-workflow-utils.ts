import type {
  CandidateKanbanColumn,
  CandidateKanbanColumnId,
  CandidateKanbanFilters,
  CandidateStage,
  CandidateStatus,
  HiringCandidate,
  HiringCandidateWorkflowStep,
  WorkflowStageId,
} from "@/types/hiring-candidate-workflow"

export const CANDIDATE_KANBAN_COLUMN_DEFINITIONS: Array<Omit<CandidateKanbanColumn, "candidates">> = [
  {
    id: "invitation_sent",
    title: "Invitation Sent",
    description: "Approved workers who have an onboarding link but have not started.",
  },
  {
    id: "started",
    title: "Started",
    description: "Workers who opened the onboarding flow or saved a draft.",
  },
  {
    id: "needs_documents",
    title: "Needs Documents",
    description: "Workers missing required documents or blocking compliance items.",
  },
  {
    id: "submitted",
    title: "Submitted",
    description: "Workers who submitted onboarding and need admin review.",
  },
  {
    id: "in_review",
    title: "In Review",
    description: "Submitted onboarding with credentials or docs under review.",
  },
  {
    id: "completed",
    title: "Completed",
    description: "Workers completed onboarding and should have roster/Work Mode output.",
  },
  {
    id: "rejected",
    title: "Rejected",
    description: "Candidates rejected or blocked from onboarding completion.",
  },
]

export const WORKFLOW_STAGES: Array<{ id: WorkflowStageId; label: string; description: string }> = [
  { id: "job_posted", label: "Job Posted", description: "The employer published or prepared the role." },
  { id: "application_received", label: "Application Received", description: "The applicant submitted their job application." },
  { id: "screening", label: "Screening", description: "The employer reviewed application details and eligibility." },
  { id: "invitation_sent", label: "Invitation Sent", description: "The onboarding candidate and invite token were created." },
  { id: "onboarding_started", label: "Onboarding Started", description: "The worker opened the onboarding flow or saved progress." },
  { id: "onboarding_completed", label: "Onboarding Completed", description: "The worker submitted the onboarding form." },
  { id: "review_pending", label: "Review Pending", description: "Employer review is needed for documents, credentials, or final approval." },
  { id: "approved", label: "Approved", description: "The worker is approved for the roster." },
  { id: "team_assigned", label: "Team Assigned", description: "The worker has an active Work Mode assignment or shift context." },
]

const WORKFLOW_STAGE_ORDER: WorkflowStageId[] = WORKFLOW_STAGES.map((stage) => stage.id)

// Signals used to derive the active workflow stage. Accepts a partial candidate so
// this stays a pure function that is easy to unit test.
export type WorkflowDerivationInput = Pick<
  HiringCandidate,
  | "status"
  | "stage"
  | "onboardingProgress"
  | "complianceStatus"
  | "invitationToken"
  | "onboardingDeliveryStatus"
> & {
  application?: Pick<NonNullable<HiringCandidate["application"]>, "status"> | null
  roster?: Pick<NonNullable<HiringCandidate["roster"]>, "workModeStatus" | "employmentAssignmentId"> | null
}

// Map real candidate signals to the furthest workflow stage they have reached.
// Ordered from most-advanced to least so the first match wins.
export function deriveWorkflowStageId(candidate: WorkflowDerivationInput): WorkflowStageId {
  const progress = Number(candidate.onboardingProgress ?? 0)
  const hasActiveRoster =
    candidate.roster?.workModeStatus === "active" || Boolean(candidate.roster?.employmentAssignmentId)

  if (candidate.status === "completed" || candidate.stage === "approved") {
    return hasActiveRoster ? "team_assigned" : "approved"
  }

  if (
    candidate.status === "submitted" ||
    candidate.stage === "review" ||
    candidate.complianceStatus === "pending_review"
  ) {
    return "review_pending"
  }

  if (candidate.status === "needs_revision") return "onboarding_started"

  if (progress >= 100) return "onboarding_completed"

  if (
    candidate.status === "in_progress" ||
    candidate.stage === "onboarding" ||
    candidate.stage === "documents" ||
    candidate.onboardingDeliveryStatus === "in_progress" ||
    progress > 0
  ) {
    return "onboarding_started"
  }

  if (
    candidate.invitationToken ||
    candidate.onboardingDeliveryStatus === "sent" ||
    candidate.application?.status === "approved"
  ) {
    return "invitation_sent"
  }

  if (candidate.application?.status === "submitted") return "application_received"
  if (candidate.application) return "screening"

  return "job_posted"
}

// Build the full 9-stage timeline relative to the derived (or provided) current stage.
// Rejected candidates mark the current stage as blocked instead of resetting.
export function buildWorkflowStepsFromCandidate(
  candidate: WorkflowDerivationInput & Pick<HiringCandidate, "createdAt" | "updatedAt" | "approvedAt" | "completedAt"> & {
    application?: (Pick<NonNullable<HiringCandidate["application"]>, "status"> & { appliedAt?: string | null }) | null
  },
  currentStageId?: WorkflowStageId
): HiringCandidateWorkflowStep[] {
  const isRejected = candidate.status === "rejected" || candidate.stage === "rejected"
  const activeStage = currentStageId ?? deriveWorkflowStageId(candidate)
  const activeIndex = WORKFLOW_STAGE_ORDER.indexOf(activeStage)

  const timestampByStage: Partial<Record<WorkflowStageId, string | null>> = {
    application_received: candidate.application?.appliedAt ?? null,
    invitation_sent: candidate.createdAt ?? null,
    onboarding_started: candidate.updatedAt ?? null,
    onboarding_completed: candidate.completedAt ?? null,
    approved: candidate.approvedAt ?? candidate.completedAt ?? null,
  }

  return WORKFLOW_STAGES.map((stage, index) => {
    let status: HiringCandidateWorkflowStep["status"]
    if (index < activeIndex) status = "completed"
    else if (index === activeIndex) status = isRejected ? "blocked" : "active"
    else status = "pending"

    return {
      id: stage.id,
      label: stage.label,
      description: stage.description,
      status,
      timestamp: timestampByStage[stage.id] ?? null,
    }
  })
}

export function getCandidateKanbanColumnId(candidate: HiringCandidate): CandidateKanbanColumnId {
  if (candidate.status === "rejected" || candidate.stage === "rejected") return "rejected"
  if (candidate.status === "completed" || candidate.stage === "approved") return "completed"
  if (candidate.status === "submitted" || candidate.stage === "review") return "submitted"
  if (candidate.status === "needs_revision") return "started"
  if ((candidate.blockingIssueCount ?? 0) > 0 || (candidate.missingRequiredCount ?? 0) > 0) return "needs_documents"
  if (candidate.status === "in_progress" || candidate.stage === "onboarding" || candidate.stage === "documents") return "started"
  return "invitation_sent"
}

export function buildCandidateKanbanColumns(candidates: HiringCandidate[]): CandidateKanbanColumn[] {
  return CANDIDATE_KANBAN_COLUMN_DEFINITIONS.map((definition) => ({
    ...definition,
    candidates: candidates.filter((candidate) => getCandidateKanbanColumnId(candidate) === definition.id),
  }))
}

export function filterCandidates({ candidates, filters }: { candidates: HiringCandidate[]; filters: CandidateKanbanFilters }): HiringCandidate[] {
  return candidates.filter((candidate) => {
    const search = filters.search.trim().toLowerCase()
    const matchesSearch =
      !search ||
      candidate.name.toLowerCase().includes(search) ||
      candidate.email.toLowerCase().includes(search) ||
      candidate.position?.toLowerCase().includes(search) ||
      candidate.department?.toLowerCase().includes(search)

    const matchesDepartment = filters.department === "all" || candidate.department === filters.department
    const matchesPosition = filters.position === "all" || candidate.position === filters.position
    const matchesCompliance = filters.complianceStatus === "all" || candidate.complianceStatus === filters.complianceStatus
    const matchesStatus = filters.status === "all" || candidate.status === filters.status
    const matchesTemplateState =
      !filters.templateState ||
      filters.templateState === "all" ||
      (filters.templateState === "pending"
        ? (candidate.templateState ?? "pending") === "pending"
        : (candidate.templateState ?? "pending") !== "pending")
    const matchesDelivery =
      !filters.deliveryStatus ||
      filters.deliveryStatus === "all" ||
      (candidate.onboardingDeliveryStatus ?? "not_sent") === filters.deliveryStatus

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesPosition &&
      matchesCompliance &&
      matchesStatus &&
      matchesTemplateState &&
      matchesDelivery
    )
  })
}

export function getCandidateStatusLabel(status: CandidateStatus): string {
  const labels: Record<CandidateStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    submitted: "Submitted",
    needs_revision: "Needs Revision",
    completed: "Completed",
    rejected: "Rejected",
    approved: "Approved",
  }

  return labels[status] ?? "Pending"
}

export function getCandidateStageLabel(stage: CandidateStage): string {
  const labels: Record<CandidateStage, string> = {
    invitation: "Invitation",
    onboarding: "Onboarding",
    documents: "Documents",
    review: "Review",
    approved: "Approved",
    rejected: "Rejected",
  }

  return labels[stage] ?? "Invitation"
}

export function getUniqueCandidateValues(candidates: HiringCandidate[], key: "department" | "position"): string[] {
  return Array.from(new Set(candidates.map((candidate) => candidate[key]).filter(Boolean) as string[])).sort()
}

export function resolveCandidateWorkflowStageIndex(stage: WorkflowStageId): number {
  const index = WORKFLOW_STAGES.findIndex((workflowStage) => workflowStage.id === stage)
  return index < 0 ? 0 : index
}
