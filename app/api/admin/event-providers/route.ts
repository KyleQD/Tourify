import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { checkIsAdmin } from "@/lib/auth/admin"
import { isEventFeatureEnabled, getBandsintownMode, validateProviderConfig } from "@/lib/events/providers/flags"
import { createTicketmasterAdapter } from "@/lib/events/providers/ticketmaster/adapter"
import { createBandsintownAdapter } from "@/lib/events/providers/bandsintown/adapter"

/** GET /api/admin/event-providers — provider modes, config health, live health checks. */
export async function GET() {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_ADMIN_TOOLS")) {
    return NextResponse.json({ error: { code: "FEATURE_UNAVAILABLE" } }, { status: 503 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })
  const admin = await checkIsAdmin()
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const configIssues = validateProviderConfig()

  const ticketmasterEnabled = isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")
  const bandsintownMode = getBandsintownMode()

  const health: Record<string, unknown> = {}
  const tm = createTicketmasterAdapter()
  if (tm) health.ticketmaster = await tm.healthCheck()
  const bit = createBandsintownAdapter()
  if (bit) health.bandsintown = await bit.healthCheck()

  return NextResponse.json({
    providers: {
      ticketmaster: { enabled: ticketmasterEnabled, health: health.ticketmaster ?? null },
      bandsintown: { mode: bandsintownMode, health: health.bandsintown ?? null },
    },
    configIssues,
  })
}
