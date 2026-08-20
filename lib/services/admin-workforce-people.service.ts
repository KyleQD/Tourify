import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type WorkforcePersonSource =
  | "staff_members"
  | "employment_assignments"
  | "tour_team_members"
  | "event_participants"
  | "venue_team_members"

export interface WorkforcePerson {
  id: string
  userId: string
  name: string
  email: string | null
  role: string | null
  status: string | null
  staffMemberId: string | null
  sources: WorkforcePersonSource[]
}

export interface ListWorkforcePeopleArgs {
  supabase: SupabaseClient
  employerEntityType?: "venue" | "organization" | "artist" | null
  employerEntityId?: string | null
  eventId?: string | null
  tourId?: string | null
  venueId?: string | null
  includePending?: boolean
  limit?: number
}

function collectIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function mergePerson(
  map: Map<string, WorkforcePerson>,
  person: Omit<WorkforcePerson, "sources"> & { source: WorkforcePersonSource }
) {
  const existing = map.get(person.userId)
  if (!existing) {
    map.set(person.userId, {
      id: person.id,
      userId: person.userId,
      name: person.name,
      email: person.email,
      role: person.role,
      status: person.status,
      staffMemberId: person.staffMemberId,
      sources: [person.source],
    })
    return
  }

  if (!existing.sources.includes(person.source)) existing.sources.push(person.source)
  if (!existing.email && person.email) existing.email = person.email
  if ((!existing.role || existing.role === "Staff") && person.role) existing.role = person.role
  if (!existing.staffMemberId && person.staffMemberId) existing.staffMemberId = person.staffMemberId
  if (person.name && (existing.name === "Staff member" || existing.name.length < person.name.length)) {
    existing.name = person.name
  }
}

export async function listWorkforcePeople(args: ListWorkforcePeopleArgs): Promise<WorkforcePerson[]> {
  const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
  const includePending = args.includePending !== false
  const peopleByUserId = new Map<string, WorkforcePerson>()

  const staffStatuses = includePending ? ["pending", "active"] : ["active"]
  const assignmentStatuses = includePending
    ? ["invited", "confirmed", "active"]
    : ["confirmed", "active"]

  if (args.employerEntityType && args.employerEntityId) {
    const { data: staffRows } = await args.supabase
      .from("staff_members")
      .select("id, user_id, name, email, role, position, status")
      .eq("employer_entity_type", args.employerEntityType)
      .eq("employer_entity_id", args.employerEntityId)
      .in("status", staffStatuses)
      .limit(limit)

    for (const row of staffRows ?? []) {
      if (!row.user_id) continue
      mergePerson(peopleByUserId, {
        id: row.id,
        userId: row.user_id,
        name: row.name || row.email || "Staff member",
        email: row.email ?? null,
        role: row.position || row.role || "Staff",
        status: row.status ?? null,
        staffMemberId: row.id,
        source: "staff_members",
      })
    }

    let assignmentQuery = args.supabase
      .from("employment_assignments")
      .select("id, user_id, role_title, position, status, staff_member_id, event_id, tour_id")
      .eq("employer_entity_type", args.employerEntityType)
      .eq("employer_entity_id", args.employerEntityId)
      .in("status", assignmentStatuses)
      .limit(limit)

    if (args.eventId) assignmentQuery = assignmentQuery.eq("event_id", args.eventId)
    if (args.tourId) assignmentQuery = assignmentQuery.eq("tour_id", args.tourId)

    const { data: assignmentRows } = await assignmentQuery
    for (const row of assignmentRows ?? []) {
      if (!row.user_id) continue
      mergePerson(peopleByUserId, {
        id: row.id,
        userId: row.user_id,
        name: row.role_title || "Staff member",
        email: null,
        role: row.position || row.role_title || "Staff",
        status: row.status ?? null,
        staffMemberId: row.staff_member_id ?? null,
        source: "employment_assignments",
      })
    }
  }

  if (args.tourId) {
    const { data: tourMembers } = await args.supabase
      .from("tour_team_members")
      .select("id, user_id, staff_member_id, name, email, contact_email, role, status")
      .eq("tour_id", args.tourId)
      .eq("is_active", true)
      .limit(limit)

    for (const row of tourMembers ?? []) {
      if (!row.user_id) continue
      mergePerson(peopleByUserId, {
        id: row.id,
        userId: row.user_id,
        name: row.name || row.email || row.contact_email || "Tour member",
        email: row.email || row.contact_email || null,
        role: row.role ?? "Crew",
        status: row.status ?? null,
        staffMemberId: row.staff_member_id ?? null,
        source: "tour_team_members",
      })
    }
  }

  if (args.eventId) {
    const { data: participants } = await args.supabase
      .from("event_participants")
      .select("id, participant_id, role, status")
      .eq("event_id", args.eventId)
      .eq("participant_type", "Individual")
      .limit(limit)

    for (const row of participants ?? []) {
      if (!row.participant_id) continue
      mergePerson(peopleByUserId, {
        id: row.id,
        userId: row.participant_id,
        name: "Event participant",
        email: null,
        role: row.role ?? "Team member",
        status: row.status ?? null,
        staffMemberId: null,
        source: "event_participants",
      })
    }
  }

  if (args.venueId || args.employerEntityType === "venue") {
    const venueId = args.venueId || args.employerEntityId
    if (venueId) {
      const { data: venueMembers } = await args.supabase
        .from("venue_team_members")
        .select("id, user_id, name, email, role, status")
        .eq("venue_id", venueId)
        .limit(limit)

      for (const row of venueMembers ?? []) {
        if (!row.user_id) continue
        mergePerson(peopleByUserId, {
          id: row.id,
          userId: row.user_id,
          name: row.name || row.email || "Venue member",
          email: row.email ?? null,
          role: row.role ?? "Member",
          status: row.status ?? null,
          staffMemberId: null,
          source: "venue_team_members",
        })
      }
    }
  }

  const userIds = collectIds(Array.from(peopleByUserId.keys()))
  if (userIds.length > 0) {
    const { data: profiles } = await args.supabase
      .from("profiles")
      .select("id, user_id, full_name, email, username")
      .or(`id.in.(${userIds.join(",")}),user_id.in.(${userIds.join(",")})`)

    for (const profile of profiles ?? []) {
      const profileUserId =
        (typeof profile.user_id === "string" && profile.user_id) ||
        (typeof profile.id === "string" && profile.id) ||
        null
      if (!profileUserId) continue
      const existing = peopleByUserId.get(profileUserId) || peopleByUserId.get(profile.id as string)
      if (!existing) continue
      if (profile.full_name) existing.name = profile.full_name as string
      else if (profile.username && existing.name === "Staff member") existing.name = profile.username as string
      if (!existing.email && profile.email) existing.email = profile.email as string
    }
  }

  return Array.from(peopleByUserId.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)
}
