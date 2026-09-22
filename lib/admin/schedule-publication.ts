/**
 * WORK-412 — Schedule publication (pure).
 *
 * Produces a typed publication payload for one schedule release:
 *   - Exact version snapshot with all shifts in local time + timezone
 *   - Diff against the previous publication (new/updated/removed shifts)
 *   - Per-recipient projection (each person sees only their own shifts)
 *   - Acknowledgement token and deadline for each recipient
 *   - Publication status lifecycle: draft → publishing → published | failed
 *   - Retry/failure state visible at item level
 *
 * This module is pure — it computes the outgoing payload and recipient
 * projections. The actual delivery (email/push/in-app) is handled by the
 * publication service (PUB-101/PUB-204 pattern).
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Input: Schedule snapshot
// ---------------------------------------------------------------------------

export interface PublishedShift {
  shift_id: string
  role_label: string
  department: string
  /** ISO local-wall datetime. */
  start_local: string
  end_local: string
  /** IANA timezone. */
  timezone: string
  location_label?: string | null
  notes?: string | null
  /** Person assigned to this shift (null = open/unassigned). */
  person_id?: string | null
  person_name?: string | null
  day_type: "show" | "travel" | "rehearsal" | "warehouse" | "other"
}

export interface ScheduleSnapshot {
  tour_id: string
  event_id?: string | null
  /** Monotonically increasing. */
  version: number
  /** ISO datetime when this snapshot was created. */
  snapshot_at: string
  shifts: PublishedShift[]
  /** Actor who triggered the publish. */
  published_by: string
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export type ShiftDiffAction = "added" | "updated" | "removed" | "unchanged"

export interface ShiftDiff {
  shift_id: string
  action: ShiftDiffAction
  /** Present for added/updated. */
  current?: PublishedShift | null
  /** Present for updated/removed. */
  previous?: PublishedShift | null
  /** Human-readable summary of what changed (for updated shifts). */
  change_summary?: string | null
}

export function diffScheduleSnapshots(
  previous: ScheduleSnapshot | null,
  current: ScheduleSnapshot,
): ShiftDiff[] {
  const diffs: ShiftDiff[] = []

  if (!previous) {
    // Everything is new
    return current.shifts.map((s) => ({
      shift_id: s.shift_id,
      action: "added",
      current: s,
    }))
  }

  const prevMap = new Map(previous.shifts.map((s) => [s.shift_id, s]))
  const currMap = new Map(current.shifts.map((s) => [s.shift_id, s]))

  // Check current shifts
  for (const curr of current.shifts) {
    const prev = prevMap.get(curr.shift_id)
    if (!prev) {
      diffs.push({ shift_id: curr.shift_id, action: "added", current: curr })
    } else {
      // Simple change detection: compare start/end/role/location
      const changed =
        prev.start_local !== curr.start_local ||
        prev.end_local !== curr.end_local ||
        prev.role_label !== curr.role_label ||
        prev.person_id !== curr.person_id ||
        prev.location_label !== curr.location_label

      if (changed) {
        const changes: string[] = []
        if (prev.start_local !== curr.start_local) changes.push(`time: ${prev.start_local} → ${curr.start_local}`)
        if (prev.end_local !== curr.end_local) changes.push(`end: ${prev.end_local} → ${curr.end_local}`)
        if (prev.role_label !== curr.role_label) changes.push(`role: ${prev.role_label} → ${curr.role_label}`)
        if (prev.person_id !== curr.person_id) changes.push(`person changed`)
        if (prev.location_label !== curr.location_label) changes.push(`location: ${prev.location_label ?? "none"} → ${curr.location_label ?? "none"}`)

        diffs.push({
          shift_id: curr.shift_id,
          action: "updated",
          current: curr,
          previous: prev,
          change_summary: changes.join("; "),
        })
      } else {
        diffs.push({ shift_id: curr.shift_id, action: "unchanged", current: curr, previous: prev })
      }
    }
  }

  // Shifts in previous but not in current → removed
  for (const prev of previous.shifts) {
    if (!currMap.has(prev.shift_id)) {
      diffs.push({ shift_id: prev.shift_id, action: "removed", previous: prev })
    }
  }

  return diffs
}

// ---------------------------------------------------------------------------
// Recipient projection
// ---------------------------------------------------------------------------

export interface ScheduleRecipient {
  person_id: string
  person_name: string
  /** ISO datetime deadline for acknowledgement. */
  ack_deadline?: string | null
}

export interface RecipientScheduleView {
  person_id: string
  person_name: string
  /** Only shifts assigned to this person. */
  my_shifts: PublishedShift[]
  /** Diffs that affect this person's shifts. */
  my_diffs: ShiftDiff[]
  /** Number of changes requiring acknowledgement. */
  changes_requiring_ack: number
  /** ISO deadline for acknowledgement. */
  ack_deadline: string | null
  /** Stable token for in-app/offline acknowledgement. */
  ack_token: string
}

export function projectScheduleForRecipient(args: {
  recipient: ScheduleRecipient
  snapshot: ScheduleSnapshot
  diffs: ShiftDiff[]
  /** External token generator (default: deterministic from person_id + version). */
  generateToken?: (personId: string, version: number) => string
}): RecipientScheduleView {
  const { recipient, snapshot, diffs } = args
  const generateToken = args.generateToken ?? defaultToken

  const myShifts = snapshot.shifts.filter((s) => s.person_id === recipient.person_id)
  const myShiftIds = new Set(myShifts.map((s) => s.shift_id))
  const myDiffs = diffs.filter(
    (d) =>
      myShiftIds.has(d.shift_id) ||
      (d.action === "removed" && d.previous?.person_id === recipient.person_id),
  )

  const changesRequiringAck = myDiffs.filter(
    (d) => d.action === "added" || d.action === "updated" || d.action === "removed",
  ).length

  return {
    person_id: recipient.person_id,
    person_name: recipient.person_name,
    my_shifts: myShifts,
    my_diffs: myDiffs,
    changes_requiring_ack: changesRequiringAck,
    ack_deadline: recipient.ack_deadline ?? null,
    ack_token: generateToken(recipient.person_id, snapshot.version),
  }
}

function defaultToken(personId: string, version: number): string {
  // Deterministic, non-secret token for acknowledgement tracking
  return `ack:${personId}:v${version}`
}

// ---------------------------------------------------------------------------
// Publication lifecycle
// ---------------------------------------------------------------------------

export type SchedulePublicationStatus = "draft" | "publishing" | "published" | "failed" | "retrying"

export interface SchedulePublicationRecord {
  publication_id: string
  tour_id: string
  snapshot_version: number
  status: SchedulePublicationStatus
  recipient_count: number
  /** How many delivery attempts have been made. */
  attempt_count: number
  /** Maximum delivery attempts before giving up. */
  max_attempts: number
  published_at: string | null
  last_attempt_at: string | null
  failure_reason: string | null
  created_by: string
  created_at: string
}

export interface PublicationDeliveryItem {
  person_id: string
  status: "pending" | "delivered" | "failed" | "acknowledged"
  delivered_at: string | null
  acknowledged_at: string | null
  ack_token: string
  failure_reason: string | null
  attempt_count: number
}

export interface SchedulePublicationResult {
  publication: SchedulePublicationRecord
  deliveries: PublicationDeliveryItem[]
  /** True when all recipients are delivered or acknowledged. */
  all_delivered: boolean
  /** True when any delivery has failed and max_attempts not yet reached. */
  has_retriable_failures: boolean
}

/** Build the initial publication record (status=publishing). */
export function buildSchedulePublication(args: {
  publication_id: string
  tour_id: string
  snapshot: ScheduleSnapshot
  recipients: ScheduleRecipient[]
  created_by: string
  created_at: string
  max_attempts?: number
}): SchedulePublicationResult {
  const {
    publication_id, tour_id, snapshot, recipients, created_by, created_at, max_attempts = 3,
  } = args

  const deliveries: PublicationDeliveryItem[] = recipients.map((r) => ({
    person_id: r.person_id,
    status: "pending",
    delivered_at: null,
    acknowledged_at: null,
    ack_token: defaultToken(r.person_id, snapshot.version),
    failure_reason: null,
    attempt_count: 0,
  }))

  const publication: SchedulePublicationRecord = {
    publication_id,
    tour_id,
    snapshot_version: snapshot.version,
    status: "publishing",
    recipient_count: recipients.length,
    attempt_count: 1,
    max_attempts,
    published_at: null,
    last_attempt_at: created_at,
    failure_reason: null,
    created_by,
    created_at,
  }

  return {
    publication,
    deliveries,
    all_delivered: false,
    has_retriable_failures: false,
  }
}

/** Apply a delivery outcome (delivered/failed) to the publication result. */
export function applyDeliveryOutcome(
  result: SchedulePublicationResult,
  personId: string,
  outcome: "delivered" | "failed",
  at: string,
  failureReason?: string | null,
): SchedulePublicationResult {
  const updatedDeliveries = result.deliveries.map((d) => {
    if (d.person_id !== personId) return d
    return {
      ...d,
      status: outcome,
      delivered_at: outcome === "delivered" ? at : d.delivered_at,
      failure_reason: outcome === "failed" ? (failureReason ?? "Unknown error") : null,
      attempt_count: d.attempt_count + 1,
    }
  })

  const allDelivered = updatedDeliveries.every(
    (d) => d.status === "delivered" || d.status === "acknowledged",
  )
  const hasRetriable = updatedDeliveries.some(
    (d) => d.status === "failed" && d.attempt_count < result.publication.max_attempts,
  )

  const pubStatus: SchedulePublicationStatus = allDelivered
    ? "published"
    : hasRetriable
    ? "retrying"
    : updatedDeliveries.every((d) => d.status === "failed")
    ? "failed"
    : "publishing"

  return {
    publication: {
      ...result.publication,
      status: pubStatus,
      published_at: allDelivered ? at : null,
      last_attempt_at: at,
    },
    deliveries: updatedDeliveries,
    all_delivered: allDelivered,
    has_retriable_failures: hasRetriable,
  }
}

/** Record an acknowledgement from a recipient. */
export function applyAcknowledgement(
  result: SchedulePublicationResult,
  personId: string,
  ackToken: string,
  at: string,
): SchedulePublicationResult | { error: string } {
  const delivery = result.deliveries.find((d) => d.person_id === personId)
  if (!delivery) return { error: `Person '${personId}' is not a recipient of this publication.` }
  if (delivery.ack_token !== ackToken) return { error: "Invalid acknowledgement token." }
  if (delivery.status === "acknowledged") return { error: "Already acknowledged." }

  const updatedDeliveries = result.deliveries.map((d) =>
    d.person_id === personId ? { ...d, status: "acknowledged" as const, acknowledged_at: at } : d,
  )

  const allDelivered = updatedDeliveries.every(
    (d) => d.status === "delivered" || d.status === "acknowledged",
  )

  return {
    ...result,
    publication: {
      ...result.publication,
      status: allDelivered ? "published" : result.publication.status,
      published_at: allDelivered && !result.publication.published_at ? at : result.publication.published_at,
    },
    deliveries: updatedDeliveries,
    all_delivered: allDelivered,
  }
}
