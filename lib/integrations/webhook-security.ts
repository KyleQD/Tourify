/**
 * Shared inbound-webhook security primitives.
 *
 * Every inbound webhook route must verify provider identity *before* any side
 * effect, and every duplicate delivery must be rejected without additional side
 * effects. These helpers are deliberately pure (no env reads, no I/O) so each
 * route keeps its own provider-specific envelope, response shape, and receipt
 * ledger while sharing one audited verification surface.
 *
 * Rules enforced here:
 * - Signature comparison is constant-time and never leaks secret length.
 * - A missing signature is an authentication failure, never a pass.
 * - Replay tolerance is bounded and explicit where the provider sends a
 *   timestamp; where it does not, the durable receipt claim is the replay
 *   defense.
 * - Database unique-violation detection is shared so a receipt claim can never
 *   be mistaken for a persistence failure.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto"

/** Stripe's own signature tolerance, reused as the default bounded window. */
export const DEFAULT_REPLAY_WINDOW_SECONDS = 300

export type DigestEncoding = "hex" | "base64"

/**
 * Constant-time string comparison.
 *
 * Both sides are hashed to a fixed 32-byte digest first so the comparison is a
 * single fixed-width `timingSafeEqual` and neither the secret nor the signature
 * length is observable. Empty values never match — an absent secret or an absent
 * signature is an authentication failure, not a valid pair.
 */
export function safeCompare(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") return false
  if (!left.length || !right.length) return false

  const leftDigest = createHash("sha256").update(left, "utf8").digest()
  const rightDigest = createHash("sha256").update(right, "utf8").digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

/** HMAC-SHA256 (or another digest) over the exact raw request body. */
export function computeHmacSignature({
  rawBody,
  secret,
  algorithm = "sha256",
  encoding = "hex",
}: {
  rawBody: string
  secret: string
  algorithm?: string
  encoding?: DigestEncoding
}): string {
  return createHmac(algorithm, secret).update(rawBody, "utf8").digest(encoding)
}

/**
 * Verify an HMAC signature over the raw request body. Returns false for a
 * missing signature, a missing secret, or any digest mismatch.
 */
export function verifyHmacSignature({
  rawBody,
  signature,
  secret,
  algorithm = "sha256",
  encoding = "hex",
}: {
  rawBody: string
  signature: string | null | undefined
  secret: string | null | undefined
  algorithm?: string
  encoding?: DigestEncoding
}): boolean {
  if (!signature || !secret) return false
  return safeCompare(computeHmacSignature({ rawBody, secret, algorithm, encoding }), signature)
}

/**
 * Partner digest scheme: `sha256("<secret>:<rawBody>")` as lowercase hex.
 *
 * This is the wire format the music institutional / licensing / rights-admin /
 * marketplace partner adapters already emit, so partners keep working while the
 * route boundary comparison becomes constant-time.
 */
export function computePrefixedDigestSignature({
  rawBody,
  secret,
}: {
  rawBody: string
  secret: string
}): string {
  return createHash("sha256").update(`${secret}:${rawBody}`).digest("hex")
}

/** Constant-time verifier for {@link computePrefixedDigestSignature}. */
export function verifyPrefixedDigestSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string
  signature: string | null | undefined
  secret: string | null | undefined
}): boolean {
  if (!signature || !secret) return false
  return safeCompare(computePrefixedDigestSignature({ rawBody, secret }), signature)
}

/**
 * Bounded replay window check for providers that sign a timestamp
 * (`t=<unix seconds>,v1=<hex>`). Non-numeric, missing, or non-positive
 * timestamps are always rejected.
 */
export function isWithinReplayWindow({
  timestampSeconds,
  toleranceSeconds = DEFAULT_REPLAY_WINDOW_SECONDS,
  nowMs = Date.now(),
}: {
  timestampSeconds: string | number | null | undefined
  toleranceSeconds?: number
  nowMs?: number
}): boolean {
  const parsed = Number(timestampSeconds)
  if (!Number.isFinite(parsed) || parsed <= 0) return false
  return Math.abs(nowMs / 1000 - parsed) <= toleranceSeconds
}

/** Postgres unique-violation detection (23505) for atomic receipt claims. */
export function isUniqueViolation(
  error: { code?: unknown; message?: unknown } | null | undefined,
): boolean {
  if (!error) return false
  if (String((error as { code?: unknown }).code ?? "") === "23505") return true
  return /duplicate key/i.test(String((error as { message?: unknown }).message ?? ""))
}
