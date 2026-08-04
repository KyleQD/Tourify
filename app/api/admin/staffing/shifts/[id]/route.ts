import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasEntityPermission } from "@/lib/services/rbac"
import {
  cancelEmploymentAssignmentForShift,
  syncEmploymentAssignmentForShift,
  type StaffShiftRow,
} from "@/lib/services/staff-shift-assignment-sync"

const patchSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
  staff_member_id: z.string().uuid().nullable().optional(),
  shift_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_duration: z.number().int().min(0).optional(),
  zone_assignment: z.string().nullable().optional(),
  role_assignment: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  notify: z.boolean().optional(),
})

function buildChangeSummary(
  before: StaffShiftRow,
  after: StaffShiftRow
): string | null {
  const parts: string[] = []
  if (before.shift_date !== after.shift_date || before.start_time !== after.start_time || before.end_time !== after.end_time)
    parts.push("time was changed")
  if (before.role_assignment !== after.role_assignment) parts.push("role was changed")
  if (before.zone_assignment !== after.zone_assignment) parts.push("zone was changed")
  if (before.staff_member_id !== after.staff_member_id) parts.push("was reassigned to you")
  if (parts.length === 0) return null
  return parts.join("; ")
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = patchSchema.parse(await req.json())
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { data: row, error: fetchErr } = await supabase
      .from("staff_shifts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (fetchErr || !row?.venue_id) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    const allowed =
      (await hasEntityPermission({
        userId: user.id,
        entityType: "Venue",
        entityId: row.venue_id,
        permission: "ASSIGN_EVENT_ROLES",
      })) ||
      (row.event_id
        ? await hasEntityPermission({
            userId: user.id,
            entityType: "Event",
            entityId: row.event_id,
            permission: "ASSIGN_EVENT_ROLES",
          })
        : false)

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { notify, ...patch } = body
    const { data, error } = await supabase.from("staff_shifts").update(patch).eq("id", id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const shouldNotify = notify !== false
    const isCancelled = data.status === "cancelled"
    const changeSummary = buildChangeSummary(row as StaffShiftRow, data as StaffShiftRow)
    const staffChanged = Boolean(patch.staff_member_id && patch.staff_member_id !== row.staff_member_id)

    let sync
    if (isCancelled) {
      sync = await cancelEmploymentAssignmentForShift({
        shift: data as StaffShiftRow,
        notify: shouldNotify,
        actorUserId: user.id,
      })
    } else {
      sync = await syncEmploymentAssignmentForShift({
        shift: data as StaffShiftRow,
        notify: shouldNotify && (Boolean(changeSummary) || staffChanged || body.status === "scheduled"),
        actorUserId: user.id,
        changeSummary: staffChanged ? "was reassigned to you" : changeSummary,
        assignmentStatus:
          data.status === "confirmed" || data.status === "completed"
            ? "confirmed"
            : "invited",
      })
    }

    return NextResponse.json({ data, sync })
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid payload" : (e as Error)?.message || "Unexpected error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { data: row, error: fetchErr } = await supabase
      .from("staff_shifts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (fetchErr || !row?.venue_id) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    const allowed =
      (await hasEntityPermission({
        userId: user.id,
        entityType: "Venue",
        entityId: row.venue_id,
        permission: "ASSIGN_EVENT_ROLES",
      })) ||
      (row.event_id
        ? await hasEntityPermission({
            userId: user.id,
            entityType: "Event",
            entityId: row.event_id,
            permission: "ASSIGN_EVENT_ROLES",
          })
        : false)

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await cancelEmploymentAssignmentForShift({
      shift: row as StaffShiftRow,
      notify: true,
      actorUserId: user.id,
    })

    const { error } = await supabase
      .from("staff_shifts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || "Unexpected error" }, { status: 400 })
  }
}
