import { NextRequest, NextResponse } from "next/server"

import { withAuth } from "@/lib/auth/api-auth"
import { StaffingFlowError, staffingErrorStatus } from "@/lib/services/staffing-assignment.service"
import { acceptStaffingInvitation } from "@/lib/services/staffing-invitation.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const supabase = createHiringServiceClient()
  const { data, error } = await supabase
    .from("staff_invitations")
    .select("id, status, role, origin, event_id, tour_id, position_details, employer_entity_id")
    .eq("token", token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Unable to load this invitation." }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Invitation not found." }, { status: 404 })
  const details = data.position_details && typeof data.position_details === "object" && !Array.isArray(data.position_details)
    ? data.position_details as Record<string, unknown>
    : {}
  return NextResponse.json({
    invitation: {
      status: data.status,
      role: data.role,
      origin: data.origin,
      eventId: data.event_id,
      tourId: data.tour_id,
      name: typeof details.name === "string" ? details.name : "Team member",
      shiftDate: typeof details.shift_date === "string" ? details.shift_date : null,
      startTime: typeof details.start_time === "string" ? details.start_time : null,
      endTime: typeof details.end_time === "string" ? details.end_time : null,
    },
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  return withAuth(async (_request, { user }) => {
    try {
      const result = await acceptStaffingInvitation({
        supabase: createHiringServiceClient(),
        token,
        user,
      })
      return NextResponse.json({ success: true, ...result })
    } catch (error) {
      if (error instanceof StaffingFlowError) {
        return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: staffingErrorStatus(error) })
      }
      console.error("[staffing invitation accept]", error)
      return NextResponse.json({ error: "Unable to accept this invitation.", code: "database" }, { status: 500 })
    }
  })(request)
}
