import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { isEventFeatureEnabled } from "@/lib/events/providers/flags"

const claimSchema = z.object({
  claimantAccountType: z.enum(["artist", "venue", "organization"]),
  claimantAccountId: z.string().uuid().optional(),
  relationshipType: z.enum(["performer", "venue_host", "organizer", "manager"]),
  evidence: z
    .object({
      note: z.string().max(2000).optional(),
      links: z.array(z.string().url()).max(5).optional(),
      providerIdentity: z.string().max(200).optional(),
    })
    .optional(),
})

/**
 * POST /api/events/[eventId]/claim — submit an ownership claim on an
 * imported event. Auto-verification only happens with a strong linked
 * identity (matching verified provider connection); otherwise the claim
 * queues for admin review. Claiming never grants the right to edit a
 * provider's source URL or external checkout data.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isEventFeatureEnabled("EVENT_EXTERNAL_CLAIMS")) {
    return NextResponse.json(
      { error: { code: "FEATURE_UNAVAILABLE", message: "Event claims are not enabled" } },
      { status: 503 },
    )
  }

  const { eventId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const input = claimSchema.parse(await request.json())
  const service = createServiceRoleClient()

  const { data: event } = await service
    .from("events")
    .select("id, artist_id, status")
    .eq("id", eventId)
    .maybeSingle()
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  if (event.artist_id) {
    return NextResponse.json({ error: { code: "ALREADY_OWNED" } }, { status: 409 })
  }

  // Strong linked identity: a verified provider connection owned by this
  // user for the same account auto-verifies the claim.
  let autoVerify = false
  if (input.claimantAccountId) {
    const { data: connection } = await service
      .from("event_provider_connections")
      .select("id, status, verified_at")
      .eq("owner_type", input.claimantAccountType)
      .eq("owner_id", input.claimantAccountId)
      .eq("status", "active")
      .not("verified_at", "is", null)
      .limit(1)
      .maybeSingle()
    autoVerify = Boolean(connection)
  }

  const { data: claim, error } = await service
    .from("event_claims")
    .insert({
      event_id: eventId,
      claimant_user_id: user.id,
      claimant_account_type: input.claimantAccountType,
      claimant_account_id: input.claimantAccountId ?? null,
      relationship_type: input.relationshipType,
      evidence: input.evidence ?? {},
      status: autoVerify ? "approved" : "pending",
      reviewed_at: autoVerify ? new Date().toISOString() : null,
    })
    .select("id, status")
    .single()
  if (error) return NextResponse.json({ error: { code: "CLAIM_FAILED" } }, { status: 500 })

  if (autoVerify && input.claimantAccountType === "artist") {
    await service.from("events").update({ artist_id: user.id }).eq("id", eventId).is("artist_id", null)
  }

  return NextResponse.json({ claimId: claim.id, status: claim.status }, { status: 201 })
}
