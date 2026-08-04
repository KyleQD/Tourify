import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkIsAdmin } from "@/lib/auth/admin"
import { isEventFeatureEnabled } from "@/lib/events/providers/flags"

/** GET /api/admin/event-sync — recent sync runs and queued job stats. */
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

  const client = createServiceRoleClient()
  const [{ data: runs }, { data: jobs }] = await Promise.all([
    client
      .from("event_sync_runs")
      .select("id, provider, started_at, finished_at, status, records_received, records_created, records_updated, error_summary")
      .order("started_at", { ascending: false })
      .limit(50),
    client
      .from("event_sync_jobs")
      .select("id, provider, job_type, status, attempt_count, run_after, last_error_code")
      .in("status", ["queued", "running", "dead"])
      .order("run_after")
      .limit(100),
  ])

  return NextResponse.json({ runs: runs ?? [], jobs: jobs ?? [] })
}
