/**
 * EQUIP-304 — Equipment scan/custody workflow.
 *
 * Records every physical hand-off, load, unload, check, and transfer of
 * equipment items and cases.  Designed to work in three modes:
 *
 *  1. **Online / immediate** — event written directly to store.
 *  2. **Offline queue**      — events are buffered locally and flushed later.
 *                              The queue is idempotent: replaying the same
 *                              client_event_id is a no-op (deduplication key).
 *  3. **Manual fallback**    — actor enters scan_method = "manual" when a
 *                              barcode reader is unavailable.
 *
 * Core models:
 *  - `CustodyEvent`        — the canonical record of one custody change.
 *  - `ScanInput`           — raw scan payload from a device/UI.
 *  - `OfflineQueueEntry`   — wrapper for buffering events for later flush.
 *  - `CustodyChain`        — ordered sequence of events for one item/case,
 *                            used to derive current custody holder and check
 *                            for broken/disputed chain links.
 *
 * All helpers are pure (no I/O).
 */

// ============================================================================
// Scan input
// ============================================================================

/** How the item was identified (determines trust level and fallback policy). */
export const SCAN_METHODS = [
  "qr_code",     // QR code read by device camera or dedicated scanner
  "barcode",     // 1-D barcode read by scanner
  "nfc",         // NFC/RFID tap
  "manual",      // Actor typed or selected the item manually (no physical scan)
] as const
export type ScanMethod = (typeof SCAN_METHODS)[number]

/** Raw scan payload from a device. The resolver maps payload → catalog_item_id / case_id. */
export interface ScanInput {
  /** Decoded payload from QR/barcode/NFC, or the manually supplied asset_tag/serial. */
  raw_payload: string
  scan_method: ScanMethod
  /** Timestamp the scan was physically taken (may differ from server receipt if offline). */
  scanned_at_utc: string
  /** Device identifier (phone IMEI, scanner serial, "web-ui", etc.). */
  device_id: string | null
  /** GPS or venue-known coordinates at time of scan. */
  location_lat: number | null
  location_lng: number | null
  /** Human-readable location label (e.g. "Load Dock B", "Stage Right"). */
  location_label: string | null
}

/** Resolve a raw scan payload to a catalog reference (pure lookup helper). */
export interface ScanResolutionResult {
  resolved: boolean
  catalog_item_id: string | null
  case_id: string | null
  /** Matched on: "asset_tag" | "serial_number" | "barcode" | "case_barcode" | "unresolved" */
  matched_on: "asset_tag" | "serial_number" | "barcode" | "case_barcode" | "unresolved"
  /** Confidence: exact match vs fuzzy/prefix. */
  match_quality: "exact" | "fuzzy" | "none"
}

/** Lookup table entry — caller builds from catalog; helper is pure. */
export interface ScanLookupEntry {
  catalog_item_id: string | null
  case_id: string | null
  asset_tag: string | null
  serial_number: string | null
  barcode: string | null
}

/**
 * Resolve a raw scan payload against a pre-built lookup table (pure).
 * Tries exact match first; falls back to case-insensitive prefix for manual entries.
 */
export function resolveScanPayload(
  payload: string,
  scanMethod: ScanMethod,
  lookupTable: readonly ScanLookupEntry[],
): ScanResolutionResult {
  const norm = payload.trim().toLowerCase()

  // Exact match pass
  for (const entry of lookupTable) {
    const fields = [entry.asset_tag, entry.serial_number, entry.barcode]
    if (fields.some((f) => f && f.toLowerCase() === norm)) {
      return {
        resolved: true,
        catalog_item_id: entry.catalog_item_id,
        case_id: entry.case_id,
        matched_on: entry.case_id ? "case_barcode" : entry.barcode?.toLowerCase() === norm ? "barcode" : entry.serial_number?.toLowerCase() === norm ? "serial_number" : "asset_tag",
        match_quality: "exact",
      }
    }
  }

  // Fuzzy pass — only for manual entries (reduce false positives on scanner input)
  if (scanMethod === "manual") {
    for (const entry of lookupTable) {
      const fields = [entry.asset_tag, entry.serial_number, entry.barcode]
      if (fields.some((f) => f && f.toLowerCase().startsWith(norm) && norm.length >= 3)) {
        return {
          resolved: true,
          catalog_item_id: entry.catalog_item_id,
          case_id: entry.case_id,
          matched_on: "asset_tag",
          match_quality: "fuzzy",
        }
      }
    }
  }

  return {
    resolved: false,
    catalog_item_id: null,
    case_id: null,
    matched_on: "unresolved",
    match_quality: "none",
  }
}

// ============================================================================
// Custody event types
// ============================================================================

/**
 * The type of custody change being recorded.
 *
 *  - `load`       – Item loaded onto a vehicle / into a case / into a truck.
 *  - `unload`     – Item unloaded / removed from vehicle or transport.
 *  - `transfer`   – Custody handed from one person/department to another.
 *  - `check`      – Item verified present and in stated condition (no hand-off).
 *  - `return`     – Item returned to home location (end of tour / vendor return).
 *  - `report`     – Ad-hoc note about item condition without a physical move.
 */
export const CUSTODY_EVENT_TYPES = [
  "load",
  "unload",
  "transfer",
  "check",
  "return",
  "report",
] as const
export type CustodyEventType = (typeof CUSTODY_EVENT_TYPES)[number]

/** Physical condition assessment recorded at time of scan. */
export const CONDITION_RATINGS = ["good", "minor_damage", "major_damage", "missing"] as const
export type ConditionRating = (typeof CONDITION_RATINGS)[number]

// ============================================================================
// Custody event — the canonical record
// ============================================================================

export interface CustodyEvent {
  /** Stable server-assigned UUID. */
  id: string
  /**
   * Client-generated idempotency key.
   * The persistence layer uses this to deduplicate replayed offline events.
   * Must be stable across retries (e.g. UUID v4 generated at scan time).
   */
  client_event_id: string
  org_id: string
  tour_id: string

  // What was scanned
  catalog_item_id: string | null
  case_id: string | null
  /** Human label at time of event (denormalized for offline display). */
  item_label: string

  // Event details
  event_type: CustodyEventType
  scan_method: ScanMethod
  condition: ConditionRating
  condition_notes: string | null

  // Actor
  actor_user_id: string
  /** Display name at time of event (denormalized). */
  actor_name: string
  /** New custody holder after this event (null for check/report). */
  new_custody_holder_id: string | null
  new_custody_holder_name: string | null

  // Location / device
  device_id: string | null
  location_label: string | null
  location_lat: number | null
  location_lng: number | null

  // Route context (optional — present when event happens mid-leg)
  movement_id: string | null
  leg_id: string | null
  stop_id: string | null

  // Audit
  /** UTC ISO when the physical scan/action occurred (device clock). */
  occurred_at_utc: string
  /** UTC ISO when the event was received/written by the server. */
  received_at_utc: string
  /** True when this event was buffered offline and flushed later. */
  was_offline: boolean
}

// ============================================================================
// Offline queue
// ============================================================================

export type OfflineQueueEntryStatus =
  | "pending"    // Not yet flushed to server
  | "flushed"    // Successfully written to server
  | "rejected"   // Server rejected (e.g. duplicate, validation error)
  | "conflict"   // Server detected a custody conflict; human review required

export interface OfflineQueueEntry {
  /** Matches CustodyEvent.client_event_id — the deduplication key. */
  client_event_id: string
  /** ISO timestamp when the event was queued locally. */
  queued_at_utc: string
  /** The raw payload to be flushed. */
  event_payload: Omit<CustodyEvent, "id" | "received_at_utc">
  status: OfflineQueueEntryStatus
  /** Number of flush attempts. */
  attempt_count: number
  /** ISO timestamp of last flush attempt. */
  last_attempt_utc: string | null
  /** Server error message if rejected. */
  rejection_reason: string | null
}

/**
 * Add a new event to the offline queue.
 * Returns a new array — original is unchanged (immutable).
 */
export function enqueueOfflineEvent(
  queue: readonly OfflineQueueEntry[],
  entry: Omit<OfflineQueueEntry, "status" | "attempt_count" | "last_attempt_utc" | "rejection_reason">,
): OfflineQueueEntry[] {
  // Idempotent: if client_event_id already exists, skip
  if (queue.some((e) => e.client_event_id === entry.client_event_id)) {
    return [...queue]
  }
  return [
    ...queue,
    {
      ...entry,
      status: "pending",
      attempt_count: 0,
      last_attempt_utc: null,
      rejection_reason: null,
    },
  ]
}

/**
 * Mark a queued event as flushed (server accepted it).
 * Idempotent: if already flushed, returns unchanged.
 */
export function markQueueEntryFlushed(
  queue: readonly OfflineQueueEntry[],
  clientEventId: string,
  receivedAt: string,
): OfflineQueueEntry[] {
  return queue.map((e) =>
    e.client_event_id === clientEventId
      ? { ...e, status: "flushed", last_attempt_utc: receivedAt }
      : e,
  )
}

/**
 * Mark a queued event as rejected.
 */
export function markQueueEntryRejected(
  queue: readonly OfflineQueueEntry[],
  clientEventId: string,
  reason: string,
  attemptedAt: string,
): OfflineQueueEntry[] {
  return queue.map((e) =>
    e.client_event_id === clientEventId
      ? {
          ...e,
          status: "rejected",
          rejection_reason: reason,
          attempt_count: e.attempt_count + 1,
          last_attempt_utc: attemptedAt,
        }
      : e,
  )
}

/**
 * Increment attempt count on a pending entry (called before each flush attempt).
 */
export function incrementFlushAttempt(
  queue: readonly OfflineQueueEntry[],
  clientEventId: string,
  attemptedAt: string,
): OfflineQueueEntry[] {
  return queue.map((e) =>
    e.client_event_id === clientEventId && e.status === "pending"
      ? { ...e, attempt_count: e.attempt_count + 1, last_attempt_utc: attemptedAt }
      : e,
  )
}

/** Return only the pending entries (ready to flush). */
export function getPendingQueueEntries(queue: readonly OfflineQueueEntry[]): OfflineQueueEntry[] {
  return queue.filter((e) => e.status === "pending")
}

// ============================================================================
// Custody chain
// ============================================================================

export interface CustodyChainLink {
  event_id: string
  client_event_id: string
  event_type: CustodyEventType
  occurred_at_utc: string
  actor_name: string
  new_custody_holder_name: string | null
  condition: ConditionRating
  location_label: string | null
  scan_method: ScanMethod
  was_offline: boolean
}

export interface CustodyChain {
  catalog_item_id: string | null
  case_id: string | null
  item_label: string
  links: CustodyChainLink[]
  /** Derived from the most recent link that changes custody. */
  current_holder_name: string | null
  /** Derived from the most recent event. */
  latest_condition: ConditionRating
  /** True when any event in the chain had condition "major_damage" or "missing". */
  has_critical_condition: boolean
  /** True when offline events are present (may have ordering ambiguity). */
  has_offline_events: boolean
}

/**
 * Build a custody chain from an ordered list of events (oldest → newest).
 * Events are expected to already be sorted by `occurred_at_utc` ascending.
 */
export function buildCustodyChain(
  itemId: string,
  isCase: boolean,
  itemLabel: string,
  events: readonly CustodyEvent[],
): CustodyChain {
  const relevant = events.filter((e) =>
    isCase ? e.case_id === itemId : e.catalog_item_id === itemId,
  )

  const links: CustodyChainLink[] = relevant.map((e) => ({
    event_id: e.id,
    client_event_id: e.client_event_id,
    event_type: e.event_type,
    occurred_at_utc: e.occurred_at_utc,
    actor_name: e.actor_name,
    new_custody_holder_name: e.new_custody_holder_name,
    condition: e.condition,
    location_label: e.location_label,
    scan_method: e.scan_method,
    was_offline: e.was_offline,
  }))

  const latest = relevant[relevant.length - 1] ?? null
  const lastTransfer = [...relevant].reverse().find((e) => e.new_custody_holder_name != null)

  return {
    catalog_item_id: isCase ? null : itemId,
    case_id: isCase ? itemId : null,
    item_label: itemLabel,
    links,
    current_holder_name: lastTransfer?.new_custody_holder_name ?? null,
    latest_condition: latest?.condition ?? "good",
    has_critical_condition: relevant.some(
      (e) => e.condition === "major_damage" || e.condition === "missing",
    ),
    has_offline_events: relevant.some((e) => e.was_offline),
  }
}

// ============================================================================
// Deduplication helpers (server-side idempotency check)
// ============================================================================

/**
 * Given a set of already-persisted client_event_ids, filter out duplicates
 * from a batch of incoming events.
 * Returns { accepted, duplicates }.
 */
export function deduplicateBatch(
  incoming: readonly Pick<CustodyEvent, "client_event_id">[],
  persistedIds: ReadonlySet<string>,
): {
  accepted: typeof incoming
  duplicates: typeof incoming
} {
  const accepted: (typeof incoming[number])[] = []
  const duplicates: (typeof incoming[number])[] = []

  for (const event of incoming) {
    if (persistedIds.has(event.client_event_id)) {
      duplicates.push(event)
    } else {
      accepted.push(event)
    }
  }

  return { accepted, duplicates }
}

// ============================================================================
// Chain integrity check
// ============================================================================

export type ChainIntegrityCode =
  | "out_of_order_offline_event"  // Two offline events whose clocks diverge > threshold
  | "duplicate_client_event_id"   // Same client_event_id appears twice in chain
  | "custody_gap"                 // load event with no prior unload at origin

export interface ChainIntegrityIssue {
  code: ChainIntegrityCode
  message: string
  event_id?: string
  client_event_id?: string
}

/**
 * Check a custody chain for integrity issues.
 * `clockSkewThresholdMs`: maximum allowed clock divergence for offline events
 *   before flagging as out-of-order (default 5 minutes).
 */
export function checkChainIntegrity(
  chain: CustodyChain,
  clockSkewThresholdMs = 5 * 60 * 1000,
): ChainIntegrityIssue[] {
  const issues: ChainIntegrityIssue[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < chain.links.length; i++) {
    const link = chain.links[i]

    // Duplicate client_event_id
    if (seenIds.has(link.client_event_id)) {
      issues.push({
        code: "duplicate_client_event_id",
        message: `Duplicate client_event_id detected: ${link.client_event_id}`,
        event_id: link.event_id,
        client_event_id: link.client_event_id,
      })
    }
    seenIds.add(link.client_event_id)

    // Out-of-order offline events
    if (link.was_offline && i > 0) {
      const prev = chain.links[i - 1]
      const prevMs = Date.parse(prev.occurred_at_utc)
      const curMs = Date.parse(link.occurred_at_utc)
      if (!isNaN(prevMs) && !isNaN(curMs) && curMs < prevMs - clockSkewThresholdMs) {
        issues.push({
          code: "out_of_order_offline_event",
          message: `Offline event ${link.event_id} occurred before preceding event by more than allowed skew`,
          event_id: link.event_id,
          client_event_id: link.client_event_id,
        })
      }
    }
  }

  return issues
}
