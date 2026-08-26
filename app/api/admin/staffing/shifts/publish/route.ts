import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasEntityPermission } from "@/lib/services/rbac"
import { publishStaffShifts } from "@/lib/services/staff-shift-assignment-sync"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

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

    // ADM-M-006: venue-scoped shifts require venue authority; ORG-scoped
    // shifts (venue_id null) previously skipped every permission check.
    // They now require a verified acting-admin context with workforce.manage,
    // and every such shift's event must belong to the acting org.
    const orgShifts = shifts.filter((s) => !s.venue_id)
    if (orgShifts.length > 0) {
      const auth = await authenticateApiRequest(req as unknown as Request)
      if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
      const admin = await resolveActingAdminContext(req as unknown as Request, auth)
      if (admin instanceof NextResponse) return admin
      if (!hasAdminCapability(admin.capabilities, "workforce.manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      for (const shift of orgShifts) {
        if (!shift.event_id) {
          // No venue AND no event linkage: scope cannot be established.
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        const { data: ev } = await supabase
          .from("events_v2")
          .select("org_id")
          .eq("id", shift.event_id)
          .maybeSingle()
        if (!ev?.org_id || ev.org_id !== admin.orgId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
    }

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
