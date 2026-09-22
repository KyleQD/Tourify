import { describe, it, expect } from "vitest"
import {
  filterChannelMembersByOrg,
  addChannelMember,
  removeChannelMember,
  applyInboxFilter,
  markInboxItemRead,
  createOutboxEntry,
  applyOutboxAttempt,
  isInQuietHours,
  isChannelOptedIn,
  createCommAck,
  acknowledgeComm,
  dismissComm,
  escalateComm,
  isCommResolved,
  checkAttachmentAccess,
  revokeAttachment,
  refreshAttachmentToken,
  type CommsChannel,
  type ChannelMembership,
  type UnifiedInboxItem,
  type NotificationPreferences,
  type SecureAttachment,
} from "@/lib/admin/comms-domain"

// ---------------------------------------------------------------------------
// COMMS-401 — Channel/audience
// ---------------------------------------------------------------------------

const CHANNEL: CommsChannel = {
  channel_id: "ch-1",
  org_id: "org-1",
  name: "Production crew",
  channel_types: ["in_app", "push"],
  members: [
    { member_id: "u-1", source: "assignment", added_at: "T", exception_reason: null, org_id: "org-1" },
    { member_id: "u-2", source: "grant", added_at: "T", exception_reason: null, org_id: "org-1" },
  ],
}

describe("filterChannelMembersByOrg", () => {
  it("returns only members from the specified org", () => {
    const ch = {
      ...CHANNEL,
      members: [
        ...CHANNEL.members,
        { member_id: "u-3", source: "grant" as const, added_at: "T", exception_reason: null, org_id: "org-2" },
      ],
    }
    expect(filterChannelMembersByOrg(ch, "org-1")).toHaveLength(2)
    expect(filterChannelMembersByOrg(ch, "org-2")).toHaveLength(1)
  })
})

describe("addChannelMember", () => {
  it("adds a normal member", () => {
    const m: ChannelMembership = { member_id: "u-99", source: "assignment", added_at: "T", exception_reason: null, org_id: "org-1" }
    const r = addChannelMember(CHANNEL, m)
    expect(r.ok).toBe(true)
    expect(r.channel?.members).toHaveLength(3)
  })

  it("requires exception_reason for exception source", () => {
    const m: ChannelMembership = { member_id: "u-exc", source: "exception", added_at: "T", exception_reason: null, org_id: "org-1" }
    expect(addChannelMember(CHANNEL, m).ok).toBe(false)
  })

  it("allows exception with reason", () => {
    const m: ChannelMembership = { member_id: "u-exc", source: "exception", added_at: "T", exception_reason: "VIP guest", org_id: "org-1" }
    expect(addChannelMember(CHANNEL, m).ok).toBe(true)
  })

  it("blocks cross-org membership", () => {
    const m: ChannelMembership = { member_id: "u-x", source: "grant", added_at: "T", exception_reason: null, org_id: "org-2" }
    expect(addChannelMember(CHANNEL, m).ok).toBe(false)
  })

  it("is idempotent on duplicate member", () => {
    const m: ChannelMembership = { member_id: "u-1", source: "assignment", added_at: "T", exception_reason: null, org_id: "org-1" }
    const r = addChannelMember(CHANNEL, m)
    expect(r.ok).toBe(true)
    expect(r.channel?.members).toHaveLength(2)
  })
})

describe("removeChannelMember", () => {
  it("removes a member", () => {
    const ch = removeChannelMember(CHANNEL, "u-1")
    expect(ch.members).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// COMMS-402 — Unified inbox
// ---------------------------------------------------------------------------

function makeInboxItem(overrides: Partial<UnifiedInboxItem> = {}): UnifiedInboxItem {
  return {
    item_id: "i-1", recipient_id: "u-1", item_type: "message", source_type: "announcement",
    source_id: "ann-1", title: "Show call", body: null, priority: "normal", is_read: false,
    requires_action: false, action_completed: false, deep_link: null,
    created_at: "T", expires_at: null,
    ...overrides,
  }
}

describe("applyInboxFilter", () => {
  it("filters by item_type", () => {
    const msg = makeInboxItem({ item_type: "message" })
    const ack = makeInboxItem({ item_id: "i-2", item_type: "acknowledgement_required" })
    const result = applyInboxFilter([msg, ack], { item_types: ["acknowledgement_required"] })
    expect(result).toHaveLength(1)
    expect(result[0].item_id).toBe("i-2")
  })

  it("filters unread_only", () => {
    const unread = makeInboxItem()
    const read = makeInboxItem({ item_id: "i-2", is_read: true })
    expect(applyInboxFilter([unread, read], { unread_only: true })).toHaveLength(1)
  })

  it("filters requires_action_only (excludes completed)", () => {
    const active = makeInboxItem({ requires_action: true, action_completed: false })
    const completed = makeInboxItem({ item_id: "i-2", requires_action: true, action_completed: true })
    const result = applyInboxFilter([active, completed], { requires_action_only: true })
    expect(result).toHaveLength(1)
  })
})

describe("markInboxItemRead", () => {
  it("marks item as read", () => {
    expect(markInboxItemRead(makeInboxItem()).is_read).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// COMMS-403 — Outbox entries
// ---------------------------------------------------------------------------

describe("createOutboxEntry / applyOutboxAttempt", () => {
  it("creates a pending entry", () => {
    const e = createOutboxEntry({ entry_id: "e-1", dedupe_key: "evt:1", audience_ids: ["u-1"], event_type: "day_sheet_updated", payload: {}, now: "T" })
    expect(e.status).toBe("pending")
    expect(e.attempt_count).toBe(0)
  })

  it("marks delivered on success", () => {
    const e = createOutboxEntry({ entry_id: "e-1", dedupe_key: "x", audience_ids: ["u"], event_type: "e", payload: {}, now: "T" })
    const r = applyOutboxAttempt(e, "success", null, "T2")
    expect(r.status).toBe("delivered")
    expect(r.delivered_at).toBe("T2")
  })

  it("retries on failure (not exhausted)", () => {
    const e = createOutboxEntry({ entry_id: "e-1", dedupe_key: "x", audience_ids: ["u"], event_type: "e", payload: {}, max_attempts: 3, now: "2025-08-01T10:00:00Z" })
    const r = applyOutboxAttempt(e, "failure", "Provider timeout", "2025-08-01T10:01:00Z")
    expect(r.status).toBe("failed")
    expect(r.attempt_count).toBe(1)
    expect(r.next_attempt_at).not.toBeNull()
  })

  it("dead letters after max attempts", () => {
    let e = createOutboxEntry({ entry_id: "e-1", dedupe_key: "x", audience_ids: ["u"], event_type: "e", payload: {}, max_attempts: 2, now: "2025-08-01T10:00:00Z" })
    e = applyOutboxAttempt(e, "failure", "err", "2025-08-01T10:01:00Z")
    e = applyOutboxAttempt(e, "failure", "err", "2025-08-01T10:02:00Z")
    expect(e.status).toBe("dead_lettered")
    expect(e.next_attempt_at).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// COMMS-404 — Preferences / quiet hours
// ---------------------------------------------------------------------------

const PREFS: NotificationPreferences = {
  user_id: "u-1",
  org_id: "org-1",
  opted_in_channels: ["in_app", "email"],
  digest_mode: false,
  quiet_hours: { start_local: "22:00", end_local: "07:00", tz: "America/New_York", emergency_override: true },
}

describe("isInQuietHours", () => {
  it("returns true during quiet hours", () => {
    expect(isInQuietHours(PREFS, "23:00", "normal")).toBe(true)
  })

  it("returns false outside quiet hours", () => {
    expect(isInQuietHours(PREFS, "12:00", "normal")).toBe(false)
  })

  it("emergency override bypasses quiet hours for critical", () => {
    expect(isInQuietHours(PREFS, "23:00", "critical")).toBe(false)
  })

  it("returns false when no quiet_hours set", () => {
    const p = { ...PREFS, quiet_hours: null }
    expect(isInQuietHours(p, "23:00", "normal")).toBe(false)
  })
})

describe("isChannelOptedIn", () => {
  it("returns true for opted-in channel", () => {
    expect(isChannelOptedIn(PREFS, "email")).toBe(true)
  })
  it("returns false for non-opted channel", () => {
    expect(isChannelOptedIn(PREFS, "sms")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// COMMS-405 — Escalation / acknowledgement
// ---------------------------------------------------------------------------

describe("createCommAck / acknowledgeComm / dismissComm / escalateComm", () => {
  it("creates a pending ack", () => {
    const a = createCommAck({ ack_id: "a-1", message_id: "m-1", recipient_id: "u-1", deadline: "2025-08-05T00:00:00Z" })
    expect(a.status).toBe("pending")
    expect(isCommResolved(a)).toBe(false)
  })

  it("acknowledges idempotently", () => {
    const a = createCommAck({ ack_id: "a-1", message_id: "m-1", recipient_id: "u-1" })
    const r1 = acknowledgeComm(a, "T1")
    const r2 = acknowledgeComm(r1, "T2")
    expect(r2).toBe(r1) // idempotent
    expect(isCommResolved(r1)).toBe(true)
  })

  it("dismiss != resolve", () => {
    const a = createCommAck({ ack_id: "a-1", message_id: "m-1", recipient_id: "u-1" })
    const dismissed = dismissComm(a)
    expect(dismissed.status).toBe("dismissed")
    expect(isCommResolved(dismissed)).toBe(false)
  })

  it("escalates ack", () => {
    const a = createCommAck({ ack_id: "a-1", message_id: "m-1", recipient_id: "u-1" })
    const escalated = escalateComm(a, "T")
    expect(escalated.status).toBe("escalated")
    expect(escalated.escalated_at).toBe("T")
  })
})

// ---------------------------------------------------------------------------
// COMMS-406 — Secure attachments
// ---------------------------------------------------------------------------

const ATTACH: SecureAttachment = {
  attachment_id: "att-1", org_id: "org-1", owner_id: "u-1",
  file_path: "/files/doc.pdf", mime_type: "application/pdf",
  access_token: "tok-abc", token_expires_at: "2025-12-01T00:00:00Z",
  status: "active", revoked_by: null, revoked_at: null,
}

describe("checkAttachmentAccess", () => {
  it("allows access for active valid token and correct org", () => {
    const r = checkAttachmentAccess(ATTACH, "org-1", "2025-08-01T00:00:00Z")
    expect(r.allowed).toBe(true)
  })

  it("blocks revoked attachment", () => {
    const r = checkAttachmentAccess(revokeAttachment(ATTACH, "u", "T"), "org-1", "T")
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/revoked/)
  })

  it("blocks expired token", () => {
    const r = checkAttachmentAccess(ATTACH, "org-1", "2026-01-01T00:00:00Z")
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/expired/)
  })

  it("blocks cross-org access", () => {
    const r = checkAttachmentAccess(ATTACH, "org-2", "2025-08-01T00:00:00Z")
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/cross-org/i)
  })
})

describe("revokeAttachment / refreshAttachmentToken", () => {
  it("revokes an attachment", () => {
    const r = revokeAttachment(ATTACH, "admin", "T")
    expect(r.status).toBe("revoked")
    expect(r.revoked_by).toBe("admin")
  })

  it("refreshes token on active attachment", () => {
    const r = refreshAttachmentToken(ATTACH, "new-tok", "2026-01-01T00:00:00Z")
    expect(r.access_token).toBe("new-tok")
    expect(r.token_expires_at).toBe("2026-01-01T00:00:00Z")
  })

  it("does not refresh revoked attachment", () => {
    const revoked = revokeAttachment(ATTACH, "a", "T")
    const r = refreshAttachmentToken(revoked, "new-tok", "T2")
    expect(r.access_token).toBe(ATTACH.access_token) // unchanged
  })
})
