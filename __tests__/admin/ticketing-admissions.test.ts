import { describe, it, expect } from "vitest"
import {
  createTicketCredential,
  revokeCredential,
  isCredentialValid,
  isKeyVersionInGracePeriod,
  revokeDevice,
  isDeviceAuthorized,
  reconcileOfflineScan,
  flushOfflineScans,
  computeAdmissionsAnomalies,
  processWebhookEvent,
  quarantineWebhookEvent,
  computeSettlementNet,
  computeSettlementVariance,
  type TicketCredential,
  type ScannerDevice,
  type OfflineScan,
  type WebhookEvent,
  type TicketSettlementHandoff,
} from "@/lib/admin/ticketing-admissions"

// ---------------------------------------------------------------------------
// TIX-508 — Credential generation
// ---------------------------------------------------------------------------

const BASE_CRED: TicketCredential = createTicketCredential({
  credential_id: "cred-1", ticket_id: "tix-1", event_id: "ev-1",
  format: "qr_signed", payload: "signed-payload-abc", key_version: 2,
  expires_at: "2025-12-01T00:00:00Z",
})

describe("TIX-508 — Credential generation", () => {
  it("creates a valid credential with no PII", () => {
    expect(BASE_CRED.is_revoked).toBe(false)
    expect(BASE_CRED.contains_pii).toBe(false)
  })

  it("isCredentialValid returns true for active credential", () => {
    expect(isCredentialValid(BASE_CRED, "2025-08-01T00:00:00Z")).toBe(true)
  })

  it("isCredentialValid returns false for revoked credential", () => {
    const revoked = revokeCredential(BASE_CRED, "T")
    expect(isCredentialValid(revoked, "2025-08-01T00:00:00Z")).toBe(false)
  })

  it("isCredentialValid returns false for expired credential", () => {
    expect(isCredentialValid(BASE_CRED, "2026-01-01T00:00:00Z")).toBe(false)
  })

  it("key version grace period checks", () => {
    expect(isKeyVersionInGracePeriod(2, 3, 2)).toBe(true)  // v2, current v3, grace 2 → ok
    expect(isKeyVersionInGracePeriod(1, 4, 2)).toBe(false) // v1, current v4, grace 2 → too old
    expect(isKeyVersionInGracePeriod(3, 3, 2)).toBe(true)  // same version
  })
})

// ---------------------------------------------------------------------------
// TIX-509 — Scanner/device management
// ---------------------------------------------------------------------------

const BASE_DEVICE: ScannerDevice = {
  device_id: "dev-1", event_id: "ev-1", operator_id: "op-1", name: "Gate A Scanner",
  gate: "A", status: "active", last_sync_at: "T", firmware_version: "1.0",
  permissions: ["scan", "override"],
}

describe("TIX-509 — Scanner/device management", () => {
  it("active device is authorized for scan", () => {
    expect(isDeviceAuthorized(BASE_DEVICE, "scan")).toBe(true)
  })

  it("revoked device is not authorized", () => {
    const revoked = revokeDevice(BASE_DEVICE, "T")
    expect(isDeviceAuthorized(revoked, "scan")).toBe(false)
    expect(revoked.status).toBe("revoked")
  })

  it("device without permission is not authorized", () => {
    const limited = { ...BASE_DEVICE, permissions: ["scan"] as ScannerDevice["permissions"] }
    expect(isDeviceAuthorized(limited, "override")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TIX-510 — Offline scanning
// ---------------------------------------------------------------------------

const PENDING_SCAN: OfflineScan = {
  scan_id: "scan-1", device_id: "dev-1", credential_id: "cred-1",
  scanned_at_local: "2025-08-02T20:00:00Z", reconciled_at: null,
  status: "pending", conflict_reason: null,
}

describe("TIX-510 — Offline scanning", () => {
  it("reconciles as admitted", () => {
    const r = reconcileOfflineScan(PENDING_SCAN, true, false, null, "2025-08-02T20:05:00Z")
    expect(r.status).toBe("reconciled_admitted")
    expect(r.reconciled_at).toBe("2025-08-02T20:05:00Z")
  })

  it("reconciles as duplicate", () => {
    const r = reconcileOfflineScan(PENDING_SCAN, true, true, null, "T")
    expect(r.status).toBe("reconciled_duplicate")
  })

  it("reconciles as denied", () => {
    const r = reconcileOfflineScan(PENDING_SCAN, false, false, null, "T")
    expect(r.status).toBe("reconciled_denied")
  })

  it("marks conflict with reason", () => {
    const r = reconcileOfflineScan(PENDING_SCAN, false, false, "Clock drift too large", "T")
    expect(r.status).toBe("conflict")
    expect(r.conflict_reason).toBe("Clock drift too large")
  })

  it("flushOfflineScans skips already reconciled", () => {
    const reconciled: OfflineScan = { ...PENDING_SCAN, scan_id: "scan-2", status: "reconciled_admitted" }
    const result = flushOfflineScans([PENDING_SCAN, reconciled], (s) =>
      reconcileOfflineScan(s, true, false, null, "T"),
    )
    expect(result.flushed).toHaveLength(1)
    expect(result.skipped_ids).toEqual(["scan-2"])
  })
})

// ---------------------------------------------------------------------------
// TIX-511 — Admissions dashboard
// ---------------------------------------------------------------------------

describe("TIX-511 — Admissions dashboard", () => {
  it("detects high denial rate", () => {
    const anomalies = computeAdmissionsAnomalies(
      { event_id: "ev-1", total_capacity: 1000, checked_in: 70, denied: 30, duplicates: 0, offline_pending: 0 },
      [],
    )
    expect(anomalies.some((a) => a.anomaly_type === "high_denial_rate")).toBe(true)
  })

  it("detects capacity near limit", () => {
    const anomalies = computeAdmissionsAnomalies(
      { event_id: "ev-1", total_capacity: 1000, checked_in: 960, denied: 0, duplicates: 0, offline_pending: 0 },
      [],
    )
    expect(anomalies.some((a) => a.anomaly_type === "capacity_near_limit" && a.severity === "critical")).toBe(true)
  })

  it("detects stale devices", () => {
    const anomalies = computeAdmissionsAnomalies(
      { event_id: "ev-1", total_capacity: 1000, checked_in: 100, denied: 0, duplicates: 0, offline_pending: 0 },
      ["dev-1", "dev-2"],
    )
    expect(anomalies.some((a) => a.anomaly_type === "stale_device")).toBe(true)
  })

  it("no anomalies when all healthy", () => {
    const anomalies = computeAdmissionsAnomalies(
      { event_id: "ev-1", total_capacity: 1000, checked_in: 100, denied: 1, duplicates: 0, offline_pending: 0 },
      [],
    )
    expect(anomalies).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TIX-512 — Provider adapter/webhook boundary
// ---------------------------------------------------------------------------

const BASE_WEBHOOK: WebhookEvent = {
  webhook_id: "wh-1", provider: "stripe", event_type: "ticket.sold",
  received_at: "T", raw_payload: '{"id":"evt_1"}',
  signature_valid: true, idempotency_key: "evt_1",
  status: "accepted", processing_error: null, external_event_id: "evt_1",
}

describe("TIX-512 — Provider webhook", () => {
  it("accepts valid webhook", () => {
    const r = processWebhookEvent(BASE_WEBHOOK, new Set())
    expect(r.status).toBe("accepted")
  })

  it("rejects invalid signature", () => {
    const r = processWebhookEvent({ ...BASE_WEBHOOK, signature_valid: false }, new Set())
    expect(r.status).toBe("rejected_signature")
  })

  it("ignores duplicate idempotency key", () => {
    const r = processWebhookEvent(BASE_WEBHOOK, new Set(["evt_1"]))
    expect(r.status).toBe("duplicate_ignored")
  })

  it("quarantines with error", () => {
    const q = quarantineWebhookEvent(BASE_WEBHOOK, "Unmatched external ID")
    expect(q.status).toBe("quarantined")
    expect(q.processing_error).toBe("Unmatched external ID")
  })
})

// ---------------------------------------------------------------------------
// TIX-513 — Settlement handoff
// ---------------------------------------------------------------------------

const BASE_HANDOFF: TicketSettlementHandoff = {
  handoff_id: "h-1", event_id: "ev-1",
  gross_minor_units: 1_000_000, fees_minor_units: 30_000, tax_minor_units: 80_000,
  refunds_minor_units: 20_000, chargebacks_minor_units: 5_000,
  comps_count: 50, comps_value_minor_units: 25_000,
  allocation_held_count: 100, attendance_count: 850,
  provider_statement_minor_units: 860_000, variance_minor_units: null,
  finance_handoff_ref: null, created_by: "u", created_at: "T",
}

describe("TIX-513 — Settlement handoff", () => {
  it("computes net correctly", () => {
    const net = computeSettlementNet(BASE_HANDOFF)
    // 1,000,000 - 30,000 - 80,000 - 20,000 - 5,000 = 865,000
    expect(net).toBe(865_000)
  })

  it("computes variance against provider statement", () => {
    const variance = computeSettlementVariance(BASE_HANDOFF)
    // 865,000 - 860,000 = 5,000
    expect(variance).toBe(5_000)
  })

  it("returns null variance when no provider statement", () => {
    const h = { ...BASE_HANDOFF, provider_statement_minor_units: null }
    expect(computeSettlementVariance(h)).toBeNull()
  })
})
