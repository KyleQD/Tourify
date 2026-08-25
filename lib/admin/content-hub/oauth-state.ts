export interface OrgSocialOAuthState {
  nonce: string
  scope: "organization" | "artist"
  returnTo: "admin" | "artist"
  organizerAccountId?: string
  opsOrgId?: string
  platform: string
}

export function encodeSocialOAuthState(state: OrgSocialOAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url")
}

export function decodeSocialOAuthState(raw: string | null | undefined): OrgSocialOAuthState | null {
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8")
    const parsed = JSON.parse(decoded) as Partial<OrgSocialOAuthState>
    if (!parsed.platform || !parsed.scope || !parsed.returnTo || !parsed.nonce) return null
    return {
      nonce: String(parsed.nonce),
      scope: parsed.scope === "organization" ? "organization" : "artist",
      returnTo: parsed.returnTo === "admin" ? "admin" : "artist",
      organizerAccountId: parsed.organizerAccountId ? String(parsed.organizerAccountId) : undefined,
      opsOrgId: parsed.opsOrgId ? String(parsed.opsOrgId) : undefined,
      platform: String(parsed.platform),
    }
  } catch {
    return null
  }
}

// ── VEN-268 — HMAC-signed, expiring, user-bound OAuth state ──────────────────
// The previous base64 state carried an unverified Math.random nonce; CSRF was
// never checked. Signed state binds platform+user to an HMAC the server can
// verify and expires after 10 minutes. PKCE verifiers travel inside the
// signed payload so only this server can read them.

import { createHash, createHmac, timingSafeEqual, randomBytes } from "crypto"

const STATE_TTL_MS = 10 * 60 * 1000

function getStateSigningSecret(): string {
  const explicit = process.env.MARKETPLACE_INTEGRATION_SECRET
  if (explicit) return explicit
  if (process.env.NODE_ENV === "production") {
    throw new Error("MARKETPLACE_INTEGRATION_SECRET is required for OAuth state signing")
  }
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error("Missing OAuth state signing secret")
  return fallback
}

export interface SignedStatePayload {
  nonce: string
  userId: string
  platform: string
  issuedAt: number
  /** Twitter-style PKCE verifier (S256 challenge derived at start). */
  codeVerifier?: string
  /** Optional org-flow context, folded into the signature. */
  scope?: "organization" | "artist"
  returnTo?: "admin" | "artist"
  organizerAccountId?: string
  opsOrgId?: string
}

export function createSignedOAuthState(payload: Omit<SignedStatePayload, "nonce" | "issuedAt">): {
  state: string
  codeChallenge?: string
} {
  const full: SignedStatePayload = {
    ...payload,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
  }
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url")
  const signature = createHmac("sha256", getStateSigningSecret()).update(body).digest("base64url")

  let codeChallenge: string | undefined
  if (full.codeVerifier) {
    // S256 challenge = BASE64URL(SHA256(verifier))
    codeChallenge = createHash("sha256").update(full.codeVerifier).digest("base64url")
  }
  return { state: `${body}.${signature}`, codeChallenge }
}

export function verifySignedOAuthState(
  raw: string | null | undefined,
  expectedUserId: string,
  expectedPlatform?: string,
): SignedStatePayload | null {
  if (!raw || !raw.includes(".")) return null
  const [body, sig] = raw.split(".")
  if (!body || !sig) return null
  const expectedSig = createHmac("sha256", getStateSigningSecret()).update(body).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedStatePayload
    if (!parsed.userId || !parsed.platform || !parsed.nonce) return null
    if (parsed.userId !== expectedUserId) return null // bound to initiating actor
    if (Date.now() - parsed.issuedAt > STATE_TTL_MS) return null // expired
    if (expectedPlatform && parsed.platform !== expectedPlatform) return null
    return parsed
  } catch {
    return null
  }
}
