import { createClient } from "@supabase/supabase-js"
import {
  isLaunchCapabilityAvailable,
  type LaunchCapabilityName,
} from "../config/launch-capabilities"
import {
  MUSIC_WORKER_REGISTRATIONS,
  classifyMusicWorkerFailure,
  type MusicWorkerRegistration,
} from "./worker-framework"

type CreatorOutboxRunnerConfig = {
  workerId: string
  table: string
  eventField: string
  attemptsField?: string
  launchCapability?: LaunchCapabilityName
}

type CreatorOutboxEvent = {
  id: string
  status: string
  available_at: string
  idempotency_key: string | null
  attempts?: number | null
  attempt_count?: number | null
  [key: string]: unknown
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

function registrationFor(workerId: string): MusicWorkerRegistration {
  const registration = MUSIC_WORKER_REGISTRATIONS.find((worker) => worker.id === workerId)
  if (!registration) throw new Error(`Missing Music worker registration: ${workerId}`)
  if (registration.scheduled) throw new Error(`Production scheduling is disabled: ${workerId}`)
  return registration
}

export async function runCreatorOutboxWorker(config: CreatorOutboxRunnerConfig) {
  const registration = registrationFor(config.workerId)
  if (config.launchCapability && !isLaunchCapabilityAvailable(config.launchCapability))
    throw new Error(`Launch capability unavailable: ${config.launchCapability}`)

  const supabase = createWorkerClient()
  const attemptsField = config.attemptsField || "attempts"
  const selectFields = ["id", "status", "available_at", attemptsField, "idempotency_key", config.eventField].join(", ")
  const now = new Date().toISOString()

  const { data: events, error } = await supabase
    .from(config.table)
    .select(selectFields)
    .eq("status", "pending")
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(50)

  // A missing table/column is a deployment blocker, not permission to guess at
  // a replacement schema or mutate an unknown queue.
  if (error) {
    console.error(`[${config.workerId}] schema guard failed`, error)
    return
  }

  for (const candidate of (events || []) as CreatorOutboxEvent[]) {
    if (!candidate.id || !candidate.idempotency_key) {
      console.error(`[${config.workerId}] schema guard rejected event`, candidate.id)
      continue
    }

    const attempt = Number(candidate[attemptsField] || 0) + 1
    const { data: claimed, error: claimError } = await supabase
      .from(config.table)
      .update({ status: "processing", [attemptsField]: attempt })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .eq("idempotency_key", candidate.idempotency_key)
      .select("id, idempotency_key")
      .maybeSingle()

    if (claimError) {
      console.error(`[${config.workerId}] claim failed`, claimError)
      continue
    }
    if (!claimed) continue

    try {
      console.log(`[${config.workerId}] processed`, candidate[config.eventField], candidate.id)
      await supabase
        .from(config.table)
        .update({ status: "delivered", processed_at: new Date().toISOString() })
        .eq("id", candidate.id)
        .eq("status", "processing")
        .eq("idempotency_key", candidate.idempotency_key)
    } catch (workerError) {
      const disposition = classifyMusicWorkerFailure(registration.retry, attempt)
      await supabase
        .from(config.table)
        .update({
          status: disposition.disposition === "dead_letter" ? "dead_letter" : "failed",
          last_error: workerError instanceof Error ? workerError.message : "unknown",
          available_at: disposition.nextAttemptInMs === null
            ? null
            : new Date(Date.now() + disposition.nextAttemptInMs).toISOString(),
        })
        .eq("id", candidate.id)
        .eq("status", "processing")
        .eq("idempotency_key", candidate.idempotency_key)
    }
  }

  console.log(`[${config.workerId}] done count=${(events || []).length}`)
}

export async function runCreatorOutboxWorkerFromEnv(config: CreatorOutboxRunnerConfig) {
  try {
    await runCreatorOutboxWorker(config)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
