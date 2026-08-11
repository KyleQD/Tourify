import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getBandsintownMode } from "@/lib/events/providers/flags"

/** GET /api/integrations/bandsintown/status — caller's connections. */
export async function GET() {
  const mode = getBandsintownMode()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const { data, error } = await supabase
    .from("event_provider_connections")
    .select("id, owner_type, owner_id, external_identity, display_name, status, connection_mode, last_synced_at, last_error_code")
    .eq("provider", "bandsintown")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: { code: "QUERY_FAILED" } }, { status: 500 })
  return NextResponse.json({ mode, connections: data ?? [] })
}
