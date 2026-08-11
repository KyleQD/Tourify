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
  | "invited"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "declined"
  | "invited"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"

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

export interface WorkModePublication {
  id: string
  eventId: string | null
  tourId: string | null
  siteMapId: string | null
  publicationType: string
  title: string
  payload: Record<string, unknown>
  publishedAt: string | null
  href: string | null
}

export interface WorkModeAssignmentListItem {
  id: string
  roleTitle: string
  department: string | null
  eventId: string | null
  venueId: string | null
  organizerId: string | null
  startsAt: string | null
  endsAt: string | null
  status: EmploymentAssignmentStatus
  permissions: Record<string, boolean>
  source: "assignment" | "publication"
  publicationType: string | null
  href: string | null
  siteMapId: string | null
}

export interface WorkModeAssignmentsPayload {
  assignments: WorkModeAssignmentListItem[]
  publications: WorkModePublication[]
  generatedAt: string
  workerActionsAvailable: boolean
}

export interface WorkModeApiResponse<T> {
  data?: T
  error?: string
  code?:
    | "not_authenticated"
    | "not_found"
    | "forbidden"
    | "validation"
    | "unavailable"
    | "conflict"
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
  eventId?: string
  tourId?: string
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

export type CreateRosterMemberSource = "invite" | "existing_user" | "manual"

export interface CreateRosterMemberArgs {
  employer: HiringEntity
  actorUserId: string
  source: CreateRosterMemberSource
  userId?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  department?: string | null
  employmentType?: string | null
  notes?: string | null
  onboardingTemplateId?: string | null
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
  tourId?: string
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

export interface UpdateRosterMemberArgs {
  employer: HiringEntity
  memberId: string
  actorUserId: string
  status?: RosterMemberStatus
  name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  department?: string | null
  employmentType?: string | null
  notes?: string | null
  permissions?: Partial<WorkModePermissions> | null
  reason?: string
}

export interface UpsertRosterFromCompletedOnboardingArgs {
  employer: HiringEntity
  candidateId: string
  actorUserId?: string
}

export interface UpsertRosterFromApprovalArgs {
  employer: HiringEntity
  actorUserId?: string
  userId: string
  candidateId?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  department?: string | null
  employmentType?: string | null
  /** When true, mark the member active/submitted after onboarding completion. */
  completed?: boolean
  /** Optional event/tour context from the source job posting. */
  eventId?: string | null
  tourId?: string | null
}

export interface RosterApiResponse<TData> {
  data?: TData
  error?: string
  details?: unknown
}
