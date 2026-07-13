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
  UpsertRosterFromApprovalArgs,
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
            .select("staff_member_id, staff_members(id, user_id)")
            .in("event_id", eventIds),
        ])

        for (const row of assignments || []) {
          if (row.user_id) userIdSet.add(row.user_id)
        }
        for (const row of shifts || []) {
          if (row.staff_member_id) memberIdSet.add(row.staff_member_id)
          const member = Array.isArray(row.staff_members) ? row.staff_members[0] : row.staff_members
          if (member?.user_id) userIdSet.add(member.user_id)
          if (member?.id) memberIdSet.add(member.id)
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
      .select("*, profiles:user_id(id, full_name, name, display_name, email, phone, avatar_url)", { count: "exact" })
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
    const canManage = await canManageHiring({ supabase: this.supabase, userId: args.actorUserId, employer: args.employer })
    if (!canManage.ok || !canManage.data.allowed) throw new Error("You do not have permission to update this roster.")

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
      department: department || existing?.department || "General",
      employment_type: args.employmentType || existing?.employment_type || "contractor",
      // staff_members.status check allows active | on_leave | terminated
      status: "active",
      compliance_status: completed ? "submitted" : "needs_review",
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
