import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getBandsintownMode } from "@/lib/events/providers/flags"

const connectSchema = z.object({
  ownerType: z.enum(["artist", "venue", "organization"]),
  ownerId: z.string().uuid(),
  externalIdentity: z.string().min(1).max(200),
  displayName: z.string().max(200).optional(),
})

/**
 * POST /api/integrations/bandsintown/connect
 * Creates a pending provider connection and enqueues a verification job.
 * Available only when the resolved Bandsintown mode is not `disabled`.
 * No cross-artist access: the connection row is owned by the caller.
 */
export async function POST(request: NextRequest) {
  const mode = getBandsintownMode()
  if (mode === "disabled") {
    return NextResponse.json(
      { error: { code: "FEATURE_UNAVAILABLE", message: "Bandsintown integration is not available" } },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const input = connectSchema.parse(await request.json())
  const service = createServiceRoleClient()

  const { data: connection, error } = await service
    .from("event_provider_connections")
    .upsert(
      {
        owner_type: input.ownerType,
        owner_id: input.ownerId,
        provider: "bandsintown",
        external_identity: input.externalIdentity.trim(),
        display_name: input.displayName ?? null,
        status: "pending",
        connection_mode: mode,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_type,owner_id,provider,external_identity" },
    )
    .select("id, status")
    .single()
  if (error) return NextResponse.json({ error: { code: "CONNECT_FAILED" } }, { status: 500 })

  // Verification job: confirms the artist identity, then activates.
  await service.from("event_sync_jobs").upsert(
    {
      provider: "bandsintown",
      job_type: "verify_connection",
      dedupe_key: `bandsintown:verify:${connection.id}`,
      payload: { connectionId: connection.id },
      status: "queued",
      priority: 50,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dedupe_key" },
  )

  return NextResponse.json({ connectionId: connection.id, status: connection.status }, { status: 201 })
}
