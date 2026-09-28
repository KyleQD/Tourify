/**
 * INTG-007 — server-only, encrypted-at-rest credential vault boundary.
 *
 * Hard rules:
 * - NEVER persist plaintext access/refresh tokens. The legacy dual-write to
 *   venue_social_integrations is retired; only encrypted envelope bytes are
 *   written to the server-only vault table.
 * - Reads FAIL CLOSED: stored values that are not decryptable v1 envelopes
 *   (including legacy key_version=0 plaintext copies) return null and are never
 *   surfaced to callers or logs.
 * - Log/audit metadata is redacted before it is persisted (logIntegrationEvent).
 *
 * The vault table (venue_social_integration_secrets) has RLS enabled with zero
 * client policies and zero grants for anon/authenticated, so only service-role
 * server code can reach token material (see 20260823031000_integration_token_vault.sql).
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { encryptIntegrationSecret, decryptIntegrationSecret } from "@/lib/marketplace/integration-credentials"
import type { IntegrationSecretEnvelope } from "@/lib/marketplace/integration-credentials"

export interface VaultSecrets {
  accessToken: string | null
  refreshToken: string | null
}

/** Encrypted envelope version stamped on every vault write. */
export const VAULT_KEY_VERSION = 1

function safeJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Parse a BYTEA/column value into a decodable JSON envelope object, or null.
 * Supports the delivery shapes Supabase clients produce (string, Uint8Array,
 * { bytes: [] }, { type: "Buffer", data: [] }, or an already-parsed object).
 */
function envelopeFromValue(value: unknown): unknown | null {
  if (value === null || value === undefined) return null
  if (value instanceof Uint8Array) return safeJson(new TextDecoder().decode(value))
  if (typeof value === "string") return safeJson(value)
  if (typeof value === "object") {
    const record = value as { bytes?: number[]; type?: string; data?: number[] }
    if (Array.isArray(record.bytes)) return safeJson(new TextDecoder().decode(new Uint8Array(record.bytes)))
    if (Array.isArray(record.data) && record.type === "Buffer") {
      return safeJson(new TextDecoder().decode(new Uint8Array(record.data)))
    }
    return value // already a parsed envelope object
  }
  return null
}

/**
 * Encode one secret into encrypted-at-rest vault bytes. The plaintext never
 * appears in the returned buffer.
 */
export function encodeVaultSecret(secret: string): Buffer {
  if (!secret) throw new Error("Cannot encode an empty vault secret")
  return Buffer.from(JSON.stringify(encryptIntegrationSecret(secret)), "utf8")
}

/**
 * Fail-closed vault read: returns the decrypted secret ONLY when the stored
 * value is a valid, decryptable v1 envelope. Legacy plaintext copies
 * (key_version=0), tampered envelopes, and wrong-key ciphertext all resolve to
 * null — never to raw string material.
 */
export function decodeVaultSecret(value: unknown): string | null {
  const envelope = envelopeFromValue(value)
  if (!envelope) return null
  try {
    return decryptIntegrationSecret(envelope)
  } catch {
    return null
  }
}

/** Metadata keys that are never allowed through to logs/audit stores. */
const CREDENTIAL_SENSITIVE_KEYS = new Set([
  "access_token",
  "refresh_token",
  "accessToken",
  "refreshToken",
  "access_token_secret",
  "refresh_token_secret",
  "token_envelope",
  "refresh_token_envelope",
  "code",
  "code_verifier",
  "authorization",
  "secret",
  "api_key",
])

/**
 * Recursively redact credential material from audit/metadata payloads. Unknown
 * keys pass through; recognized credential keys are replaced with a marker and
 * nested objects are redacted in place so a single missed assignment cannot
 * leak a token.
 */
export function redactCredentialLog(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (CREDENTIAL_SENSITIVE_KEYS.has(key)) {
      safe[key] = "[REDACTED]"
      continue
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      safe[key] = redactCredentialLog(value as Record<string, unknown>)
    } else {
      safe[key] = value
    }
  }
  return safe
}

/**
 * Build the encrypted persistence payload for an organization social
 * integration. Only encrypted envelopes and expiry metadata are returned — the
 * caller cannot accidentally include plaintext tokens in the row it writes.
 */
export interface OrganizationTokenGrant {
  access_token: string
  refresh_token?: string | null
  expires_in?: number
}

export interface OrganizationCredentialPayload {
  token_envelope: IntegrationSecretEnvelope
  refresh_token_envelope: IntegrationSecretEnvelope | null
  token_expires_at: string | null
}

export function buildOrganizationCredentialPayload(grant: OrganizationTokenGrant): OrganizationCredentialPayload {
  return {
    token_envelope: encryptIntegrationSecret(grant.access_token),
    refresh_token_envelope: grant.refresh_token ? encryptIntegrationSecret(grant.refresh_token) : null,
    token_expires_at: grant.expires_in ? new Date(Date.now() + grant.expires_in * 1000).toISOString() : null,
  }
}

export async function readVenueIntegrationSecrets(integrationId: string): Promise<VaultSecrets> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from("venue_social_integration_secrets")
    .select("access_token_secret, refresh_token_secret")
    .eq("integration_id", integrationId)
    .maybeSingle()

  if (!data) return { accessToken: null, refreshToken: null }
  return {
    accessToken: decodeVaultSecret((data as any).access_token_secret),
    refreshToken: decodeVaultSecret((data as any).refresh_token_secret),
  }
}

/**
 * Encrypted-only write to the server-only vault. Explicit nulls clear the vault
 * column (disconnect/clear semantics); undefined leaves it unchanged. Legacy
 * plaintext columns on venue_social_integrations are intentionally never
 * written again (INTG-007).
 */
export async function writeVenueIntegrationSecrets(
  integrationId: string,
  secrets: Partial<VaultSecrets>,
): Promise<void> {
  const service = createServiceRoleClient()
  const update: Record<string, unknown> = {}
  if (secrets.accessToken !== undefined) {
    update.access_token_secret = secrets.accessToken === null ? null : encodeVaultSecret(secrets.accessToken)
  }
  if (secrets.refreshToken !== undefined) {
    update.refresh_token_secret = secrets.refreshToken === null ? null : encodeVaultSecret(secrets.refreshToken)
  }
  if (Object.keys(update).length === 0) return

  const { error } = await service
    .from("venue_social_integration_secrets")
    .upsert({ integration_id: integrationId, key_version: VAULT_KEY_VERSION, ...update }, { onConflict: "integration_id" })
  if (error) throw new Error(`vault write failed: ${error.message}`)
}

export async function deleteVenueIntegrationSecrets(integrationId: string): Promise<void> {
  const service = createServiceRoleClient()
  // Secret deletion first — a failed row-clear must never leave live tokens.
  await service.from("venue_social_integration_secrets").delete().eq("integration_id", integrationId)
}

export async function logIntegrationEvent(entry: {
  venueId: string | null
  actorId: string
  action: "connect" | "disconnect" | "refresh" | "scope_change" | "sync_failed"
  platform: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const service = createServiceRoleClient()
  await service.from("integration_audit_log").insert({
    venue_id: entry.venueId,
    actor_id: entry.actorId,
    action: entry.action,
    platform: entry.platform,
    metadata: redactCredentialLog(entry.metadata),
  })
}