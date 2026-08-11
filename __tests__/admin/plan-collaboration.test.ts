import { describe, it, expect } from "vitest"
import {
  joinPresence,
  leavePresence,
  heartbeatPresence,
  getActivePresenceSessions,
  createConflictResolution,
  hasVersionConflict,
  createPlanComment,
  replyToComment,
  resolveComment,
  reopenComment,
  shouldNotify,
  muteNotificationEvent,
  unmuteNotificationEvent,
  type PlanNotificationPreference,
} from "@/lib/admin/plan-collaboration"

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

describe("joinPresence", () => {
  it("creates an active presence session", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "2025-08-02T10:00:00Z" })
    expect(s.is_active).toBe(true)
    expect(s.section).toBeNull()
  })

  it("can be scoped to a section", () => {
    const s = joinPresence({ session_id: "s-2", tour_id: "t-1", user_id: "u-2", section: "stops", now: "T" })
    expect(s.section).toBe("stops")
  })
})

describe("leavePresence", () => {
  it("marks session inactive", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "T1" })
    const left = leavePresence(s, "T2")
    expect(left.is_active).toBe(false)
    expect(left.last_heartbeat).toBe("T2")
  })
})

describe("heartbeatPresence", () => {
  it("updates last_heartbeat", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "2025-08-02T10:00:00Z" })
    const updated = heartbeatPresence(s, "2025-08-02T10:00:30Z")
    expect(updated.last_heartbeat).toBe("2025-08-02T10:00:30Z")
    expect(updated.is_active).toBe(true)
  })
})

describe("getActivePresenceSessions", () => {
  it("returns active sessions within threshold", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "2025-08-02T10:00:00Z" })
    const active = getActivePresenceSessions([s], "2025-08-02T10:00:30Z", 60_000)
    expect(active).toHaveLength(1)
  })

  it("excludes stale sessions", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "2025-08-02T10:00:00Z" })
    // 2 minutes later — beyond 60s threshold
    const active = getActivePresenceSessions([s], "2025-08-02T10:02:01Z", 60_000)
    expect(active).toHaveLength(0)
  })

  it("excludes left sessions", () => {
    const s = joinPresence({ session_id: "s-1", tour_id: "t-1", user_id: "u-1", now: "2025-08-02T10:00:00Z" })
    const left = leavePresence(s, "2025-08-02T10:00:01Z")
    const active = getActivePresenceSessions([left], "2025-08-02T10:00:10Z", 60_000)
    expect(active).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

describe("hasVersionConflict", () => {
  it("detects conflict when versions differ", () => {
    expect(hasVersionConflict(5, 3)).toBe(true)
  })

  it("no conflict when versions match", () => {
    expect(hasVersionConflict(5, 5)).toBe(false)
  })
})

describe("createConflictResolution", () => {
  it("records manual-merge resolution", () => {
    const r = createConflictResolution({
      resolution_id: "res-1",
      tour_id: "t-1",
      section: "stops",
      server_version: 5,
      client_version: 3,
      strategy: "manual_merge",
      resolved_by: "user-1",
      resolved_at: "T",
      merged_fields: ["venue", "date"],
    })
    expect(r.strategy).toBe("manual_merge")
    expect(r.merged_fields).toEqual(["venue", "date"])
  })

  it("defaults merged_fields to empty", () => {
    const r = createConflictResolution({
      resolution_id: "res-2",
      tour_id: "t-1",
      section: "route",
      server_version: 2,
      client_version: 1,
      strategy: "server_wins",
      resolved_by: "u",
      resolved_at: "T",
    })
    expect(r.merged_fields).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Plan comments
// ---------------------------------------------------------------------------

describe("createPlanComment", () => {
  it("creates an open comment", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Should we move LA stop?", now: "T" })
    expect(c.status).toBe("open")
    expect(c.replies).toHaveLength(0)
    expect(c.resolved_by).toBeNull()
  })
})

describe("replyToComment", () => {
  it("adds a reply", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Question", now: "T" })
    const r = replyToComment(c, { reply_id: "r-1", comment_id: "c-1", author_id: "u-2", created_at: "T2", body: "Sure" })
    expect(r.replies).toHaveLength(1)
  })

  it("is idempotent on duplicate reply_id", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Q", now: "T" })
    const reply = { reply_id: "r-1", comment_id: "c-1", author_id: "u-2", created_at: "T2", body: "A" }
    const c1 = replyToComment(c, reply)
    const c2 = replyToComment(c1, reply)
    expect(c2.replies).toHaveLength(1)
    expect(c2).toBe(c1)
  })
})

describe("resolveComment / reopenComment", () => {
  it("resolves a comment", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Q", now: "T" })
    const resolved = resolveComment(c, "user-pm", "T2")
    expect(resolved.status).toBe("resolved")
    expect(resolved.resolved_by).toBe("user-pm")
  })

  it("is idempotent — resolving already resolved is no-op", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Q", now: "T" })
    const r1 = resolveComment(c, "u", "T2")
    const r2 = resolveComment(r1, "u", "T3")
    expect(r2).toBe(r1)
  })

  it("reopens a resolved comment", () => {
    const c = createPlanComment({ comment_id: "c-1", tour_id: "t-1", section: "stops", author_id: "u-1", body: "Q", now: "T" })
    const resolved = resolveComment(c, "u", "T2")
    const reopened = reopenComment(resolved)
    expect(reopened.status).toBe("open")
    expect(reopened.resolved_by).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

describe("shouldNotify / muteNotificationEvent / unmuteNotificationEvent", () => {
  const base: PlanNotificationPreference = { user_id: "u-1", tour_id: "t-1", muted_events: [] }

  it("notifies when event not muted", () => {
    expect(shouldNotify(base, "change_proposed")).toBe(true)
  })

  it("does not notify when event is muted", () => {
    const muted = muteNotificationEvent(base, "presence_joined")
    expect(shouldNotify(muted, "presence_joined")).toBe(false)
  })

  it("mute is idempotent", () => {
    const m1 = muteNotificationEvent(base, "comment_added")
    const m2 = muteNotificationEvent(m1, "comment_added")
    expect(m2.muted_events).toHaveLength(1)
    expect(m2).toBe(m1) // same ref
  })

  it("unmutes a muted event", () => {
    const muted = muteNotificationEvent(base, "conflict_detected")
    const unmuted = unmuteNotificationEvent(muted, "conflict_detected")
    expect(shouldNotify(unmuted, "conflict_detected")).toBe(true)
  })
})
