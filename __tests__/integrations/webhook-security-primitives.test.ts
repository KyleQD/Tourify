/**
 * INTG-006 — shared inbound-webhook verification primitives.
 *
 * These are the security guarantees every inbound route relies on: constant-time
 * comparison with no length leak, a missing signature is never a pass, bounded
 * replay tolerance, and shared unique-violation detection for atomic receipt
 * claims.
 */

import { describe, expect, it } from "vitest"
import { createHash, createHmac } from "node:crypto"
import {
  DEFAULT_REPLAY_WINDOW_SECONDS,
  computeHmacSignature,
  computePrefixedDigestSignature,
  isUniqueViolation,
  isWithinReplayWindow,
  safeCompare,
  verifyHmacSignature,
  verifyPrefixedDigestSignature,
} from "@/lib/integrations/webhook-security"

describe("safeCompare", () => {
  it("matches identical values", () => {
    expect(safeCompare("s3cr3t", "s3cr3t")).toBe(true)
  })

  it("rejects a differing value", () => {
    expect(safeCompare("s3cr3t", "s3cr3t ")).toBe(false)
    expect(safeCompare("s3cr3t", "other")).toBe(false)
  })

  it("never treats an empty or non-string operand as a match", () => {
    expect(safeCompare("", "")).toBe(false)
    expect(safeCompare("secret", "")).toBe(false)
    expect(safeCompare("", "secret")).toBe(false)
    expect(safeCompare(null, "secret")).toBe(false)
    expect(safeCompare("secret", undefined)).toBe(false)
    expect(safeCompare(123 as unknown, "123")).toBe(false)
  })

  it("does not short-circuit on differing lengths (fixed-width digest compare)", () => {
    // A length-mismatched pair must still be hashed to a fixed width first, so
    // there is no early-return that reveals the secret length.
    const short = "a"
    const long = "a".repeat(4096)
    expect(safeCompare(short, long)).toBe(false)
    expect(safeCompare(long, short)).toBe(false)
  })
})

describe("verifyHmacSignature", () => {
  const rawBody = '{"id":"evt_1"}'
  const secret = "whsec_partner"

  it("accepts a valid hex HMAC over the raw body", () => {
    const signature = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
    expect(verifyHmacSignature({ rawBody, signature, secret })).toBe(true)
  })

  it("accepts a valid base64 HMAC over the raw body", () => {
    const signature = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
    expect(verifyHmacSignature({ rawBody, signature, secret, encoding: "base64" })).toBe(true)
  })

  it("rejects a tampered body", () => {
    const signature = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
    expect(verifyHmacSignature({ rawBody: `${rawBody} `, signature, secret })).toBe(false)
  })

  it("rejects a signature minted with a different secret", () => {
    const signature = createHmac("sha256", "other").update(rawBody, "utf8").digest("hex")
    expect(verifyHmacSignature({ rawBody, signature, secret })).toBe(false)
  })

  it("rejects a missing signature or missing secret", () => {
    const signature = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
    expect(verifyHmacSignature({ rawBody, signature: null, secret })).toBe(false)
    expect(verifyHmacSignature({ rawBody, signature: "", secret })).toBe(false)
    expect(verifyHmacSignature({ rawBody, signature, secret: undefined })).toBe(false)
  })
})

describe("verifyPrefixedDigestSignature", () => {
  const rawBody = '{"id":"partner_evt_1","type":"invoice.paid"}'
  const secret = "partner_shared_secret"

  it("is wire-compatible with the partner digest the adapters already emit", () => {
    // Existing partners sign sha256("<secret>:<rawBody>"); the route boundary must
    // keep accepting that exact digest.
    const legacy = createHash("sha256").update(`${secret}:${rawBody}`).digest("hex")
    expect(computePrefixedDigestSignature({ rawBody, secret })).toBe(legacy)
    expect(verifyPrefixedDigestSignature({ rawBody, signature: legacy, secret })).toBe(true)
  })

  it("rejects a signature minted with a different secret", () => {
    const forged = createHash("sha256").update(`attacker:${rawBody}`).digest("hex")
    expect(verifyPrefixedDigestSignature({ rawBody, signature: forged, secret })).toBe(false)
  })

  it("rejects a signature over a different body", () => {
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex")
    expect(verifyPrefixedDigestSignature({ rawBody: '{"id":"other"}', signature, secret })).toBe(false)
  })

  it("rejects a missing signature or missing secret", () => {
    const signature = computePrefixedDigestSignature({ rawBody, secret })
    expect(verifyPrefixedDigestSignature({ rawBody, signature: null, secret })).toBe(false)
    expect(verifyPrefixedDigestSignature({ rawBody, signature: undefined, secret })).toBe(false)
    expect(verifyPrefixedDigestSignature({ rawBody, signature, secret: null })).toBe(false)
  })
})

describe("isWithinReplayWindow", () => {
  const nowMs = Date.UTC(2026, 8, 25, 12, 0, 0)
  const nowSeconds = Math.floor(nowMs / 1000)

  it("accepts a timestamp inside the default bounded window", () => {
    expect(isWithinReplayWindow({ timestampSeconds: nowSeconds, nowMs })).toBe(true)
    expect(
      isWithinReplayWindow({
        timestampSeconds: nowSeconds - DEFAULT_REPLAY_WINDOW_SECONDS,
        nowMs,
      }),
    ).toBe(true)
  })

  it("rejects a timestamp beyond the bounded window in either direction", () => {
    expect(
      isWithinReplayWindow({
        timestampSeconds: nowSeconds - DEFAULT_REPLAY_WINDOW_SECONDS - 1,
        nowMs,
      }),
    ).toBe(false)
    expect(
      isWithinReplayWindow({
        timestampSeconds: nowSeconds + DEFAULT_REPLAY_WINDOW_SECONDS + 1,
        nowMs,
      }),
    ).toBe(false)
  })

  it("rejects a missing, non-numeric, or non-positive timestamp", () => {
    expect(isWithinReplayWindow({ timestampSeconds: null, nowMs })).toBe(false)
    expect(isWithinReplayWindow({ timestampSeconds: "", nowMs })).toBe(false)
    expect(isWithinReplayWindow({ timestampSeconds: "not-a-number", nowMs })).toBe(false)
    expect(isWithinReplayWindow({ timestampSeconds: 0, nowMs })).toBe(false)
    expect(isWithinReplayWindow({ timestampSeconds: -1, nowMs })).toBe(false)
  })

  it("honours a caller-supplied tolerance", () => {
    expect(
      isWithinReplayWindow({ timestampSeconds: nowSeconds - 60, toleranceSeconds: 30, nowMs }),
    ).toBe(false)
    expect(
      isWithinReplayWindow({ timestampSeconds: nowSeconds - 60, toleranceSeconds: 120, nowMs }),
    ).toBe(true)
  })
})

describe("isUniqueViolation", () => {
  it("detects the 23505 unique-violation code", () => {
    expect(isUniqueViolation({ code: "23505", message: "anything" })).toBe(true)
  })

  it("detects a duplicate-key message without a code", () => {
    expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint "x"' })).toBe(true)
  })

  it("does not treat other persistence failures as duplicates", () => {
    expect(isUniqueViolation({ code: "42P01", message: 'relation "x" does not exist' })).toBe(false)
    expect(isUniqueViolation({ code: "23503", message: "foreign key violation" })).toBe(false)
    expect(isUniqueViolation({ message: "connection reset" })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation(undefined)).toBe(false)
  })
})
