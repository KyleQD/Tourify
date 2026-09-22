import { describe, it, expect } from "vitest"
import {
  isTokenUsable,
  recordTokenAccess,
  revokeToken,
  submitToken,
  checkTokenScope,
  verifyExternalIdentity,
  upsertDraftEntry,
  markSlotUploaded,
  markSlotScanResult,
  isUploadUsable,
  type ExternalAdvanceToken,
  type ExternalUploadSlot,
  type ExternalDraftEntry,
} from "../../lib/admin/advance-external-request"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseToken(overrides: Partial<ExternalAdvanceToken> = {}): ExternalAdvanceToken {
  return {
    id: "tok-1",
    org_id: "org-1",
    event_id: "ev-1",
    advance_id: "adv-1",
    section_ids: ["s1", "s2"],
    status: "active",
    token_hash: "abc123",
    expires_at: "2099-01-01T00:00:00Z",
    verification_method: "none",
    access_count: 0,
    created_by: "user-pm",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

function baseSlot(overrides: Partial<ExternalUploadSlot> = {}): ExternalUploadSlot {
  return {
    id: "slot-1",
    token_id: "tok-1",
    section_id: "s1",
    field_id: "f1",
    signed_url_ref: "https://storage.example.com/upload/abc",
    signed_url_expires_at: "2025-06-15T00:00:00Z",
    status: "pending",
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2025-06-01T00:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// isTokenUsable
// ---------------------------------------------------------------------------

describe("isTokenUsable", () => {
  it("returns true for active non-expired token", () => {
    expect(isTokenUsable(baseToken())).toBe(true)
  })
  it("returns false for revoked token", () => {
    expect(isTokenUsable(baseToken({ status: "revoked" }))).toBe(false)
  })
  it("returns false for submitted token", () => {
    expect(isTokenUsable(baseToken({ status: "submitted" }))).toBe(false)
  })
  it("returns false when expires_at is in the past", () => {
    // future expiry → usable
    expect(isTokenUsable(baseToken({ expires_at: "2099-01-01T00:00:00Z" }), "2025-01-01T00:00:00Z")).toBe(true)
    // past expiry → not usable
    expect(isTokenUsable(baseToken({ expires_at: "2020-01-01T00:00:00Z" }), "2025-01-01T00:00:00Z")).toBe(false)
  })
  it("returns false when max_access_count reached", () => {
    expect(isTokenUsable(baseToken({ max_access_count: 3, access_count: 3 }))).toBe(false)
  })
  it("returns true when access_count below max", () => {
    expect(isTokenUsable(baseToken({ max_access_count: 5, access_count: 2 }))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// recordTokenAccess
// ---------------------------------------------------------------------------

describe("recordTokenAccess", () => {
  it("increments access_count and sets status to used", () => {
    const t = baseToken()
    const updated = recordTokenAccess(t, "2025-06-10T00:00:00Z")
    expect(updated.access_count).toBe(1)
    expect(updated.status).toBe("used")
    expect(updated.last_accessed_at).toBe("2025-06-10T00:00:00Z")
  })

  it("auto-expires when max_access_count reached", () => {
    const t = baseToken({ max_access_count: 1, access_count: 0 })
    const updated = recordTokenAccess(t)
    expect(updated.status).toBe("expired")
  })

  it("throws for non-usable token", () => {
    expect(() => recordTokenAccess(baseToken({ status: "revoked" }))).toThrow()
  })
})

// ---------------------------------------------------------------------------
// revokeToken
// ---------------------------------------------------------------------------

describe("revokeToken", () => {
  it("revokes an active token", () => {
    const updated = revokeToken(baseToken(), "admin-1", "changed contact", "2025-06-10T00:00:00Z")
    expect(updated.status).toBe("revoked")
    expect(updated.revoke_reason).toBe("changed contact")
    expect(updated.revoked_by).toBe("admin-1")
  })
  it("is idempotent — revoking already-revoked is a no-op", () => {
    const revoked = revokeToken(baseToken(), "admin-1", "reason")
    const again = revokeToken(revoked, "admin-2", "other reason")
    expect(again.revoked_by).toBe("admin-1") // original preserved
  })
})

// ---------------------------------------------------------------------------
// submitToken
// ---------------------------------------------------------------------------

describe("submitToken", () => {
  it("marks a used token as submitted", () => {
    const t = baseToken({ status: "used" })
    const updated = submitToken(t, "2025-06-15T00:00:00Z")
    expect(updated.status).toBe("submitted")
    expect(updated.submitted_at).toBe("2025-06-15T00:00:00Z")
  })
  it("throws for revoked token", () => {
    expect(() => submitToken(baseToken({ status: "revoked" }))).toThrow()
  })
})

// ---------------------------------------------------------------------------
// checkTokenScope
// ---------------------------------------------------------------------------

describe("checkTokenScope", () => {
  it("allows access to a section in scope for active token", () => {
    const r = checkTokenScope(baseToken(), "ev-1", "s1")
    expect(r.allowed).toBe(true)
  })
  it("denies access to a section not in scope", () => {
    const r = checkTokenScope(baseToken(), "ev-1", "s99")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("section_not_in_scope")
  })
  it("denies access to a different event", () => {
    const r = checkTokenScope(baseToken(), "ev-99", "s1")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("event_mismatch")
  })
  it("denies access when token is expired", () => {
    const r = checkTokenScope(
      baseToken({ expires_at: "2020-01-01T00:00:00Z" }),
      "ev-1",
      "s1",
      "2025-01-01T00:00:00Z",
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("token_not_usable")
  })
})

// ---------------------------------------------------------------------------
// verifyExternalIdentity
// ---------------------------------------------------------------------------

describe("verifyExternalIdentity", () => {
  it("passes verification for method=none", () => {
    const r = verifyExternalIdentity(baseToken({ verification_method: "none" }), { method: "none" })
    expect(r.verified).toBe(true)
  })

  it("verifies email_match correctly", () => {
    const tok = baseToken({ verification_method: "email_match", expected_email: "venue@example.com" })
    expect(verifyExternalIdentity(tok, { method: "email_match", supplied_email: "venue@example.com" }).verified).toBe(true)
    expect(verifyExternalIdentity(tok, { method: "email_match", supplied_email: "other@example.com" }).verified).toBe(false)
  })

  it("is case-insensitive for email_match", () => {
    const tok = baseToken({ verification_method: "email_match", expected_email: "Venue@Example.COM" })
    const r = verifyExternalIdentity(tok, { method: "email_match", supplied_email: "venue@example.com" })
    expect(r.verified).toBe(true)
  })

  it("verifies passcode correctly", () => {
    const tok = baseToken({ verification_method: "passcode", passcode_hash: "hash-abc" })
    expect(verifyExternalIdentity(tok, { method: "passcode", supplied_passcode_hash: "hash-abc" }).verified).toBe(true)
    expect(verifyExternalIdentity(tok, { method: "passcode", supplied_passcode_hash: "hash-wrong" }).verified).toBe(false)
  })

  it("fails when method does not match token", () => {
    const tok = baseToken({ verification_method: "email_match", expected_email: "a@b.com" })
    const r = verifyExternalIdentity(tok, { method: "passcode" })
    expect(r.verified).toBe(false)
    expect(r.reason).toBe("method_mismatch")
  })

  it("passes for magic_link (server-side already consumed)", () => {
    const tok = baseToken({ verification_method: "magic_link" })
    const r = verifyExternalIdentity(tok, { method: "magic_link" })
    expect(r.verified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// upsertDraftEntry
// ---------------------------------------------------------------------------

describe("upsertDraftEntry", () => {
  it("inserts a new draft entry", () => {
    const entries = upsertDraftEntry([], {
      id: "de-1", token_id: "tok-1", section_id: "s1", field_id: "f1", value: "Madison Square Garden", now: "2025-06-10T00:00:00Z",
    })
    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe("Madison Square Garden")
  })

  it("overwrites existing entry for same field (idempotent upsert)", () => {
    const existing: ExternalDraftEntry[] = [{
      id: "de-1", token_id: "tok-1", section_id: "s1", field_id: "f1", value: "Old Value", saved_at: "2025-06-01T00:00:00Z",
    }]
    const updated = upsertDraftEntry(existing, {
      id: "de-1", token_id: "tok-1", section_id: "s1", field_id: "f1", value: "New Value", now: "2025-06-10T00:00:00Z",
    })
    expect(updated).toHaveLength(1)
    expect(updated[0].value).toBe("New Value")
  })

  it("keeps entries for different fields separate", () => {
    const existing: ExternalDraftEntry[] = [{
      id: "de-1", token_id: "tok-1", section_id: "s1", field_id: "f1", value: "A", saved_at: "2025-06-01T00:00:00Z",
    }]
    const updated = upsertDraftEntry(existing, {
      id: "de-2", token_id: "tok-1", section_id: "s1", field_id: "f2", value: "B",
    })
    expect(updated).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Upload slot lifecycle
// ---------------------------------------------------------------------------

describe("markSlotUploaded", () => {
  it("transitions pending slot to scan_pending", () => {
    const slot = baseSlot()
    const updated = markSlotUploaded(slot, {
      original_filename: "stage-plan.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 204800,
      now: "2025-06-10T00:00:00Z",
    })
    expect(updated.status).toBe("scan_pending")
    expect(updated.original_filename).toBe("stage-plan.pdf")
    expect(updated.mime_type).toBe("application/pdf")
  })
})

describe("markSlotScanResult", () => {
  it("marks scan_cleared when cleared", () => {
    const slot = baseSlot({ status: "scan_pending" })
    expect(markSlotScanResult(slot, true).status).toBe("scan_cleared")
  })
  it("marks scan_rejected when not cleared", () => {
    const slot = baseSlot({ status: "scan_pending" })
    expect(markSlotScanResult(slot, false).status).toBe("scan_rejected")
  })
})

describe("isUploadUsable", () => {
  it("returns true only for scan_cleared", () => {
    expect(isUploadUsable(baseSlot({ status: "scan_cleared" }))).toBe(true)
    expect(isUploadUsable(baseSlot({ status: "scan_pending" }))).toBe(false)
    expect(isUploadUsable(baseSlot({ status: "uploaded" }))).toBe(false)
    expect(isUploadUsable(baseSlot({ status: "scan_rejected" }))).toBe(false)
  })
})
