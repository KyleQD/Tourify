import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-254 — venue workflow subscription management. Reads require venue
 * analytics visibility; writes require team management (routing config is an
 * operational authority, distinct from human delivery preferences which stay
 * in notification_preferences per VEN-294).
 */

const VALID_WORKFLOWS = [
  "booking_request",
  "booking_transition",
  "hiring_stage",
  "shift_published",
  "checkin_alert",
  "document_shared",
] as const

const patchSchema = z.object({
  venue_id: z.string().uuid(),
  workflow: z.enum(VALID_WORKFLOWS),
  target_permission: z.string().min(3).max(60).optional(),
  min_priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let venueId = new URL(request.url).searchParams.get("venue_id")
  if (!venueId) {
    const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
    venueId = venue?.id || null
  }
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "view_analytics")
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("venue_workflow_subscriptions")
    .select("*")
    .eq("venue_id", venueId)
    .order("workflow")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    {
      success: true,
      subscriptions: data || [],
      note:
        "Routing decides WHO (canonical RBAC permission); each human's channels and quiet hours still come from their personal notification_preferences.",
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const { venue_id, workflow, ...updates } = parsed.data

  const access = await canManageVenue(auth.supabase, auth.user.id, venue_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ error: "Team manage permission required" }, { status: 403 })

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("venue_workflow_subscriptions")
    .upsert(
      {
        venue_id,
        workflow,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,workflow" },
    )
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, subscription: data })
}
