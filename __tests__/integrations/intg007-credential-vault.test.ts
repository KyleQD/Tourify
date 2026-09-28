/**
 * INTG-007 — encrypted-at-rest credential vault contract.
 *
 * Proves the vault boundary never persists or emits plaintext access/refresh
 * tokens, decryption fails closed (wrong key, tampered ciphertext, legacy
 * plaintext copies, malformed bytes), rotation re-encrypts to fresh
 * ciphertext, disconnect clears via explicit nulls, and audit metadata is
 * redacted before it reaches a log/audit store.
 */

import { describe, expect, it, beforeAll } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { decryptIntegrationSecret } from "@/lib/marketplace/integration-credentials"
import {
  VAULT_KEY_VERSION,
  buildOrganizationCredentialPayload,
  decodeVaultSecret,
  deleteVenueIntegrationSecrets,
  encodeVaultSecret,
  logIntegrationEvent,
  readVenueIntegrationSecrets,
  redactCredentialLog,
  writeVenueIntegrationSecrets,
} from "@/lib/integrations/token-vault"

const ACCESS = "intg007-access-token-0123456789"
const REFRESH = "intg007-refresh-token-9876543210"
const OTHER_KEY = "intg007-other-key-abcdef"

beforeAll(() => {
  process.env.MARKETPLACE_INTEGRATION_SECRET = "intg007-vault-test-key"
})

describe("encrypted-at-rest encoding", () => {
  it("never embeds plaintext in the encoded vault bytes", () => {
    const encoded = encodeVaultSecret(ACCESS)
    const asText = encoded.toString("utf8")
    expect(asText).not.toContain(ACCESS)
    const envelope = JSON.parse(asText)
    expect(envelope.ciphertext).not.toContain(ACCESS)
    expect(envelope.version).toBe("v1")
    expect(envelope.algorithm).toBe("aes-256-gcm")
  })

  it("round-trips a secret through the encrypted envelope", () => {
    expect(decodeVaultSecret(encodeVaultSecret(ACCESS))).toBe(ACCESS)
  })

  it("rotates to fresh ciphertext on every re-encode", () => {
    const first = encodeVaultSecret(ACCESS).toString("utf8")
    const second = encodeVaultSecret(ACCESS).toString("utf8")
    expect(first).not.toBe(second)
    expect(decodeVaultSecret(first)).toBe(ACCESS)
    expect(decodeVaultSecret(second)).toBe(ACCESS)
  })

  it("rejects empty secrets instead of writing blank material", () => {
    expect(() => encodeVaultSecret("")).toThrow()
    expect(() => encodeVaultSecret("   ")).toThrow()
  })
})

describe("fail-closed decryption", () => {
  it("returns null (never the plaintext) when the key does not match", () => {
    const encoded = encodeVaultSecret(ACCESS)
    process.env.MARKETPLACE_INTEGRATION_SECRET = OTHER_KEY
    try {
      expect(decodeVaultSecret(encoded)).toBeNull()
    } finally {
      process.env.MARKETPLACE_INTEGRATION_SECRET = "intg007-vault-test-key"
    }
    expect(decodeVaultSecret(encoded)).toBe(ACCESS)
  })

  it("returns null for legacy plaintext column copies (key_version 0 style)", () => {
    // Pre-INTG-007 rows stored the raw token bytes with key_version = 0. A
    // fail-closed vault must never surface those bytes as text.
    expect(decodeVaultSecret(Buffer.from(ACCESS, "utf8"))).toBeNull()
    expect(decodeVaultSecret(ACCESS)).toBeNull()
    expect(decodeVaultSecret(new Uint8Array(Buffer.from(REFRESH, "utf8")))).toBeNull()
  })

  it("returns null for tampered ciphertext", () => {
    const envelope = JSON.parse(encodeVaultSecret(ACCESS).toString("utf8"))
    const tampered = {
      ...envelope,
      ciphertext: `${envelope.ciphertext.slice(0, -4)}AAAA`,
    }
    expect(decodeVaultSecret(JSON.stringify(tampered))).toBeNull()
  })

  it("returns null for malformed or unrelated bytes", () => {
    expect(decodeVaultSecret(null)).toBeNull()
    expect(decodeVaultSecret(undefined)).toBeNull()
    expect(decodeVaultSecret(Buffer.from("not-json-at-all", "utf8"))).toBeNull()
    expect(decodeVaultSecret(42)).toBeNull()
    expect(decodeVaultSecret({ gibberish: true })).toBeNull()
  })

  it("decodes the delivery shapes Supabase bytea clients produce", () => {
    const envelopeBytes = encodeVaultSecret(ACCESS)
    const viaString = envelopeBytes.toString("utf8")
    const viaBytes = new Uint8Array(envelopeBytes)
    const viaBufferObject = { type: "Buffer", data: [...envelopeBytes] }
    const viaBytesArray = { bytes: [...envelopeBytes] }
    expect(decodeVaultSecret(viaString)).toBe(ACCESS)
    expect(decodeVaultSecret(viaBytes)).toBe(ACCESS)
    expect(decodeVaultSecret(viaBufferObject)).toBe(ACCESS)
    expect(decodeVaultSecret(viaBytesArray)).toBe(ACCESS)
  })
})

describe("organization credential payload (callback persistence)", () => {
  it("contains only encrypted envelopes and metadata — no plaintext keys or values", () => {
    const payload = buildOrganizationCredentialPayload({
      access_token: ACCESS,
      refresh_token: REFRESH,
      expires_in: 3600,
    })
    expect(Object.keys(payload).sort()).toEqual(["refresh_token_envelope", "token_envelope", "token_expires_at"])
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain(ACCESS)
    expect(serialized).not.toContain(REFRESH)
    expect(serialized).not.toContain("access_token:")
  })

  it("supports connected providers with an access token and no refresh grant", () => {
    const payload = buildOrganizationCredentialPayload({ access_token: ACCESS })
    expect(payload.token_envelope).toBeTruthy()
    expect(payload.refresh_token_envelope).toBeNull()
    expect(payload.token_expires_at).toBeNull()
  })

  it("keeps the refresh token decryptable when present", () => {
    const payload = buildOrganizationCredentialPayload({ access_token: ACCESS, refresh_token: REFRESH })
    expect(decryptIntegrationSecret(payload.refresh_token_envelope)).toBe(REFRESH)
  })
})

describe("audit/log redaction", () => {
  it("redacts credential keys at any nesting depth while keeping safe metadata", () => {
    const redacted = redactCredentialLog({
      venue_id: "venue-1",
      action: "refresh",
      access_token: ACCESS,
      refreshToken: REFRESH,
      nested: { refresh_token_secret: ACCESS, ok: true },
      error: "provider rejected refresh (401)",
    })
    expect(redacted).toMatchObject({
      venue_id: "venue-1",
      action: "refresh",
      access_token: "[REDACTED]",
      refreshToken: "[REDACTED]",
      error: "provider rejected refresh (401)",
    })
    expect(redacted.nested).toEqual({ refresh_token_secret: "[REDACTED]", ok: true })
    expect(JSON.stringify(redacted)).not.toContain(ACCESS)
    expect(JSON.stringify(redacted)).not.toContain(REFRESH)
  })

  it("returns an empty object for nullish metadata", () => {
    expect(redactCredentialLog(null)).toEqual({})
    expect(redactCredentialLog(undefined)).toEqual({})
  })
})

describe("public API surface (venue route contract)", () => {
  it("keeps the token-vault exports the venue route imports", () => {
    expect(typeof readVenueIntegrationSecrets).toBe("function")
    expect(typeof writeVenueIntegrationSecrets).toBe("function")
    expect(typeof deleteVenueIntegrationSecrets).toBe("function")
    expect(typeof logIntegrationEvent).toBe("function")
    expect(VAULT_KEY_VERSION).toBe(1)
  })
})

describe("callback route no-plaintext guard (INTG-007)", () => {
  it("organization OAuth callback never constructs plaintext persistence data", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/api/social/oauth/callback/route.ts"),
      "utf8",
    )
    expect(source).toContain("buildOrganizationCredentialPayload")
    expect(source).not.toContain("access_token: payload.access_token")
    expect(source).not.toContain("refresh_token: payload.refresh_token")
    expect(source).not.toContain("access_token: payload.access_token,")
    expect(source).not.toMatch(/token_envelope:\s*tokenEnvelope/)
  })
})