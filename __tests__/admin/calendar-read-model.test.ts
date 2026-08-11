import { describe, it, expect } from "vitest"
import {
  buildCalendarReadModel,
  getStaleOrErrorSources,
  applyCalendarFilter,
  detectOverlapConflicts,
  previewCalendarEdit,
  buildIcsSnapshot,
  buildIcsItem,
  createFeedToken,
  revokeFeedToken,
  recordFeedTokenAccess,
  isFeedTokenUsable,
  type CalendarItem,
  type CalendarSourceHealth,
} from "@/lib/admin/calendar-read-model"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    item_id: "item-1",
    source_type: "shift",
    source_id: "shift-1",
    title: "Load-in",
    start_utc: "2025-08-02T08:00:00Z",
    end_utc: "2025-08-02T12:00:00Z",
    display_tz: "America/New_York",
    status: "confirmed",
    owner_id: "person-1",
    department: "production",
    tour_id: "tour-1",
    stop_id: "stop-1",
    event_id: "event-1",
    is_authorized: true,
    ...overrides,
  }
}

const GOOD_HEALTH: CalendarSourceHealth = { source_type: "shift", last_synced_at: "T", error: null, is_fresh: true }
const BAD_HEALTH: CalendarSourceHealth = { source_type: "travel", last_synced_at: null, error: "Provider timeout", is_fresh: false }

// ---------------------------------------------------------------------------
// CAL-401 — Calendar read model
// ---------------------------------------------------------------------------

describe("buildCalendarReadModel / getStaleOrErrorSources", () => {
  it("builds a read model", () => {
    const m = buildCalendarReadModel([makeItem()], [GOOD_HEALTH], "T")
    expect(m.items).toHaveLength(1)
    expect(m.source_health).toHaveLength(1)
  })

  it("reports stale or error sources", () => {
    const stale = getStaleOrErrorSources([GOOD_HEALTH, BAD_HEALTH])
    expect(stale).toHaveLength(1)
    expect(stale[0].source_type).toBe("travel")
  })
})

// ---------------------------------------------------------------------------
// CAL-402 — Filters
// ---------------------------------------------------------------------------

describe("applyCalendarFilter", () => {
  const BASE_FILTER = {
    view: "week" as const,
    range_start: "2025-08-02T00:00:00Z",
    range_end: "2025-08-09T00:00:00Z",
    display_tz: "UTC",
  }

  it("includes items within range", () => {
    const result = applyCalendarFilter([makeItem()], BASE_FILTER)
    expect(result).toHaveLength(1)
  })

  it("excludes items outside range", () => {
    const result = applyCalendarFilter([makeItem({ start_utc: "2025-08-01T08:00:00Z", end_utc: "2025-08-01T12:00:00Z" })], BASE_FILTER)
    expect(result).toHaveLength(0)
  })

  it("excludes unauthorized items", () => {
    const result = applyCalendarFilter([makeItem({ is_authorized: false })], BASE_FILTER)
    expect(result).toHaveLength(0)
  })

  it("filters by source_type", () => {
    const ros = makeItem({ item_id: "ros", source_type: "ros_item" })
    const shift = makeItem({ item_id: "sh", source_type: "shift" })
    const result = applyCalendarFilter([ros, shift], { ...BASE_FILTER, source_types: ["ros_item"] })
    expect(result).toHaveLength(1)
    expect(result[0].item_id).toBe("ros")
  })

  it("filters by department", () => {
    const prod = makeItem({ department: "production" })
    const sound = makeItem({ item_id: "s", department: "sound" })
    const result = applyCalendarFilter([prod, sound], { ...BASE_FILTER, departments: ["sound"] })
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// CAL-403 — Conflict overlays
// ---------------------------------------------------------------------------

describe("detectOverlapConflicts", () => {
  it("detects shift overlap for same owner", () => {
    const a = makeItem({ item_id: "a", owner_id: "p1", start_utc: "2025-08-02T08:00:00Z", end_utc: "2025-08-02T12:00:00Z" })
    const b = makeItem({ item_id: "b", owner_id: "p1", start_utc: "2025-08-02T10:00:00Z", end_utc: "2025-08-02T14:00:00Z" })
    const conflicts = detectOverlapConflicts([a, b])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].conflict_type).toBe("shift_overlap")
  })

  it("no conflict for different owners", () => {
    const a = makeItem({ item_id: "a", owner_id: "p1" })
    const b = makeItem({ item_id: "b", owner_id: "p2", start_utc: "2025-08-02T10:00:00Z", end_utc: "2025-08-02T14:00:00Z" })
    expect(detectOverlapConflicts([a, b])).toHaveLength(0)
  })

  it("no conflict for non-overlapping items", () => {
    const a = makeItem({ item_id: "a", owner_id: "p1", start_utc: "2025-08-02T08:00:00Z", end_utc: "2025-08-02T10:00:00Z" })
    const b = makeItem({ item_id: "b", owner_id: "p1", start_utc: "2025-08-02T10:00:00Z", end_utc: "2025-08-02T12:00:00Z" })
    expect(detectOverlapConflicts([a, b])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// CAL-404 — Edit preview
// ---------------------------------------------------------------------------

describe("previewCalendarEdit", () => {
  const EDIT_CMD = {
    item_id: "item-1",
    command_type: "move" as const,
    proposed_start_utc: "2025-08-02T09:00:00Z",
    proposed_end_utc: "2025-08-02T13:00:00Z",
  }

  it("allows editable item with no conflicts", () => {
    const r = previewCalendarEdit(makeItem(), EDIT_CMD, [])
    expect(r.outcome).toBe("allowed")
    expect(r.is_source_editable).toBe(true)
  })

  it("blocks read-only source (travel)", () => {
    const r = previewCalendarEdit(makeItem({ source_type: "travel" }), EDIT_CMD, [])
    expect(r.outcome).toBe("blocked")
    expect(r.is_source_editable).toBe(false)
  })

  it("requires confirmation when overlaps exist", () => {
    const overlap = makeItem({ item_id: "other", owner_id: "person-1" })
    const r = previewCalendarEdit(makeItem(), EDIT_CMD, [overlap])
    expect(r.outcome).toBe("requires_confirmation")
    expect(r.affected_items).toContain("other")
  })

  it("blocks when end before start", () => {
    const r = previewCalendarEdit(makeItem(), { ...EDIT_CMD, proposed_start_utc: "T2", proposed_end_utc: "T1" }, [])
    expect(r.outcome).toBe("blocked")
    expect(r.validation_issues).toContain("End time must be after start time")
  })
})

// ---------------------------------------------------------------------------
// CAL-405 — ICS export
// ---------------------------------------------------------------------------

describe("buildIcsSnapshot", () => {
  it("builds ICS snapshot with authorized items only", () => {
    const auth = makeItem()
    const unauth = makeItem({ item_id: "u", is_authorized: false })
    const snap = buildIcsSnapshot({ snapshot_id: "s-1", audience_class: "crew", items: [auth, unauth], version: 1, now: "T" })
    expect(snap.items).toHaveLength(1)
    expect(snap.items[0].uid).toBe("item-1@tourify")
    expect(snap.version).toBe(1)
  })

  it("maps calendar status to ICS status", () => {
    const item = buildIcsItem(makeItem({ status: "cancelled" }), 1)
    expect(item.status).toBe("CANCELLED")
    const tent = buildIcsItem(makeItem({ status: "tentative" }), 1)
    expect(tent.status).toBe("TENTATIVE")
    const conf = buildIcsItem(makeItem({ status: "confirmed" }), 1)
    expect(conf.status).toBe("CONFIRMED")
  })
})

// ---------------------------------------------------------------------------
// CAL-406 — Feed tokens
// ---------------------------------------------------------------------------

describe("createFeedToken", () => {
  it("creates an active token", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "abc", org_id: "o", owner_id: "u", scope: ["crew"], expires_at: "2025-09-01T00:00:00Z", now: "T" })
    expect(t.status).toBe("active")
    expect(t.access_count).toBe(0)
  })
})

describe("revokeFeedToken", () => {
  it("revokes a token", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: null, now: "T" })
    const r = revokeFeedToken(t, "admin", "T2")
    expect(r.status).toBe("revoked")
    expect(r.revoked_by).toBe("admin")
  })
})

describe("recordFeedTokenAccess / isFeedTokenUsable", () => {
  it("increments access_count", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: null, now: "2025-08-01T00:00:00Z" })
    const updated = recordFeedTokenAccess(t, "2025-08-01T01:00:00Z")
    expect(updated.access_count).toBe(1)
  })

  it("marks expired when past expiry", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: "2025-08-01T00:00:00Z", now: "2025-07-01T00:00:00Z" })
    const updated = recordFeedTokenAccess(t, "2025-09-01T00:00:00Z")
    expect(updated.status).toBe("expired")
  })

  it("isFeedTokenUsable false for revoked token", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: null, now: "T" })
    const revoked = revokeFeedToken(t, "a", "T")
    expect(isFeedTokenUsable(revoked, "T")).toBe(false)
  })

  it("isFeedTokenUsable false when expired", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: "2025-08-01T00:00:00Z", now: "T" })
    expect(isFeedTokenUsable(t, "2025-09-01T00:00:00Z")).toBe(false)
  })

  it("isFeedTokenUsable true for active non-expired token", () => {
    const t = createFeedToken({ token_id: "t-1", token_hash: "h", org_id: "o", owner_id: "u", scope: [], expires_at: "2025-12-01T00:00:00Z", now: "T" })
    expect(isFeedTokenUsable(t, "2025-08-01T00:00:00Z")).toBe(true)
  })
})
