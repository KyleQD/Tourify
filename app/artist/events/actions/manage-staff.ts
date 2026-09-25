"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Artist event crew roster.
 *
 * DB-008 code-drift cluster "artist": this module used to read and write
 * `event_staff`, which the active migration chain never creates (its only
 * definition is
 * `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260811201816_communications_command_center_foundation.sql`),
 * so every call failed with a PostgREST "relation does not exist" error.
 *
 * Canonical destinations recorded by the database lane and
 * `lib/admin/workforce-identity-map.ts` (WORK-101):
 * - the crew person record is `staff_members` — "de-facto organization person
 *   today", canonical destination `organization_people`;
 * - event scope is the chain's own event roster relation `event_participants`,
 *   whose only foreign key is `event_id -> events.id`.
 *
 * A crew entry is therefore a `staff_members` row linked to the event through
 * `event_participants` (participant_id = staff_members.id,
 * participant_type = 'staff_member'). The exported `StaffMember` shape is
 * unchanged so `app/artist/events/operations/page.tsx` keeps working.
 */

interface StaffMember {
  id?: string
  event_id: string
  name: string
  role: string
  status: 'confirmed' | 'pending' | 'declined'
  contact: string
}

type EventSupabase = Awaited<ReturnType<typeof createClient>>

const CREW_PARTICIPANT_TYPE = 'staff_member'

/**
 * `staff_members.status` is free text; the crew UI offers three values, so the
 * record is normalized instead of cast (an unrecognized value would render an
 * empty select with no way to fix it).
 */
function toCrewStatus(value: string | null | undefined): StaffMember['status'] {
  if (value === 'confirmed' || value === 'declined') return value
  if (value === 'pending' || value === 'invited' || value === 'needs_attention') return 'pending'
  return 'confirmed'
}

/**
 * Server-side artist scope check. Every crew mutation is scoped to an event the
 * caller owns; nothing here trusts a caller-supplied event id on its own.
 */
async function assertEventScope(supabase: EventSupabase, eventId: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Not authenticated")

  const { data: event, error } = await supabase
    .from("events")
    .select("id, created_by, artist_id")
    .eq("id", eventId)
    .maybeSingle()

  if (error) throw new Error("Failed to verify event scope")
  if (!event) throw new Error("Event not found")
  if (event.created_by !== user.id && event.artist_id !== user.id) {
    throw new Error("Not authorized for this event")
  }
}

export async function addStaffMember(staff: StaffMember) {
  if (!staff?.event_id || !staff.name) throw new Error("Missing event or name")

  const supabase = await createClient()
  await assertEventScope(supabase, staff.event_id)

  const email = staff.contact?.trim() || null

  // Reuse the canonical crew record when the same person already exists so an
  // event does not fork the organization roster.
  let staffMemberId: string | null = null
  if (email) {
    const { data: existing } = await supabase
      .from("staff_members")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle()
    staffMemberId = existing?.id ?? null
  }

  if (staffMemberId) {
    const { error: updateError } = await supabase
      .from("staff_members")
      .update({ name: staff.name, role: staff.role, status: staff.status })
      .eq("id", staffMemberId)
    if (updateError) {
      console.error("Error updating staff member:", updateError)
      throw new Error("Failed to add staff member")
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("staff_members")
      .insert({ name: staff.name, email, role: staff.role, status: staff.status })
      .select("id")
      .single()
    if (insertError) {
      console.error("Error creating staff member:", insertError)
      throw new Error("Failed to add staff member")
    }
    staffMemberId = created.id
  }

  // Link the crew record to the event through the chain's event roster.
  const { data: link, error: linkError } = await supabase
    .from("event_participants")
    .insert({
      event_id: staff.event_id,
      participant_id: staffMemberId,
      participant_type: CREW_PARTICIPANT_TYPE,
      role: staff.role,
    })
    .select("participant_id, role, created_at")
    .single()

  if (linkError) {
    console.error("Error linking staff member to event:", linkError)
    throw new Error("Failed to add staff member")
  }

  revalidatePath(`/artist/events/${staff.event_id}`)
  return {
    id: link.participant_id,
    event_id: staff.event_id,
    name: staff.name,
    role: link.role || staff.role,
    status: staff.status,
    contact: email ?? "",
  }
}

export async function updateStaffMember(id: string, updates: Partial<StaffMember>) {
  if (!id) throw new Error("Missing staff member id")
  if (!updates?.event_id) throw new Error("Missing event id")

  const supabase = await createClient()
  await assertEventScope(supabase, updates.event_id)

  const patch: Record<string, unknown> = {}
  if (updates.name) patch.name = updates.name
  if (updates.role) patch.role = updates.role
  if (updates.status) patch.status = updates.status
  if (typeof updates.contact === "string") patch.email = updates.contact.trim() || null

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("staff_members")
      .update(patch)
      .eq("id", id)
    if (error) {
      console.error("Error updating staff member:", error)
      throw new Error("Failed to update staff member")
    }
  }

  const { error: roleError } = await supabase
    .from("event_participants")
    .update({ role: updates.role })
    .eq("event_id", updates.event_id)
    .eq("participant_id", id)
    .eq("participant_type", CREW_PARTICIPANT_TYPE)

  if (roleError) {
    console.error("Error updating event crew role:", roleError)
    throw new Error("Failed to update staff member")
  }

  revalidatePath(`/artist/events/${updates.event_id}`)
  return { id, event_id: updates.event_id, ...updates }
}

export async function deleteStaffMember(id: string, eventId: string) {
  if (!id || !eventId) throw new Error("Missing staff member or event id")

  const supabase = await createClient()
  await assertEventScope(supabase, eventId)

  // Unlink from the event; the canonical crew record is left intact so the
  // person is not removed from the organization roster.
  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("participant_id", id)
    .eq("participant_type", CREW_PARTICIPANT_TYPE)

  if (error) {
    console.error("Error deleting staff member:", error)
    throw new Error("Failed to delete staff member")
  }

  revalidatePath(`/artist/events/${eventId}`)
  return { success: true }
}

export async function getEventStaff(eventId: string) {
  if (!eventId) throw new Error("Missing event id")

  const supabase = await createClient()
  await assertEventScope(supabase, eventId)

  const { data: participants, error } = await supabase
    .from("event_participants")
    .select("participant_id, participant_type, role, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching event staff:", error)
    throw new Error("Failed to fetch event staff")
  }

  const rows = participants || []
  const staffIds = rows
    .filter(row => row.participant_type === CREW_PARTICIPANT_TYPE)
    .map(row => row.participant_id)

  const { data: staffRows } = staffIds.length
    ? await supabase
        .from("staff_members")
        .select("id, name, email, role, status")
        .in("id", staffIds)
    : { data: [] as Array<{ id: string; name: string | null; email: string | null; role: string | null; status: string }> }

  const staffById = new Map((staffRows || []).map(row => [String(row.id), row]))

  return rows
    .filter(row => row.participant_type === CREW_PARTICIPANT_TYPE)
    .map(row => {
      const person = staffById.get(String(row.participant_id))
      return {
        id: String(row.participant_id),
        event_id: eventId,
        name: person?.name || "Crew member",
        role: row.role || person?.role || "crew",
        status: toCrewStatus(person?.status),
        contact: person?.email || "",
      }
    })
}
