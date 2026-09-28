import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { withPlatformAdmin } from "@/lib/auth/api-auth"
import { isEventFeatureEnabled } from "@/lib/events/providers/flags"

const actionSchema = z.object({
  candidateId: z.string().uuid(),
  action: z.enum(["merge", "reject", "never_merge"]),
  winnerEventId: z.string().uuid().optional(),
})

/** GET /api/admin/event-merges — pending merge candidates, newest first. */
export const GET = withPlatformAdmin(async () => {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_ADMIN_TOOLS")) {
    return NextResponse.json({ error: { code: "FEATURE_UNAVAILABLE" } }, { status: 503 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from("event_merge_candidates")
    .select(
      "id, left_event_id, right_event_id, confidence_score, match_reasons, status, created_at",
    )
    .eq("status", "pending")
    .order("confidence_score", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: { code: "QUERY_FAILED" } }, { status: 500 })
  return NextResponse.json({ candidates: data ?? [] })
})

/** POST /api/admin/event-merges — execute a merge / reject / never-merge. */
export const POST = withPlatformAdmin(async (request: NextRequest) => {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_ADMIN_TOOLS")) {
    return NextResponse.json({ error: { code: "FEATURE_UNAVAILABLE" } }, { status: 503 })
  }

  const input = actionSchema.parse(await request.json())
  const client = createServiceRoleClient()

  const { data: candidate } = await client
    .from("event_merge_candidates")
    .select("id, left_event_id, right_event_id, status")
    .eq("id", input.candidateId)
    .single()
  if (!candidate) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  if (candidate.status !== "pending") {
    return NextResponse.json({ error: { code: "ALREADY_REVIEWED" } }, { status: 409 })
  }

  if (input.action === "merge") {
    const winner = input.winnerEventId ?? candidate.left_event_id
    const loser = winner === candidate.left_event_id ? candidate.right_event_id : candidate.left_event_id
    const { error } = await client.rpc("event_merge_execute", {
      p_winner: winner,
      p_loser: loser,
      p_actor: admin.id,
    })
    if (error) return NextResponse.json({ error: { code: "MERGE_FAILED", message: error.message } }, { status: 500 })
    return NextResponse.json({ ok: true, winner, loser })
  }

  if (input.action === "never_merge") {
    const [left, right] = [candidate.left_event_id, candidate.right_event_id].sort()
    await client.from("event_merge_decisions").upsert(
      { left_event_id: left, right_event_id: right, decision: "never_merge", decided_by: admin.id },
      { onConflict: "left_event_id,right_event_id" },
    )
  }

  const { error } = await client
    .from("event_merge_candidates")
    .update({
      status: input.action === "never_merge" ? "never_merge" : "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED" } }, { status: 500 })
  return NextResponse.json({ ok: true })
})
