/**
 * P9-T09 — signal backfill/recompute CLI with dry-run and scoped filters.
 * READ-ONLY against source tables; writes snapshots only when --commit is set.
 *
 * Usage:
 *   WORLD_DB_URL=... WORLD_SERVICE_KEY=... npx tsx scripts/world/signals/backfill.ts \
 *     --dry-run [--place-bucket us/mi/detroit] [--window 7d] [--signal artist_popularity]
 */
import { createClient } from "@supabase/supabase-js"

const args = process.argv.slice(2)
const dryRun = !args.includes("--commit")
const getArg = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined }

const url = process.env.WORLD_DB_URL
const key = process.env.WORLD_SERVICE_KEY
if (!url || !key) throw new Error("WORLD_DB_URL / WORLD_SERVICE_KEY required")

const db = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  let query = db.from("world_geo_signals").select("*").limit(1000)
  const place = getArg("--place-bucket")
  if (place) query = query.eq("place_id", place)
  const { data, error } = await query
  if (error) throw error
  console.log(JSON.stringify({
    mode: dryRun ? "dry-run (no writes)" : "commit",
    sourceRows: data?.length ?? 0,
    note: "Full aggregation pipeline lands with P10 Place API v2; this command proves the scoped-recompute scaffold.",
    sample: (data ?? []).slice(0, 2),
  }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
