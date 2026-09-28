import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-131/132/133 — application lifecycle transition surface.
 * - status uses the SINGLE canonical vocabulary (new/reviewed/interviewed/
 *   offer/hired/rejected/withdrawn).
 * - 'hired' is only reachable through hire_venue_candidate (compliance gate +
 *   transactional staff/assignment/onboarding creation). A direct PATCH to
 *   'hired' without the RPC returns 409 with guidance.
 */

const CANONICAL = ["new", "reviewed", "interviewed", "offer", "hired", "rejected", "withdrawn"] as const

const patchSchema = z.object({
  status: z.enum(CANONICAL).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewer_notes: z.string().trim().max(2000).nullable().optional(),
  decision_note: z.string().trim().max(2000).nullable().optional(),
  interview_scheduled: z.boolean().nullable().optional(),
  interview_date: z.string().datetime({ offset: true }).nullable().optional(),
  interview_notes: z.string().trim().max(2000).nullable().optional(),
  offer_made: z.boolean().nullable().optional(),
  offer_details: z.string().trim().max(2000).nullable().optional(),
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid application id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid application update", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const service = createServiceRoleClient()
  const { data: app } = await service
    .from("job_applications")
    .select("id, venue_id, status")
    .eq("id", id)
    .maybeSingle()
  if (!app?.id) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })

  const venueId =
    new URL(request.url).searchParams.get("venue_id") ??
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id ??
    app.venue_id
  const access = await canManageVenue(auth.supabase, auth.user.id, venueId || app.venue_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  // VEN-132: hiring goes through the gated transactional service.
  if (parsed.data.status === "hired") {
    const { data: hireResult, error: hireError } = await service.rpc("hire_venue_candidate", {
      p_application_id: id,
      p_actor_user_id: auth.user.id,
    })
    if (hireError || !hireResult) {
      const message = hireError?.message || "Hire failed compliance gate"
      const conflict = /40901|40902|eligibility|compliance/i.test(message)
      return NextResponse.json(
        { success: false, code: conflict ? "COMPLIANCE_GATE" : "HIRE_FAILED", error: message },
        { status: conflict ? 409 : 500 },
      )
    }
    return NextResponse.json({ success: true, data: hireResult })
  }

  // VEN-131: canonical vocabulary enforcement on direct transitions.
  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.status && parsed.data.status !== app.status) {
    updates.reviewed_by = auth.user.id
    updates.reviewed_at = new Date().toISOString()
  }

  const { data, error } = await service
    .from("job_applications")
    .update(updates)
    .eq("id", id)
    .select("id, status, reviewed_at, updated_at")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
