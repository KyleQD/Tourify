import { getTrustedMusicWriteClient } from "./music-access"
import { hashMusicDeclarationStatement } from "./music-origin-manifest"
import {
  HUMAN_MUSIC_POLICY_VERSION,
  MUSIC_UPLOAD_POLICY_VERSION,
  type MusicAiUseCategory,
  type MusicDeclarationPayload,
  type MusicTrainingUsePolicy,
} from "./music-trust"

export interface PersistMusicDeclarationInput {
  supabase: any
  track: Record<string, any>
  userId: string
  payload: MusicDeclarationPayload
  idempotencyKey: string
  originProcessingEnabled: boolean
}

export async function persistMusicDeclaration(input: PersistMusicDeclarationInput) {
  const trusted = await getTrustedMusicWriteClient(input.supabase)
  const { data: priorIdempotent } = await trusted
    .from("music_upload_declarations")
    .select("*")
    .eq("user_id", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle()
  if (priorIdempotent) return priorIdempotent

  const { data: latest } = await trusted
    .from("music_upload_declarations")
    .select("*")
    .eq("track_id", input.track.id)
    .order("declaration_version", { ascending: false })
    .limit(1)
    .maybeSingle()
  const declarationVersion = Number(latest?.declaration_version || 0) + 1
  const declaration = {
    rights_confirmed: input.payload.rights_confirmed ?? latest?.rights_confirmed ?? false,
    ai_use_category: (input.payload.ai_use_category || latest?.ai_use_category || "unknown") as MusicAiUseCategory,
    ai_tools: input.payload.ai_tools ?? latest?.ai_tools ?? [],
    ai_disclosure_details: input.payload.ai_disclosure_details !== undefined ? input.payload.ai_disclosure_details : latest?.ai_disclosure_details || null,
    synthesized_voice_or_likeness: input.payload.synthesized_voice_or_likeness ?? latest?.synthesized_voice_or_likeness ?? false,
    contributor_disclosures_confirmed: input.payload.contributor_disclosures_confirmed ?? latest?.contributor_disclosures_confirmed ?? false,
    source_material_available: input.payload.source_material_available ?? latest?.source_material_available ?? false,
    training_use_policy: (input.payload.training_use_policy || latest?.training_use_policy || "rights_reserved") as MusicTrainingUsePolicy,
    music_upload_policy_version: input.payload.music_upload_policy_version || latest?.music_upload_policy_version || MUSIC_UPLOAD_POLICY_VERSION,
    human_music_policy_version: input.payload.human_music_policy_version || latest?.human_music_policy_version || HUMAN_MUSIC_POLICY_VERSION,
    accepted_music_upload_policy: input.payload.accepted_music_upload_policy ?? latest?.accepted_music_upload_policy ?? false,
    accepted_human_music_policy: input.payload.accepted_human_music_policy ?? latest?.accepted_human_music_policy ?? false,
  }
  const statementHash = hashMusicDeclarationStatement(declaration)
  const { data: created, error } = await trusted
    .from("music_upload_declarations")
    .insert({
      track_id: input.track.id,
      user_id: input.userId,
      declaration_version: declarationVersion,
      ...declaration,
      statement_text_hash: statementHash,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single()
  if (error || !created) throw error || new Error("music_declaration_write_failed")

  const storagePath = input.track.storage_path as string | null
  if (storagePath && input.originProcessingEnabled) {
    const originIdempotencyKey = `${input.track.id}:full:${storagePath}:${created.id}`
    const { error: originJobError } = await trusted.from("music_file_fingerprints").upsert({
      track_id: input.track.id,
      user_id: input.userId,
      declaration_id: created.id,
      file_role: "full",
      storage_bucket: input.track.storage_bucket || "artist-music",
      storage_path: storagePath,
      processing_status: "pending",
      next_attempt_at: new Date().toISOString(),
      idempotency_key: originIdempotencyKey,
    }, { onConflict: "idempotency_key", ignoreDuplicates: true })
    if (originJobError) throw originJobError
  }

  const { error: trackError } = await trusted
    .from("artist_music")
    .update({
      trust_schema_version: 1,
      trust_setup_status: "ready",
      active_declaration_id: created.id,
      ai_use_category: declaration.ai_use_category,
      training_use_policy: declaration.training_use_policy,
      origin_status: storagePath && input.originProcessingEnabled ? "pending" : "not_recorded",
      rights_confirmed: declaration.rights_confirmed,
      rights_confirmed_at: declaration.rights_confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.track.id)
    .eq("user_id", input.userId)
  if (trackError) throw trackError

  return created
}

export async function markMusicTrustRepairRequired(supabase: any, trackId: string, userId: string) {
  const trusted = await getTrustedMusicWriteClient(supabase)
  await trusted.from("artist_music").update({
    is_public: false,
    trust_setup_status: "repair_required",
    updated_at: new Date().toISOString(),
  }).eq("id", trackId).eq("user_id", userId)
}
