/**
 * ADV-403 — Add secure external request flow
 *
 * External respondents (venue contacts, vendors, promoters) receive an
 * expiring section-scoped link.  The token encodes the org/event/section
 * scope; no other events or sections can be accessed via it.
 *
 * Identity verification policy is configurable:
 *   none | email_match | passcode | magic_link
 *
 * Respondents can save drafts and upload files.  Upload slots carry their
 * own short-lived signed URL and require malware-scan clearance before use.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// External request token
// ---------------------------------------------------------------------------

export type ExternalVerificationMethod =
  | "none"        // token alone is sufficient (low-sensitivity)
  | "email_match" // respondent must confirm their email matches the grant
  | "passcode"    // short PIN sent separately
  | "magic_link"  // one-time link sent to registered email

export type ExternalTokenStatus =
  | "active"
  | "used"       // link was clicked; session started (does NOT mean form submitted)
  | "expired"
  | "revoked"
  | "submitted"  // form was submitted successfully

export interface ExternalAdvanceToken {
  id: string
  org_id: string
  event_id: string
  advance_id: string
  /** One token = access to exactly these section IDs (non-empty) */
  section_ids: string[]

  status: ExternalTokenStatus

  /** Hashed token value — the raw value is only in the URL */
  token_hash: string
  /** ISO-8601 expiry */
  expires_at: string

  verification_method: ExternalVerificationMethod
  /** For email_match: the address that must match */
  expected_email?: string
  /** For passcode: hashed PIN (raw PIN sent separately via SMS/email) */
  passcode_hash?: string

  /** Number of times the link has been accessed (not submitted) */
  access_count: number
  /** Maximum access count before automatic revocation (null = unlimited) */
  max_access_count?: number

  created_by: string
  created_at: string
  last_accessed_at?: string
  submitted_at?: string
  revoked_by?: string
  revoked_at?: string
  revoke_reason?: string
}

// ---------------------------------------------------------------------------
// Token lifecycle helpers
// ---------------------------------------------------------------------------

export function isTokenUsable(
  token: ExternalAdvanceToken,
  now?: string,
): boolean {
  const ts = now ?? new Date().toISOString()
  if (token.status === "revoked" || token.status === "expired") return false
  if (token.status === "submitted") return false
  if (token.expires_at <= ts) return false
  if (token.max_access_count !== undefined && token.access_count >= token.max_access_count) return false
  return true
}

export function recordTokenAccess(
  token: ExternalAdvanceToken,
  now?: string,
): ExternalAdvanceToken {
  if (!isTokenUsable(token, now)) {
    throw new Error(`Token ${token.id} is not usable (status: ${token.status}).`)
  }
  const ts = now ?? new Date().toISOString()
  const updated: ExternalAdvanceToken = {
    ...token,
    access_count: token.access_count + 1,
    last_accessed_at: ts,
    status: "used",
  }
  // Auto-expire if max_access_count reached
  if (updated.max_access_count !== undefined && updated.access_count >= updated.max_access_count) {
    return { ...updated, status: "expired" }
  }
  return updated
}

export function revokeToken(
  token: ExternalAdvanceToken,
  revokedBy: string,
  reason: string,
  now?: string,
): ExternalAdvanceToken {
  if (token.status === "revoked") return token // idempotent
  const ts = now ?? new Date().toISOString()
  return { ...token, status: "revoked", revoked_by: revokedBy, revoked_at: ts, revoke_reason: reason }
}

export function submitToken(
  token: ExternalAdvanceToken,
  now?: string,
): ExternalAdvanceToken {
  if (!isTokenUsable(token, now)) {
    throw new Error(`Token ${token.id} cannot be submitted (status: ${token.status}).`)
  }
  const ts = now ?? new Date().toISOString()
  return { ...token, status: "submitted", submitted_at: ts }
}

// ---------------------------------------------------------------------------
// Scope check — enforces enumeration ban
// ---------------------------------------------------------------------------

export interface TokenScopeCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Verifies that a requested section is within the token's scope.
 * Callers MUST check this before returning any advance data to an external
 * respondent.  Requesting a section not in scope is a hard deny — no partial
 * data is leaked.
 */
export function checkTokenScope(
  token: ExternalAdvanceToken,
  requestedEventId: string,
  requestedSectionId: string,
  now?: string,
): TokenScopeCheckResult {
  if (!isTokenUsable(token, now)) {
    return { allowed: false, reason: "token_not_usable" }
  }
  if (token.event_id !== requestedEventId) {
    return { allowed: false, reason: "event_mismatch" }
  }
  if (!token.section_ids.includes(requestedSectionId)) {
    return { allowed: false, reason: "section_not_in_scope" }
  }
  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Identity verification
// ---------------------------------------------------------------------------

export interface VerifyIdentityInput {
  method: ExternalVerificationMethod
  /** Respondent-supplied email (for email_match) */
  supplied_email?: string
  /** Respondent-supplied passcode (for passcode) */
  supplied_passcode_hash?: string
}

export interface VerifyIdentityResult {
  verified: boolean
  reason?: string
}

export function verifyExternalIdentity(
  token: ExternalAdvanceToken,
  input: VerifyIdentityInput,
): VerifyIdentityResult {
  if (token.verification_method !== input.method) {
    return { verified: false, reason: "method_mismatch" }
  }
  switch (input.method) {
    case "none":
      return { verified: true }
    case "email_match":
      if (!token.expected_email || !input.supplied_email) {
        return { verified: false, reason: "missing_email" }
      }
      if (token.expected_email.toLowerCase() !== input.supplied_email.toLowerCase()) {
        return { verified: false, reason: "email_mismatch" }
      }
      return { verified: true }
    case "passcode":
      if (!token.passcode_hash || !input.supplied_passcode_hash) {
        return { verified: false, reason: "missing_passcode" }
      }
      if (token.passcode_hash !== input.supplied_passcode_hash) {
        return { verified: false, reason: "passcode_mismatch" }
      }
      return { verified: true }
    case "magic_link":
      // Magic link verification is handled by the email delivery service;
      // by the time this function is called the token was already consumed.
      return { verified: true }
    default:
      return { verified: false, reason: "unknown_method" }
  }
}

// ---------------------------------------------------------------------------
// Draft saves
// ---------------------------------------------------------------------------

export type DraftFieldValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>   // contact / address structs
  | string[]                  // multiselect

export interface ExternalDraftEntry {
  id: string
  token_id: string
  section_id: string
  field_id: string
  value: DraftFieldValue
  saved_at: string
}

/** Upsert a single draft value — idempotent by (token_id, section_id, field_id). */
export function upsertDraftEntry(
  existing: ExternalDraftEntry[],
  entry: Omit<ExternalDraftEntry, "saved_at"> & { now?: string },
): ExternalDraftEntry[] {
  const ts = entry.now ?? new Date().toISOString()
  const { now: _now, ...rest } = entry
  void _now
  const updated: ExternalDraftEntry = { ...rest, saved_at: ts }
  const idx = existing.findIndex(
    (e) =>
      e.token_id === entry.token_id &&
      e.section_id === entry.section_id &&
      e.field_id === entry.field_id,
  )
  if (idx === -1) return [...existing, updated]
  return [...existing.slice(0, idx), updated, ...existing.slice(idx + 1)]
}

// ---------------------------------------------------------------------------
// Upload slot
// ---------------------------------------------------------------------------

export type UploadSlotStatus =
  | "pending"           // slot created; awaiting upload
  | "uploaded"          // file received; scan pending
  | "scan_pending"      // queued for malware scan
  | "scan_cleared"      // scan passed; file usable
  | "scan_rejected"     // scan found issue; file rejected
  | "replaced"          // superseded by a newer upload in same slot
  | "deleted"           // explicitly removed

export interface ExternalUploadSlot {
  id: string
  token_id: string
  section_id: string
  field_id: string
  /** Short-lived signed URL (caller generates; this model stores the reference) */
  signed_url_ref: string
  signed_url_expires_at: string
  status: UploadSlotStatus
  original_filename?: string
  mime_type?: string
  file_size_bytes?: number
  created_at: string
  updated_at: string
}

export function markSlotUploaded(slot: ExternalUploadSlot, meta: {
  original_filename: string
  mime_type: string
  file_size_bytes: number
  now?: string
}): ExternalUploadSlot {
  const ts = meta.now ?? new Date().toISOString()
  return { ...slot, status: "scan_pending", original_filename: meta.original_filename, mime_type: meta.mime_type, file_size_bytes: meta.file_size_bytes, updated_at: ts }
}

export function markSlotScanResult(
  slot: ExternalUploadSlot,
  cleared: boolean,
  now?: string,
): ExternalUploadSlot {
  const ts = now ?? new Date().toISOString()
  return { ...slot, status: cleared ? "scan_cleared" : "scan_rejected", updated_at: ts }
}

/** Returns true only if the upload is safe to use. */
export function isUploadUsable(slot: ExternalUploadSlot): boolean {
  return slot.status === "scan_cleared"
}
