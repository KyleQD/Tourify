import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: tourId } = await context.params
  return withAdminCapability("tour.manage", async (_request, { supabase, user, admin }) => {
    try {
      await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })
      const calendarToken = crypto.randomUUID()
      const { data, error } = await supabase
        .from("tours")
        .update({ calendar_token: calendarToken })
        .eq("id", tourId)
        .eq("org_id", admin.orgId)
        .select("id, calendar_token")
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return NextResponse.json({ error: "Tour not found" }, { status: 404 })
      return NextResponse.json({ success: true, calendarToken: data.calendar_token })
    } catch (error) {
      const resolved = adminAccessErrorResponse(error, "Failed to rotate calendar token", 500)
      return NextResponse.json({ error: resolved.message }, { status: resolved.status })
    }
  })(request)
}
