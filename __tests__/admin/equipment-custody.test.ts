import { describe, expect, it } from "vitest"

import {
  buildCustodyChain,
  checkChainIntegrity,
  deduplicateBatch,
  enqueueOfflineEvent,
  getPendingQueueEntries,
  incrementFlushAttempt,
  markQueueEntryFlushed,
  markQueueEntryRejected,
  resolveScanPayload,
  type CustodyEvent,
  type OfflineQueueEntry,
  type ScanLookupEntry,
} from "@/lib/admin/equipment-custody"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

let _eventSeq = 0
function makeEvent(overrides: Partial<CustodyEvent> = {}): CustodyEvent {
  _eventSeq++
  return {
    id: overrides.id ?? `evt-${_eventSeq}`,
    client_event_id: overrides.client_event_id ?? `cev-${_eventSeq}`,
    org_id: "org-1",
    tour_id: "tour-1",
    catalog_item_id: overrides.catalog_item_id ?? "item-1",
    case_id: overrides.case_id ?? null,
    item_label: "Shure SM58",
    event_type: overrides.event_type ?? "check",
    scan_method: overrides.scan_method ?? "qr_code",
    condition: overrides.condition ?? "good",
    condition_notes: null,
    actor_user_id: "user-1",
    actor_name: "Stage Manager",
    new_custody_holder_id: overrides.new_custody_holder_id ?? null,
    new_custody_holder_name: overrides.new_custody_holder_name ?? null,
    device_id: "scanner-01",
    location_label: "Load Dock B",
    location_lat: null,
    location_lng: null,
    movement_id: null,
    leg_id: null,
    stop_id: null,
    occurred_at_utc: overrides.occurred_at_utc ?? "2025-06-01T10:00:00Z",
    received_at_utc: "2025-06-01T10:00:01Z",
    was_offline: overrides.was_offline ?? false,
    ...overrides,
  }
}

function makeQueueEntry(
  clientEventId: string,
  overrides: Partial<OfflineQueueEntry> = {},
): OfflineQueueEntry {
  return {
    client_event_id: clientEventId,
    queued_at_utc: "2025-06-01T09:00:00Z",
    event_payload: {
      ...makeEvent({ client_event_id: clientEventId }),
    } as OfflineQueueEntry["event_payload"],
    status: "pending",
    attempt_count: 0,
    last_attempt_utc: null,
    rejection_reason: null,
    ...overrides,
  }
}

const LOOKUP: ScanLookupEntry[] = [
  { catalog_item_id: "item-1", case_id: null, asset_tag: "TAG-001", serial_number: "SN-001", barcode: "BC-001" },
  { catalog_item_id: null,     case_id: "case-1", asset_tag: null,   serial_number: null,   barcode: "CASE-BC-001" },
  { catalog_item_id: "item-2", case_id: null, asset_tag: "TAG-002", serial_number: null,    barcode: null },
]

// ============================================================================
// Scan resolution
// ============================================================================

describe("EQUIP-304 scan resolution", () => {
  it("resolves exact barcode match", () => {
    const result = resolveScanPayload("BC-001", "barcode", LOOKUP)
    expect(result.resolved).toBe(true)
    expect(result.catalog_item_id).toBe("item-1")
    expect(result.matched_on).toBe("barcode")
    expect(result.match_quality).toBe("exact")
  })

  it("resolves exact asset_tag match", () => {
    const result = resolveScanPayload("TAG-001", "qr_code", LOOKUP)
    expect(result.resolved).toBe(true)
    expect(result.catalog_item_id).toBe("item-1")
    expect(result.matched_on).toBe("asset_tag")
  })

  it("resolves serial_number match", () => {
    const result = resolveScanPayload("SN-001", "qr_code", LOOKUP)
    expect(result.resolved).toBe(true)
    expect(result.catalog_item_id).toBe("item-1")
    expect(result.matched_on).toBe("serial_number")
  })

  it("resolves case barcode match", () => {
    const result = resolveScanPayload("CASE-BC-001", "barcode", LOOKUP)
    expect(result.resolved).toBe(true)
    expect(result.case_id).toBe("case-1")
    expect(result.matched_on).toBe("case_barcode")
  })

  it("is case-insensitive", () => {
    const result = resolveScanPayload("tag-001", "qr_code", LOOKUP)
    expect(result.resolved).toBe(true)
  })

  it("fuzzy-matches manual entry on prefix (≥3 chars)", () => {
    const result = resolveScanPayload("TAG", "manual", LOOKUP)
    // "TAG" is 3 chars but "TAG-001" starts with "TAG" — should match
    expect(result.resolved).toBe(true)
    expect(result.match_quality).toBe("fuzzy")
  })

  it("does NOT fuzzy-match on scanner input (only manual)", () => {
    const result = resolveScanPayload("TAG", "barcode", LOOKUP)
    expect(result.resolved).toBe(false)
  })

  it("returns unresolved for unknown payload", () => {
    const result = resolveScanPayload("UNKNOWN-XYZ", "qr_code", LOOKUP)
    expect(result.resolved).toBe(false)
    expect(result.matched_on).toBe("unresolved")
  })
})

// ============================================================================
// Offline queue — idempotency and state
// ============================================================================

describe("EQUIP-304 offline queue", () => {
  it("enqueues a new event", () => {
    const queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    expect(queue).toHaveLength(1)
    expect(queue[0].client_event_id).toBe("cev-a")
    expect(queue[0].status).toBe("pending")
  })

  it("is idempotent — duplicate client_event_id is silently ignored", () => {
    let queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    queue = enqueueOfflineEvent(queue, makeQueueEntry("cev-a"))
    expect(queue).toHaveLength(1)
  })

  it("marks entry as flushed", () => {
    const queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    const updated = markQueueEntryFlushed(queue, "cev-a", "2025-06-01T10:05:00Z")
    expect(updated[0].status).toBe("flushed")
    expect(updated[0].last_attempt_utc).toBe("2025-06-01T10:05:00Z")
  })

  it("marks entry as rejected with reason", () => {
    const queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    const updated = markQueueEntryRejected(queue, "cev-a", "duplicate on server", "2025-06-01T10:05:00Z")
    expect(updated[0].status).toBe("rejected")
    expect(updated[0].rejection_reason).toBe("duplicate on server")
    expect(updated[0].attempt_count).toBe(1)
  })

  it("increments attempt count", () => {
    const queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    const updated = incrementFlushAttempt(queue, "cev-a", "2025-06-01T10:01:00Z")
    expect(updated[0].attempt_count).toBe(1)
  })

  it("getPendingQueueEntries returns only pending", () => {
    let queue = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    queue = enqueueOfflineEvent(queue, makeQueueEntry("cev-b"))
    queue = markQueueEntryFlushed(queue, "cev-a", "2025-06-01T10:05:00Z")
    const pending = getPendingQueueEntries(queue)
    expect(pending).toHaveLength(1)
    expect(pending[0].client_event_id).toBe("cev-b")
  })

  it("original queue is unchanged after operations (immutable)", () => {
    const original = enqueueOfflineEvent([], makeQueueEntry("cev-a"))
    markQueueEntryFlushed(original, "cev-a", "2025-06-01T10:05:00Z")
    expect(original[0].status).toBe("pending")
  })
})

// ============================================================================
// Custody chain
// ============================================================================

describe("EQUIP-304 custody chain", () => {
  it("builds an empty chain for an item with no events", () => {
    const chain = buildCustodyChain("item-1", false, "SM58", [])
    expect(chain.links).toHaveLength(0)
    expect(chain.current_holder_name).toBeNull()
    expect(chain.latest_condition).toBe("good")
    expect(chain.has_critical_condition).toBe(false)
  })

  it("derives current holder from most recent transfer event", () => {
    const events = [
      makeEvent({ event_type: "load",     new_custody_holder_name: "A1" }),
      makeEvent({ event_type: "transfer", new_custody_holder_name: "A2", occurred_at_utc: "2025-06-01T12:00:00Z" }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    expect(chain.current_holder_name).toBe("A2")
  })

  it("reflects latest condition", () => {
    const events = [
      makeEvent({ condition: "good" }),
      makeEvent({ condition: "minor_damage", occurred_at_utc: "2025-06-01T11:00:00Z" }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    expect(chain.latest_condition).toBe("minor_damage")
  })

  it("flags has_critical_condition for major_damage or missing", () => {
    const events = [
      makeEvent({ condition: "good" }),
      makeEvent({ condition: "major_damage", occurred_at_utc: "2025-06-01T11:00:00Z" }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    expect(chain.has_critical_condition).toBe(true)
  })

  it("flags has_offline_events", () => {
    const events = [makeEvent({ was_offline: true })]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    expect(chain.has_offline_events).toBe(true)
  })

  it("filters by case_id when isCase=true", () => {
    const events = [
      makeEvent({ case_id: "case-1", catalog_item_id: null }),
      makeEvent({ case_id: null,     catalog_item_id: "item-1" }),
    ]
    const chain = buildCustodyChain("case-1", true, "FOH Case", events)
    expect(chain.links).toHaveLength(1)
    expect(chain.case_id).toBe("case-1")
    expect(chain.catalog_item_id).toBeNull()
  })
})

// ============================================================================
// Deduplication
// ============================================================================

describe("EQUIP-304 batch deduplication", () => {
  it("separates new from already-persisted events", () => {
    const incoming = [
      { client_event_id: "cev-1" },
      { client_event_id: "cev-2" },
      { client_event_id: "cev-3" },
    ]
    const persisted = new Set(["cev-1", "cev-3"])
    const { accepted, duplicates } = deduplicateBatch(incoming, persisted)
    expect(accepted).toHaveLength(1)
    expect(accepted[0].client_event_id).toBe("cev-2")
    expect(duplicates).toHaveLength(2)
  })

  it("returns all accepted when no duplicates", () => {
    const incoming = [{ client_event_id: "cev-x" }]
    const { accepted, duplicates } = deduplicateBatch(incoming, new Set())
    expect(accepted).toHaveLength(1)
    expect(duplicates).toHaveLength(0)
  })
})

// ============================================================================
// Chain integrity
// ============================================================================

describe("EQUIP-304 chain integrity", () => {
  it("finds no issues in a clean ordered chain", () => {
    const events = [
      makeEvent({ occurred_at_utc: "2025-06-01T10:00:00Z", was_offline: false }),
      makeEvent({ occurred_at_utc: "2025-06-01T11:00:00Z", was_offline: false }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    expect(checkChainIntegrity(chain)).toHaveLength(0)
  })

  it("detects duplicate client_event_id in chain", () => {
    const events = [
      makeEvent({ client_event_id: "cev-dup", occurred_at_utc: "2025-06-01T10:00:00Z" }),
      makeEvent({ client_event_id: "cev-dup", occurred_at_utc: "2025-06-01T11:00:00Z" }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    const issues = checkChainIntegrity(chain)
    expect(issues.some((i) => i.code === "duplicate_client_event_id")).toBe(true)
  })

  it("flags out-of-order offline events beyond skew threshold", () => {
    const events = [
      makeEvent({ occurred_at_utc: "2025-06-01T12:00:00Z", was_offline: false }),
      // offline event with clock 10 minutes BEFORE the preceding event
      makeEvent({ occurred_at_utc: "2025-06-01T11:50:00Z", was_offline: true }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    const issues = checkChainIntegrity(chain, 5 * 60 * 1000) // 5-min threshold
    expect(issues.some((i) => i.code === "out_of_order_offline_event")).toBe(true)
  })

  it("does NOT flag offline event within skew threshold", () => {
    const events = [
      makeEvent({ occurred_at_utc: "2025-06-01T12:00:00Z", was_offline: false }),
      // offline event 2 min before — within 5-min threshold
      makeEvent({ occurred_at_utc: "2025-06-01T11:58:00Z", was_offline: true }),
    ]
    const chain = buildCustodyChain("item-1", false, "SM58", events)
    const issues = checkChainIntegrity(chain, 5 * 60 * 1000)
    expect(issues.filter((i) => i.code === "out_of_order_offline_event")).toHaveLength(0)
  })
})
