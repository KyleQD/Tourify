import { createClient } from "@supabase/supabase-js"

function required(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

async function main() {
  const supabase = createClient(
    required("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: flag } = await supabase.from("feature_flags").select("enabled").eq("key", "music_origin_processing_enabled").maybeSingle()
  const { data: tracks, error } = await supabase.from("artist_music")
    .select("id, user_id, active_declaration_id, storage_bucket, storage_path")
    .eq("trust_schema_version", 1).eq("trust_setup_status", "repair_required").limit(200)
  if (error) throw error

  let repaired = 0
  let unresolved = 0
  for (const track of tracks || []) {
    if (!track.active_declaration_id) { unresolved += 1; continue }
    if (flag?.enabled && track.storage_path) {
      const idempotencyKey = `${track.id}:full:${track.storage_path}:${track.active_declaration_id}`
      const { error: jobError } = await supabase.from("music_file_fingerprints").upsert({
        track_id: track.id, user_id: track.user_id, declaration_id: track.active_declaration_id,
        file_role: "full", storage_bucket: track.storage_bucket || "artist-music", storage_path: track.storage_path,
        processing_status: "pending", next_attempt_at: new Date().toISOString(), idempotency_key: idempotencyKey,
      }, { onConflict: "idempotency_key", ignoreDuplicates: true })
      if (jobError) { unresolved += 1; continue }
    }
    const { error: updateError } = await supabase.from("artist_music").update({
      trust_setup_status: "ready", origin_status: flag?.enabled && track.storage_path ? "pending" : "not_recorded",
      updated_at: new Date().toISOString(),
    }).eq("id", track.id).eq("is_public", false)
    if (updateError) unresolved += 1
    else repaired += 1
  }
  console.log(JSON.stringify({ metric: "music_trust_reconciliation", scanned: tracks?.length || 0, repaired, unresolved }))
}

main().catch((error) => { console.error(error); process.exit(1) })
