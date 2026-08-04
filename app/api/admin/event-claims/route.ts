import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkIsAdmin } from "@/lib/auth/admin"
import { isEventFeatureEnabled } from "@/lib/events/providers/flags"

const reviewSchema = z.object({
  claimId: z.string().uuid(),
  action: z.enum(["approve", "reject", "revoke"]),
})

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return checkIsAdmin()
}

/** GET /api/admin/event-claims — pending claims for review. */
export async function GET() {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_ADMIN_TOOLS")) {
    return NextResponse.json({ error: { code: "FEATURE_UNAVAILABLE" } }, { status: 503 })
  }
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from("event_claims")
    .select("id, event_id, claimant_user_id, claimant_account_type, relationship_type, evidence, status, created_at")
    .eq("status", "pending")
    .order("created_at")
    .limit(100)
  if (error) return NextResponse.json({ error: { code: "QUERY_FAILED" } }, { status: 500 })
  return NextResponse.json({ claims: data ?? [] })
}

/** POST /api/admin/event-claims — review a claim. Approval grants
 *  ownership (artist_id for artist claims) without touching provider
 *  source URLs or checkout data. */
export async function POST(request: NextRequest) {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_ADMIN_TOOLS")) {
    return NextResponse.json({ error: { code: "FEATURE_UNAVAILABLE" } }, { status: 503 })
  }
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const input = reviewSchema.parse(await request.json())
  const client = createServiceRoleClient()

  const { data: claim } = await client
    .from("event_claims")
    .select("id, event_id, claimant_user_id, claimant_account_type, status")
    .eq("id", input.claimId)
    .single()
  if (!claim) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  const nextStatus =
    input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "revoked"

  const { error } = await client
    .from("event_claims")
    .update({ status: nextStatus, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", claim.id)
  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED" } }, { status: 500 })

  if (input.action === "approve" && claim.claimant_account_type === "artist") {
    await client
      .from("events")
      .update({ artist_id: claim.claimant_user_id })
      .eq("id", claim.event_id)
      .is("artist_id", null)
  }
  if (input.action === "revoke" && claim.claimant_account_type === "artist") {
    await client
      .from("events")
      .update({ artist_id: null })
      .eq("id", claim.event_id)
      .eq("artist_id", claim.claimant_user_id)
  }

  return NextResponse.json({ ok: true, status: nextStatus })
}
