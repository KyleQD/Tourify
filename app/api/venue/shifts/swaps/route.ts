import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { sendWorkforceActivityNotification } from "@/lib/rebuild/workforce-activity-notify"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

const createSchema = z.object({
  venue_id: z.string().uuid(),
  original_shift_id: z.string().uuid(),
  original_staff_id: z.string().uuid(),
  requested_staff_id: z.string().uuid(),
  swap_reason: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const venueId = request.nextUrl.searchParams.get("venue_id") || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })
  const service = createServiceRoleClient()
  const { data, error } = await service.from("venue_shift_swaps").select("*").eq("venue_id", venueId).order("requested_at", { ascending: false }).limit(200)
  if (error) return NextResponse.json({ success: false, error: "Unable to load shift swaps" }, { status: 503 })
  return NextResponse.json({ success: true, data: data ?? [], swaps: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid shift swap", details: parsed.error.flatten() }, { status: 422 })
  const service = createServiceRoleClient()
  const { data: staff } = await service.from("venue_team_members").select("id, user_id, name").eq("id", parsed.data.original_staff_id).eq("venue_id", parsed.data.venue_id).eq("status", "active").maybeSingle()
  const managerAccess = await canManageVenue(auth.supabase, auth.user.id, parsed.data.venue_id, "manage_team")
  if (!staff || (staff.user_id !== auth.user.id && !managerAccess.allowed)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  const { data, error } = await service.from("venue_shift_swaps").insert({ ...parsed.data, requested_by: auth.user.id, request_status: "pending" }).select("*").single()
  if (error || !data) return NextResponse.json({ success: false, error: "Unable to create shift swap" }, { status: 503 })
  const { data: venue } = await service.from("venue_profiles").select("id, user_id, main_profile_id").eq("id", parsed.data.venue_id).maybeSingle()
  const recipientUserId = venue?.user_id || venue?.main_profile_id
  if (recipientUserId) {
    await sendWorkforceActivityNotification({
      recipientUserId,
      actorUserId: auth.user.id,
      type: "shift_swap_request",
      title: "Shift swap request",
      content: `${staff.name || "A team member"} requested a shift swap.`,
      sourceType: "venue_shift_swap",
      sourceId: data.id,
      link: "/admin/dashboard/staff?tab=scheduling",
      priority: "high",
      targetEntityType: "venue",
      targetEntityId: parsed.data.venue_id,
    }).catch((notifyError) => console.warn("[venue shift swaps] notification failed", notifyError))
  }
  return NextResponse.json({ success: true, data }, { status: 201 })
}
