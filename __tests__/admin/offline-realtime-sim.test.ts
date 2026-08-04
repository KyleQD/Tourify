import { describe, it, expect } from "vitest"
import {
  computeOfflineFreshness,
  processReconnectQueue,
  applyRevocationEvent,
  markReconnecting,
  reauthorize,
  checkContentStaleness,
  type OfflinePackage,
  type SubscriptionStatus,
} from "@/lib/admin/offline-realtime-sim"

// ---------------------------------------------------------------------------
// computeOfflineFreshness
// ---------------------------------------------------------------------------

const PKG: OfflinePackage = {
  package_id: "pkg-1",
  content_version: 3,
  downloaded_at: "2025-08-02T10:00:00Z",
  server_version_at_download: "3",
  is_access_revoked: false,
  ttl_seconds: 3600,
}

describe("computeOfflineFreshness", () => {
  it("fresh when up-to-date and within TTL", () => {
    const r = computeOfflineFreshness(PKG, 3, false, "2025-08-02T10:30:00Z")
    expect(r).toBe("fresh")
  })

  it("stale when server version ahead", () => {
    const r = computeOfflineFreshness(PKG, 5, false, "2025-08-02T10:30:00Z")
    expect(r).toBe("stale")
  })

  it("stale when TTL exceeded", () => {
    const r = computeOfflineFreshness(PKG, 3, false, "2025-08-02T12:00:01Z") // > 3600s
    expect(r).toBe("stale")
  })

  it("superseded when server content superseded", () => {
    const r = computeOfflineFreshness(PKG, 3, true, "2025-08-02T10:30:00Z")
    expect(r).toBe("superseded")
  })

  it("revoked takes priority over everything", () => {
    const r = computeOfflineFreshness({ ...PKG, is_access_revoked: true }, 10, true, "2025-08-02T12:00:00Z")
    expect(r).toBe("revoked")
  })
})

// ---------------------------------------------------------------------------
// processReconnectQueue
// ---------------------------------------------------------------------------

describe("processReconnectQueue", () => {
  it("delivers ordered messages after reconnect", () => {
    const msgs = [{ seq: 4, payload: "d" }, { seq: 2, payload: "b" }, { seq: 3, payload: "c" }]
    const r = processReconnectQueue(msgs, 1)
    expect(r.in_order_messages.map((m) => m.seq)).toEqual([2, 3, 4])
    expect(r.gaps).toHaveLength(0)
    expect(r.last_seq).toBe(4)
  })

  it("detects gaps in sequence", () => {
    const msgs = [{ seq: 2, payload: "b" }, { seq: 5, payload: "e" }]
    const r = processReconnectQueue(msgs, 1)
    expect(r.gaps).toHaveLength(1)
    expect(r.gaps[0]).toEqual({ expected: 3, got: 5 })
  })

  it("skips duplicate messages (seq <= lastSeqSeen)", () => {
    const msgs = [{ seq: 1, payload: "old" }, { seq: 2, payload: "new" }]
    const r = processReconnectQueue(msgs, 1)
    expect(r.in_order_messages.map((m) => m.seq)).toEqual([2])
  })

  it("returns empty result when no new messages", () => {
    const r = processReconnectQueue([], 5)
    expect(r.in_order_messages).toHaveLength(0)
    expect(r.last_seq).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Permission revocation simulation
// ---------------------------------------------------------------------------

const ACTIVE_STATUS: SubscriptionStatus = {
  subscription_id: "sub-1",
  state: "active",
  revocation: null,
}

describe("applyRevocationEvent", () => {
  it("revokes an active subscription", () => {
    const event = { subscription_id: "sub-1", reason: "role_removed" as const, revoked_at: "T" }
    const r = applyRevocationEvent(ACTIVE_STATUS, event)
    expect(r.state).toBe("revoked")
    expect(r.revocation).toEqual(event)
  })

  it("is idempotent on already revoked subscription", () => {
    const event = { subscription_id: "sub-1", reason: "manual_revoke" as const, revoked_at: "T1" }
    const revoked = applyRevocationEvent(ACTIVE_STATUS, event)
    const event2 = { subscription_id: "sub-1", reason: "org_change" as const, revoked_at: "T2" }
    const r = applyRevocationEvent(revoked, event2)
    expect(r.revocation?.reason).toBe("manual_revoke") // first event preserved
  })
})

describe("markReconnecting / reauthorize", () => {
  it("marks active subscription as reconnecting", () => {
    const r = markReconnecting(ACTIVE_STATUS)
    expect(r.state).toBe("reconnecting")
  })

  it("revoked subscription cannot reconnect", () => {
    const event = { subscription_id: "sub-1", reason: "grant_expired" as const, revoked_at: "T" }
    const revoked = applyRevocationEvent(ACTIVE_STATUS, event)
    const r = markReconnecting(revoked)
    expect(r.state).toBe("revoked")
  })

  it("reauthorize sets state to active", () => {
    const reconnecting = markReconnecting(ACTIVE_STATUS)
    expect(reauthorize(reconnecting).state).toBe("active")
  })

  it("reauthorize cannot restore revoked subscription", () => {
    const event = { subscription_id: "sub-1", reason: "role_removed" as const, revoked_at: "T" }
    const revoked = applyRevocationEvent(ACTIVE_STATUS, event)
    expect(reauthorize(revoked).state).toBe("revoked")
  })
})

// ---------------------------------------------------------------------------
// checkContentStaleness
// ---------------------------------------------------------------------------

describe("checkContentStaleness", () => {
  it("returns current when up to date", () => {
    expect(checkContentStaleness({ content_id: "c", client_version: 3, server_version: 3, is_superseded: false, is_revoked: false })).toBe("current")
  })

  it("returns version_behind when client is behind", () => {
    expect(checkContentStaleness({ content_id: "c", client_version: 2, server_version: 5, is_superseded: false, is_revoked: false })).toBe("version_behind")
  })

  it("returns superseded", () => {
    expect(checkContentStaleness({ content_id: "c", client_version: 3, server_version: 3, is_superseded: true, is_revoked: false })).toBe("superseded")
  })

  it("revoked wins over superseded", () => {
    expect(checkContentStaleness({ content_id: "c", client_version: 3, server_version: 3, is_superseded: true, is_revoked: true })).toBe("revoked")
  })
})
