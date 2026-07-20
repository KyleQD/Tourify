import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export interface WorkerOpsShift {
  id: string
  eventId: string | null
  shiftDate: string | null
  startTime: string | null
  endTime: string | null
  role: string | null
  status: string | null
  zone: string | null
}

export interface WorkerOpsTask {
  id: string
  eventId: string | null
  title: string
  status: string | null
  dueDate: string | null
  priority: string | null
}

export interface WorkerOpsLodging {
  id: string
  guestName: string | null
  roomNumber: string | null
  bookingId: string | null
  status: string | null
}

export interface WorkerOpsTravel {
  id: string
  groupName: string | null
  status: string | null
  role: string | null
}

export interface WorkerOpsAssignment {
  id: string
  roleTitle: string | null
  status: string | null
  eventId: string | null
  tourId: string | null
  employerEntityType: string | null
  employerEntityId: string | null
}

export interface WorkerOpsDashboard {
  staffMembers: Array<{
    id: string
    status: string | null
    position: string | null
    employerEntityType: string | null
    employerEntityId: string | null
  }>
  assignments: WorkerOpsAssignment[]
  shifts: WorkerOpsShift[]
  tasks: WorkerOpsTask[]
  lodging: WorkerOpsLodging[]
  travel: WorkerOpsTravel[]
}

export async function getWorkerOpsDashboard(args: {
  supabase: SupabaseClient
  userId: string
}): Promise<WorkerOpsDashboard> {
  const { supabase, userId } = args

  const [{ data: staffRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, status, position, role, employer_entity_type, employer_entity_id")
      .eq("user_id", userId)
      .in("status", ["pending", "active"]),
    supabase
      .from("employment_assignments")
      .select("id, role_title, status, event_id, tour_id, employer_entity_type, employer_entity_id")
      .eq("user_id", userId)
      .in("status", ["invited", "confirmed", "active"]),
  ])

  const staffMemberIds = (staffRows ?? []).map((row) => row.id as string).filter(Boolean)
  const eventIds = Array.from(
    new Set((assignmentRows ?? []).map((row) => row.event_id as string | null).filter(Boolean) as string[])
  )

  const [shiftsResult, tasksResult, lodgingResult, travelResult] = await Promise.all([
    staffMemberIds.length > 0
      ? supabase
          .from("staff_shifts")
          .select("id, event_id, shift_date, start_time, end_time, role_assignment, status, zone_assignment")
          .in("staff_member_id", staffMemberIds)
          .order("shift_date", { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] as any[] }),
    eventIds.length > 0
      ? supabase
          .from("tasks")
          .select("id, event_id, title, name, status, due_date, priority, assignee_id, assigned_to")
          .or(`assignee_id.eq.${userId},assigned_to.eq.${userId}`)
          .in("event_id", eventIds)
          .limit(50)
      : supabase
          .from("tasks")
          .select("id, event_id, title, name, status, due_date, priority, assignee_id, assigned_to")
          .or(`assignee_id.eq.${userId},assigned_to.eq.${userId}`)
          .limit(50),
    staffMemberIds.length > 0
      ? supabase
          .from("lodging_guest_assignments")
          .select("id, guest_name, room_number, booking_id, status, team_member_id, staff_id")
          .or(`team_member_id.eq.${userId},staff_id.in.(${staffMemberIds.join(",")})`)
          .limit(50)
      : supabase
          .from("lodging_guest_assignments")
          .select("id, guest_name, room_number, booking_id, status, team_member_id, staff_id")
          .eq("team_member_id", userId)
          .limit(50),
    supabase
      .from("travel_group_members")
      .select("id, status, role, travel_groups(name, status)")
      .eq("user_id", userId)
      .limit(50),
  ])

  return {
    staffMembers: (staffRows ?? []).map((row) => ({
      id: row.id as string,
      status: (row.status as string | null) ?? null,
      position: ((row.position || row.role) as string | null) ?? null,
      employerEntityType: (row.employer_entity_type as string | null) ?? null,
      employerEntityId: (row.employer_entity_id as string | null) ?? null,
    })),
    assignments: (assignmentRows ?? []).map((row) => ({
      id: row.id as string,
      roleTitle: (row.role_title as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      eventId: (row.event_id as string | null) ?? null,
      tourId: (row.tour_id as string | null) ?? null,
      employerEntityType: (row.employer_entity_type as string | null) ?? null,
      employerEntityId: (row.employer_entity_id as string | null) ?? null,
    })),
    shifts: (shiftsResult.data ?? []).map((row: any) => ({
      id: row.id,
      eventId: row.event_id ?? null,
      shiftDate: row.shift_date ?? null,
      startTime: row.start_time ?? null,
      endTime: row.end_time ?? null,
      role: row.role_assignment ?? null,
      status: row.status ?? null,
      zone: row.zone_assignment ?? null,
    })),
    tasks: (tasksResult.data ?? []).map((row: any) => ({
      id: row.id,
      eventId: row.event_id ?? null,
      title: row.title || row.name || "Task",
      status: row.status ?? null,
      dueDate: row.due_date ?? null,
      priority: row.priority ?? null,
    })),
    lodging: ((lodgingResult as { data?: any[] | null }).data ?? []).map((row: any) => ({
      id: row.id,
      guestName: row.guest_name ?? null,
      roomNumber: row.room_number ?? null,
      bookingId: row.booking_id ?? null,
      status: row.status ?? null,
    })),
    travel: ((travelResult as { data?: any[] | null; error?: { message?: string } | null }).error
      ? []
      : (travelResult as { data?: any[] | null }).data ?? []
    ).map((row: any) => ({
      id: row.id,
      groupName: row.travel_groups?.name ?? null,
      status: row.status ?? row.travel_groups?.status ?? null,
      role: row.role ?? null,
    })),
  }
}
