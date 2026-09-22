/**
 * TIX-508 — Credential generation (signed/rotatable).
 * TIX-509 — Scanner/device management.
 * TIX-510 — Offline scanning.
 * TIX-511 — Admissions dashboard.
 * TIX-512 — Provider adapter/webhook boundary.
 * TIX-513 — Ticket settlement handoff.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ===========================================================================
// TIX-508 — Credential generation
// ===========================================================================

export type CredentialFormat = "qr_signed" | "barcode_signed" | "nfc_token"

export interface TicketCredential {
  credential_id: string
  ticket_id: string
  event_id: string
  format: CredentialFormat
  /** Signed payload (opaque to this module). */
  payload: string
  key_version: number
  is_revoked: boolean
  revoked_at: string | null
  expires_at: string | null
  /** No PII in the payload — sensitive data is NOT embedded. */
  contains_pii: false
}

export function createTicketCredential(params: {
  credential_id: string
  ticket_id: string
  event_id: string
  format: CredentialFormat
  payload: string
  key_version: number
  expires_at: string | null
}): TicketCredential {
  return { ...params, is_revoked: false, revoked_at: null, contains_pii: false }
}

export function revokeCredential(cred: TicketCredential, now: string): TicketCredential {
  return { ...cred, is_revoked: true, revoked_at: now }
}

export function isCredentialValid(cred: TicketCredential, nowIso: string): boolean {
  if (cred.is_revoked) return false
  if (cred.expires_at && cred.expires_at < nowIso) return false
  return true
}

/**
 * On key rotation, verify a credential is still valid using the old key version
 * (backward validity). Returns whether the old key version is within the
 * grace period (maxOldKeyVersionAge).
 */
export function isKeyVersionInGracePeriod(
  credKeyVersion: number,
  currentKeyVersion: number,
  maxOldVersionSupported: number,
): boolean {
  return credKeyVersion >= currentKeyVersion - maxOldVersionSupported
}

// ===========================================================================
// TIX-509 — Scanner/device management
// ===========================================================================

export type DeviceStatus = "active" | "revoked" | "lost"

export interface ScannerDevice {
  device_id: string
  event_id: string
  operator_id: string
  name: string
  gate: string | null
  status: DeviceStatus
  last_sync_at: string | null
  firmware_version: string | null
  permissions: ("scan" | "override" | "list")[]
}

export function revokeDevice(device: ScannerDevice, now: string): ScannerDevice {
  return { ...device, status: "revoked" }
}

export function markDeviceLost(device: ScannerDevice): ScannerDevice {
  return { ...device, status: "lost" }
}

export function isDeviceAuthorized(device: ScannerDevice, requiredPermission: ScannerDevice["permissions"][number]): boolean {
  return device.status === "active" && device.permissions.includes(requiredPermission)
}

// ===========================================================================
// TIX-510 — Offline scanning
// ===========================================================================

export type OfflineScanStatus =
  | "pending"
  | "reconciled_admitted"
  | "reconciled_denied"
  | "reconciled_duplicate"
  | "conflict"

export interface OfflineScan {
  scan_id: string
  device_id: string
  credential_id: string
  scanned_at_local: string   // client timestamp (may drift)
  reconciled_at: string | null
  status: OfflineScanStatus
  conflict_reason: string | null
}

export function reconcileOfflineScan(
  scan: OfflineScan,
  isAdmitted: boolean,
  isDuplicate: boolean,
  conflict_reason: string | null,
  serverNow: string,
): OfflineScan {
  let status: OfflineScanStatus
  if (conflict_reason) {
    status = "conflict"
  } else if (isDuplicate) {
    status = "reconciled_duplicate"
  } else if (isAdmitted) {
    status = "reconciled_admitted"
  } else {
    status = "reconciled_denied"
  }
  return { ...scan, status, conflict_reason, reconciled_at: serverNow }
}

/**
 * Flush offline scans idempotently (skip already-reconciled).
 */
export function flushOfflineScans(
  pending: readonly OfflineScan[],
  reconcileOne: (scan: OfflineScan) => OfflineScan,
): { flushed: OfflineScan[]; skipped_ids: string[] } {
  const flushed: OfflineScan[] = []
  const skipped_ids: string[] = []

  for (const scan of pending) {
    if (scan.status !== "pending") {
      skipped_ids.push(scan.scan_id)
      continue
    }
    flushed.push(reconcileOne(scan))
  }

  return { flushed, skipped_ids }
}

// ===========================================================================
// TIX-511 — Admissions dashboard
// ===========================================================================

export interface AdmissionsDashboard {
  event_id: string
  total_capacity: number
  checked_in: number
  denied: number
  duplicates: number
  offline_pending: number
  anomaly_flags: AdmissionsAnomaly[]
  data_fresh: boolean
  stale_devices: string[]    // device_ids with stale last_sync
  last_updated_at: string
}

export type AnomalyType = "high_denial_rate" | "high_duplicate_rate" | "stale_device" | "capacity_near_limit"

export interface AdmissionsAnomaly {
  anomaly_type: AnomalyType
  description: string
  severity: "warning" | "error" | "critical"
}

export function computeAdmissionsAnomalies(
  dashboard: Omit<AdmissionsDashboard, "anomaly_flags" | "data_fresh" | "stale_devices" | "last_updated_at">,
  staleDeviceIds: string[],
): AdmissionsAnomaly[] {
  const anomalies: AdmissionsAnomaly[] = []
  const total = dashboard.checked_in + dashboard.denied + dashboard.duplicates
  if (total > 0) {
    const denialPct = (dashboard.denied / total) * 100
    if (denialPct >= 15) {
      anomalies.push({ anomaly_type: "high_denial_rate", description: `Denial rate: ${denialPct.toFixed(1)}%`, severity: "error" })
    } else if (denialPct >= 5) {
      anomalies.push({ anomaly_type: "high_denial_rate", description: `Denial rate: ${denialPct.toFixed(1)}%`, severity: "warning" })
    }
    const dupPct = (dashboard.duplicates / total) * 100
    if (dupPct >= 5) {
      anomalies.push({ anomaly_type: "high_duplicate_rate", description: `Duplicate rate: ${dupPct.toFixed(1)}%`, severity: "warning" })
    }
  }
  if (dashboard.total_capacity > 0) {
    const fillPct = (dashboard.checked_in / dashboard.total_capacity) * 100
    if (fillPct >= 95) {
      anomalies.push({ anomaly_type: "capacity_near_limit", description: `${fillPct.toFixed(1)}% capacity used`, severity: "critical" })
    }
  }
  if (staleDeviceIds.length > 0) {
    anomalies.push({ anomaly_type: "stale_device", description: `${staleDeviceIds.length} device(s) not synced recently`, severity: "warning" })
  }
  return anomalies
}

// ===========================================================================
// TIX-512 — Provider adapter/webhook boundary
// ===========================================================================

export type WebhookProcessingStatus =
  | "accepted"
  | "rejected_signature"
  | "duplicate_ignored"
  | "quarantined"
  | "processed"

export interface WebhookEvent {
  webhook_id: string
  provider: string
  event_type: string
  received_at: string
  raw_payload: string     // immutable original
  signature_valid: boolean
  /** Idempotency key: same event never processed twice. */
  idempotency_key: string
  status: WebhookProcessingStatus
  processing_error: string | null
  /** Provider-side event_id (for matching external identities). */
  external_event_id: string | null
}

export function processWebhookEvent(
  event: WebhookEvent,
  alreadyProcessedKeys: Set<string>,
): { status: WebhookProcessingStatus; event: WebhookEvent } {
  if (!event.signature_valid) {
    return { status: "rejected_signature", event: { ...event, status: "rejected_signature" } }
  }
  if (alreadyProcessedKeys.has(event.idempotency_key)) {
    return { status: "duplicate_ignored", event: { ...event, status: "duplicate_ignored" } }
  }
  return { status: "accepted", event: { ...event, status: "accepted" } }
}

export function quarantineWebhookEvent(event: WebhookEvent, error: string): WebhookEvent {
  return { ...event, status: "quarantined", processing_error: error }
}

// ===========================================================================
// TIX-513 — Ticket settlement handoff
// ===========================================================================

export interface TicketSettlementHandoff {
  handoff_id: string
  event_id: string
  gross_minor_units: number
  fees_minor_units: number
  tax_minor_units: number
  refunds_minor_units: number
  chargebacks_minor_units: number
  comps_count: number
  comps_value_minor_units: number
  allocation_held_count: number
  attendance_count: number
  /** Provider statement amount in minor units. */
  provider_statement_minor_units: number | null
  /** Difference between internal net and provider statement. */
  variance_minor_units: number | null
  finance_handoff_ref: string | null
  created_by: string
  created_at: string
}

export function computeSettlementNet(handoff: TicketSettlementHandoff): number {
  return (
    handoff.gross_minor_units -
    handoff.fees_minor_units -
    handoff.tax_minor_units -
    handoff.refunds_minor_units -
    handoff.chargebacks_minor_units
  )
}

export function computeSettlementVariance(handoff: TicketSettlementHandoff): number | null {
  if (handoff.provider_statement_minor_units === null) return null
  return computeSettlementNet(handoff) - handoff.provider_statement_minor_units
}
