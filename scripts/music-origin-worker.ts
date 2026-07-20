import { createHash, randomUUID } from "node:crypto"
import { execFile } from "node:child_process"
import { createReadStream } from "node:fs"
import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { promisify } from "node:util"
import { createWriteStream } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { buildMusicOriginManifest, hashMusicOriginManifest } from "../lib/music/music-origin-manifest"
import { MUSIC_ORIGIN_SCHEMA_VERSION } from "../lib/music/music-trust"
import { buildPrivateFingerprintMatchSignals, computeOriginRetry, staleLockCutoff } from "../lib/music/music-origin-job-policy"

const execFileAsync = promisify(execFile)
const MAX_ATTEMPTS = 5
const STALE_LOCK_MINUTES = 15

type OriginJob = {
  id: string
  track_id: string
  user_id: string
  declaration_id: string
  storage_bucket: string
  storage_path: string
  attempt_count: number
  max_attempts: number
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

async function recoverStaleLocks(supabase: ReturnType<typeof createWorkerClient>) {
  const cutoff = staleLockCutoff(Date.now(), STALE_LOCK_MINUTES)
  await supabase.from("music_file_fingerprints").update({
    processing_status: "failed",
    processing_error_code: "stale_lock_recovered",
    processing_error: "A stale worker lock was recovered.",
    locked_at: null,
    locked_by: null,
    next_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("processing_status", "processing").lt("locked_at", cutoff)
}

async function claimJobs(supabase: ReturnType<typeof createWorkerClient>, workerId: string, limit: number) {
  await recoverStaleLocks(supabase)
  const { data: candidates, error } = await supabase.from("music_file_fingerprints")
    .select("*")
    .in("processing_status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw error

  const claimed: OriginJob[] = []
  for (const candidate of candidates || []) {
    const attempts = Number(candidate.attempt_count || 0) + 1
    const { data } = await supabase.from("music_file_fingerprints").update({
      processing_status: "processing",
      attempt_count: attempts,
      locked_at: new Date().toISOString(),
      locked_by: workerId,
      processing_error_code: null,
      processing_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", candidate.id).in("processing_status", ["pending", "failed"]).select("*").maybeSingle()
    if (data) claimed.push(data as OriginJob)
  }
  return claimed
}

async function downloadToFile(supabase: ReturnType<typeof createWorkerClient>, job: OriginJob, destination: string) {
  const { data, error } = await supabase.storage.from(job.storage_bucket).createSignedUrl(job.storage_path, 300)
  if (error || !data?.signedUrl) throw Object.assign(new Error("source_sign_failed"), { code: "source_sign_failed" })
  const response = await fetch(data.signedUrl)
  if (!response.ok || !response.body) throw Object.assign(new Error("source_download_failed"), { code: "source_download_failed" })
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destination))
}

async function sha256File(path: string) {
  const hash = createHash("sha256")
  await pipeline(createReadStream(path), hash)
  return hash.digest("hex")
}

async function inspectAudio(path: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_format", "-show_streams", "-of", "json", path,
  ], { maxBuffer: 4 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function acousticFingerprint(path: string) {
  if (process.env.MUSIC_ORIGIN_FINGERPRINT_ENABLED !== "true") return null
  try {
    const { stdout } = await execFileAsync(process.env.FPCALC_PATH || "fpcalc", ["-json", path], { maxBuffer: 4 * 1024 * 1024 })
    const parsed = JSON.parse(stdout)
    return typeof parsed.fingerprint === "string" ? parsed.fingerprint : null
  } catch (error: any) {
    const code = error?.code === "ENOENT" ? "fpcalc_missing" : "fpcalc_failed"
    throw Object.assign(new Error(code), { code })
  }
}

async function processJob(supabase: ReturnType<typeof createWorkerClient>, job: OriginJob) {
  const workdir = await mkdtemp(join(tmpdir(), "tourify-music-origin-"))
  const sourcePath = join(workdir, "source-audio")
  try {
    await downloadToFile(supabase, job, sourcePath)
    const [sha256, technicalMetadata, fileStat, acoustic] = await Promise.all([
      sha256File(sourcePath), inspectAudio(sourcePath), stat(sourcePath), acousticFingerprint(sourcePath),
    ])
    const [{ data: track, error: trackError }, { data: declaration, error: declarationError }] = await Promise.all([
      supabase.from("artist_music").select("id, user_id, title, duration, is_public").eq("id", job.track_id).single(),
      supabase.from("music_upload_declarations").select("*").eq("id", job.declaration_id).single(),
    ])
    if (trackError || declarationError || !track || !declaration) throw new Error("origin_dependencies_missing")

    const { data: shaMatching } = await supabase.from("music_file_fingerprints")
      .select("id, track_id")
      .eq("sha256", sha256)
      .neq("track_id", job.track_id)
      .limit(20)
    const acousticResult = acoustic
      ? await supabase.from("music_file_fingerprints").select("id, track_id")
          .eq("acoustic_fingerprint", acoustic).neq("track_id", job.track_id).limit(20)
      : { data: [] as Array<{ id: string; track_id: string }> }
    const matchSignals = buildPrivateFingerprintMatchSignals(job.track_id, [
      ...(shaMatching || []).map((candidate) => ({ ...candidate, match_type: "sha256_match" as const })),
      ...(acousticResult.data || []).map((candidate) => ({ ...candidate, match_type: "chromaprint_match" as const })),
    ])

    const recordedAt = new Date().toISOString()
    const { data: existingOrigin } = await supabase.from("music_origin_records")
      .select("id").eq("fingerprint_id", job.id).maybeSingle()
    let origin = existingOrigin
    if (!origin) {
      const { data: previous } = await supabase.from("music_origin_records")
        .select("version, manifest_hash")
        .eq("track_id", job.track_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
      const manifest = buildMusicOriginManifest({
        schemaVersion: MUSIC_ORIGIN_SCHEMA_VERSION,
        trackId: job.track_id,
        artistUserId: job.user_id,
        sourceSha256: sha256,
        title: track.title,
        durationSeconds: track.duration,
        declarationVersion: String(declaration.declaration_version),
        declarationStatementHash: declaration.statement_text_hash,
        aiUseCategory: declaration.ai_use_category,
        trainingUsePolicy: declaration.training_use_policy,
        recordedAt,
        previousManifestHash: previous?.manifest_hash || null,
      })
      const { data: createdOrigin, error: originError } = await supabase.from("music_origin_records").insert({
        track_id: job.track_id,
        user_id: job.user_id,
        declaration_id: job.declaration_id,
        fingerprint_id: job.id,
        version: Number(previous?.version || 0) + 1,
        schema_version: MUSIC_ORIGIN_SCHEMA_VERSION,
        manifest_json: manifest,
        manifest_hash: hashMusicOriginManifest(manifest),
        previous_manifest_hash: previous?.manifest_hash || null,
        is_public: track.is_public === true,
        recorded_at: recordedAt,
      }).select("id").single()
      if (originError || !createdOrigin) throw originError || new Error("origin_record_write_failed")
      origin = createdOrigin
    }

    await supabase.from("music_file_fingerprints").update({
      sha256, acoustic_fingerprint: acoustic, fingerprint_algorithm: acoustic ? "chromaprint" : null,
      byte_size: fileStat.size, technical_metadata: technicalMetadata, match_signals: matchSignals,
      processing_status: "complete", processor_version: "music-origin-worker/1.0.0",
      processed_at: recordedAt, locked_at: null, locked_by: null, updated_at: recordedAt,
    }).eq("id", job.id)
    await supabase.from("artist_music").update({ origin_status: "recorded", updated_at: recordedAt }).eq("id", job.track_id)
    await supabase.from("music_origin_events").upsert({
      track_id: job.track_id, origin_record_id: origin.id, actor_user_id: null,
      event_type: "origin_recorded", event_data: { match_signal_count: matchSignals.length },
      request_id: job.id,
    }, { onConflict: "track_id,event_type,request_id", ignoreDuplicates: true })
    console.log(JSON.stringify({ metric: "music_origin_job_complete", job_id: job.id, match_signal_count: matchSignals.length }))
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function markFailed(supabase: ReturnType<typeof createWorkerClient>, job: OriginJob, error: unknown) {
  const attempt = Number(job.attempt_count || 1)
  const maxAttempts = Number(job.max_attempts || MAX_ATTEMPTS)
  const retry = computeOriginRetry(attempt, maxAttempts)
  const deadLetter = retry.deadLetter
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code) : "origin_processing_failed"
  await supabase.from("music_file_fingerprints").update({
    processing_status: deadLetter ? "dead_letter" : "failed",
    processing_error_code: code.slice(0, 120), processing_error: message.slice(0, 1000),
    next_attempt_at: retry.nextAttemptAt, locked_at: null, locked_by: null, updated_at: new Date().toISOString(),
  }).eq("id", job.id)
  if (deadLetter) await supabase.from("artist_music").update({ origin_status: "failed" }).eq("id", job.track_id)
  await supabase.from("music_origin_events").insert({
    track_id: job.track_id, actor_user_id: null,
    event_type: deadLetter ? "origin_dead_lettered" : "origin_retry_scheduled",
    event_data: { attempt, error_code: code }, request_id: `${job.id}:${attempt}`,
  })
  console.error(JSON.stringify({ metric: "music_origin_job_failed", job_id: job.id, attempt, dead_letter: deadLetter, error_code: code }))
}

async function runOnce() {
  const supabase = createWorkerClient()
  const workerId = process.env.MUSIC_ORIGIN_WORKER_ID || `music-origin-${process.pid}-${randomUUID()}`
  const batchSize = Math.min(Math.max(Number(process.env.MUSIC_ORIGIN_WORKER_BATCH_SIZE) || 5, 1), 25)
  const jobs = await claimJobs(supabase, workerId, batchSize)
  for (const job of jobs) {
    try { await processJob(supabase, job) } catch (error) { await markFailed(supabase, job, error) }
  }
  if (!jobs.length) console.log(JSON.stringify({ metric: "music_origin_queue_empty" }))
}

async function main() {
  const loop = process.env.MUSIC_ORIGIN_WORKER_LOOP === "true"
  const intervalMs = Math.max(Number(process.env.MUSIC_ORIGIN_WORKER_INTERVAL_MS) || 15_000, 1_000)
  do {
    await runOnce()
    if (loop) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  } while (loop)
}

main().catch((error) => { console.error(error); process.exit(1) })
