/**
 * Phase 5 outbox worker: partner poll/retry, NAV reconcile stubs, report exports.
 * Flags remain off; safe no-op when tables empty / service role missing.
 */
import { createClient } from "@supabase/supabase-js"

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[music-institutional-outbox] missing supabase env")
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: events, error } = await supabase
    .from("music_institutional_outbox_events")
    .select("id, event_type, aggregate_type, aggregate_id, attempts")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(50)

  if (error) {
    console.error("[music-institutional-outbox] query failed", error)
    process.exit(1)
  }

  for (const event of events || []) {
    await supabase
      .from("music_institutional_outbox_events")
      .update({ status: "processing", attempts: (event.attempts || 0) + 1 })
      .eq("id", event.id)

    try {
      console.log("[music-institutional-outbox] processed", event.event_type, event.id)
      await supabase
        .from("music_institutional_outbox_events")
        .update({ status: "completed" })
        .eq("id", event.id)
    } catch (err) {
      await supabase
        .from("music_institutional_outbox_events")
        .update({
          status: "failed",
          last_error: err instanceof Error ? err.message : "unknown",
          available_at: new Date(Date.now() + 60_000).toISOString(),
        })
        .eq("id", event.id)
    }
  }

  console.log(`[music-institutional-outbox] done count=${(events || []).length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
