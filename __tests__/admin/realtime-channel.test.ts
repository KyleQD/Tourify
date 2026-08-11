import { describe, it, expect } from "vitest"
import {
  checkChannelAuthorization,
  createSubscription,
  revokeSubscription,
  markAuthChecked,
  createReplayBuffer,
  appendToBuffer,
  getCatchUpMessages,
  nextSequenceNumber,
  isMessageVisibleToSubscriber,
  detectMessageGap,
  summarizeChannel,
  type RealtimeChannelScope,
  type RealtimeSubscription,
  type RealtimeMessage,
  type ChannelSequenceState,
} from "../../lib/admin/realtime-channel"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCOPE: RealtimeChannelScope = {
  org_id: "org-1",
  event_id: "ev-1",
  sub_scope: "all",
}

function sub(overrides: Partial<RealtimeSubscription> = {}): RealtimeSubscription {
  return createSubscription({
    id: "sub-1",
    user_id: "user-pm",
    channel_id: "ch-1",
    scope: SCOPE,
    now: "2025-09-15T00:00:00Z",
    ...overrides,
  })
}

function msg(seq: number, overrides: Partial<RealtimeMessage> = {}): RealtimeMessage {
  return {
    id: `msg-${seq}`,
    channel_id: "ch-1",
    sequence_number: seq,
    type: "timeline_update",
    payload: {},
    sent_by: "user-pm",
    sent_at: "2025-09-15T20:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// checkChannelAuthorization
// ---------------------------------------------------------------------------

describe("checkChannelAuthorization", () => {
  it("authorizes valid user with correct capability", () => {
    const r = checkChannelAuthorization(SCOPE, ["event.live_ops"], "org-1")
    expect(r.authorized).toBe(true)
  })

  it("rejects org mismatch", () => {
    const r = checkChannelAuthorization(SCOPE, ["event.live_ops"], "org-99")
    expect(r.authorized).toBe(false)
    if (!r.authorized) expect(r.reason).toBe("org_mismatch")
  })

  it("rejects missing capability", () => {
    const r = checkChannelAuthorization(SCOPE, ["workforce.view"], "org-1")
    expect(r.authorized).toBe(false)
    if (!r.authorized) expect(r.reason).toMatch(/event\.live_ops/)
  })

  it("management scope requires event.manage", () => {
    const mgmtScope: RealtimeChannelScope = { ...SCOPE, sub_scope: "management" }
    expect(checkChannelAuthorization(mgmtScope, ["event.live_ops"], "org-1").authorized).toBe(false)
    expect(checkChannelAuthorization(mgmtScope, ["event.manage"], "org-1").authorized).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Subscription lifecycle
// ---------------------------------------------------------------------------

describe("createSubscription", () => {
  it("starts with active status and seq 0", () => {
    const s = sub()
    expect(s.status).toBe("active")
    expect(s.last_delivered_seq).toBe(0)
    expect(s.last_seen_seq).toBe(0)
  })
})

describe("revokeSubscription", () => {
  it("revokes an active subscription", () => {
    const revoked = revokeSubscription(sub(), "permission_changed", "2025-09-15T20:30:00Z")
    expect(revoked.status).toBe("revoked")
    expect(revoked.revoke_reason).toBe("permission_changed")
    expect(revoked.revoked_at).toBe("2025-09-15T20:30:00Z")
  })
  it("is idempotent", () => {
    const r1 = revokeSubscription(sub(), "reason1", "2025-09-15T20:00:00Z")
    const r2 = revokeSubscription(r1, "reason2", "2025-09-15T21:00:00Z")
    expect(r2.revoke_reason).toBe("reason1")
  })
})

describe("markAuthChecked", () => {
  it("updates last_auth_check_at", () => {
    const updated = markAuthChecked(sub(), "2025-09-15T21:00:00Z")
    expect(updated.last_auth_check_at).toBe("2025-09-15T21:00:00Z")
  })
})

// ---------------------------------------------------------------------------
// Replay buffer
// ---------------------------------------------------------------------------

describe("createReplayBuffer", () => {
  it("starts empty with configured max_size", () => {
    const buf = createReplayBuffer("ch-1", 100)
    expect(buf.messages).toHaveLength(0)
    expect(buf.max_size).toBe(100)
  })
})

describe("appendToBuffer", () => {
  it("appends a message", () => {
    let buf = createReplayBuffer("ch-1")
    buf = appendToBuffer(buf, msg(1))
    expect(buf.messages).toHaveLength(1)
  })

  it("evicts oldest when at max capacity", () => {
    let buf = createReplayBuffer("ch-1", 3)
    buf = appendToBuffer(buf, msg(1))
    buf = appendToBuffer(buf, msg(2))
    buf = appendToBuffer(buf, msg(3))
    buf = appendToBuffer(buf, msg(4))
    expect(buf.messages).toHaveLength(3)
    expect(buf.messages[0].sequence_number).toBe(2)
    expect(buf.messages[2].sequence_number).toBe(4)
  })
})

describe("getCatchUpMessages", () => {
  it("returns messages after lastSeq in order", () => {
    let buf = createReplayBuffer("ch-1")
    buf = appendToBuffer(buf, msg(1))
    buf = appendToBuffer(buf, msg(2))
    buf = appendToBuffer(buf, msg(3))
    const catchUp = getCatchUpMessages(buf, 1)
    expect(catchUp.map((m) => m.sequence_number)).toEqual([2, 3])
  })

  it("returns empty when no new messages", () => {
    let buf = createReplayBuffer("ch-1")
    buf = appendToBuffer(buf, msg(1))
    expect(getCatchUpMessages(buf, 1)).toHaveLength(0)
  })

  it("returns all messages when lastSeq is 0", () => {
    let buf = createReplayBuffer("ch-1")
    buf = appendToBuffer(buf, msg(1))
    buf = appendToBuffer(buf, msg(2))
    expect(getCatchUpMessages(buf, 0)).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Sequence counter
// ---------------------------------------------------------------------------

describe("nextSequenceNumber", () => {
  it("increments monotonically", () => {
    const state: ChannelSequenceState = { channel_id: "ch-1", next_seq: 1 }
    const { seq, updated } = nextSequenceNumber(state)
    expect(seq).toBe(1)
    expect(updated.next_seq).toBe(2)
    const { seq: seq2 } = nextSequenceNumber(updated)
    expect(seq2).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Message visibility
// ---------------------------------------------------------------------------

describe("isMessageVisibleToSubscriber", () => {
  it("delivers all-scope messages to all active subscribers", () => {
    expect(isMessageVisibleToSubscriber(msg(1), sub())).toBe(true)
  })

  it("does not deliver to revoked subscription", () => {
    const revoked = revokeSubscription(sub(), "reason")
    expect(isMessageVisibleToSubscriber(msg(1), revoked)).toBe(false)
  })

  it("filters by target_scope", () => {
    const deptMsg = msg(1, { target_scope: "department", target_scope_value: "lighting" })
    const crewSub = sub({ scope: { ...SCOPE, sub_scope: "department", scope_value: "lighting" } })
    const otherSub = sub({ scope: { ...SCOPE, sub_scope: "department", scope_value: "sound" } })
    expect(isMessageVisibleToSubscriber(deptMsg, crewSub)).toBe(true)
    expect(isMessageVisibleToSubscriber(deptMsg, otherSub)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Gap detection
// ---------------------------------------------------------------------------

describe("detectMessageGap", () => {
  it("detects no gap for contiguous messages", () => {
    const msgs = [msg(1), msg(2), msg(3)]
    expect(detectMessageGap(msgs, 1).has_gap).toBe(false)
  })

  it("detects gap in sequence", () => {
    const msgs = [msg(1), msg(3)]  // missing 2
    const result = detectMessageGap(msgs, 1)
    expect(result.has_gap).toBe(true)
    expect(result.first_missing_seq).toBe(2)
  })

  it("returns no gap for empty list", () => {
    expect(detectMessageGap([], 5).has_gap).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// summarizeChannel
// ---------------------------------------------------------------------------

describe("summarizeChannel", () => {
  it("counts active subscribers and latest seq", () => {
    const subs = [sub(), revokeSubscription(sub({ id: "sub-2" }), "reason")]
    let buf = createReplayBuffer("ch-1")
    buf = appendToBuffer(buf, msg(1))
    buf = appendToBuffer(buf, msg(2))
    const summary = summarizeChannel("ch-1", SCOPE, subs, buf)
    expect(summary.active_subscriber_count).toBe(1)
    expect(summary.latest_seq).toBe(2)
    expect(summary.buffer_size).toBe(2)
  })
})
