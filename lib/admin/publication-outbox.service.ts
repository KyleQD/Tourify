/**
 * PUB-101 — Publication outbox service (atomic commit + worker ops).
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"
import {
  classifyPublicationOutboxError,
  computePublicationOutboxBackoffSeconds,
  defaultPublicationOutboxHandler,
  getPublicationOutboxHandler,
  normalizePublicationCorrelationId,
  type CommitDomainWithOutboxInput,
  type CommitDomainWithOutboxResult,
  type ProcessOutboxItemResult,
  type PublicationOutboxRow,
} from "@/lib/admin/publication-outbox"

function mapOutboxRow(raw: Record<string, unknown>): PublicationOutboxRow {
  return {
    id: String(raw.id),
    org_id: String(raw.org_id),
    domain_transaction_id: raw.domain_transaction_id
      ? String(raw.domain_transaction_id)
      : null,
    event_type: String(raw.event_type),
    aggregate_type: String(raw.aggregate_type),
    aggregate_id: String(raw.aggregate_id),
    payload:
      raw.payload && typeof raw.payload === "object"
        ? (raw.payload as Record<string, unknown>)
        : {},
    idempotency_key: String(raw.idempotency_key),
    correlation_id: String(raw.correlation_id),
    status: raw.status as PublicationOutboxRow["status"],
    attempts: Number(raw.attempts ?? 0),
    max_attempts: Number(raw.max_attempts ?? 8),
    available_at: String(raw.available_at),
    locked_at: raw.locked_at ? String(raw.locked_at) : null,
    locked_by: raw.locked_by ? String(raw.locked_by) : null,
    last_error: raw.last_error ? String(raw.last_error) : null,
    last_error_class: raw.last_error_class ? String(raw.last_error_class) : null,
    created_at: String(raw.created_at),
    processed_at: raw.processed_at ? String(raw.processed_at) : null,
  }
}

/**
 * Atomically write a domain transaction marker + outbox row.
 * Idempotent on (org_id, idempotency_key).
 */
export async function commitDomainWithOutbox(
  client: SupabaseClient,
  input: CommitDomainWithOutboxInput,
): Promise<CommitDomainWithOutboxResult> {
  if (!input.orgId?.trim()) throw new Error("orgId is required")
  if (!input.idempotencyKey?.trim()) throw new Error("idempotencyKey is required")

  const correlationId = normalizePublicationCorrelationId(input.correlationId)

  const { data, error } = await client.rpc("admin_commit_domain_with_outbox", {
    p_org_id: input.orgId,
    p_command_name: input.commandName,
    p_correlation_id: correlationId,
    p_actor_user_id: input.actorUserId ?? null,
    p_domain_payload: input.domainPayload ?? {},
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_outbox_payload: {
      ...(input.outboxPayload ?? {}),
      correlationId,
    },
    p_idempotency_key: input.idempotencyKey,
    p_max_attempts: input.maxAttempts ?? 8,
  })

  if (error) throw new Error(error.message || "Failed to commit domain with outbox")

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error("Empty response from admin_commit_domain_with_outbox")

  return {
    transactionId: String(row.transaction_id),
    outboxId: String(row.outbox_id),
    alreadyExisted: Boolean(row.already_existed),
    correlationId,
  }
}

export async function claimPublicationOutboxBatch(input: {
  orgId: string
  workerId: string
  limit?: number
  client?: SupabaseClient
}): Promise<PublicationOutboxRow[]> {
  return withOutboxClient({
    client: input.client,
    orgId: input.orgId,
    reason: "Claim publication outbox batch",
  }, async (client) => {
    const { data, error } = await client.rpc("admin_publication_outbox_claim_for_org", {
      p_org_id: input.orgId,
      p_worker_id: input.workerId,
      p_limit: input.limit ?? 25,
    })

    if (error) throw new Error(error.message || "Failed to claim publication outbox batch")
    if (!Array.isArray(data)) return []
    return data.map((row) => mapOutboxRow(row as Record<string, unknown>))
  })
}

export async function markPublicationOutboxDelivered(input: {
  orgId: string
  outboxId: string
  workerId: string
  client?: SupabaseClient
}): Promise<PublicationOutboxRow> {
  return withOutboxClient({ client: input.client, orgId: input.orgId, reason: "Mark publication outbox delivered" }, async (client) => {
    const { data, error } = await client.rpc("admin_publication_outbox_mark_delivered_for_org", {
      p_org_id: input.orgId,
      p_outbox_id: input.outboxId,
      p_worker_id: input.workerId,
    })
    if (error) throw new Error(error.message || "Failed to mark outbox delivered")
    return mapOutboxRow((data ?? {}) as Record<string, unknown>)
  })
}

export async function markPublicationOutboxFailed(input: {
  orgId: string
  outboxId: string
  workerId: string
  error: string
  errorClass?: string
  backoffSeconds?: number
  client?: SupabaseClient
}): Promise<PublicationOutboxRow> {
  return withOutboxClient({ client: input.client, orgId: input.orgId, reason: "Mark publication outbox failed" }, async (client) => {
    const { data, error } = await client.rpc("admin_publication_outbox_mark_failed_for_org", {
      p_org_id: input.orgId,
      p_outbox_id: input.outboxId,
      p_worker_id: input.workerId,
      p_error: input.error,
      p_error_class: input.errorClass ?? "retryable",
      p_backoff_seconds: input.backoffSeconds ?? null,
    })
    if (error) throw new Error(error.message || "Failed to mark outbox failed")
    return mapOutboxRow((data ?? {}) as Record<string, unknown>)
  })
}

export async function replayPublicationOutboxDeadLetter(input: {
  orgId: string
  outboxId: string
  correlationId?: string | null
  client?: SupabaseClient
}): Promise<PublicationOutboxRow> {
  return withOutboxClient({ client: input.client, orgId: input.orgId, reason: "Replay publication outbox dead letter" }, async (client) => {
    const { data, error } = await client.rpc("admin_publication_outbox_replay_for_org", {
      p_org_id: input.orgId,
      p_outbox_id: input.outboxId,
      p_correlation_id: input.correlationId ?? null,
    })
    if (error) throw new Error(error.message || "Failed to replay dead-letter outbox")
    return mapOutboxRow((data ?? {}) as Record<string, unknown>)
  })
}

/**
 * Claim + process a batch. Handlers must be idempotent on idempotency_key.
 */
export async function processPublicationOutboxBatch(input: {
  orgId: string
  workerId: string
  limit?: number
  client?: SupabaseClient
}): Promise<ProcessOutboxItemResult[]> {
  const client = input.client
  const claimed = await claimPublicationOutboxBatch({
    orgId: input.orgId,
    workerId: input.workerId,
    limit: input.limit,
    client,
  })

  const results: ProcessOutboxItemResult[] = []

  for (const row of claimed) {
    const handler =
      getPublicationOutboxHandler(row.event_type) ?? defaultPublicationOutboxHandler

    try {
      await handler(row)
      const delivered = await markPublicationOutboxDelivered({
        orgId: row.org_id,
        outboxId: row.id,
        workerId: input.workerId,
        client,
      })
      results.push({
        outboxId: row.id,
        outcome: "delivered",
        attempts: delivered.attempts,
        correlationId: row.correlation_id,
      })
    } catch (error) {
      const errorClass = classifyPublicationOutboxError(error)
      const message = error instanceof Error ? error.message : String(error)
      const failed = await markPublicationOutboxFailed({
        orgId: row.org_id,
        outboxId: row.id,
        workerId: input.workerId,
        error: message,
        errorClass,
        backoffSeconds: computePublicationOutboxBackoffSeconds(row.attempts),
        client,
      })
      results.push({
        outboxId: row.id,
        outcome: failed.status === "dead" ? "dead" : "failed",
        attempts: failed.attempts,
        correlationId: row.correlation_id,
        error: message,
      })
    }
  }

  return results
}

async function withOutboxClient<T>(
  input: { client?: SupabaseClient; orgId: string; reason: string },
  run: (client: SupabaseClient) => Promise<T>,
): Promise<T> {
  if (input.client) return run(input.client)
  return executeServiceRoleJob(
    {
      orgId: input.orgId,
      reason: input.reason,
      moduleId: "admin.publication.outbox",
    },
    run,
  )
}

export async function listPublicationOutboxForOrg(input: {
  orgId: string
  status?: PublicationOutboxRow["status"] | PublicationOutboxRow["status"][]
  limit?: number
  client: SupabaseClient
}): Promise<PublicationOutboxRow[]> {
  let query = input.client
    .from("admin_publication_outbox")
    .select("*")
    .eq("org_id", input.orgId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50)

  if (input.status) {
    const statuses = Array.isArray(input.status) ? input.status : [input.status]
    query = query.in("status", statuses)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message || "Failed to list publication outbox")
  return (data ?? []).map((row) => mapOutboxRow(row as Record<string, unknown>))
}
