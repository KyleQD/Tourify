import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const schema = z.object({
  staffMemberId: z.string().uuid(),
  tourId: z.string().uuid(),
  teamId: z.string().uuid().nullable().optional(),
  role: z.string().trim().max(160).nullable().optional(),
  zone: z.string().trim().max(160).nullable().optional(),
  managerUserId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  propagationMode: z.enum(["current_events", "current_and_future_events"]).default("current_events"),
  selectedEventIds: z.array(z.string().uuid()).max(500).default([]),
})

export const POST = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tour membership", details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const { data, error } = await (supabase as any).rpc("assign_tour_membership", {
    p_staff_member_id: input.staffMemberId,
    p_tour_id: input.tourId,
    p_team_id: input.teamId ?? null,
    p_role: input.role ?? null,
    p_zone: input.zone ?? null,
    p_manager_user_id: input.managerUserId ?? null,
    p_notes: input.notes ?? null,
    p_propagate_to_future_events: input.propagationMode === "current_and_future_events",
    p_selected_event_ids: input.selectedEventIds.length ? input.selectedEventIds : null,
  })

  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 422
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ success: true, membership: data }, { status: 201 })
})
