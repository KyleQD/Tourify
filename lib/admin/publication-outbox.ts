/**
 * PUB-101 — Publication outbox helpers (pure).
 *
 * Atomic domain+outbox commit, claim/process semantics, exponential backoff,
 * dead-letter threshold, replay, and correlation helpers.
 */

export type PublicationOutboxStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed"
  | "dead"

export type PublicationOutboxErrorClass = "retryable" | "fatal" | "suppressed"

export interface PublicationOutboxRow {
  id: string
  org_id: string
  domain_transaction_id: string | null
  event_type: string
  aggregate_type: string
  aggregate_id: string
  payload: Record<string, unknown>
  idempotency_key: string
  correlation_id: string
  status: PublicationOutboxStatus
  attempts: number
  max_attempts: number
  available_at: string
  locked_at: string | null
  locked_by: string | null
  last_error: string | null
  last_error_class: string | null
  created_at: string
  processed_at: string | null
}

export interface CommitDomainWithOutboxInput {
  orgId: string
  commandName: string
  correlationId: string
  actorUserId?: string | null
  domainPayload?: Record<string, unknown>
  eventType: string
  aggregateType: string
  aggregateId: string
  outboxPayload?: Record<string, unknown>
  idempotencyKey: string
  maxAttempts?: number
}

export interface CommitDomainWithOutboxResult {
  transactionId: string
  outboxId: string
  alreadyExisted: boolean
  correlationId: string
}

export interface ProcessOutboxItemResult {
  outboxId: string
  outcome: "delivered" | "failed" | "dead" | "skipped"
  attempts: number
  correlationId: string
  error?: string
}

/** Exponential backoff: 5 * 2^(attempts-1) seconds, capped at 1 hour. */
export function computePublicationOutboxBackoffSeconds(attempts: number): number {
  const safeAttempts = Math.max(1, Math.floor(attempts))
  const seconds = 5 * 2 ** Math.max(safeAttempts - 1, 0)
  return Math.min(3600, seconds)
}

export function shouldDeadLetterOutbox(input: {
  attempts: number
  maxAttempts: number
  errorClass?: PublicationOutboxErrorClass | null
}): boolean {
  if (input.errorClass === "fatal" || input.errorClass === "suppressed") return true
  return input.attempts >= Math.max(1, input.maxAttempts)
}

export function buildPublicationOutboxIdempotencyKey(input: {
  orgId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  naturalKey: string
}): string {
  return [
    input.orgId.trim(),
    input.eventType.trim(),
    input.aggregateType.trim(),
    input.aggregateId.trim(),
    input.naturalKey.trim(),
  ].join(":")
}

export function normalizePublicationCorrelationId(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (trimmed) return trimmed
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID()
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function classifyPublicationOutboxError(error: unknown): PublicationOutboxErrorClass {
  if (!error || typeof error !== "object") return "retryable"
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : ""
  if (code === "fatal" || code === "suppressed") return code as PublicationOutboxErrorClass
  const message = error instanceof Error ? error.message : String(error)
  if (/fatal|permanent|not found|unauthorized/i.test(message)) return "fatal"
  return "retryable"
}

export function nextOutboxStatusAfterFailure(input: {
  attempts: number
  maxAttempts: number
  errorClass?: PublicationOutboxErrorClass | null
}): "failed" | "dead" {
  return shouldDeadLetterOutbox(input) ? "dead" : "failed"
}

/** Handlers must be idempotent w.r.t. row.idempotency_key. */
export type PublicationOutboxHandler = (
  row: PublicationOutboxRow,
) => Promise<void> | void

const defaultHandlers = new Map<string, PublicationOutboxHandler>()

export function registerPublicationOutboxHandler(
  eventType: string,
  handler: PublicationOutboxHandler,
): void {
  defaultHandlers.set(eventType.trim(), handler)
}

export function getPublicationOutboxHandler(
  eventType: string,
): PublicationOutboxHandler | undefined {
  return defaultHandlers.get(eventType.trim())
}

/**
 * Built-in handler for publication.committed (and unknown types).
 * Delivery channel fan-out is handled by workers / PUB-205; this validates the row.
 */
export async function defaultPublicationOutboxHandler(row: PublicationOutboxRow): Promise<void> {
  if (!row.idempotency_key?.trim())
    throw Object.assign(new Error("Missing idempotency key"), { code: "fatal" })
}
