import { NextRequest, NextResponse } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { validateProviderConfig, isEventFeatureEnabled } from "@/lib/events/providers/flags"
import { createTicketmasterAdapter } from "@/lib/events/providers/ticketmaster/adapter"
import { ingestExternalEvent } from "@/lib/events/canonical-event-service"
import { EventProviderError } from "@/lib/events/providers/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const LOCK_STALE_AFTER_MS = 5 * 60 * 1000
const WORKER_ID = `cron-${process.env.VERCEL_REGION ?? "local"}-${Date.now()}`

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}

/**
 * POST /api/cron/events/sync
 *
 * Claims queued event_sync_jobs and executes them through provider
 * adapters. Idempotent: job dedupe keys prevent duplicate enqueues, and
 * ingest is idempotent on provider identity.
 *
 * Job payloads (ticketmaster):
 *   { "job_type": "market_sync", "payload": { "city": "Las Vegas", "stateCode": "NV",
 *     "countryCode": "US", "latitude": 36.17, "longitude": -115.14,
 *     "radiusMiles": 25, "startDateTime": "...", "endDateTime": "..." } }
 *
 * Deliberately scoped: no uncontrolled national crawl.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const configIssues = validateProviderConfig()
  if (configIssues.length > 0) {
    return NextResponse.json(
      { error: { code: "PROVIDER_CONFIG", issues: configIssues } },
      { status: 503 },
    )
  }

  const client = createServiceRoleClient()
  const results: Array<Record<string, unknown>> = []

  // Recover stale locks before claiming.
  await client
    .from("event_sync_jobs")
    .update({ status: "queued", locked_at: null, locked_by: null })
    .eq("status", "running")
    .lt("locked_at", new Date(Date.now() - LOCK_STALE_AFTER_MS).toISOString())

  for (let claimed = 0; claimed < 5; claimed++) {
    // Claim one job: pick a candidate, then atomically flip its status.
    const { data: candidate } = await client
      .from("event_sync_jobs")
      .select("id")
      .eq("status", "queued")
      .lte("run_after", new Date().toISOString())
      .order("priority")
      .order("id")
      .limit(1)
      .maybeSingle()

    if (!candidate) break

    const { data: job } = await client
      .from("event_sync_jobs")
      .update({ status: "running", locked_at: new Date().toISOString(), locked_by: WORKER_ID })
      .eq("id", candidate.id)
      .eq("status", "queued") // lost the race? no row comes back
      .select("id, provider, job_type, payload, attempt_count, max_attempts")
      .maybeSingle()

    if (!job) continue // raced by another worker; try next
    results.push(await executeJob(client, job))
  }

  return NextResponse.json({ worker: WORKER_ID, results })
}

async function executeJob(
  client: ReturnType<typeof createServiceRoleClient>,
  job: { id: string; provider: string; job_type: string; payload: Record<string, unknown>; attempt_count: number; max_attempts: number },
): Promise<Record<string, unknown>> {
  const { data: run } = await client
    .from("event_sync_runs")
    .insert({ provider: job.provider, job_id: job.id, correlation_id: crypto.randomUUID() })
    .select("id")
    .single()

  let status = "succeeded"
  let errorSummary: string | null = null
  let received = 0
  let created = 0
  let updated = 0

  try {
    if (job.provider === "ticketmaster") {
      if (!isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")) {
        throw new EventProviderError("DISABLED", "Ticketmaster provider is disabled", false, "ticketmaster")
      }
      const adapter = createTicketmasterAdapter()
      if (!adapter) throw new EventProviderError("DISABLED", "Ticketmaster adapter unavailable", false, "ticketmaster")

      if (job.job_type === "market_sync") {
        const payload = job.payload as {
          city?: string
          stateCode?: string
          countryCode?: string
          latitude?: number
          longitude?: number
          radiusMiles?: number
          startDateTime?: string
          endDateTime?: string
          maxPages?: number
        }
        const maxPages = Math.min(payload.maxPages ?? 2, 5)
        for (let page = 0; page < maxPages; page++) {
          const result = await adapter.searchEvents({ ...payload, page, size: 50 })
          received += result.events.length
          for (const event of result.events) {
            const ingest = await ingestExternalEvent(event)
            if (ingest.created) created += 1
            else updated += 1
          }
          if (result.totalPages != null && page + 1 >= result.totalPages) break
        }
      } else {
        throw new EventProviderError("INVALID_RESPONSE", `Unknown job_type ${job.job_type}`, false, "ticketmaster")
      }
    } else {
      throw new EventProviderError("DISABLED", `No adapter for provider ${job.provider}`, false)
    }
  } catch (error) {
    status = "failed"
    const code = (error as EventProviderError).code ?? "UPSTREAM_ERROR"
    errorSummary = `${code}: ${(error as Error).message}`.slice(0, 500)
    const exhausted = job.attempt_count + 1 >= job.max_attempts
    // 429/backoff: retry with delay, never a storm.
    const retryable = (error as EventProviderError).retryable ?? false
    const backoffMs = Math.min(60_000 * 2 ** job.attempt_count, 30 * 60_000)
    await client
      .from("event_sync_jobs")
      .update({
        status: exhausted || !retryable ? (exhausted && retryable ? "dead" : "failed") : "queued",
        run_after: new Date(Date.now() + backoffMs).toISOString(),
        attempt_count: job.attempt_count + 1,
        locked_at: null,
        locked_by: null,
        last_error_code: code,
        last_error_summary: errorSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
  }

  if (status === "succeeded") {
    await client
      .from("event_sync_jobs")
      .update({ status: "succeeded", locked_at: null, locked_by: null, updated_at: new Date().toISOString() })
      .eq("id", job.id)
  }

  await client
    .from("event_sync_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      records_received: received,
      records_created: created,
      records_updated: updated,
      error_summary: errorSummary,
    })
    .eq("id", run?.id)

  return { jobId: job.id, status, received, created, updated, error: errorSummary }
}
