import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { promisify } from "node:util"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const execFileAsync = promisify(execFile)

type PreviewJob = {
  id: string
  music_id: string
  artist_user_id: string
  source_bucket: string
  source_path: string
  preview_bucket: string | null
  preview_path: string | null
  duration_seconds: number
  attempts: number
}

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function createWorkerClient() {
  const supabaseUrl = getEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function claimJobs(supabase: ReturnType<typeof createWorkerClient>, workerId: string, limit: number) {
  const { data: queued, error } = await supabase
    .from("music_preview_generation_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) throw error

  const claimed: PreviewJob[] = []
  for (const job of queued || []) {
    const { data, error: claimError } = await supabase
      .from("music_preview_generation_jobs")
      .update({
        status: "processing",
        attempts: Number(job.attempts || 0) + 1,
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        error: null,
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle()

    if (claimError) throw claimError
    if (data) claimed.push(data as PreviewJob)
  }

  return claimed
}

async function downloadSignedObject(
  supabase: ReturnType<typeof createWorkerClient>,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw error || new Error("source_sign_failed")

  const response = await fetch(data.signedUrl)
  if (!response.ok) throw new Error(`source_download_failed_${response.status}`)

  return Buffer.from(await response.arrayBuffer())
}

function buildPreviewPath(job: PreviewJob) {
  if (job.preview_path) return job.preview_path
  const safeName = basename(job.source_path).replace(/[^a-zA-Z0-9._-]/g, "-") || "track"
  return `${job.artist_user_id}/previews/${job.music_id}-${Date.now()}-${randomUUID()}-${safeName}.mp3`
}

async function generatePreviewClip(inputPath: string, outputPath: string, durationSeconds: number) {
  const duration = Math.min(Math.max(Math.round(durationSeconds || 15), 1), 600)
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-vn",
    "-acodec",
    "libmp3lame",
    "-b:a",
    "192k",
    outputPath,
  ])
}

async function markFailed(
  supabase: ReturnType<typeof createWorkerClient>,
  job: PreviewJob,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error)
  const failedAt = new Date().toISOString()

  await supabase
    .from("music_preview_generation_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      updated_at: failedAt,
      completed_at: failedAt,
    })
    .eq("id", job.id)

  await supabase
    .from("artist_music")
    .update({
      preview_status: "failed",
      preview_error: message.slice(0, 1000),
      updated_at: failedAt,
    })
    .eq("id", job.music_id)
    .eq("user_id", job.artist_user_id)
}

async function processJob(supabase: ReturnType<typeof createWorkerClient>, job: PreviewJob) {
  const workdir = await mkdtemp(join(tmpdir(), "tourify-music-preview-"))
  const inputPath = join(workdir, "source-audio")
  const outputPath = join(workdir, "preview.mp3")
  const previewBucket = job.preview_bucket || "artist-music"
  const previewPath = buildPreviewPath(job)

  try {
    const source = await downloadSignedObject(supabase, job.source_bucket, job.source_path)
    await writeFile(inputPath, source)
    await generatePreviewClip(inputPath, outputPath, job.duration_seconds)
    const previewBuffer = await readFile(outputPath)

    const { error: uploadError } = await supabase.storage
      .from(previewBucket)
      .upload(previewPath, previewBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      })
    if (uploadError) throw uploadError

    const readyAt = new Date().toISOString()
    const { error: trackError } = await supabase
      .from("artist_music")
      .update({
        preview_status: "ready",
        preview_error: null,
        preview_storage_bucket: previewBucket,
        preview_storage_path: previewPath,
        preview_file_url: null,
        preview_generated_at: readyAt,
        updated_at: readyAt,
      })
      .eq("id", job.music_id)
      .eq("user_id", job.artist_user_id)
    if (trackError) throw trackError

    const { error: jobError } = await supabase
      .from("music_preview_generation_jobs")
      .update({
        status: "ready",
        preview_bucket: previewBucket,
        preview_path: previewPath,
        error: null,
        completed_at: readyAt,
        updated_at: readyAt,
      })
      .eq("id", job.id)
    if (jobError) throw jobError

    console.log(`preview job ready: ${job.id} -> ${previewPath}`)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function runOnce() {
  const supabase = createWorkerClient()
  const workerId = process.env.MUSIC_PREVIEW_WORKER_ID || `music-preview-${process.pid}-${randomUUID()}`
  const batchSize = Math.min(Math.max(Number(process.env.MUSIC_PREVIEW_WORKER_BATCH_SIZE) || 5, 1), 25)
  const jobs = await claimJobs(supabase, workerId, batchSize)

  if (jobs.length === 0) {
    console.log("no queued music preview jobs")
    return
  }

  for (const job of jobs) {
    try {
      console.log(`processing preview job: ${job.id}`)
      await processJob(supabase, job)
    } catch (error) {
      console.error(`preview job failed: ${job.id}`, error)
      await markFailed(supabase, job, error)
    }
  }
}

async function main() {
  const loop = process.env.MUSIC_PREVIEW_WORKER_LOOP === "true"
  const intervalMs = Math.max(Number(process.env.MUSIC_PREVIEW_WORKER_INTERVAL_MS) || 15000, 1000)

  do {
    await runOnce()
    if (loop) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  } while (loop)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
