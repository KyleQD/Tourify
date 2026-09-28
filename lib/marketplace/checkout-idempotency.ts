import { createHash } from "crypto"

export type CheckoutAttemptRecord = {
  input_hash: string
  order_id: string | null
  status: "pending" | "completed" | "failed" | "expired"
}

export type CheckoutAttemptDecision =
  | { action: "create" }
  | { action: "resume"; orderId: string }
  | { action: "conflict"; reason: "payload_mismatch" | "already_completed" | "key_not_reusable" | "in_progress" }

/**
 * Hash the server-relevant checkout input. The caller deliberately excludes
 * arbitrary metadata so retries cannot mutate money, inventory, or identity
 * while preserving the same idempotency key.
 */
export function hashMarketplaceCheckoutInput(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

/**
 * Decide whether an existing checkout attempt may be resumed. An idempotency
 * key is permanently bound to its first payload; terminal attempts require a
 * fresh key so an old key can never create a second order.
 */
export function resolveCheckoutAttempt(
  existing: CheckoutAttemptRecord | null,
  inputHash: string,
): CheckoutAttemptDecision {
  if (!existing) return { action: "create" }
  if (existing.input_hash !== inputHash) {
    return { action: "conflict", reason: "payload_mismatch" }
  }
  if (existing.status === "completed") {
    return { action: "conflict", reason: "already_completed" }
  }
  if (existing.status === "pending" && existing.order_id) {
    return { action: "resume", orderId: existing.order_id }
  }
  if (existing.status === "pending") {
    return { action: "conflict", reason: "in_progress" }
  }
  return { action: "conflict", reason: "key_not_reusable" }
}
