import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const attachSchema = z.object({ tourId: z.string().uuid() })

/**
 * POST /api/events/[eventId]/tour — attach an event to an existing
 * Tourify tour. Caller must own the event (artist_id) or hold an approved
 * claim on it. "View Tour" links ride on the same tour_id.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const { tourId } = attachSchema.parse(await request.json())
  const service = createServiceRoleClient()

  const { data: event } = await service
    .from("events")
    .select("id, artist_id")
    .eq("id", eventId)
    .maybeSingle()
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  let authorized = event.artist_id === user.id
  if (!authorized) {
    const { data: claim } = await service
      .from("event_claims")
      .select("id")
      .eq("event_id", eventId)
      .eq("claimant_user_id", user.id)
      .eq("status", "approved")
      .maybeSingle()
    authorized = Boolean(claim)
  }
  if (!authorized) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const { data: tour } = await service.from("tours").select("id").eq("id", tourId).maybeSingle()
  if (!tour) return NextResponse.json({ error: { code: "TOUR_NOT_FOUND" } }, { status: 404 })

  const { error } = await service.from("events").update({ tour_id: tourId }).eq("id", eventId)
  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED" } }, { status: 500 })

  return NextResponse.json({ ok: true, eventId, tourId })
}
