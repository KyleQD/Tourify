/**
 * P5-T10 — Backfill DRY RUN: read-only cardinality report. Never writes.
 * Usage: WORLD_DB_URL=... WORLD_SERVICE_KEY=... npx tsx scripts/world/projections/dry-run-venue-event.ts
 */
import { createClient } from "@supabase/supabase-js"

async function main() {
  const url = process.env.WORLD_DB_URL
  const key = process.env.WORLD_SERVICE_KEY
  if (!url || !key) throw new Error("WORLD_DB_URL / WORLD_SERVICE_KEY required")
  const db = createClient(url, key, { auth: { persistSession: false } })

  const count = async (table: string): Promise<number | "N/A"> => {
    const { count } = await db.from(table).select("id", { count: "exact", head: true })
    return count ?? "N/A"
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    venue_profiles_total: await count("venue_profiles"),
    events_v2_total: await count("events_v2"),
    events_legacy_total: await count("events"),
  }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
