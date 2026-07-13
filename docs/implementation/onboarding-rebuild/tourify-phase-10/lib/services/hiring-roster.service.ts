import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AssignShiftZoneArgs,
  ComplianceStatus,
  GetRosterMemberArgs,
  ListRosterMembersArgs,
  ListRosterMembersResult,
  RosterMember,
  RosterMemberDocumentSummary,
  RosterMemberProfile,
  RosterMemberStatus,
  UpdateRosterMemberStatusArgs,
  UpsertRosterFromCompletedOnboardingArgs,
  WorkModeAssignment,
} from "@/types/hiring-roster-work-mode"
import type { HiringEntity } from "@/types/hiring-entity"
import { canAssignWorkMode, canManageHiring } from "@/lib/auth/hiring-permissions"
import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"

interface HiringRosterServiceArgs {
  supabase: SupabaseClient
}

interface StaffMemberRow {
  id: string
  user_id: string
  employer_entity_type?: "venue" | "organization" | "artist" | null
  employer_entity_id?: string | null
  venue_id?: string | null
  position?: string | null
  department?: string | null
  employment_type?: string | null
  status?: RosterMemberStatus | null
  compliance_status?: ComplianceStatus | null
  onboarding_candidate_id?: string | null
  onboarding_progress?: number | null
  started_at?: string | null
  last_active_at?: string | null
  assigned_zone?: string | null
  assigned_manager_id?: string | null
  notes?: string | null
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
    id: getString(profileSource, ["id"]) ?? row.user_id,
    fullName,
    email: getString(profileSource, ["email"]),
    phone: getString(profileSource, ["phone", "phone_number"]),
    avatarUrl: getString(profileSource, ["avatar_url", "image_url"]),
  }
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
    position: row.position ?? "Staff",
    department: row.department ?? null,
    permissions: resolveWorkModePermissions({
      position: row.position,
      department: row.department,
      existingPermissions: row.permissions as Partial<WorkModeAssignment["permissions"]> | null,
    }),
    status: (row.status as WorkModeAssignment["status"]) ?? "pending",
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
    userId: row.user_id,
    employer: resolvedEmployer,
    profile: buildProfile(row),
    position: row.position ?? "Staff",
    department: row.department ?? null,
    employmentType: row.employment_type ?? null,
    status: row.status ?? "pending",
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

export class HiringRosterService {
  private supabase: SupabaseClient

  constructor({ supabase }: HiringRosterServiceArgs) {
    this.supabase = supabase
  }

  async listRosterMembers(args: ListRosterMembersArgs): Promise<ListRosterMembersResult> {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    let query = this.supabase
      .from("staff_members")
      .select("*, profiles:user_id(id, full_name, name, display_name, email, phone, avatar_url)", { count: "exact" })
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (args.status && args.status !== "all") query = query.eq("status", args.status)
    if (args.complianceStatus && args.complianceStatus !== "all") {
      query = query.eq("compliance_status", args.complianceStatus)
    }
    if (args.department && args.department !== "all") query = query.eq("department", args.department)
    if (args.search) {
      query = query.or(`position.ilike.%${args.search}%,department.ilike.%${args.search}%`)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as StaffMemberRow[]
    const memberIds = rows.map((row) => row.id)
    const userIds = rows.map((row) => row.user_id)

    const [assignmentsResult, documentsResult] = await Promise.all([
      memberIds.length
        ? this.supabase
            .from("employment_assignments")
            .select("*")
            .eq("employer_entity_type", args.employer.entityType)
            .eq("employer_entity_id", args.employer.entityId)
            .in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? this.supabase
            .from("staff_documents")
            .select("id, staff_member_id, label, document_type, status, expires_at, reviewed_at")
            .in("staff_member_id", memberIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
    if (documentsResult.error) throw new Error(documentsResult.error.message)

    const assignments = ((assignmentsResult.data ?? []) as EmploymentAssignmentRow[]).reduce<Record<string, EmploymentAssignmentRow>>(
      (map, assignment) => {
        map[assignment.user_id] = assignment
        return map
      },
      {}
    )

    const documentsByMember = ((documentsResult.data ?? []) as Array<StaffDocumentRow & { staff_member_id?: string }>).reduce<
      Record<string, StaffDocumentRow[]>
    >((map, document) => {
      if (!document.staff_member_id) return map
      map[document.staff_member_id] = [...(map[document.staff_member_id] ?? []), document]
      return map
    }, {})

    const members = rows.map((row) =>
      mapRosterMember({
        row,
        employer: args.employer,
        assignment: assignments[row.user_id],
        documents: documentsByMember[row.id],
      })
    )

    const departments = Array.from(new Set(members.map((member) => member.department).filter(Boolean))) as string[]

    return {
      members,
      total: count ?? members.length,
      departments,
      complianceCounts: getComplianceCounts(members),
      statusCounts: getStatusCounts(members),
    }
  }

  async getRosterMember(args: GetRosterMemberArgs): Promise<RosterMember | null> {
    const { data, error } = await this.supabase
      .from("staff_members")
      .select("*, profiles:user_id(id, full_name, name, display_name, email, phone, avatar_url)")
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null

    const row = data as StaffMemberRow

    const [assignmentResult, documentsResult] = await Promise.all([
      this.supabase
        .from("employment_assignments")
        .select("*")
        .eq("user_id", row.user_id)
        .eq("employer_entity_type", args.employer.entityType)
        .eq("employer_entity_id", args.employer.entityId)
        .maybeSingle(),
      this.supabase
        .from("staff_documents")
        .select("id, label, document_type, status, expires_at, reviewed_at")
        .eq("staff_member_id", args.memberId),
    ])

    if (assignmentResult.error) throw new Error(assignmentResult.error.message)
    if (documentsResult.error) throw new Error(documentsResult.error.message)

    return mapRosterMember({
      row,
      employer: args.employer,
      assignment: assignmentResult.data as EmploymentAssignmentRow | null,
      documents: documentsResult.data as StaffDocumentRow[] | null,
    })
  }

  async updateRosterMemberStatus(args: UpdateRosterMemberStatusArgs): Promise<RosterMember | null> {
    const canManage = await canManageHiring({ userId: args.actorUserId, employer: args.employer })
    if (!canManage) throw new Error("You do not have permission to update this roster.")

    const { error } = await this.supabase
      .from("staff_members")
      .update({
        status: args.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.memberId)
      .eq("employer_entity_type", args.employer.entityType)
      .eq("employer_entity_id", args.employer.entityId)

    if (error) throw new Error(error.message)

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId,
      event_type: "roster_member_status_updated",
      subject_type: "staff_member",
      subject_id: args.memberId,
      metadata: {
        status: args.status,
        reason: args.reason ?? null,
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId: args.memberId })
  }

  async assignShiftZone(args: AssignShiftZoneArgs): Promise<RosterMember | null> {
    const canAssign = await canAssignWorkMode({ userId: args.actorUserId, employer: args.employer })
    if (!canAssign) throw new Error("You do not have permission to assign roster members.")

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

    const position = candidate.position ?? "Staff"
    const department = candidate.department ?? null
    const permissions = resolveWorkModePermissions({ position, department })

    const { data: member, error: memberError } = await this.supabase
      .from("staff_members")
      .upsert(
        {
          user_id: userId,
          employer_entity_type: args.employer.entityType,
          employer_entity_id: args.employer.entityId,
          venue_id: args.employer.entityType === "venue" ? args.employer.entityId : args.employer.scope?.venueId ?? null,
          position,
          department,
          employment_type: candidate.employment_type ?? null,
          status: "active",
          compliance_status: "needs_review",
          onboarding_candidate_id: args.candidateId,
          onboarding_progress: 100,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,employer_entity_type,employer_entity_id,position" }
      )
      .select("id")
      .single()

    if (memberError) throw new Error(memberError.message)

    const { error: assignmentError } = await this.supabase.from("employment_assignments").upsert(
      {
        user_id: userId,
        staff_member_id: member.id,
        employer_entity_type: args.employer.entityType,
        employer_entity_id: args.employer.entityId,
        venue_id: args.employer.entityType === "venue" ? args.employer.entityId : args.employer.scope?.venueId ?? null,
        position,
        department,
        permissions,
        status: "active",
        source: "hiring_onboarding",
        starts_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,employer_entity_type,employer_entity_id,position" }
    )

    if (assignmentError) throw new Error(assignmentError.message)

    await this.supabase.from("hiring_audit_events").insert({
      employer_entity_type: args.employer.entityType,
      employer_entity_id: args.employer.entityId,
      actor_user_id: args.actorUserId ?? userId,
      event_type: "roster_created_from_onboarding",
      subject_type: "staff_member",
      subject_id: member.id,
      metadata: {
        candidate_id: args.candidateId,
        position,
        department,
      },
    })

    return this.getRosterMember({ employer: args.employer, memberId: member.id })
  }
}
