import type {
  CandidateKanbanColumn,
  CandidateKanbanColumnId,
  CandidateKanbanFilters,
  CandidateStage,
  CandidateStatus,
  HiringCandidate,
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

export function getCandidateKanbanColumnId(candidate: HiringCandidate): CandidateKanbanColumnId {
  if (candidate.status === "rejected" || candidate.stage === "rejected") return "rejected"
  if (candidate.status === "completed" || candidate.stage === "approved") return "completed"
  if (candidate.status === "submitted" || candidate.stage === "review") return "submitted"
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

    return matchesSearch && matchesDepartment && matchesPosition && matchesCompliance && matchesStatus
  })
}

export function getCandidateStatusLabel(status: CandidateStatus): string {
  const labels: Record<CandidateStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    submitted: "Submitted",
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
