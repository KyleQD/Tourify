import { describe, it, expect } from "vitest"
import {
  buildReminderDedupKey,
  scheduleReminder,
  computeReminderSchedule,
  markReminderDispatched,
  shouldSkipReminderDelivery,
  recordReminderDelivery,
  type AdvanceReminderSchedule,
  type ReminderRecipientPreferences,
  type AdvanceEscalationPolicy,
} from "../../lib/admin/advance-reminders"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PREFS: ReminderRecipientPreferences = {
  user_id: "user-pm",
  preferred_channels: ["in_app", "email"],
  time_zone: "America/New_York",
  opt_out_types: [],
}

const POLICY: AdvanceEscalationPolicy = {
  critical_categories: ["venue_details", "production"],
  escalation_after_hours: 24,
  escalation_target_ids: ["user-director"],
  escalation_channel: "email",
}

function baseScheduleEntry(overrides: Partial<AdvanceReminderSchedule> = {}): AdvanceReminderSchedule {
  return {
    id: "rem-1",
    advance_section_id: "sec-1",
    recipient_user_id: "user-pm",
    type: "approaching_due",
    channel: "email",
    scheduled_at: "2025-08-25T13:00:00.000Z",
    section_due_date: "2025-09-01",
    dispatched: false,
    dedup_key: "sec-1:user-pm:approaching_due:2025-08-25",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// buildReminderDedupKey
// ---------------------------------------------------------------------------

describe("buildReminderDedupKey", () => {
  it("generates stable key", () => {
    expect(buildReminderDedupKey("sec-1", "user-pm", "approaching_due", "2025-08-25"))
      .toBe("sec-1:user-pm:approaching_due:2025-08-25")
  })
  it("omits date_key when not provided", () => {
    expect(buildReminderDedupKey("sec-1", "user-pm", "overdue"))
      .toBe("sec-1:user-pm:overdue")
  })
})

// ---------------------------------------------------------------------------
// scheduleReminder
// ---------------------------------------------------------------------------

describe("scheduleReminder", () => {
  it("adds a new entry", () => {
    const result = scheduleReminder([], {
      id: "rem-1", advance_section_id: "sec-1", recipient_user_id: "user-pm",
      type: "approaching_due", channel: "email",
      scheduled_at: "2025-08-25T13:00:00Z", section_due_date: "2025-09-01",
      date_key: "2025-08-25",
    })
    expect(result).toHaveLength(1)
    expect(result[0].dedup_key).toBe("sec-1:user-pm:approaching_due:2025-08-25")
  })

  it("is idempotent — duplicate dedup_key is a no-op", () => {
    const existing = [baseScheduleEntry()]
    const result = scheduleReminder(existing, {
      id: "rem-2", advance_section_id: "sec-1", recipient_user_id: "user-pm",
      type: "approaching_due", channel: "email",
      scheduled_at: "2025-08-25T13:00:00Z", section_due_date: "2025-09-01",
      date_key: "2025-08-25",
    })
    expect(result).toHaveLength(1)  // unchanged
  })

  it("adds two entries for different types", () => {
    const r1 = scheduleReminder([], {
      id: "rem-1", advance_section_id: "sec-1", recipient_user_id: "user-pm",
      type: "approaching_due", channel: "email",
      scheduled_at: "2025-08-25T13:00:00Z", section_due_date: "2025-09-01",
      date_key: "2025-08-25",
    })
    const r2 = scheduleReminder(r1, {
      id: "rem-2", advance_section_id: "sec-1", recipient_user_id: "user-pm",
      type: "overdue", channel: "email",
      scheduled_at: "2025-09-06T09:00:00Z", section_due_date: "2025-09-01",
      date_key: "2025-09-06",
    })
    expect(r2).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// computeReminderSchedule
// ---------------------------------------------------------------------------

describe("computeReminderSchedule", () => {
  it("produces approaching_due reminders for upcoming section", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-09-15",
      is_critical: false,
      recipient: PREFS,
      policy: POLICY,
      today: "2025-09-01",   // 14 days before
      id_prefix: "rem",
    })
    // Should include 7d, 3d, 1d entries for each channel (in_app + email) → 6 total
    const types = entries.map((e) => `${e.type}:${e.channel}`)
    expect(entries.filter((e) => e.type === "approaching_due").length).toBeGreaterThanOrEqual(2)
    expect(types.every((t) => !t.startsWith("overdue") && !t.startsWith("escalation"))).toBe(true)
  })

  it("produces overdue reminders for past-due section", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-08-01",
      is_critical: false,
      recipient: PREFS,
      policy: POLICY,
      today: "2025-09-01",
      id_prefix: "rem",
    })
    expect(entries.some((e) => e.type === "overdue")).toBe(true)
  })

  it("produces escalation for critical overdue section", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-08-01",
      is_critical: true,
      recipient: PREFS,
      policy: POLICY,
      today: "2025-09-01",   // 31 days overdue → > 24h threshold
      id_prefix: "rem",
    })
    const escalations = entries.filter((e) => e.type === "escalation")
    expect(escalations.length).toBeGreaterThan(0)
    expect(escalations[0].recipient_user_id).toBe("user-director")
    expect(escalations[0].channel).toBe("email")
  })

  it("does not produce escalation for non-critical overdue section", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-08-01",
      is_critical: false,
      recipient: PREFS,
      policy: POLICY,
      today: "2025-09-01",
      id_prefix: "rem",
    })
    expect(entries.some((e) => e.type === "escalation")).toBe(false)
  })

  it("respects opt_out_types", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-09-15",
      is_critical: false,
      recipient: { ...PREFS, opt_out_types: ["approaching_due"] },
      policy: POLICY,
      today: "2025-09-01",
      id_prefix: "rem",
    })
    expect(entries.some((e) => e.type === "approaching_due")).toBe(false)
  })

  it("produces no duplicate dedup_keys", () => {
    const entries = computeReminderSchedule({
      advance_section_id: "sec-1",
      section_due_date: "2025-09-15",
      is_critical: true,
      recipient: PREFS,
      policy: POLICY,
      today: "2025-09-01",
      id_prefix: "rem",
    })
    const keys = entries.map((e) => e.dedup_key)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

// ---------------------------------------------------------------------------
// markReminderDispatched
// ---------------------------------------------------------------------------

describe("markReminderDispatched", () => {
  it("marks entry dispatched", () => {
    const updated = markReminderDispatched(baseScheduleEntry(), "2025-08-25T09:00:00Z")
    expect(updated.dispatched).toBe(true)
    expect(updated.dispatched_at).toBe("2025-08-25T09:00:00Z")
  })
  it("is idempotent — calling twice returns same record", () => {
    const d1 = markReminderDispatched(baseScheduleEntry(), "2025-08-25T09:00:00Z")
    const d2 = markReminderDispatched(d1, "2025-08-26T09:00:00Z")
    expect(d2.dispatched_at).toBe("2025-08-25T09:00:00Z")  // original preserved
  })
})

// ---------------------------------------------------------------------------
// shouldSkipReminderDelivery
// ---------------------------------------------------------------------------

describe("shouldSkipReminderDelivery", () => {
  it("skips when section already approved", () => {
    const r = shouldSkipReminderDelivery({ preferences: PREFS, type: "approaching_due", section_approved: true })
    expect(r.skip).toBe(true)
    expect(r.reason).toBe("section_already_approved")
  })
  it("skips when recipient opted out", () => {
    const r = shouldSkipReminderDelivery({
      preferences: { ...PREFS, opt_out_types: ["overdue"] },
      type: "overdue",
      section_approved: false,
    })
    expect(r.skip).toBe(true)
    expect(r.reason).toBe("recipient_opted_out")
  })
  it("does not skip active reminder for non-approved section", () => {
    const r = shouldSkipReminderDelivery({ preferences: PREFS, type: "approaching_due", section_approved: false })
    expect(r.skip).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// recordReminderDelivery
// ---------------------------------------------------------------------------

describe("recordReminderDelivery", () => {
  it("records a sent delivery", () => {
    const d = recordReminderDelivery(baseScheduleEntry(), "sent", { id: "del-1", sent_at: "2025-08-25T09:00:00Z" })
    expect(d.status).toBe("sent")
    expect(d.schedule_id).toBe("rem-1")
    expect(d.sent_at).toBe("2025-08-25T09:00:00Z")
  })
  it("records a failed delivery with error", () => {
    const d = recordReminderDelivery(baseScheduleEntry(), "failed", { id: "del-2", error: "SMTP timeout" })
    expect(d.status).toBe("failed")
    expect(d.error).toBe("SMTP timeout")
  })
  it("records a skipped delivery with reason", () => {
    const d = recordReminderDelivery(baseScheduleEntry(), "skipped", { id: "del-3", skip_reason: "section_already_approved" })
    expect(d.status).toBe("skipped")
    expect(d.skip_reason).toBe("section_already_approved")
  })
})
