/**
 * Stub protected-derivative pipeline:
 * request → hash → optional watermark → c2pa → store status
 * Never mutates the archival clean master.
 */
import { createHash, randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { getC2paAdapter, buildC2paAssertions } from "../lib/music-rights/c2pa-adapter"
import { getWatermarkAdapter } from "../lib/music-rights/watermark-adapter"
import { buildTrainingReservationPolicy } from "../lib/music-rights/training-reservation"

const MAX_ATTEMPTS = 5
const BATCH_SIZE = Number(process.env.MUSIC_RIGHTS_DERIVATIVE_BATCH || 10)

type DerivativeRow = {
  id: string
  project_id: string
  owner_user_id: string
  artist_music_id: string
  derivative_type: string
  status: string
  watermark_enabled: boolean
  c2pa_enabled: boolean
  adversarial_audio_prohibited: boolean
  attempt_count: number
  source_asset_commitment: string | null
  processing_recipe: Record<string, unknown>
  metadata: Record<string, unknown>
}

function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function createWorkerClient() {
  return createClient(
    requiredEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function claimDerivatives(supabase: ReturnType<typeof createWorkerClient>, workerId: string) {
  const { data: candidates, error } = await supabase
    .from("music_rights_derivatives")
    .select("*")
    .in("status", ["requested", "failed"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)
  if (error) throw error

  const claimed: DerivativeRow[] = []
  for (const candidate of candidates || []) {
    const attempts = Number(candidate.attempt_count || 0) + 1
    const { data } = await supabase
      .from("music_rights_derivatives")
      .update({
        status: "processing",
        attempt_count: attempts,
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id)
      .in("status", ["requested", "failed"])
      .select("*")
      .maybeSingle()
    if (data) claimed.push(data as DerivativeRow)
  }
  return claimed
}

async function processDerivative(
  supabase: ReturnType<typeof createWorkerClient>,
  row: DerivativeRow,
) {
  if (!row.adversarial_audio_prohibited) {
    await supabase.from("music_rights_derivatives").update({
      status: "failed",
      error_code: "adversarial_audio_forbidden",
      error_message: "Adversarial/unlearnable audio processors are research-only and blocked.",
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id)
    return
  }

  const syntheticPath = `derivative://${row.id}/${row.derivative_type}`
  const contentHash = createHash("sha256")
    .update(JSON.stringify({
      id: row.id,
      projectId: row.project_id,
      type: row.derivative_type,
      recipe: row.processing_recipe,
      source: row.source_asset_commitment,
    }))
    .digest("hex")

  let watermarkId: string | null = null
  if (row.watermark_enabled) {
    const watermark = await getWatermarkAdapter()
    const embed = await watermark.embed({
      derivativePath: syntheticPath,
      opaquePayload: `asset:${row.artist_music_id.slice(0, 8)}:${row.id.slice(0, 8)}`,
    })
    const { data: watermarkRow } = await supabase.from("music_rights_watermarks").upsert({
      derivative_id: row.id,
      project_id: row.project_id,
      status: embed.ok ? (embed.status === "stub" ? "embedded" : embed.status) : "failed",
      algorithm: embed.algorithm,
      algorithm_version: embed.algorithmVersion,
      opaque_payload: embed.opaquePayload,
      error_code: embed.errorCode || null,
      error_message: embed.errorMessage || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "derivative_id" }).select("id").maybeSingle()
    watermarkId = watermarkRow?.id || null
    if (!embed.ok) {
      await supabase.from("music_rights_derivatives").update({
        status: "failed",
        content_hash: contentHash,
        error_code: embed.errorCode || "watermark_failed",
        error_message: embed.errorMessage || "Watermark embedding failed.",
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      return
    }
  }

  let c2paHash: string | null = null
  if (row.c2pa_enabled) {
    const policy = buildTrainingReservationPolicy()
    const c2pa = await getC2paAdapter()
    const assertions = buildC2paAssertions({
      passportPublicId: String(row.metadata?.passport_public_id || row.project_id),
      artistPublicIdentity: String(row.metadata?.artist_public_identity || row.owner_user_id),
      recordingIdentifier: row.artist_music_id,
      sourceAssetCommitment: row.source_asset_commitment || contentHash,
      originCertificationStatus: String(row.metadata?.origin_status || "unknown"),
      aiUseDisclosureCategory: String(row.metadata?.ai_use_category || "unknown"),
      issuer: "did:web:tourify.app:music-rights",
      creationActions: ["derivative_transcode_stub"],
      derivativeType: row.derivative_type,
      rightsReservationUrl: policy.policyUrl,
      publicVerificationUrl: `${policy.policyUrl.replace("/legal/music-training-reservation", "")}/music/verify/origin/${row.artist_music_id}`,
    })
    const signed = await c2pa.signManifest({
      derivativePath: syntheticPath,
      mimeType: String(row.metadata?.mime_type || "audio/wav"),
      assertions,
    })
    await supabase.from("music_rights_c2pa_manifests").upsert({
      derivative_id: row.id,
      project_id: row.project_id,
      status: signed.ok ? (signed.status === "stub" ? "signed" : signed.status) : signed.status,
      assertions,
      manifest_store_hash: signed.manifestStoreHash || null,
      error_code: signed.errorCode || null,
      error_message: signed.errorMessage || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "derivative_id" })
    c2paHash = signed.manifestStoreHash || null
    if (!signed.ok && signed.status !== "unsupported") {
      await supabase.from("music_rights_derivatives").update({
        status: "unpublished",
        content_hash: contentHash,
        error_code: signed.errorCode || "c2pa_failed",
        error_message: signed.errorMessage || "C2PA signing failed; clean master untouched.",
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      return
    }
  }

  await supabase.from("music_rights_derivatives").update({
    status: "ready",
    content_hash: contentHash,
    storage_bucket: "artist-music",
    storage_path: `derivatives/${row.artist_music_id}/${row.id}`,
    metadata: {
      ...row.metadata,
      stub_pipeline: true,
      watermark_id: watermarkId,
      c2pa_manifest_hash: c2paHash,
      clean_master_untouched: true,
    },
    locked_at: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id)

  await supabase.from("music_rights_outbox_events").upsert({
    project_id: row.project_id,
    event_type: "music.rights.c2pa.signed",
    dedupe_key: `derivative:${row.id}:ready`,
    payload: { derivativeId: row.id, contentHash, c2paHash, watermarkId },
    status: "pending",
    updated_at: new Date().toISOString(),
  }, { onConflict: "event_type,dedupe_key" })
}

async function main() {
  const workerId = `derivative-worker:${randomUUID()}`
  const supabase = createWorkerClient()
  const claimed = await claimDerivatives(supabase, workerId)
  for (const row of claimed) {
    try {
      await processDerivative(supabase, row)
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error"
      await supabase.from("music_rights_derivatives").update({
        status: "failed",
        error_code: "derivative_worker_error",
        error_message: message.slice(0, 500),
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
    }
  }
  console.log(JSON.stringify({ workerId, processed: claimed.length }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
