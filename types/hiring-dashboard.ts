import type { HiringEntity } from "@/types/hiring-entity"

export type HiringDashboardTab =
  | "overview"
  | "jobs"
  | "applications"
  | "onboarding"
  | "roster"
  | "templates"
  | "audit"

export type HiringJobPostingStatus = "draft" | "published" | "paused" | "closed" | "filled" | "archived"

export interface HiringDashboardProps {
  employer: HiringEntity
  initialTab?: HiringDashboardTab
  initialCandidateId?: string | null
  initialMemberId?: string | null
}

export interface HiringDashboardStatCard {
  key: string
  label: string
  value: number | string
  description?: string
}

export interface HiringDashboardStats {
  totalJobs: number
  publishedJobs: number
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  onboardingTotal: number
  onboardingInProgress: number
  onboardingCompleted: number
  rosterTotal: number
  rosterActive: number
  averageOnboardingProgress: number
  recentActivity: HiringAuditActivity[]
}

export interface HiringAuditActivity {
  id: string
  action: string
  actorName?: string | null
  subjectName?: string | null
  description?: string | null
  createdAt: string
  target?: HiringActivityTarget | null
}

export type HiringActivityTargetType = "application" | "candidate" | "roster_member" | "job"

export interface HiringActivityTarget {
  type: HiringActivityTargetType
  id: string
  href: string
  actionLabel: string
}

export interface HiringJobListItem {
  id: string
  title: string
  department?: string | null
  position?: string | null
  status?: HiringJobPostingStatus | null
  numberOfPositions?: number | null
  createdAt?: string | null
  publishedAt?: string | null
  archivedAt?: string | null
  filledAt?: string | null
  eventId?: string | null
  tourId?: string | null
}

export interface HiringJobOverviewItem extends HiringJobListItem {
  totalApplicants: number
  pendingApplicants: number
  approvedApplicants: number
  activeHires: number
  remainingPositions: number
  hasVacancy: boolean
  linkedEvent?: { id: string; title: string; startAt?: string | null } | null
  linkedTour?: { id: string; name: string; startDate?: string | null; endDate?: string | null } | null
}

export interface HiringOverviewActionCounts {
  newApplications: number
  onboardingAwaitingApproval: number
  readyToAssign: number
  openRoles: number
}

export interface HiringReadyWorker {
  id: string
  userId?: string | null
  name: string
  position?: string | null
  department?: string | null
}

export interface HiringOverviewData {
  actionCounts: HiringOverviewActionCounts
  currentJobs: HiringJobOverviewItem[]
  archivedJobs: HiringJobOverviewItem[]
  readyToAssignWorkers: HiringReadyWorker[]
  recentActivity: HiringAuditActivity[]
  freshAt: string
}

export interface HiringEventCoverage {
  eventId: string
  totalShifts: number
  filledShifts: number
  openShifts: number
}

export interface HiringApplicationListItem {
  id: string
  applicantName: string
  applicantEmail?: string | null
  jobTitle?: string | null
  department?: string | null
  status: string
  appliedAt?: string | null
  onboardingStage?: string | null
  isEligible?: boolean | null
}

export interface HiringCandidateListItem {
  id: string
  name: string
  email?: string | null
  position?: string | null
  department?: string | null
  status: string
  stage?: string | null
  onboardingProgress: number
  invitationToken?: string | null
  updatedAt?: string | null
}

export interface HiringRosterMemberListItem {
  id: string
  userId?: string | null
  name: string
  email?: string | null
  position?: string | null
  department?: string | null
  status: string
  complianceStatus?: string | null
  startedAt?: string | null
}

export interface HiringTemplateListItem {
  id: string
  name: string
  description?: string | null
  department?: string | null
  position?: string | null
  employmentType?: string | null
  isDefault?: boolean | null
  scope?: "employer" | "global"
  parentTemplateId?: string | null
  fieldCount?: number
  requiredDocuments?: string[]
  agreementCount?: number
  estimatedDays?: number | null
  updatedAt?: string | null
}

export interface HiringDashboardApiResponse<TData> {
  data?: TData
  error?: string
  message?: string
}
