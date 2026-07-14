import "server-only"

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

export interface IntegrationSecretEnvelope {
  version: "v1"
  algorithm: "aes-256-gcm"
  iv: string
  authTag: string
  ciphertext: string
  createdAt: string
}

function getIntegrationSecret() {
  const explicit = process.env.MARKETPLACE_INTEGRATION_SECRET
  if (explicit) return explicit
  if (process.env.NODE_ENV === "production") {
    throw new Error("MARKETPLACE_INTEGRATION_SECRET is required for provider credential encryption")
  }
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error("Missing marketplace integration encryption secret")
  return fallback
}

function deriveKey(salt: Buffer) {
  return scryptSync(getIntegrationSecret(), salt, 32)
}

export function encryptIntegrationSecret(value: string): IntegrationSecretEnvelope {
  const plaintext = value.trim()
  if (!plaintext) throw new Error("Cannot encrypt an empty integration secret")

  const iv = randomBytes(12)
  const salt = randomBytes(16)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(salt), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    version: "v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: Buffer.concat([salt, encrypted]).toString("base64"),
    createdAt: new Date().toISOString(),
  }
}

export function decryptIntegrationSecret(envelope: unknown): string | null {
  if (!envelope || typeof envelope !== "object") return null
  const typed = envelope as Partial<IntegrationSecretEnvelope>
  if (typed.version !== "v1" || typed.algorithm !== "aes-256-gcm" || !typed.iv || !typed.authTag || !typed.ciphertext) {
    return null
  }

  const raw = Buffer.from(typed.ciphertext, "base64")
  const salt = raw.subarray(0, 16)
  const encrypted = raw.subarray(16)
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(salt), Buffer.from(typed.iv, "base64"))
  decipher.setAuthTag(Buffer.from(typed.authTag, "base64"))
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

export function resolveIntegrationAccessToken(row: Record<string, unknown> | null | undefined) {
  const encrypted = decryptIntegrationSecret(row?.token_envelope)
  if (encrypted) return encrypted
  return typeof row?.access_token === "string" ? row.access_token : null
}

export function sanitizeMarketplaceIntegration<T extends Record<string, unknown> | null | undefined>(row: T) {
  if (!row) return row
  const {
    access_token: _accessToken,
    refresh_token: _refreshToken,
    token_envelope: tokenEnvelope,
    refresh_token_envelope: refreshTokenEnvelope,
    ...safe
  } = row

  return {
    ...safe,
    hasToken: Boolean(tokenEnvelope || _accessToken),
    hasRefreshToken: Boolean(refreshTokenEnvelope || _refreshToken),
  }
}
