import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasEntityPermission } from "@/lib/services/rbac"
import { syncEmploymentAssignmentForShift } from "@/lib/services/staff-shift-assignment-sync"

const createSchema = z.object({
  venue_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  staff_member_id: z.string().uuid(),
  shift_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration: z.number().int().min(0).default(0),
  zone_assignment: z.string().optional(),
  role_assignment: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
  /** When true, sync Work Mode invite and notify the worker immediately. */
  notify: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  try {
    const input = createSchema.parse(await req.json())
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const allowed =
      (await hasEntityPermission({
        userId: user.id,
        entityType: "Venue",
        entityId: input.venue_id,
        permission: "ASSIGN_EVENT_ROLES",
      })) ||
      (input.event_id
        ? await hasEntityPermission({
            userId: user.id,
            entityType: "Event",
            entityId: input.event_id,
            permission: "ASSIGN_EVENT_ROLES",
          })
        : false)

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { notify, ...shiftInput } = input
    const { data, error } = await supabase
      .from("staff_shifts")
      .insert({
        ...shiftInput,
        status: shiftInput.status ?? "scheduled",
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Always sync employment_assignments; notify only when requested (publish / save & publish)
    const sync = await syncEmploymentAssignmentForShift({
      shift: data,
      notify: Boolean(notify),
      actorUserId: user.id,
      assignmentStatus: data.status === "confirmed" ? "confirmed" : "invited",
    })

    return NextResponse.json({ data, sync })
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid payload" : (e as Error)?.message || "Unexpected error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const venueId = url.searchParams.get("venueId")
    if (!venueId) return NextResponse.json({ error: "venueId required" }, { status: 400 })

    const eventId = url.searchParams.get("eventId") || undefined
    const staffMemberId = url.searchParams.get("staff_member_id") || undefined
    const status = url.searchParams.get("status") || undefined
    const dateFrom = url.searchParams.get("date_from") || undefined
    const dateTo = url.searchParams.get("date_to") || undefined

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const canReadVenue = await hasEntityPermission({
      userId: user.id,
      entityType: "Venue",
      entityId: venueId,
      permission: "EDIT_EVENT_LOGISTICS",
    })
    const canReadEvent = eventId
      ? (await hasEntityPermission({
          userId: user.id,
          entityType: "Event",
          entityId: eventId,
          permission: "EDIT_EVENT_LOGISTICS",
        })) ||
        (await hasEntityPermission({
          userId: user.id,
          entityType: "Event",
          entityId: eventId,
          permission: "ASSIGN_EVENT_ROLES",
        }))
      : false
    if (!canReadVenue && !canReadEvent) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    let query = supabase.from("staff_shifts").select("*").eq("venue_id", venueId)

    if (eventId) query = query.eq("event_id", eventId)
    if (staffMemberId) query = query.eq("staff_member_id", staffMemberId)
    if (status) query = query.eq("status", status)
    if (dateFrom) query = query.gte("shift_date", dateFrom)
    if (dateTo) query = query.lte("shift_date", dateTo)

    const { data, error } = await query
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || "Unexpected error" }, { status: 400 })
  }
}
