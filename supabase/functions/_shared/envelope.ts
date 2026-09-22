// DO NOT EDIT THIS FORMAT INDEPENDENTLY.
//
// INTG-007 — Deno/Node dual-runtime mirror of the organization credential
// envelope codec. Byte-compatible with `lib/marketplace/integration-credentials.ts`
// (`IntegrationSecretEnvelope`), the Next.js vault that the org OAuth callback
// (app/api/social/oauth/callback/route.ts) uses to persist org credentials.
//
// Both social edge functions (social-oauth, social-analytics) import this module
// so:
//   1. the edge never reads/writes org plaintext access/refresh tokens — it
//      decrypts the envelope the Next.js boundary persisted; and
//   2. kept importable from vitest (Node) for cross-runtime parity round-trips
//      and fail-closed (tamper / wrong-key / plaintext-bytes) guards.
//
// Keep this file in lockstep with lib/marketplace/integration-credentials.ts:
//   - version "v1", algorithm "aes-256-gcm"
//   - key        = scrypt(secret, salt, 32);  salt = 16 random bytes
//   - iv         = 12 random bytes (separate base64 field)
//   - ciphertext = base64([salt(16) || aes-256-gcm ciphertext])  (salt prepended)
//   - authTag    = auth tag from the GCM cipher (separate base64 field)
//   - decrypt returns null on ANY mismatch / tamper / malformed bytes (fail-closed)
//
// Env contract matches the org boundary: explicit MARKETPLACE_INTEGRATION_SECRET
// wins; in production a missing explicit secret throws; otherwise
// SUPABASE_SERVICE_ROLE_KEY is the non-prod parity fallback.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"
import { Buffer } from "node:buffer"

export interface IntegrationSecretEnvelope {
  version: "v1"
  algorithm: "aes-256-gcm"
  iv: string
  authTag: string
  ciphertext: string
  createdAt: string
}

// Read env from Deno edge OR Node (vitest/Next) without a hard dependency on
// either global, so the single source of truth stays importable on both.
function readEnv(key: string): string | undefined {
  const globals = globalThis as Record<string, unknown>
  const deno = globals.Deno as { env?: { get(k: string): string | undefined } } | undefined
  if (deno?.env?.get) {
    const fromDeno = deno.env.get(key)
    if (fromDeno !== undefined) return fromDeno
  }
  const processLike = globals.process as { env?: Record<string, string | undefined> } | undefined
  return processLike?.env?.[key]
}

export function getIntegrationSecret(): string {
  const explicit = readEnv("MARKETPLACE_INTEGRATION_SECRET")
  if (explicit) return explicit

  // Match the Next.js org boundary: production requires the explicit secret so
  // decryption is byte-compatible on both runtimes; never silently weaken it.
  if (readEnv("NODE_ENV") === "production") {
    throw new Error("INTG-007: MARKETPLACE_INTEGRATION_SECRET required in production for org credential vault parity")
  }

  const fallback = readEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!fallback) {
    throw new Error("INTG-007: missing integration encryption secret (MARKETPLACE_INTEGRATION_SECRET or SUPABASE_SERVICE_ROLE_KEY)")
  }
  return fallback
}

function deriveKey(salt: Uint8Array): Uint8Array {
  return new Uint8Array(scryptSync(getIntegrationSecret(), salt, 32))
}

export function encryptIntegrationSecret(value: string): IntegrationSecretEnvelope {
  const plaintext = value.trim()
  if (!plaintext) throw new Error("INTG-007: cannot encrypt an empty integration secret")

  const iv = randomBytes(12)
  const salt = randomBytes(16)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(salt), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag() as Uint8Array

  return {
    version: "v1",
    algorithm: "aes-256-gcm",
    iv: Buffer.from(iv).toString("base64"),
    authTag: Buffer.from(authTag).toString("base64"),
    ciphertext: Buffer.concat([salt, encrypted]).toString("base64"),
    createdAt: new Date().toISOString(),
  }
}

export function decryptIntegrationSecret(envelope: unknown): string | null {
  if (!envelope || typeof envelope !== "object") return null
  const typed = envelope as Partial<IntegrationSecretEnvelope>
  if (
    typed.version !== "v1" ||
    typed.algorithm !== "aes-256-gcm" ||
    !typed.iv ||
    !typed.authTag ||
    !typed.ciphertext
  ) {
    return null
  }

  try {
    const raw = Buffer.from(typed.ciphertext, "base64")
    const salt = raw.subarray(0, 16)
    const encrypted = raw.subarray(16)
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(salt), Buffer.from(typed.iv, "base64"))
    decipher.setAuthTag(Buffer.from(typed.authTag, "base64"))
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  } catch {
    // Fail-closed: never surface plaintext on tamper, wrong key, or malformed bytes.
    return null
  }
}
