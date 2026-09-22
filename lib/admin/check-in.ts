/**
 * LIVE-409 — Hardened check-in.
 *
 * Eligibility derives from credential/assignment records. Covers:
 *  - Eligibility derivation (credentialed / assigned / both)
 *  - Scan resolution (QR, barcode, NFC, manual)
 *  - Check-in outcomes: admitted / denied / duplicate / offline_queued / revoked
 *  - Offline queue: idempotent enqueue → flush (online sync)
 *  - Operator / device audit on every entry
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type CheckInMethod = "qr" | "barcode" | "nfc" | "manual"

export const CHECK_IN_OUTCOMES = [
  "admitted",
  "denied",
  "duplicate",
  "revoked",
  "offline_queued",
] as const
export type CheckInOutcome = (typeof CHECK_IN_OUTCOMES)[number]

export type EligibilitySource = "credential" | "assignment" | "both"

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export interface CredentialEligibility {
  source: "credential"
  credential_id: string
  credential_type: string
  /** Whether the credential is currently active and not expired. */
  is_valid: boolean
  expires_at: string | null
}

export interface AssignmentEligibility {
  source: "assignment"
  assignment_id: string
  role: string
  /** Whether the assignment is in an admitted status. */
  is_active: boolean
}

export type EligibilityRecord = CredentialEligibility | AssignmentEligibility

export interface EligibilityResult {
  eligible: boolean
  source: EligibilitySource | null
  reasons: string[]
  records: EligibilityRecord[]
}

/**
 * Derive eligibility for a person from their credential and assignment records.
 * A person is eligible if they have at least one valid credential OR one active assignment.
 */
export function deriveEligibility(
  credentials: readonly CredentialEligibility[],
  assignments: readonly AssignmentEligibility[],
): EligibilityResult {
  const records: EligibilityRecord[] = [...credentials, ...assignments]
  const reasons: string[] = []

  const validCredential = credentials.find((c) => c.is_valid)
  const activeAssignment = assignments.find((a) => a.is_active)

  const hasCred = !!validCredential
  const hasAssign = !!activeAssignment
  const eligible = hasCred || hasAssign

  if (!hasCred && credentials.length > 0) {
    reasons.push("No valid credential found (expired or inactive)")
  }
  if (!hasAssign && assignments.length > 0) {
    reasons.push("No active assignment found")
  }
  if (!eligible) {
    reasons.push("No credential or assignment on record")
  }

  let source: EligibilitySource | null = null
  if (hasCred && hasAssign) source = "both"
  else if (hasCred) source = "credential"
  else if (hasAssign) source = "assignment"

  return { eligible, source, reasons, records }
}

// ---------------------------------------------------------------------------
// Check-in session
// ---------------------------------------------------------------------------

export interface CheckInSession {
  session_id: string
  org_id: string
  event_id: string
  operator_id: string
  device_id: string | null
  opened_at: string
  closed_at: string | null
  /** Entries recorded during this session (online + offline-queued). */
  entries: CheckInEntry[]
}

// ---------------------------------------------------------------------------
// Check-in entry
// ---------------------------------------------------------------------------

export interface CheckInEntry {
  entry_id: string
  session_id: string
  person_id: string
  method: CheckInMethod
  outcome: CheckInOutcome
  /** Required when outcome = 'denied' or 'revoked'. */
  denial_reason: string | null
  /** Original scan token/code (for audit; not stored for PII). */
  scan_ref: string | null
  is_offline: boolean
  /** If offline, the client-side timestamp; server reconciles on flush. */
  client_timestamp: string
  /** Set on server-side flush. */
  server_timestamp: string | null
  operator_id: string
  device_id: string | null
}

// ---------------------------------------------------------------------------
// Create session
// ---------------------------------------------------------------------------

export function createCheckInSession(params: {
  session_id: string
  org_id: string
  event_id: string
  operator_id: string
  device_id?: string | null
  now: string
}): CheckInSession {
  return {
    session_id: params.session_id,
    org_id: params.org_id,
    event_id: params.event_id,
    operator_id: params.operator_id,
    device_id: params.device_id ?? null,
    opened_at: params.now,
    closed_at: null,
    entries: [],
  }
}

export function closeCheckInSession(session: CheckInSession, now: string): CheckInSession {
  return { ...session, closed_at: now }
}

// ---------------------------------------------------------------------------
// Admit / deny helpers
// ---------------------------------------------------------------------------

export interface CheckInAttempt {
  entry_id: string
  person_id: string
  method: CheckInMethod
  scan_ref?: string | null
  operator_id: string
  device_id?: string | null
  /** Client timestamp (ISO-8601). */
  client_timestamp: string
  /** Whether this scan is from an offline device. */
  is_offline?: boolean
}

export interface CheckInResult {
  outcome: CheckInOutcome
  entry: CheckInEntry
  denial_reason: string | null
}

/**
 * Process a single check-in attempt given pre-resolved eligibility and
 * the set of already-admitted person_ids in this session.
 */
export function processCheckIn(params: {
  session: CheckInSession
  attempt: CheckInAttempt
  eligibility: EligibilityResult
  /** IDs of persons who have already been admitted in this or any prior session. */
  admittedPersonIds: Set<string>
  /** If true, person's credential/assignment was explicitly revoked. */
  isRevoked?: boolean
}): CheckInResult {
  const { attempt, eligibility, admittedPersonIds } = params
  const is_offline = attempt.is_offline ?? false

  let outcome: CheckInOutcome
  let denial_reason: string | null = null

  if (params.isRevoked) {
    outcome = "revoked"
    denial_reason = "Access has been revoked"
  } else if (admittedPersonIds.has(attempt.person_id)) {
    outcome = "duplicate"
    denial_reason = "Already checked in"
  } else if (!eligibility.eligible) {
    outcome = "denied"
    denial_reason = eligibility.reasons.join("; ")
  } else if (is_offline) {
    outcome = "offline_queued"
  } else {
    outcome = "admitted"
  }

  const entry: CheckInEntry = {
    entry_id: attempt.entry_id,
    session_id: params.session.session_id,
    person_id: attempt.person_id,
    method: attempt.method,
    outcome,
    denial_reason,
    scan_ref: attempt.scan_ref ?? null,
    is_offline,
    client_timestamp: attempt.client_timestamp,
    server_timestamp: is_offline ? null : attempt.client_timestamp,
    operator_id: attempt.operator_id,
    device_id: attempt.device_id ?? null,
  }

  return { outcome, entry, denial_reason }
}

/**
 * Append a check-in entry to a session (immutable). Idempotent on entry_id.
 */
export function appendCheckInEntry(session: CheckInSession, entry: CheckInEntry): CheckInSession {
  if (session.entries.some((e) => e.entry_id === entry.entry_id)) return session
  return { ...session, entries: [...session.entries, entry] }
}

// ---------------------------------------------------------------------------
// Offline queue flush
// ---------------------------------------------------------------------------

export interface OfflineFlushResult {
  session: CheckInSession
  flushed_count: number
  /** Entry IDs that were already present (idempotent dedup). */
  duplicate_entry_ids: string[]
}

/**
 * Flush offline-queued entries into the session, stamping server_timestamp.
 * Idempotent: entries with the same entry_id are skipped.
 */
export function flushOfflineQueue(
  session: CheckInSession,
  offlineEntries: readonly CheckInEntry[],
  serverNow: string,
): OfflineFlushResult {
  const duplicate_entry_ids: string[] = []
  let flushed_count = 0
  let updated = session

  for (const entry of offlineEntries) {
    if (session.entries.some((e) => e.entry_id === entry.entry_id)) {
      duplicate_entry_ids.push(entry.entry_id)
      continue
    }
    const stamped: CheckInEntry = { ...entry, server_timestamp: serverNow }
    updated = { ...updated, entries: [...updated.entries, stamped] }
    flushed_count += 1
  }

  return { session: updated, flushed_count, duplicate_entry_ids }
}

// ---------------------------------------------------------------------------
// Manual override (operator admits without scan)
// ---------------------------------------------------------------------------

export function manualCheckIn(params: {
  session: CheckInSession
  entry_id: string
  person_id: string
  operator_id: string
  device_id?: string | null
  reason: string
  now: string
}): { session: CheckInSession; entry: CheckInEntry } {
  const entry: CheckInEntry = {
    entry_id: params.entry_id,
    session_id: params.session.session_id,
    person_id: params.person_id,
    method: "manual",
    outcome: "admitted",
    denial_reason: null,
    scan_ref: null,
    is_offline: false,
    client_timestamp: params.now,
    server_timestamp: params.now,
    operator_id: params.operator_id,
    device_id: params.device_id ?? null,
  }
  // Reason is captured in a note field on the entry for audit; we include it
  // in the entry's scan_ref as a labelled string so callers can audit it.
  const entryWithReason: CheckInEntry = { ...entry, scan_ref: `manual_override:${params.reason}` }
  const session = appendCheckInEntry(params.session, entryWithReason)
  return { session, entry: entryWithReason }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface CheckInSessionSummary {
  session_id: string
  total_entries: number
  admitted_count: number
  denied_count: number
  duplicate_count: number
  revoked_count: number
  offline_queued_count: number
  manual_count: number
  is_open: boolean
}

export function summarizeCheckInSession(session: CheckInSession): CheckInSessionSummary {
  let admitted_count = 0
  let denied_count = 0
  let duplicate_count = 0
  let revoked_count = 0
  let offline_queued_count = 0
  let manual_count = 0

  for (const e of session.entries) {
    if (e.outcome === "admitted") admitted_count += 1
    if (e.outcome === "denied") denied_count += 1
    if (e.outcome === "duplicate") duplicate_count += 1
    if (e.outcome === "revoked") revoked_count += 1
    if (e.outcome === "offline_queued") offline_queued_count += 1
    if (e.method === "manual") manual_count += 1
  }

  return {
    session_id: session.session_id,
    total_entries: session.entries.length,
    admitted_count,
    denied_count,
    duplicate_count,
    revoked_count,
    offline_queued_count,
    manual_count,
    is_open: session.closed_at === null,
  }
}
