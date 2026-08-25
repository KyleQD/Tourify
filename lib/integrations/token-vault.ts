/**
 * VEN-266 — server-only dual-read/write token vault for venue social
 * integrations. Reads prefer the encrypted secrets table; legacy plaintext
 * columns remain populated during the migration window (per VEN-016 step 2)
 * and are nulled only at verified cutover.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { encryptIntegrationSecret, decryptIntegrationSecret } from "@/lib/marketplace/integration-credentials"

export interface VaultSecrets {
  accessToken: string | null
  refreshToken: string | null
}

function bytesToEnvelope(raw: unknown): unknown | null {
  if (!raw) return null
  if (typeof raw === "object") return raw // BYTEA decoded to JSON envelope by postgrest? handled below
  return null
}

/** Decrypt one BYTEA column: key_version 0 = legacy plaintext copy. */
function decodeColumn(value: unknown, keyVersion: number): string | null {
  if (value === null || value === undefined) return null

  if (keyVersion === 0) {
    if (typeof value === "string") return value
    if (value instanceof Uint8Array) return new TextDecoder().decode(value)
    // Supabase may deliver bytea as {bytes:[..]} json in some clients.
    const maybe = value as { bytes?: number[] }
    if (Array.isArray(maybe?.bytes)) return new TextDecoder().decode(new Uint8Array(maybe.bytes))
    return null
  }

  const envelope = value instanceof Uint8Array ? safeJson(new TextDecoder().decode(value)) : typeof value === "string" ? safeJson(value) : bytesToEnvelope(value)
  if (!envelope) return null
  return decryptIntegrationSecret(envelope)
}

function safeJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function readVenueIntegrationSecrets(integrationId: string): Promise<VaultSecrets> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from("venue_social_integration_secrets")
    .select("access_token_secret, refresh_token_secret, key_version")
    .eq("integration_id", integrationId)
    .maybeSingle()

  if (!data) return { accessToken: null, refreshToken: null }
  const keyVersion = Number((data as any).key_version ?? 0)
  return {
    accessToken: decodeColumn((data as any).access_token_secret, keyVersion),
    refreshToken: decodeColumn((data as any).refresh_token_secret, keyVersion),
  }
}

/**
 * Dual-write: encrypted vault is authoritative; legacy columns stay populated
 * during the migration window so pre-cutover readers keep working. Nulls are
 * written through on explicit clears (disconnect).
 */
export async function writeVenueIntegrationSecrets(
  integrationId: string,
  secrets: Partial<VaultSecrets>,
): Promise<void> {
  const service = createServiceRoleClient()
  const now = new Date().toISOString()

  if ("accessToken" in secrets || "refreshToken" in secrets) {
    const envelope: Record<string, unknown> = { key_version: 1 }
    if (secrets.accessToken !== undefined && secrets.accessToken !== null) {
      envelope.access_token_secret = Buffer.from(JSON.stringify(encryptIntegrationSecret(secrets.accessToken)), "utf8")
    }
    if (secrets.refreshToken !== undefined && secrets.refreshToken !== null) {
      envelope.refresh_token_secret = Buffer.from(JSON.stringify(encryptIntegrationSecret(secrets.refreshToken)), "utf8")
    }
    const { error } = await service
      .from("venue_social_integration_secrets")
      .upsert({ integration_id: integrationId, ...envelope }, { onConflict: "integration_id" })
    if (error) throw new Error(`vault write failed: ${error.message}`)
  }

  const legacyUpdate: Record<string, unknown> = {}
  if ("accessToken" in secrets) legacyUpdate.access_token = secrets.accessToken ?? null
  if ("refreshToken" in secrets) legacyUpdate.refresh_token = secrets.refreshToken ?? null
  if (Object.keys(legacyUpdate).length > 0) {
    await service
      .from("venue_social_integrations")
      .update({ ...legacyUpdate, updated_at: now })
      .eq("id", integrationId)
  }
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
    metadata: entry.metadata || {},
  })
}
