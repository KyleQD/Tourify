import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { sendWorkforceActivityNotification } from "@/lib/rebuild/workforce-activity-notify"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const bodySchema = z.object({
  sourceId: z.string().uuid(),
  requestType: z.enum(["time_off", "availability"]),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid workforce request" }, { status: 422 })
  const service = createServiceRoleClient()
  const table = parsed.data.requestType === "time_off" ? "staff_time_off_requests" : "staff_availability"
  const { data: source } = await service.from(table).select("id, staff_member_id").eq("id", parsed.data.sourceId).maybeSingle()
  if (!source?.staff_member_id) return NextResponse.json({ error: "Workforce request not found" }, { status: 404 })
  const { data: member } = await service
    .from("venue_team_members")
    .select("id, user_id, venue_id, name")
    .eq("id", source.staff_member_id)
    .eq("status", "active")
    .maybeSingle()
  if (!member || member.user_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data: venue } = await service.from("venue_profiles").select("id, user_id, main_profile_id").eq("id", member.venue_id).maybeSingle()
  const recipientUserId = venue?.user_id || venue?.main_profile_id
  if (!recipientUserId) return NextResponse.json({ success: true, notified: false })

  const isTimeOff = parsed.data.requestType === "time_off"
  await sendWorkforceActivityNotification({
    recipientUserId,
    actorUserId: auth.user.id,
    type: isTimeOff ? "staff_time_off_request" : "workforce_availability_request",
    title: isTimeOff ? "Time-off request" : "Availability updated",
    content: `${member.name || "A team member"} ${isTimeOff ? "submitted a time-off request" : "updated their availability"}.`,
    sourceType: table,
    sourceId: source.id,
    link: "/admin/dashboard/staff?tab=scheduling",
    priority: isTimeOff ? "high" : "normal",
    targetEntityType: "venue",
    targetEntityId: member.venue_id,
  })
  return NextResponse.json({ success: true, notified: true })
}
