import { describe, it, expect } from "vitest"
import {
  deriveEligibility,
  createCheckInSession,
  closeCheckInSession,
  processCheckIn,
  appendCheckInEntry,
  flushOfflineQueue,
  manualCheckIn,
  summarizeCheckInSession,
  type CheckInSession,
  type EligibilityResult,
} from "@/lib/admin/check-in"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Parameters<typeof createCheckInSession>[0]> = {}): CheckInSession {
  return createCheckInSession({
    session_id: "sess-1",
    org_id: "org-1",
    event_id: "event-1",
    operator_id: "op-1",
    now: "2025-08-01T18:00:00Z",
    ...overrides,
  })
}

const ELIGIBLE: EligibilityResult = {
  eligible: true,
  source: "credential",
  reasons: [],
  records: [{ source: "credential", credential_id: "cred-1", credential_type: "wristband", is_valid: true, expires_at: null }],
}

const INELIGIBLE: EligibilityResult = {
  eligible: false,
  source: null,
  reasons: ["No credential or assignment on record"],
  records: [],
}

// ---------------------------------------------------------------------------
// deriveEligibility
// ---------------------------------------------------------------------------

describe("deriveEligibility", () => {
  it("eligible via valid credential", () => {
    const r = deriveEligibility(
      [{ source: "credential", credential_id: "c-1", credential_type: "wristband", is_valid: true, expires_at: null }],
      [],
    )
    expect(r.eligible).toBe(true)
    expect(r.source).toBe("credential")
  })

  it("eligible via active assignment", () => {
    const r = deriveEligibility(
      [],
      [{ source: "assignment", assignment_id: "a-1", role: "crew", is_active: true }],
    )
    expect(r.eligible).toBe(true)
    expect(r.source).toBe("assignment")
  })

  it("eligible via both", () => {
    const r = deriveEligibility(
      [{ source: "credential", credential_id: "c-1", credential_type: "wristband", is_valid: true, expires_at: null }],
      [{ source: "assignment", assignment_id: "a-1", role: "crew", is_active: true }],
    )
    expect(r.eligible).toBe(true)
    expect(r.source).toBe("both")
  })

  it("not eligible when credential expired", () => {
    const r = deriveEligibility(
      [{ source: "credential", credential_id: "c-1", credential_type: "wristband", is_valid: false, expires_at: "2025-07-01T00:00:00Z" }],
      [],
    )
    expect(r.eligible).toBe(false)
    expect(r.reasons).toEqual(expect.arrayContaining(["No valid credential found (expired or inactive)"]))
  })

  it("not eligible when assignment inactive", () => {
    const r = deriveEligibility(
      [],
      [{ source: "assignment", assignment_id: "a-1", role: "crew", is_active: false }],
    )
    expect(r.eligible).toBe(false)
  })

  it("not eligible with no records", () => {
    const r = deriveEligibility([], [])
    expect(r.eligible).toBe(false)
    expect(r.source).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createCheckInSession / closeCheckInSession
// ---------------------------------------------------------------------------

describe("createCheckInSession", () => {
  it("creates an open session", () => {
    const s = makeSession()
    expect(s.session_id).toBe("sess-1")
    expect(s.closed_at).toBeNull()
    expect(s.entries).toHaveLength(0)
  })
})

describe("closeCheckInSession", () => {
  it("sets closed_at", () => {
    const s = makeSession()
    const closed = closeCheckInSession(s, "2025-08-01T22:00:00Z")
    expect(closed.closed_at).toBe("2025-08-01T22:00:00Z")
  })
})

// ---------------------------------------------------------------------------
// processCheckIn
// ---------------------------------------------------------------------------

describe("processCheckIn", () => {
  it("admits eligible person", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-1", person_id: "p-1", method: "qr", operator_id: "op-1", client_timestamp: "T", is_offline: false },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
    })
    expect(r.outcome).toBe("admitted")
    expect(r.denial_reason).toBeNull()
  })

  it("denies ineligible person", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-1", person_id: "p-1", method: "qr", operator_id: "op-1", client_timestamp: "T" },
      eligibility: INELIGIBLE,
      admittedPersonIds: new Set(),
    })
    expect(r.outcome).toBe("denied")
    expect(r.denial_reason).toMatch(/No credential/)
  })

  it("returns duplicate for already-admitted person", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-2", person_id: "p-1", method: "barcode", operator_id: "op-1", client_timestamp: "T" },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(["p-1"]),
    })
    expect(r.outcome).toBe("duplicate")
    expect(r.denial_reason).toMatch(/Already checked in/)
  })

  it("returns revoked for revoked access", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-3", person_id: "p-1", method: "nfc", operator_id: "op-1", client_timestamp: "T" },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
      isRevoked: true,
    })
    expect(r.outcome).toBe("revoked")
    expect(r.denial_reason).toMatch(/revoked/)
  })

  it("queues offline scan", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-4", person_id: "p-2", method: "qr", operator_id: "op-1", client_timestamp: "T", is_offline: true },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
    })
    expect(r.outcome).toBe("offline_queued")
    expect(r.entry.server_timestamp).toBeNull()
  })

  it("records operator and device on entry", () => {
    const session = makeSession()
    const r = processCheckIn({
      session,
      attempt: { entry_id: "e-5", person_id: "p-3", method: "manual", operator_id: "op-99", device_id: "device-A", client_timestamp: "T" },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
    })
    expect(r.entry.operator_id).toBe("op-99")
    expect(r.entry.device_id).toBe("device-A")
  })
})

// ---------------------------------------------------------------------------
// appendCheckInEntry — idempotent
// ---------------------------------------------------------------------------

describe("appendCheckInEntry", () => {
  it("appends an entry", () => {
    const s = makeSession()
    const r = processCheckIn({ session: s, attempt: { entry_id: "e-1", person_id: "p-1", method: "qr", operator_id: "op-1", client_timestamp: "T" }, eligibility: ELIGIBLE, admittedPersonIds: new Set() })
    const updated = appendCheckInEntry(s, r.entry)
    expect(updated.entries).toHaveLength(1)
  })

  it("is idempotent on duplicate entry_id", () => {
    const s = makeSession()
    const r = processCheckIn({ session: s, attempt: { entry_id: "e-1", person_id: "p-1", method: "qr", operator_id: "op-1", client_timestamp: "T" }, eligibility: ELIGIBLE, admittedPersonIds: new Set() })
    const s1 = appendCheckInEntry(s, r.entry)
    const s2 = appendCheckInEntry(s1, r.entry)
    expect(s2.entries).toHaveLength(1)
    expect(s2).toBe(s1) // same ref
  })
})

// ---------------------------------------------------------------------------
// flushOfflineQueue
// ---------------------------------------------------------------------------

describe("flushOfflineQueue", () => {
  it("flushes offline entries with server timestamp", () => {
    const s = makeSession()
    const offlineEntry = processCheckIn({
      session: s,
      attempt: { entry_id: "off-1", person_id: "p-5", method: "qr", operator_id: "op-1", client_timestamp: "T-client", is_offline: true },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
    }).entry

    const result = flushOfflineQueue(s, [offlineEntry], "2025-08-01T20:00:00Z")
    expect(result.flushed_count).toBe(1)
    expect(result.session.entries[0].server_timestamp).toBe("2025-08-01T20:00:00Z")
    expect(result.duplicate_entry_ids).toHaveLength(0)
  })

  it("skips already-present entries (idempotent)", () => {
    const s = makeSession()
    const offlineEntry = processCheckIn({
      session: s,
      attempt: { entry_id: "off-1", person_id: "p-5", method: "qr", operator_id: "op-1", client_timestamp: "T", is_offline: true },
      eligibility: ELIGIBLE,
      admittedPersonIds: new Set(),
    }).entry
    const s1 = appendCheckInEntry(s, offlineEntry)
    const result = flushOfflineQueue(s1, [offlineEntry], "T-server")
    expect(result.flushed_count).toBe(0)
    expect(result.duplicate_entry_ids).toEqual(["off-1"])
  })
})

// ---------------------------------------------------------------------------
// manualCheckIn
// ---------------------------------------------------------------------------

describe("manualCheckIn", () => {
  it("performs manual override and records reason in scan_ref", () => {
    const s = makeSession()
    const { session, entry } = manualCheckIn({
      session: s,
      entry_id: "manual-1",
      person_id: "p-9",
      operator_id: "op-1",
      reason: "Wristband scanner broken",
      now: "2025-08-01T19:00:00Z",
    })
    expect(entry.outcome).toBe("admitted")
    expect(entry.method).toBe("manual")
    expect(entry.scan_ref).toContain("manual_override:Wristband scanner broken")
    expect(session.entries).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// summarizeCheckInSession
// ---------------------------------------------------------------------------

describe("summarizeCheckInSession", () => {
  it("returns zero counts for empty session", () => {
    const s = makeSession()
    const sum = summarizeCheckInSession(s)
    expect(sum.total_entries).toBe(0)
    expect(sum.admitted_count).toBe(0)
    expect(sum.is_open).toBe(true)
  })

  it("counts all outcome types correctly", () => {
    const s = makeSession()

    const admit = processCheckIn({ session: s, attempt: { entry_id: "e1", person_id: "p1", method: "qr", operator_id: "o", client_timestamp: "T" }, eligibility: ELIGIBLE, admittedPersonIds: new Set() }).entry
    const deny = processCheckIn({ session: s, attempt: { entry_id: "e2", person_id: "p2", method: "qr", operator_id: "o", client_timestamp: "T" }, eligibility: INELIGIBLE, admittedPersonIds: new Set() }).entry
    const dup = processCheckIn({ session: s, attempt: { entry_id: "e3", person_id: "p1", method: "qr", operator_id: "o", client_timestamp: "T" }, eligibility: ELIGIBLE, admittedPersonIds: new Set(["p1"]) }).entry
    const rev = processCheckIn({ session: s, attempt: { entry_id: "e4", person_id: "p3", method: "nfc", operator_id: "o", client_timestamp: "T" }, eligibility: ELIGIBLE, admittedPersonIds: new Set(), isRevoked: true }).entry
    const offline = processCheckIn({ session: s, attempt: { entry_id: "e5", person_id: "p4", method: "qr", operator_id: "o", client_timestamp: "T", is_offline: true }, eligibility: ELIGIBLE, admittedPersonIds: new Set() }).entry

    let updated = appendCheckInEntry(s, admit)
    updated = appendCheckInEntry(updated, deny)
    updated = appendCheckInEntry(updated, dup)
    updated = appendCheckInEntry(updated, rev)
    updated = appendCheckInEntry(updated, offline)

    const sum = summarizeCheckInSession(updated)
    expect(sum.admitted_count).toBe(1)
    expect(sum.denied_count).toBe(1)
    expect(sum.duplicate_count).toBe(1)
    expect(sum.revoked_count).toBe(1)
    expect(sum.offline_queued_count).toBe(1)
    expect(sum.total_entries).toBe(5)
  })

  it("counts manual entries", () => {
    const s = makeSession()
    const { session } = manualCheckIn({ session: s, entry_id: "m1", person_id: "p-m", operator_id: "op", reason: "test", now: "T" })
    const sum = summarizeCheckInSession(session)
    expect(sum.manual_count).toBe(1)
  })

  it("is_open false after closing", () => {
    const s = closeCheckInSession(makeSession(), "2025-08-01T23:00:00Z")
    const sum = summarizeCheckInSession(s)
    expect(sum.is_open).toBe(false)
  })
})
