import type { HiringEntity } from "@/types/hiring-entity"

export type RosterMemberStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "offboarded"

export type ComplianceStatus =
  | "not_started"
  | "in_progress"
  | "needs_review"
  | "blocked"
  | "compliant"
  | "expired"

export type EmploymentAssignmentStatus =
  | "pending"
  | "active"
  | "paused"
  | "revoked"
  | "completed"

export type AccessStaffDocsScope = "own" | "team" | "none"
export type RunSheetAccess = boolean | "limited"

export interface WorkModePermissions {
  view_shift_schedule: boolean
  check_in_out: boolean
  view_run_sheet: RunSheetAccess
  post_official_comms: boolean
  manage_other_staff: boolean
  access_staff_docs: AccessStaffDocsScope
  view_private_contacts?: boolean
  verify_documents?: boolean
  assign_zones?: boolean
  export_roster?: boolean
}

export interface WorkModeAssignment {
  id: string
  userId: string
  employer: HiringEntity
  staffMemberId?: string | null
  roleTemplateId?: string | null
  position: string
  department?: string | null
  permissions: WorkModePermissions
  status: EmploymentAssignmentStatus
  source: "hiring_onboarding" | "manual" | "import" | "legacy"
  startsAt?: string | null
  endsAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface RosterMemberProfile {
  id: string
  fullName: string
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
}

export interface RosterMemberDocumentSummary {
  id: string
  label: string
  documentType: string
  status: "missing" | "uploaded" | "approved" | "rejected" | "expired" | "needs_review"
  expiresAt?: string | null
  reviewedAt?: string | null
}

export interface RosterMemberShiftSummary {
  shiftId?: string | null
  eventId?: string | null
  eventName?: string | null
  zone?: string | null
  startTime?: string | null
  endTime?: string | null
  status?: string | null
}

export interface RosterMember {
  id: string
  userId: string
  employer: HiringEntity
  profile: RosterMemberProfile
  position: string
  department?: string | null
  employmentType?: string | null
  status: RosterMemberStatus
  complianceStatus: ComplianceStatus
  onboardingCandidateId?: string | null
  onboardingProgress?: number | null
  startedAt?: string | null
  lastActiveAt?: string | null
  assignedZone?: string | null
  assignedManagerId?: string | null
  notes?: string | null
  documentSummary?: RosterMemberDocumentSummary[]
  currentShift?: RosterMemberShiftSummary | null
  workModeAssignment?: WorkModeAssignment | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ListRosterMembersArgs {
  employer: HiringEntity
  status?: RosterMemberStatus | "all"
  complianceStatus?: ComplianceStatus | "all"
  department?: string | "all"
  search?: string
  limit?: number
  offset?: number
}

export interface ListRosterMembersResult {
  members: RosterMember[]
  total: number
  departments: string[]
  complianceCounts: Record<string, number>
  statusCounts: Record<string, number>
}

export interface GetRosterMemberArgs {
  employer: HiringEntity
  memberId: string
}

export interface AssignShiftZoneArgs {
  employer: HiringEntity
  memberId: string
  actorUserId: string
  eventId?: string
  shiftId?: string
  zone?: string
  assignedManagerId?: string
  notes?: string
}

export interface UpdateRosterMemberStatusArgs {
  employer: HiringEntity
  memberId: string
  actorUserId: string
  status: RosterMemberStatus
  reason?: string
}

export interface UpsertRosterFromCompletedOnboardingArgs {
  employer: HiringEntity
  candidateId: string
  actorUserId?: string
}

export interface RosterApiResponse<TData> {
  data?: TData
  error?: string
  details?: unknown
}
