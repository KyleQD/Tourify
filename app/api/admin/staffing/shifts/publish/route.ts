import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasEntityPermission } from "@/lib/services/rbac"
import { publishStaffShifts } from "@/lib/services/staff-shift-assignment-sync"

const publishSchema = z.object({
  shift_ids: z.array(z.string().uuid()).min(1),
  notify: z.boolean().optional().default(true),
})

export async function POST(req: Request) {
  try {
    const input = publishSchema.parse(await req.json())
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { data: shifts, error: fetchError } = await supabase
      .from("staff_shifts")
      .select("id, venue_id, event_id")
      .in("id", input.shift_ids)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })
    if (!shifts?.length) return NextResponse.json({ error: "No shifts found" }, { status: 404 })

    const venueIds = Array.from(new Set(shifts.map((s) => s.venue_id).filter(Boolean))) as string[]
    for (const venueId of venueIds) {
      const allowed = await hasEntityPermission({
        userId: user.id,
        entityType: "Venue",
        entityId: venueId,
        permission: "ASSIGN_EVENT_ROLES",
      })
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await publishStaffShifts({
      shiftIds: input.shift_ids,
      actorUserId: user.id,
      notify: input.notify,
    })

    return NextResponse.json({
      data: result,
      message:
        input.notify
          ? `Published ${result.published} shifts and notified ${result.notified} staff.`
          : `Published ${result.published} shifts.`,
    })
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid payload" : (e as Error)?.message || "Unexpected error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
