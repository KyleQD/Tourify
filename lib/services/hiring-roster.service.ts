import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AssignShiftZoneArgs,
  ComplianceStatus,
  CreateRosterMemberArgs,
  GetRosterMemberArgs,
  ListRosterMembersArgs,
  ListRosterMembersResult,
  RosterMember,
  RosterMemberDocumentSummary,
  RosterMemberProfile,
  RosterMemberStatus,
  UpdateRosterMemberArgs,
  UpdateRosterMemberStatusArgs,
  UpsertRosterFromApprovalArgs,
  UpsertRosterFromCompletedOnboardingArgs,
  WorkModeAssignment,
} from "@/types/hiring-roster-work-mode"
import type { HiringEntity } from "@/types/hiring-entity"
import { canAssignWorkMode, canManageHiring } from "@/lib/auth/hiring-permissions"
import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"
import { syncEmploymentAssignmentForShift } from "@/lib/services/staff-shift-assignment-sync"

interface HiringRosterServiceArgs {
  supabase: SupabaseClient
}

interface StaffMemberRow {
  id: string
  user_id?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  venue_id?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  position?: string | null
  department?: string | null
  employment_type?: string | null
  status?: RosterMemberStatus | string | null
  compliance_status?: ComplianceStatus | null
  onboarding_candidate_id?: string | null
  onboarding_progress?: number | null
  started_at?: string | null
  last_active_at?: string | null
  assigned_zone?: string | null
  assigned_manager_id?: string | null
  notes?: string | null
  permissions?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  profile?: Record<string, unknown> | null
  profiles?: Record<string, unknown> | null
}

interface EmploymentAssignmentRow {
  id: string
  user_id: string
  staff_member_id?: string | null
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  venue_id?: string | null
  role_template_id?: string | null
  role_title?: string | null
  position?: string | null
  department?: string | null
  permissions?: Record<string, unknown> | null
  status?: string | null
  source?: string | null
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface StaffDocumentRow {
  id: string
  label?: string | null
  document_type?: string | null
  status?: string | null
  expires_at?: string | null
  reviewed_at?: string | null
}

function getString(source: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!source) return null

  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value
  }

  return null
}

function buildProfile(row: StaffMemberRow): RosterMemberProfile {
  const profileSource = (row.profiles ?? row.profile ?? {}) as Record<string, unknown>
  const fullName =
    getString(profileSource, ["full_name", "name", "display_name"]) ??
    getString(row as unknown as Record<string, unknown>, ["name", "full_name"]) ??
    "Unnamed staff member"

  return {
    id: getString(profileSource, ["id"]) ?? row.user_id ?? row.id,
    fullName,
    email: getString(profileSource, ["email"]) ?? row.email ?? null,
    phone: getString(profileSource, ["phone", "phone_number"]) ?? row.phone ?? null,
    avatarUrl: getString(profileSource, ["avatar_url", "image_url"]),
  }
}

function resolveMemberPosition(row: StaffMemberRow): string {
  return row.position ?? row.role ?? "Staff"
}

function normalizeRosterStatus(status: string | null | undefined): RosterMemberStatus {
  if (status === "pending" || status === "active" || status === "inactive" || status === "suspended" || status === "offboarded") {
    return status
  }
  if (status === "on_leave") return "inactive"
  if (status === "terminated") return "offboarded"
  return "active"
}

function buildEmployerFromRow(row: StaffMemberRow, fallback: HiringEntity): HiringEntity {
  return {
    ...fallback,
    entityType: row.employer_entity_type ?? fallback.entityType,
    entityId: row.employer_entity_id ?? row.venue_id ?? fallback.entityId,
  }
}

function mapDocuments(rows?: StaffDocumentRow[] | null): RosterMemberDocumentSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    label: row.label ?? row.document_type ?? "Document",
    documentType: row.document_type ?? "document",
    status: (row.status as RosterMemberDocumentSummary["status"]) ?? "uploaded",
    expiresAt: row.expires_at ?? null,
    reviewedAt: row.reviewed_at ?? null,
  }))
}

function mapAssignment(row: EmploymentAssignmentRow | null | undefined, employer: HiringEntity): WorkModeAssignment | null {
  if (!row) return null

  return {
    id: row.id,
    userId: row.user_id,
    employer: {
      ...employer,
      entityType: row.employer_entity_type ?? employer.entityType,
      entityId: row.employer_entity_id ?? row.venue_id ?? employer.entityId,
    },
    staffMemberId: row.staff_member_id ?? null,
    roleTemplateId: row.role_template_id ?? null,
    position: row.position ?? row.role_title ?? "Staff",
    department: row.department ?? null,
    permissions: resolveWorkModePermissions({
      position: row.position,
      department: row.department,
      existingPermissions: row.permissions as Partial<WorkModeAssignment["permissions"]> | null,
    }),
    status: (row.status as WorkModeAssignment["status"]) ?? "invited",
    source: (row.source as WorkModeAssignment["source"]) ?? "legacy",
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function mapRosterMember({
  row,
  employer,
  assignment,
  documents,
}: {
  row: StaffMemberRow
  employer: HiringEntity
  assignment?: EmploymentAssignmentRow | null
  documents?: StaffDocumentRow[] | null
}): RosterMember {
  const resolvedEmployer = buildEmployerFromRow(row, employer)

  return {
    id: row.id,
    userId: row.user_id ?? row.id,
    employer: resolvedEmployer,
    profile: buildProfile(row),
    position: resolveMemberPosition(row),
    department: row.department ?? null,
    employmentType: row.employment_type ?? null,
    status: normalizeRosterStatus(row.status),
    complianceStatus: row.compliance_status ?? "not_started",
    onboardingCandidateId: row.onboarding_candidate_id ?? null,
    onboardingProgress: row.onboarding_progress ?? null,
    startedAt: row.started_at ?? null,
    lastActiveAt: row.last_active_at ?? null,
    assignedZone: row.assigned_zone ?? null,
    assignedManagerId: row.assigned_manager_id ?? null,
    notes: row.notes ?? null,
    documentSummary: mapDocuments(documents),
    currentShift: null,
    workModeAssignment: mapAssignment(assignment, resolvedEmployer),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function getStatusCounts(members: RosterMember[]): Record<string, number> {
  return members.reduce<Record<string, number>>((counts, member) => {
    counts[member.status] = (counts[member.status] ?? 0) + 1
    return counts
  }, {})
}

function getComplianceCounts(members: RosterMember[]): Record<string, number> {
  return members.reduce<Record<string, number>>((counts, member) => {
    counts[member.complianceStatus] = (counts[member.complianceStatus] ?? 0) + 1
    return counts
  }, {})
}

function collectIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function generateInvitationToken(): string {
  return crypto.randomUUID().replaceAll("-", "")
}

function assignmentStatusForRosterStatus(status?: RosterMemberStatus): EmploymentAssignmentRow["status"] | undefined {
  if (!status) return undefined
  if (status === "active") return "active"
  if (status === "pending") return "invited"
  if (status === "inactive" || status === "suspended" || status === "offboarded") return "cancelled"
  return undefined
}

function mergeProfileIntoRow(row: StaffMemberRow, profile?: Record<string, unknown>): StaffMemberRow {
  return profile ? { ...row, profile } : row
}

async function fetchProfilesByUserId(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const profiles = new Map<string, Record<string, unknown>>()
  if (userIds.length === 0) return profiles

  const addRows = (rows: Array<Record<string, unknown>> | null | undefined) => {
    for (const row of rows ?? []) {
      const id = typeof row.id === "string" ? row.id : null
      const userId = typeof row.user_id === "string" ? row.user_id : null
      if (id && userIds.includes(id)) profiles.set(id, row)
      if (userId && userIds.includes(userId)) profiles.set(userId, row)
    }
  }

  const byId = await supabase.from("profiles").select("*").in("id", userIds)
  if (!byId.error) addRows(byId.data as Array<Record<string, unknown>>)

  const byUserId = await supabase.from("profiles").select("*").in("user_id", userIds)
  if (!byUserId.error) addRows(byUserId.data as Array<Record<string, unknown>>)

  return profiles
}

async function fetchAssignmentsByUserId({
  supabase,
  employer,
  userIds,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  userIds: string[]
}): Promise<Map<string, EmploymentAssignmentRow>> {
  const assignmentsByUser = new Map<string, EmploymentAssignmentRow>()
  if (userIds.length === 0) return assignmentsByUser

  const { data, error } = await supabase
    .from("employment_assignments")
    .select("*")
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .in("user_id", userIds)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)

  for (const assignment of (data ?? []) as EmploymentAssignmentRow[]) {
    if (!assignment.user_id || assignmentsByUser.has(assignment.user_id)) continue
    assignmentsByUser.set(assignment.user_id, assignment)
  }

  return assignmentsByUser
}

async function fetchDocumentsByMemberId({
  supabase,
  memberIds,
  candidateIdToMemberId,
}: {
  supabase: SupabaseClient
  memberIds: string[]
  candidateIdToMemberId: Map<string, string>
}): Promise<Record<string, StaffDocumentRow[]>> {
  const byMember: Record<string, StaffDocumentRow[]> = {}

  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from("staff_documents")
      .select("id, staff_member_id, label, document_type, status, expires_at, reviewed_at")
      .in("staff_member_id", memberIds)

    if (!error) {
      for (const document of (data ?? []) as Array<StaffDocumentRow & { staff_member_id?: string }>) {
        if (!document.staff_member_id) continue
        byMember[document.staff_member_id] = [...(byMember[document.staff_member_id] ?? []), document]
      }
    }
  }

  const candidateIds = Array.from(candidateIdToMemberId.keys())
  if (candidateIds.length > 0) {
    const { data, error } = await supabase
      .from("staff_documents")
      .select("id, candidate_id, label, document_type, status, expires_at, reviewed_at")
      .in("candidate_id", candidateIds)

    if (!error) {
      for (const document of (data ?? []) as Array<StaffDocumentRow & { candidate_id?: string }>) {
        if (!document.candidate_id) continue
        const matchingMemberId = candidateIdToMemberId.get(document.candidate_id)
        if (matchingMemberId) {
          byMember[matchingMemberId] = [...(byMember[matchingMemberId] ?? []), document]
        }
      }
    }
  }

  return byMember
}

export class HiringRosterService {
  private supabase: SupabaseClient

  constructor({ supabase }: HiringRosterServiceArgs) {
    this.supabase = supabase
  }

  async listRosterMembers(args: ListRosterMembersArgs): Promise<ListRosterMembersResult> {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    let scopedUserIds: string[] | null = null
    let scopedMemberIds: string[] | null = null

    if (args.eventId || args.tourId) {
      let eventIds: string[] = args.eventId ? [args.eventId] : []

      if (args.tourId) {
        const { data: tourLinks } = await this.supabase
          .from("tour_events")
          .select("event_id")
          .eq("tour_id", args.tourId)
        eventIds = Array.from(
          new Set([
            ...eventIds,
            ...((tourLinks || []).map((row: { event_id?: string }) => row.event_id).filter(Boolean) as string[]),
          ])
        )
      }

      const userIdSet = new Set<string>()
      const memberIdSet = new Set<string>()

      if (eventIds.length > 0) {
        const [{ data: assignments }, { data: shifts }] = await Promise.all([
          this.supabase
            .from("employment_assignments")
            .select("user_id")
            .in("event_id", eventIds)
            .eq("employer_entity_type", args.employer.entityType)
            .eq("employer_entity_id", args.employer.entityId),
          this.supabase
            .from("staff_shifts")
            .select("staff_member_id")
            .in("event_id", eventIds),
        ])

        for (const row of assignments || []) {
          if (row.user_id) userIdSet.add(row.user_id)
        }
        for (const row of shifts || []) {
          if (row.staff_member_id) memberIdSet.add(row.staff_member_id)
        }

        const shiftMemberIds = Array.from(memberIdSet)
        if (shiftMemberIds.length > 0) {
          const { data: shiftMembers } = await this.supabase
            .from("staff_members")
            .select("id, user_id")
            .in("id", shiftMemberIds)

          for (const member of shiftMembers || []) {
            if (member?.user_id) userIdSet.add(member.user_id)
            if (member?.id) memberIdSet.add(member.id)
          }
        }
      }

      if (args.tourId) {
        const { data: tourAssignments } = await this.supabase
          .from("employment_assignments")
          .select("user_id")
          .eq("tour_id", args.tourId)
          .eq("employer_entity_type", args.employer.entityType)
          .eq("employer_entity_id", args.employer.entityId)

        for (const row of tourAssignments || []) {
          if (row.user_id) userIdSet.add(row.user_id)
        }
      }

      scopedUserIds = Array.from(userIdSet)
      scopedMemberIds = Array.from(memberIdSet)

      if (scopedUserIds.length === 0 && scopedMemberIds.length === 0) {
        return {
          members: [],
          total: 0,
          departments: [],
          complianceCounts: {},
          statusCounts: {},
        }
      }
    }

    let query = this.supabase
      .from("staff_members")
      .select("*", { count: "exact" })
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (scopedMemberIds && scopedMemberIds.length > 0 && scopedUserIds && scopedUserIds.length > 0) {
      query = query.or(`id.in.(${scopedMemberIds.join(",")}),user_id.in.(${scopedUserIds.join(",")})`)
    } else if (scopedMemberIds && scopedMemberIds.length > 0) {
      query = query.in("id", scopedMemberIds)
    } else if (scopedUserIds && scopedUserIds.length > 0) {
      query = query.in("user_id", scopedUserIds)
    }

    if (args.status && args.status !== "all") query = query.eq("status", args.status)
    if (args.complianceStatus && args.complianceStatus !== "all") {
      query = query.eq("compliance_status", args.complianceStatus)
    }
    if (args.department && args.department !== "all") query = query.eq("department", args.department)
    if (args.search) {
      const term = args.search.replaceAll(",", " ").trim()
      query = query.or(`role.ilike.%${term}%,department.ilike.%${term}%,name.ilike.%${term}%,email.ilike.%${term}%`)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as StaffMemberRow[]
    const memberIds = rows.map((row) => row.id)
    const userIds = collectIds(rows.map((row) => row.user_id))
    const candidateIdToMemberId = new Map<string, string>(
      rows
        .filter((row) => row.onboarding_candidate_id)
        .map((row) => [row.onboarding_candidate_id as string, row.id])
    )

    const [profilesByUser, assignments, documentsByMember, countRowsResult] = await Promise.all([
      fetchProfilesByUserId(this.supabase, userIds),
      fetchAssignmentsByUserId({
        supabase: this.supabase,
        employer: args.employer,
        userIds,
      }),
      fetchDocumentsByMemberId({
        supabase: this.supabase,
        memberIds,
        candidateIdToMemberId,
      }),
      this.supabase
        .from("staff_members")
        .select("status, compliance_status, department")
        .eq("employer_entity_type", args.employer.entityType)
        .eq("employer_entity_id", args.employer.entityId),
    ])

    const members = rows.map((row) =>
      mapRosterMember({
        row: mergeProfileIntoRow(row, row.user_id ? profilesByUser.get(row.user_id) : undefined),
        employer: args.employer,
        assignment: row.user_id ? assignments.get(row.user_id) : undefined,
        documents: documentsByMember[row.id],
      })
    )

    const countRows = countRowsResult.error ? rows : ((countRowsResult.data ?? []) as StaffMemberRow[])
    const departments = Array.from(new Set(countRows.map((member) => member.department).filter(Boolean))) as string[]
    const statusCounts = countRows.reduce<Record<string, number>>((acc, row) => {
      const status = normalizeRosterStatus(row.status)
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {})
    const complianceCounts = countRows.reduce<Record<string, number>>((acc, row) => {
      const status = row.compliance_status ?? "not_started"
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {})

    return {
      members,
      total: count ?? members.length,
      departments,
      complianceCounts,
      statusCounts,
    }
  }

  async getRosterMember(args: GetRosterMemberArgs): Promise<RosterMember | null> {
    const { data, error } = await this.supabase
      .from("staff_members")
      .select("*")
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null

    const row = data as StaffMemberRow
    const candidateIdToMemberId = new Map<string, string>()
    if (row.onboarding_candidate_id) candidateIdToMemberId.set(row.onboarding_candidate_id, row.id)

    const [profilesByUser, assignments, documentsByMember] = await Promise.all([
      fetchProfilesByUserId(this.supabase, collectIds([row.user_id])),
      fetchAssignmentsByUserId({
        supabase: this.supabase,
        employer: args.employer,
        userIds: collectIds([row.user_id]),
      }),
      fetchDocumentsByMemberId({
        supabase: this.supabase,
        memberIds: [row.id],
        candidateIdToMemberId,
      }),
    ])

    return mapRosterMember({
      row: mergeProfileIntoRow(row, row.user_id ? profilesByUser.get(row.user_id) : undefined),
      employer: args.employer,
      assignment: row.user_id ? assignments.get(row.user_id) : undefined,
      documents: documentsByMember[row.id],
    })
  }

  async createRosterMember(args: CreateRosterMemberArgs): Promise<RosterMember | null> {
    const canManage = await canManageHiring({ supabase: this.supabase, userId: args.actorUserId, employer: args.employer })
    if (!canManage.ok || !canManage.data.allowed) throw new Error("You do not have permission to add roster members.")

    const now = new Date().toISOString()
    const position = args.position?.trim() || "Staff"
    const department = args.department?.trim() || "General"
    const venueId = args.employer.entityType === "venue" ? args.employer.entityId : args.employer.scope?.venueId ?? null
    const permissions = resolveWorkModePermissions({ position, department })
    let candidateId: string | null = null
    let invitationId: string | null = null

    if (args.source === "invite") {
      const token = generateInvitationToken()
      const candidateInsert = await this.supabase
        .from("staff_onboarding_candidates")
        .insert({
          employer_entity_type: args.employer.entityType,
          employer_entity_id: args.employer.entityId,
          venue_id: venueId,
          user_id: args.userId ?? null,
          name: args.name?.trim() || args.email?.trim() || "Invited staff member",
          email: args.email?.trim() || null,
          phone: args.phone?.trim() || null,
          position,
          department,
          employment_type: args.employmentType || "contractor",
          status: "pending",
          stage: "invitation",
          onboarding_progress: 0,
          compliance_status: "not_started",
          template_id: args.onboardingTemplateId ?? null,
          invitation_token: token,
          notes: args.notes ?? null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single()

      if (candidateInsert.error) throw new Error(candidateInsert.error.message)
      candidateId = candidateInsert.data.id

      const invitationInsert = await this.supabase
        .from("staff_invitations")
        .insert({
          employer_entity_type: args.employer.entityType,
          employer_entity_id: args.employer.entityId,
          venue_id: venueId,
          token,
          email: args.email?.trim() || "onboarding@example.test",
          phone: args.phone?.trim() || null,
          role: position,
          origin: "hiring_hub_roster",
          status: "pending",
          template_id: args.onboardingTemplateId ?? null,
          position_details: {
            candidate_id: candidateId,
            position,
            department,
            employment_type: args.employmentType || "contractor",
          },
          created_by: args.actorUserId,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single()

      if (invitationInsert.error) throw new Error(invitationInsert.error.message)
      invitationId = invitationInsert.data.id
    }

    let existing: { id: string } | null = null
    if (args.userId) {
      const existingResult = await this.supabase
        .from("staff_members")
        .select("id")
        .eq("user_id", args.userId)
        .eq("employer_entity_type", args.employer.entityType)
        .eq("employer_entity_id", args.employer.entityId)
        .maybeSingle()
      if (existingResult.error) throw new Error(existingResult.error.message)
      existing = existingResult.data as { id: string } | null
    }

    const memberPayload: Record<string, unknown> = {
      user_id: args.userId ?? null,
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      venue_id: venueId,
      onboarding_candidate_id: candidateId,
      name: args.name?.trim() || args.email?.trim() || "Staff member",
      email: args.email?.trim() || null,
      phone: args.phone?.trim() || null,
      role: position,
      position,
      department,
      employment_type: args.employmentType || "contractor",
      status: args.source === "manual" ? "active" : "pending",
      compliance_status: args.source === "manual" ? "compliant" : "not_started",
      onboarding_progress: args.source === "manual" ? 100 : 0,
      started_at: args.source === "manual" ? now : null,
      notes: args.notes ?? null,
      permissions,
      updated_at: now,
    }

    let memberId: string
    if (existing?.id) {
      const { data, error } = await this.supabase
        .from("staff_members")
        .update(memberPayload)
        .eq("id", existing.id)
        .select("id")
        .single()
      if (error) throw new Error(error.message)
      memberId = data.id
    } else {
      const { data, error } = await this.supabase
        .from("staff_members")
        .insert({ ...memberPayload, hire_date: now, created_at: now })
        .select("id")
        .single()
      if (error) throw new Error(error.message)
      memberId = data.id
    }

    if (args.userId) {
      const assignmentPayload = {
        user_id: args.userId,
        staff_member_id: memberId,
        employer_entity_type: args.employer.entityType,
        employer_entity_id: args.employer.entityId,
        venue_id: venueId,
        role_title: position,
        position,
        department,
        permissions,
        status: args.source === "manual" ? "active" : "invited",
        source: args.source === "manual" ? "manual" : "hiring_onboarding",
        updated_at: now,
      }

      const { data: existingAssignment } = await this.supabase
        .from("employment_assignments")
        .select("id")
        .eq("user_id", args.userId)
        .eq("employer_entity_type", args.employer.entityType)
        .eq("employer_entity_id", args.employer.entityId)
        .maybeSingle()

      if (existingAssignment?.id) {
        const { error } = await this.supabase
          .from("employment_assignments")
          .update(assignmentPayload)
          .eq("id", existingAssignment.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await this.supabase.from("employment_assignments").insert({
          ...assignmentPayload,
          starts_at: args.source === "manual" ? now : null,
          created_at: now,
        })
        if (error) throw new Error(error.message)
      }
    }

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId,
      event_type: "roster_member_created",
      subject_type: "staff_member",
      subject_id: memberId,
      metadata: {
        source: args.source,
        candidate_id: candidateId,
        invitation_id: invitationId,
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId })
  }

  async updateRosterMember(args: UpdateRosterMemberArgs): Promise<RosterMember | null> {
    const canManage = await canManageHiring({ supabase: this.supabase, userId: args.actorUserId, employer: args.employer })
    if (!canManage.ok || !canManage.data.allowed) throw new Error("You do not have permission to update this roster.")

    const now = new Date().toISOString()
    const payload: Record<string, unknown> = { updated_at: now }

    if (args.status) payload.status = args.status
    if (args.name !== undefined) payload.name = args.name
    if (args.email !== undefined) payload.email = args.email
    if (args.phone !== undefined) payload.phone = args.phone
    if (args.position !== undefined) {
      payload.position = args.position
      payload.role = args.position
    }
    if (args.department !== undefined) payload.department = args.department
    if (args.employmentType !== undefined) payload.employment_type = args.employmentType
    if (args.notes !== undefined) payload.notes = args.notes
    if (args.permissions !== undefined) payload.permissions = args.permissions ?? {}
    if (args.status === "active") {
      payload.started_at = now
      payload.last_active_at = now
    }

    const { data: existing, error: existingError } = await this.supabase
      .from("staff_members")
      .select("id, user_id, position, role, department, permissions")
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (!existing) return null

    const { error } = await this.supabase
      .from("staff_members")
      .update(payload)
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)

    if (error) throw new Error(error.message)

    if (existing.user_id) {
      const assignmentPayload: Record<string, unknown> = { updated_at: now }
      const nextPosition = args.position ?? existing.position ?? existing.role
      const nextDepartment = args.department ?? existing.department
      const nextPermissions =
        args.permissions ??
        resolveWorkModePermissions({
          position: typeof nextPosition === "string" ? nextPosition : null,
          department: typeof nextDepartment === "string" ? nextDepartment : null,
          existingPermissions: existing.permissions as Partial<WorkModeAssignment["permissions"]> | null,
        })

      if (args.position !== undefined) {
        assignmentPayload.position = args.position
        assignmentPayload.role_title = args.position
      }
      if (args.department !== undefined) assignmentPayload.department = args.department
      if (args.permissions !== undefined || args.position !== undefined || args.department !== undefined)
        assignmentPayload.permissions = nextPermissions
      const assignmentStatus = assignmentStatusForRosterStatus(args.status)
      if (assignmentStatus) assignmentPayload.status = assignmentStatus

      if (Object.keys(assignmentPayload).length > 1) {
        await this.supabase
          .from("employment_assignments")
          .update(assignmentPayload)
          .eq("user_id", existing.user_id)
          .eq("employer_entity_type", args.employer.entityType)
          .eq("employer_entity_id", args.employer.entityId)
      }
    }

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId,
      event_type: args.status ? "roster_member_status_updated" : "roster_member_updated",
      subject_type: "staff_member",
      subject_id: args.memberId,
      metadata: {
        status: args.status ?? null,
        reason: args.reason ?? null,
        fields: Object.keys(payload).filter((key) => key !== "updated_at"),
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId: args.memberId })
  }

  async updateRosterMemberStatus(args: UpdateRosterMemberStatusArgs): Promise<RosterMember | null> {
    return this.updateRosterMember(args)
  }

  async assignShiftZone(args: AssignShiftZoneArgs): Promise<RosterMember | null> {
    const canAssign = await canAssignWorkMode({ supabase: this.supabase, userId: args.actorUserId, employer: args.employer })
    if (!canAssign.ok || !canAssign.data.allowed) throw new Error("You do not have permission to assign roster members.")

    const { error } = await this.supabase
      .from("staff_members")
      .update({
        assigned_zone: args.zone ?? null,
        assigned_manager_id: args.assignedManagerId ?? null,
        notes: args.notes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)

    if (error) throw new Error(error.message)

    if (args.shiftId) {
      const shiftUpdate = await this.supabase
        .from("staff_shifts")
        .update({
          staff_member_id: args.memberId,
          zone_assignment: args.zone ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.shiftId)
        .select("*")
        .maybeSingle()

      if (shiftUpdate.error) throw new Error(shiftUpdate.error.message)
      if (shiftUpdate.data) {
        await syncEmploymentAssignmentForShift({
          supabase: this.supabase,
          shift: shiftUpdate.data,
          notify: true,
          actorUserId: args.actorUserId,
          assignmentStatus: "invited",
        })
      }
    }

    if (args.shiftId || args.eventId) {
      await this.supabase.from("staff_shift_assignments").insert({
        staff_member_id: args.memberId,
        event_id: args.eventId ?? null,
        shift_id: args.shiftId ?? null,
        zone: args.zone ?? null,
        assigned_by: args.actorUserId,
        employer_entity_type: args.employer.entityType,
        employer_entity_id: args.employer.entityId,
        notes: args.notes ?? null,
      })
    }

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId,
      event_type: "roster_member_assigned",
      subject_type: "staff_member",
      subject_id: args.memberId,
      metadata: {
        event_id: args.eventId ?? null,
        shift_id: args.shiftId ?? null,
        zone: args.zone ?? null,
        assigned_manager_id: args.assignedManagerId ?? null,
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId: args.memberId })
  }

  async upsertRosterFromApproval(args: UpsertRosterFromApprovalArgs): Promise<RosterMember | null> {
    const position = args.position?.trim() || "Staff"
    const department = args.department?.trim() || null
    const permissions = resolveWorkModePermissions({ position, department })
    const completed = Boolean(args.completed)
    const now = new Date().toISOString()
    const venueId = args.employer.entityType === "venue" ? args.employer.entityId : args.employer.scope?.venueId ?? null

    const { data: existing, error: existingError } = await this.supabase
      .from("staff_members")
      .select("*")
      .eq("user_id", args.userId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    const basePayload: Record<string, unknown> = {
      user_id: args.userId,
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      venue_id: venueId,
      name: args.name?.trim() || existing?.name || args.email?.trim() || "Staff member",
      email: args.email?.trim() || existing?.email || null,
      phone: args.phone?.trim() || existing?.phone || null,
      role: position,
      position,
      department: department || existing?.department || "General",
      employment_type: args.employmentType || existing?.employment_type || "contractor",
      status: completed ? "active" : "pending",
      compliance_status: completed ? "compliant" : "needs_review",
      permissions,
      updated_at: now,
    }

    let memberId: string

    if (existing?.id) {
      const { data: updated, error: updateError } = await this.supabase
        .from("staff_members")
        .update(basePayload)
        .eq("id", existing.id)
        .select("id")
        .single()

      if (updateError) throw new Error(updateError.message)
      memberId = updated.id
    } else {
      const { data: inserted, error: insertError } = await this.supabase
        .from("staff_members")
        .insert({
          ...basePayload,
          hire_date: now,
          created_at: now,
        })
        .select("id")
        .single()

      if (insertError) throw new Error(insertError.message)
      memberId = inserted.id
    }

    // Best-effort optional metadata columns (may not exist on all environments).
    if (args.candidateId || completed) {
      const optionalPayload: Record<string, unknown> = { updated_at: now }
      if (args.candidateId) optionalPayload.onboarding_candidate_id = args.candidateId
      if (completed) {
        optionalPayload.onboarding_progress = 100
        optionalPayload.started_at = existing?.started_at ?? now
      }
      await this.supabase.from("staff_members").update(optionalPayload).eq("id", memberId)
    }

    const { data: existingAssignment } = await this.supabase
      .from("employment_assignments")
      .select("id, event_id")
      .eq("user_id", args.userId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    const assignmentPayload: Record<string, unknown> = {
      user_id: args.userId,
      staff_member_id: memberId,
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      venue_id: venueId,
      role_title: position,
      position,
      department,
      permissions,
      status: completed ? "active" : "invited",
      source: "hiring_onboarding",
      updated_at: now,
    }

    if (existingAssignment?.id) {
      const { error: assignmentUpdateError } = await this.supabase
        .from("employment_assignments")
        .update(assignmentPayload)
        .eq("id", existingAssignment.id)

      if (assignmentUpdateError) throw new Error(assignmentUpdateError.message)
    } else {
      const { error: assignmentInsertError } = await this.supabase.from("employment_assignments").insert({
        ...assignmentPayload,
        starts_at: now,
        created_at: now,
      })

      if (assignmentInsertError) throw new Error(assignmentInsertError.message)
    }

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId ?? args.userId,
      event_type: completed ? "roster_activated_from_onboarding" : "roster_created_from_approval",
      subject_type: "staff_member",
      subject_id: memberId,
      metadata: {
        candidate_id: args.candidateId ?? null,
        position,
        department,
        completed,
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId })
  }

  async upsertRosterFromCompletedOnboarding(args: UpsertRosterFromCompletedOnboardingArgs): Promise<RosterMember | null> {
    const { data: candidate, error: candidateError } = await this.supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", args.candidateId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (candidateError) throw new Error(candidateError.message)
    if (!candidate) return null

    const userId = candidate.user_id ?? candidate.applicant_id
    if (!userId) throw new Error("Completed candidate is missing a user id.")

    return this.upsertRosterFromApproval({
      employer: args.employer,
      actorUserId: args.actorUserId,
      userId,
      candidateId: args.candidateId,
      name: typeof candidate.name === "string" ? candidate.name : null,
      email: typeof candidate.email === "string" ? candidate.email : null,
      phone: typeof candidate.phone === "string" ? candidate.phone : null,
      position: candidate.position ?? candidate.role ?? "Staff",
      department: candidate.department ?? null,
      employmentType: candidate.employment_type ?? null,
      completed: true,
    })
  }
}
