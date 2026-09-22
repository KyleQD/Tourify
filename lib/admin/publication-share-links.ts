/**
 * PUB-206 — Secure publication share links (pure helpers).
 * Token is high-entropy; only hashes are stored. Gate enforces scope, expiry,
 * passcode, download permission, max-use, revocation, and snapshot lifecycle.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto"

/** 32 bytes → 256 bits entropy (base64url plaintext returned once). */
export const PUBLICATION_SHARE_TOKEN_BYTES = 32

export type PublicationShareGateDenyReason =
  | "missing"
  | "revoked"
  | "expired"
  | "max_uses"
  | "passcode_required"
  | "passcode_failed"
  | "download_denied"
  | "scope_denied"
  | "snapshot_retracted"
  | "snapshot_superseded"
  | "snapshot_not_committed"

export interface PublicationShareTokenRecord {
  id: string
  orgId: string
  snapshotId: string
  tokenHash: string
  name: string
  scope: Record<string, unknown>
  expiresAt: string | null
  passcodeHash: string | null
  allowDownload: boolean
  maxUses: number | null
  useCount: number
  revokedAt: string | null
}

export interface PublicationShareSnapshotRecord {
  id: string
  status: "draft" | "committed" | "superseded" | "retracted" | string
  retractedAt?: string | null
}

export interface PublicationShareGateInput {
  token: PublicationShareTokenRecord | null
  snapshot: PublicationShareSnapshotRecord | null
  action: "view" | "download"
  /**
   * When the token has a passcode hash:
   * - omitted/undefined → treat as not provided (passcode_required)
   * - false → passcode_failed
   * - true → accepted
   */
  passcodeVerified?: boolean
  requestedScopeKeys?: string[]
  nowMs?: number
}

export type PublicationShareGateResult =
  | { ok: true; token: PublicationShareTokenRecord; snapshot: PublicationShareSnapshotRecord }
  | { ok: false; reason: PublicationShareGateDenyReason; accessAction: string }

export function generatePublicationShareToken(
  bytes: number = PUBLICATION_SHARE_TOKEN_BYTES,
): string {
  const size = Math.max(16, Math.floor(bytes))
  return randomBytes(size).toString("base64url")
}

export function hashPublicationShareSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function verifyPublicationShareSecret(value: string, expectedHash: string): boolean {
  if (!value || !expectedHash) return false
  const actual = Buffer.from(hashPublicationShareSecret(value), "utf8")
  const expected = Buffer.from(expectedHash, "utf8")
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function buildPublicationSharePath(token: string): string {
  return `/p/${encodeURIComponent(token)}`
}

export function buildPublicationShareUrl(input: { origin: string; token: string }): string {
  const origin = input.origin.replace(/\/$/, "")
  return `${origin}${buildPublicationSharePath(input.token)}`
}

export function evaluatePublicationShareGate(
  input: PublicationShareGateInput,
): PublicationShareGateResult {
  if (!input.token) return { ok: false, reason: "missing", accessAction: "denied" }
  if (!input.snapshot)
    return { ok: false, reason: "missing", accessAction: "denied" }

  if (input.token.revokedAt)
    return { ok: false, reason: "revoked", accessAction: "revoked_hit" }

  const now = input.nowMs ?? Date.now()
  if (input.token.expiresAt) {
    const expires = new Date(input.token.expiresAt).getTime()
    if (Number.isFinite(expires) && expires < now)
      return { ok: false, reason: "expired", accessAction: "expired_hit" }
  }

  if (
    input.token.maxUses != null &&
    input.token.maxUses >= 0 &&
    input.token.useCount >= input.token.maxUses
  ) {
    return { ok: false, reason: "max_uses", accessAction: "denied" }
  }

  if (input.snapshot.status === "retracted" || input.snapshot.retractedAt)
    return { ok: false, reason: "snapshot_retracted", accessAction: "denied" }
  if (input.snapshot.status === "superseded")
    return { ok: false, reason: "snapshot_superseded", accessAction: "superseded_hit" }
  if (input.snapshot.status !== "committed")
    return { ok: false, reason: "snapshot_not_committed", accessAction: "denied" }

  if (input.token.passcodeHash) {
    if (input.passcodeVerified == null)
      return { ok: false, reason: "passcode_required", accessAction: "denied" }
    if (input.passcodeVerified !== true)
      return { ok: false, reason: "passcode_failed", accessAction: "passcode_failed" }
  }

  if (input.action === "download" && !input.token.allowDownload)
    return { ok: false, reason: "download_denied", accessAction: "denied" }

  const allowedSections = normalizeScopeSections(input.token.scope)
  if (input.requestedScopeKeys?.length && allowedSections.length > 0) {
    const denied = input.requestedScopeKeys.some((key) => !allowedSections.includes(key))
    if (denied) return { ok: false, reason: "scope_denied", accessAction: "denied" }
  }

  return { ok: true, token: input.token, snapshot: input.snapshot }
}

export function normalizeScopeSections(scope: Record<string, unknown> | null | undefined): string[] {
  if (!scope || typeof scope !== "object") return []
  const sections = scope.sections
  if (!Array.isArray(sections)) return []
  return sections.map((item) => String(item).trim()).filter(Boolean)
}

export function buildShareLinkScope(input: {
  sections?: string[]
  audienceClass?: string
  notes?: string
}): Record<string, unknown> {
  return {
    sections: (input.sections || []).map((s) => s.trim()).filter(Boolean),
    audienceClass: input.audienceClass || "worker",
    notes: input.notes || null,
  }
}

export interface CreateShareLinkInputView {
  name: string
  scope: Record<string, unknown>
  expiresAt: string | null
  passcode: string | null
  allowDownload: boolean
  maxUses: number | null
}

export function validateCreateShareLinkInput(input: {
  name?: string
  expiresAt?: string | null
  passcode?: string | null
  allowDownload?: boolean
  maxUses?: number | null
  sections?: string[]
}): { ok: true; value: CreateShareLinkInputView } | { ok: false; error: string } {
  const name = (input.name || "Share link").trim()
  if (!name || name.length > 120) return { ok: false, error: "Name must be 1–120 characters." }

  let expiresAt: string | null = null
  if (input.expiresAt) {
    const ms = new Date(input.expiresAt).getTime()
    if (!Number.isFinite(ms)) return { ok: false, error: "expiresAt is invalid." }
    if (ms <= Date.now()) return { ok: false, error: "expiresAt must be in the future." }
    expiresAt = new Date(ms).toISOString()
  }

  const maxUses =
    input.maxUses == null || input.maxUses === undefined
      ? null
      : Math.floor(Number(input.maxUses))
  if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 100000))
    return { ok: false, error: "maxUses must be between 1 and 100000." }

  const passcode = input.passcode?.trim() || null
  if (passcode && passcode.length < 4)
    return { ok: false, error: "Passcode must be at least 4 characters." }

  return {
    ok: true,
    value: {
      name,
      scope: buildShareLinkScope({ sections: input.sections }),
      expiresAt,
      passcode,
      allowDownload: Boolean(input.allowDownload),
      maxUses,
    },
  }
}
