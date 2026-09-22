/**
 * WORK-405 — Skills and credentials tests.
 */

import { describe, it, expect } from "vitest"
import {
  skillLevelMeetsRequirement,
  checkRoleCredentials,
  checkBulkCredentials,
  DEFAULT_WARN_EXPIRY_DAYS,
  type CredentialRequirement,
  type WorkerCredential,
} from "@/lib/admin/workforce-credentials"

const NOW = "2026-10-01T00:00:00.000Z"
const PERSON = "p1"
const SLOT = "slot-rigger"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<CredentialRequirement> = {}): CredentialRequirement {
  return {
    requirement_id: "req-1",
    role_slot_id: SLOT,
    credential_type: "certification",
    credential_name: "ETCP Rigger",
    min_skill_level: null,
    requires_verification: false,
    warn_expiry_days: DEFAULT_WARN_EXPIRY_DAYS,
    missing_policy: "block",
    expired_policy: "block",
    notes: null,
    ...overrides,
  }
}

function makeCred(overrides: Partial<WorkerCredential> = {}): WorkerCredential {
  return {
    credential_id: "cred-1",
    person_id: PERSON,
    credential_type: "certification",
    credential_name: "ETCP Rigger",
    issuer: "ETCP",
    issued_date: "2025-01-01",
    expiry_date: null,
    skill_level: "advanced",
    verification_status: "verified",
    file_ref: "creds/etcp-rigger.pdf",
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Skill level comparison
// ---------------------------------------------------------------------------

describe("WORK-405 — skill level comparison", () => {
  it("equal level meets requirement", () => {
    expect(skillLevelMeetsRequirement("advanced", "advanced")).toBe(true)
  })

  it("higher level meets lower requirement", () => {
    expect(skillLevelMeetsRequirement("expert", "basic")).toBe(true)
    expect(skillLevelMeetsRequirement("advanced", "intermediate")).toBe(true)
  })

  it("lower level does not meet higher requirement", () => {
    expect(skillLevelMeetsRequirement("basic", "advanced")).toBe(false)
    expect(skillLevelMeetsRequirement("intermediate", "expert")).toBe(false)
  })

  it("null required level is always met", () => {
    expect(skillLevelMeetsRequirement(null, null)).toBe(true)
    expect(skillLevelMeetsRequirement("basic", null)).toBe(true)
  })

  it("null held level does not meet any required level", () => {
    expect(skillLevelMeetsRequirement(null, "basic")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Met outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: met", () => {
  it("returns met when credential matches and no expiry", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq()],
      credentials: [makeCred()],
      nowIso: NOW,
    })
    expect(result.is_eligible).toBe(true)
    expect(result.blocking_count).toBe(0)
    expect(result.items[0].outcome).toBe("met")
  })

  it("met outcome carries matched_credential reference", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq()],
      credentials: [makeCred()],
      nowIso: NOW,
    })
    expect(result.items[0].matched_credential?.credential_id).toBe("cred-1")
  })

  it("credential name match is case-insensitive", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ credential_name: "etcp rigger" })],
      credentials: [makeCred({ credential_name: "ETCP Rigger" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("met")
  })
})

// ---------------------------------------------------------------------------
// Missing outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: missing", () => {
  it("missing (block policy) sets is_blocking=true, is_eligible=false", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ missing_policy: "block" })],
      credentials: [],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("missing")
    expect(result.items[0].is_blocking).toBe(true)
    expect(result.is_eligible).toBe(false)
  })

  it("missing (warn policy) sets is_warning=true, is_eligible=true", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ missing_policy: "warn" })],
      credentials: [],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("missing")
    expect(result.items[0].is_warning).toBe(true)
    expect(result.is_eligible).toBe(true)
    expect(result.warning_count).toBe(1)
  })

  it("missing (info policy) is non-blocking and non-warning", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ missing_policy: "info" })],
      credentials: [],
      nowIso: NOW,
    })
    expect(result.items[0].is_blocking).toBe(false)
    expect(result.items[0].is_warning).toBe(false)
  })

  it("only credentials for the correct person_id are considered", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq()],
      credentials: [makeCred({ person_id: "other-person" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("missing")
  })
})

// ---------------------------------------------------------------------------
// Expired outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: expired", () => {
  it("expired credential (block policy) blocks", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ expired_policy: "block" })],
      credentials: [makeCred({ expiry_date: "2026-09-01" })], // before NOW
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("expired")
    expect(result.items[0].is_blocking).toBe(true)
    expect(result.items[0].days_until_expiry).toBeLessThan(0)
  })

  it("expired credential (warn policy) warns but does not block", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ expired_policy: "warn" })],
      credentials: [makeCred({ expiry_date: "2026-09-01" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("expired")
    expect(result.items[0].is_warning).toBe(true)
    expect(result.is_eligible).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Expiring-soon outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: expiring soon", () => {
  it("credential expiring within warn window → met_expiring + warning", () => {
    // Expires in 15 days (< 30-day default warn threshold)
    const expiryDate = new Date(Date.parse(NOW) + 15 * 86_400_000).toISOString().slice(0, 10)
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ warn_expiry_days: 30 })],
      credentials: [makeCred({ expiry_date: expiryDate })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("met_expiring")
    expect(result.items[0].is_warning).toBe(true)
    expect(result.items[0].is_blocking).toBe(false)
    expect(result.items[0].days_until_expiry).toBe(15)
    expect(result.is_eligible).toBe(true)  // still eligible, just warning
  })

  it("credential expiring just outside warn window → met (no warning)", () => {
    const expiryDate = new Date(Date.parse(NOW) + 45 * 86_400_000).toISOString().slice(0, 10)
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ warn_expiry_days: 30 })],
      credentials: [makeCred({ expiry_date: expiryDate })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("met")
    expect(result.items[0].is_warning).toBe(false)
  })

  it("DEFAULT_WARN_EXPIRY_DAYS is 30", () => {
    expect(DEFAULT_WARN_EXPIRY_DAYS).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Unverified outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: unverified", () => {
  it("requires_verification=true and unverified credential blocks (block policy)", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ requires_verification: true, missing_policy: "block" })],
      credentials: [makeCred({ verification_status: "pending" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("unverified")
    expect(result.items[0].is_blocking).toBe(true)
  })

  it("requires_verification=false ignores verification status", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ requires_verification: false })],
      credentials: [makeCred({ verification_status: "unverified" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("met")
  })
})

// ---------------------------------------------------------------------------
// Skill level outcome
// ---------------------------------------------------------------------------

describe("WORK-405 — credential check: insufficient level", () => {
  it("credential with too-low skill level → insufficient_level", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ min_skill_level: "expert", missing_policy: "block" })],
      credentials: [makeCred({ skill_level: "basic" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("insufficient_level")
    expect(result.items[0].is_blocking).toBe(true)
  })

  it("credential meeting min level → met", () => {
    const result = checkRoleCredentials({
      person_id: PERSON, role_slot_id: SLOT,
      requirements: [makeReq({ min_skill_level: "intermediate" })],
      credentials: [makeCred({ skill_level: "advanced" })],
      nowIso: NOW,
    })
    expect(result.items[0].outcome).toBe("met")
  })
})

// ---------------------------------------------------------------------------
// Multiple requirements
// ---------------------------------------------------------------------------

describe("WORK-405 — multiple requirements", () => {
  it("all met → is_eligible=true, blocking_count=0", () => {
    const reqs = [
      makeReq({ requirement_id: "r1", credential_name: "ETCP Rigger" }),
      makeReq({ requirement_id: "r2", credential_name: "First Aid", credential_type: "certification" }),
    ]
    const creds = [
      makeCred({ credential_id: "c1", credential_name: "ETCP Rigger" }),
      makeCred({ credential_id: "c2", credential_name: "First Aid" }),
    ]
    const result = checkRoleCredentials({ person_id: PERSON, role_slot_id: SLOT, requirements: reqs, credentials: creds, nowIso: NOW })
    expect(result.is_eligible).toBe(true)
    expect(result.blocking_count).toBe(0)
    expect(result.items).toHaveLength(2)
  })

  it("one missing block → is_eligible=false even if others are met", () => {
    const reqs = [
      makeReq({ requirement_id: "r1", credential_name: "ETCP Rigger" }),
      makeReq({ requirement_id: "r2", credential_name: "Missing Cert", missing_policy: "block" }),
    ]
    const result = checkRoleCredentials({ person_id: PERSON, role_slot_id: SLOT, requirements: reqs, credentials: [makeCred()], nowIso: NOW })
    expect(result.is_eligible).toBe(false)
    expect(result.blocking_count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Bulk check
// ---------------------------------------------------------------------------

describe("WORK-405 — bulk credential check", () => {
  it("summarises eligible, ineligible, warning-only correctly", () => {
    const req = makeReq()
    const bulk = checkBulkCredentials({
      entries: [
        { person_id: "p1", role_slot_id: SLOT, requirements: [req] },
        { person_id: "p2", role_slot_id: SLOT, requirements: [req] },
        { person_id: "p3", role_slot_id: SLOT, requirements: [makeReq({ missing_policy: "warn" })] },
      ],
      credentials: [
        makeCred({ credential_id: "c1", person_id: "p1" }),
        // p2 has no credential → ineligible (block)
        // p3 has no credential → warning only (warn policy)
      ],
      nowIso: NOW,
    })
    expect(bulk.eligible_count).toBe(1)    // p1 met, no warnings
    expect(bulk.ineligible_count).toBe(1)  // p2 missing block
    expect(bulk.warning_only_count).toBe(1)// p3 missing warn
    expect(bulk.results).toHaveLength(3)
  })
})
