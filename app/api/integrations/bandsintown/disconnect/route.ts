import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const disconnectSchema = z.object({ connectionId: z.string().uuid() })

/**
 * POST /api/integrations/bandsintown/disconnect
 * Revokes a connection the caller owns. Imported source records are
 * disabled (not deleted); verified Tourify-native events are preserved.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const { connectionId } = disconnectSchema.parse(await request.json())
  const service = createServiceRoleClient()

  const { data: connection } = await service
    .from("event_provider_connections")
    .select("id, created_by, provider")
    .eq("id", connectionId)
    .maybeSingle()
  if (!connection || connection.provider !== "bandsintown") {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }
  if (connection.created_by !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
  }

  await service
    .from("event_provider_connections")
    .update({ status: "disconnected", next_sync_at: null, updated_at: new Date().toISOString() })
    .eq("id", connectionId)

  // Canonical events and source records are preserved; the connection no
  // longer syncs. (Source records are not connection-scoped today, so we
  // intentionally do not blanket-disable other artists' sources.)
  return NextResponse.json({ ok: true, status: "disconnected" })
}
