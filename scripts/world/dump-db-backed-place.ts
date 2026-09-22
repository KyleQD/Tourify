/**
 * scripts/world/dump-db-backed-place.ts
 *
 * A5 activation helper: projects a pilot place from the LOCAL isolated
 * Supabase through SupabaseWorldHistoryRepository + the world-place-v0.1
 * projector and writes the database-backed JSON for semantic parity against
 * the static reference fixture.
 *
 * Usage:
 *   WORLD_DB_URL=... WORLD_SERVICE_KEY=... WORLD_VISIBILITY=draft_and_published \
 *   npx tsx scripts/world/dump-db-backed-place.ts detroit out.json
 */
import { writeFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

import { PostgrestSupabaseWorldHistoryReader } from "../../lib/world/history/supabase-world-reader"
import { SupabaseWorldHistoryRepository } from "../../lib/world/history/supabase-world-history-repository"
import { projectDraftWorldPlaceResponse } from "../../lib/world/history/project-world-place-response"
import type { WorldRepositoryVisibility } from "../../lib/world/history/supabase-reader-contract"

async function main() {
  const [key, outPath] = process.argv.slice(2)
  if (!key || !outPath) {
    console.error("Usage: tsx scripts/world/dump-db-backed-place.ts <pilotKey> <outPath>")
    process.exit(64)
  }
  const url = process.env.WORLD_DB_URL
  const serviceKey = process.env.WORLD_SERVICE_KEY
  if (!url || !serviceKey) {
    console.error("WORLD_DB_URL and WORLD_SERVICE_KEY are required")
    process.exit(64)
  }
  const visibility = (process.env.WORLD_VISIBILITY ?? "draft_and_published") as WorldRepositoryVisibility

  // Local isolated rehearsal only. The service-role key here belongs to the
  // disposable local stack, never to Tourify Demo.
  const client = createClient(url, serviceKey, { auth: { persistSession: false } })
  const reader = new PostgrestSupabaseWorldHistoryReader(client)
  const repository = new SupabaseWorldHistoryRepository(reader, { visibility })

  const snapshot = await repository.getPlaceKnowledgeByKey(key)
  if (!snapshot) {
    console.error(`No knowledge snapshot found for ${key}`)
    process.exit(1)
  }
  const response = projectDraftWorldPlaceResponse(snapshot)
  writeFileSync(outPath, JSON.stringify(response, null, 2) + "\n")
  console.log(`Wrote database-backed ${key} response to ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
