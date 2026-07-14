import type { HiringEntity } from "@/types/hiring-entity"

export type HiringDashboardTab =
  | "overview"
  | "jobs"
  | "applications"
  | "onboarding"
  | "roster"
  | "templates"
  | "audit"

export interface HiringDashboardProps {
  employer: HiringEntity
  initialTab?: HiringDashboardTab
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
}

export interface HiringJobListItem {
  id: string
  title: string
  department?: string | null
  position?: string | null
  status?: string | null
  numberOfPositions?: number | null
  createdAt?: string | null
  publishedAt?: string | null
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
  department?: string | null
  position?: string | null
  isDefault?: boolean | null
  updatedAt?: string | null
}

export interface HiringDashboardApiResponse<TData> {
  data?: TData
  error?: string
  message?: string
}
