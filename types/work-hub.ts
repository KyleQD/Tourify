import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"
import type { HiringEntityType } from "@/types/hiring-entity"

export type WorkerApplicationStage =
  | "applied"
  | "under_review"
  | "interview"
  | "approved"
  | "declined"
  | "withdrawn"

export interface WorkerApplicationTimelineStep {
  key: "applied" | "review" | "interview" | "decision" | "onboarding" | "rostered"
  label: string
  state: "complete" | "current" | "upcoming" | "stopped"
  at: string | null
}

export interface WorkerApplication {
  id: string
  source: "artist" | "staffing"
  jobId: string
  title: string
  role: string | null
  department: string | null
  employerEntityType: HiringEntityType | null
  employerEntityId: string | null
  employerName: string | null
  rawStatus: string
  normalizedStatus: WorkerApplicationStage
  appliedAt: string | null
  reviewedAt: string | null
  href: string
  timeline: WorkerApplicationTimelineStep[]
}

export interface WorkerChannelSummary {
  threadId: string
  name: string
  kind: "coordinator" | "team"
  href: string
  unreadCount: number
  latestMessage: string | null
  latestMessageAt: string | null
}

export interface WorkerOperationalSummary {
  tasks: Array<{ id: string; title: string; status: string | null; dueDate: string | null }>
  travel: Array<{ id: string; name: string | null; status: string | null }>
  lodging: Array<{ id: string; roomNumber: string | null; status: string | null }>
}

export interface WorkerTourEvent {
  id: string
  title: string
  startsAt: string | null
  timezone: string | null
  scopeOrigin: "explicit" | "current_events_bulk" | "future_rule"
}

export interface WorkerTour {
  id: string
  membershipId: string
  name: string
  role: string | null
  teamName: string | null
  propagationMode: "current_events" | "current_and_future_events"
  events: WorkerTourEvent[]
  scheduleState: "not_assigned" | "scheduled"
}

export interface WorkerTask {
  id: string
  taskId: string
  title: string
  description: string | null
  state: "assigned" | "acknowledged" | "doing" | "blocked" | "done" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  dueAt: string | null
  blockedReason: string | null
  tourId: string | null
  tourName: string | null
  eventId: string | null
  eventName: string | null
  shiftPlanId: string | null
  shiftTitle: string | null
  href: string
}

export interface WorkerEngagement {
  id: string
  employerEntityType: HiringEntityType
  employerEntityId: string
  employerName: string
  rosterStatus: string
  role: string
  department: string | null
  onboardingProgress: number
  complianceStatus: string | null
  scheduleState: "not_assigned" | "invited" | "scheduled" | "completed"
  coordinatorChannel: WorkerChannelSummary | null
  teamChannels: WorkerChannelSummary[]
  approvedApplications: WorkerApplication[]
  assignments: WorkModeAssignmentListItem[]
  tours: WorkerTour[]
  tasks: WorkerTask[]
  eventBrief: Record<string, unknown> | null
  operations: WorkerOperationalSummary
  createdAt: string | null
}

export interface WorkHubAttentionItem {
  id: string
  kind: "onboarding" | "shift_invitation" | "acknowledgement" | "task_acknowledgement" | "blocked_task" | "overdue_task"
  title: string
  description: string
  href: string
  employerName: string | null
  assignmentId: string | null
  publicationId: string | null
  taskAssignmentId: string | null
}

export interface WorkHubRecommendedJob {
  id: string
  source: "artist" | "venue"
  title: string
  organizationName: string | null
  location: string | null
  employmentType: string | null
  href: string
}

export interface WorkHubHistoryItem {
  id: string
  kind: "assignment" | "engagement"
  title: string
  employerName: string | null
  status: EmploymentAssignmentStatus | string
  at: string | null
  href: string | null
}

export interface WorkHubPayload {
  attention: WorkHubAttentionItem[]
  applications: WorkerApplication[]
  engagements: WorkerEngagement[]
  assignments: WorkModeAssignmentListItem[]
  publications: WorkModePublication[]
  recommendedJobs: WorkHubRecommendedJob[]
  history: WorkHubHistoryItem[]
  partialSources: string[]
  generatedAt: string
  workerActionsAvailable: boolean
}
