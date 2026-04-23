import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasEntityPermission } from "@/lib/services/rbac"

const patchSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
  shift_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  role_assignment: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
})

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
      .select("id, venue_id, event_id")
      .eq("id", id)
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

    const { data, error } = await supabase.from("staff_shifts").update(body).eq("id", id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
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
      .select("id, venue_id, event_id")
      .eq("id", id)
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

    const { error } = await supabase.from("staff_shifts").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || "Unexpected error" }, { status: 400 })
  }
}
