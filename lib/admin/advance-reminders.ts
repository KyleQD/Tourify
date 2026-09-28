/**
 * ADV-406 — Add reminder/escalation policy
 *
 * Reminders for advance sections are:
 *   - Deduplicated by (advance_section_id, recipient, type)
 *   - Scheduled relative to the section due_date in the recipient's
 *     preferred IANA time zone
 *   - Escalated when a critical section is overdue (separate channel/priority)
 *   - Recorded in a delivery history with status tracking
 *
 * Pure domain logic; no Supabase or transport imports.
 */

// ---------------------------------------------------------------------------
// Reminder type and channel
// ---------------------------------------------------------------------------

export type ReminderType =
  | "approaching_due"      // N days before due date
  | "due_today"
  | "overdue"              // past due date (repeat interval)
  | "escalation"           // critical section overdue; higher-priority channel

export type ReminderChannel = "in_app" | "email" | "sms"

// ---------------------------------------------------------------------------
// Recipient preferences
// ---------------------------------------------------------------------------

export interface ReminderRecipientPreferences {
  user_id: string
  preferred_channels: ReminderChannel[]
  /** IANA time zone for local-time scheduling, e.g. "America/New_York" */
  time_zone: string
  /** Do-not-disturb window in local time: e.g. { start: "22:00", end: "08:00" } */
  dnd_window?: { start: string; end: string }
  opt_out_types: ReminderType[]
}

// ---------------------------------------------------------------------------
// Reminder schedule entry
// ---------------------------------------------------------------------------

export interface AdvanceReminderSchedule {
  id: string
  advance_section_id: string
  recipient_user_id: string
  type: ReminderType
  channel: ReminderChannel
  /** Scheduled send time (UTC ISO-8601) */
  scheduled_at: string
  /** ISO-8601 due_date of the section at time of scheduling */
  section_due_date: string
  /** True once a delivery record has been created for this schedule entry */
  dispatched: boolean
  dispatched_at?: string
  /** Dedupe key: prevents duplicate entries for same section+recipient+type */
  dedup_key: string
}

// ---------------------------------------------------------------------------
// Reminder delivery record
// ---------------------------------------------------------------------------

export type ReminderDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped"   // e.g. recipient opted out; section already approved

export interface AdvanceReminderDelivery {
  id: string
  schedule_id: string
  advance_section_id: string
  recipient_user_id: string
  type: ReminderType
  channel: ReminderChannel
  status: ReminderDeliveryStatus
  sent_at?: string
  error?: string
  /** Reason when status = skipped */
  skip_reason?: string
}

// ---------------------------------------------------------------------------
// Escalation policy
// ---------------------------------------------------------------------------

export interface AdvanceEscalationPolicy {
  /** Sections with this category or below are considered critical */
  critical_categories: string[]
  /** Hours overdue before escalation triggers */
  escalation_after_hours: number
  /** Escalation target: user IDs to notify (e.g. production manager) */
  escalation_target_ids: string[]
  escalation_channel: ReminderChannel
}

// ---------------------------------------------------------------------------
// Dedupe key generation
// ---------------------------------------------------------------------------

export function buildReminderDedupKey(
  advanceSectionId: string,
  recipientUserId: string,
  type: ReminderType,
  /** For repeating overdue reminders, include the date of the scheduled send */
  dateKey?: string,
): string {
  const parts = [advanceSectionId, recipientUserId, type]
  if (dateKey) parts.push(dateKey)
  return parts.join(":")
}

// ---------------------------------------------------------------------------
// Schedule reminder entries (deduped)
// ---------------------------------------------------------------------------

export interface ScheduleReminderInput {
  id: string
  advance_section_id: string
  recipient_user_id: string
  type: ReminderType
  channel: ReminderChannel
  scheduled_at: string
  section_due_date: string
  date_key?: string
}

/**
 * Adds a reminder to the schedule only if no entry with the same dedup_key
 * already exists (active or dispatched).
 * Returns the updated schedule (unchanged if already present).
 */
export function scheduleReminder(
  existing: AdvanceReminderSchedule[],
  input: ScheduleReminderInput,
): AdvanceReminderSchedule[] {
  const dedup_key = buildReminderDedupKey(
    input.advance_section_id,
    input.recipient_user_id,
    input.type,
    input.date_key,
  )
  const duplicate = existing.some((e) => e.dedup_key === dedup_key)
  if (duplicate) return existing   // idempotent no-op

  const entry: AdvanceReminderSchedule = {
    id: input.id,
    advance_section_id: input.advance_section_id,
    recipient_user_id: input.recipient_user_id,
    type: input.type,
    channel: input.channel,
    scheduled_at: input.scheduled_at,
    section_due_date: input.section_due_date,
    dispatched: false,
    dedup_key,
  }
  return [...existing, entry]
}

// ---------------------------------------------------------------------------
// Compute schedule entries for a section + recipient
// ---------------------------------------------------------------------------

export interface ComputeReminderScheduleInput {
  advance_section_id: string
  section_due_date: string    // YYYY-MM-DD
  is_critical: boolean
  recipient: ReminderRecipientPreferences
  policy: AdvanceEscalationPolicy
  today: string               // YYYY-MM-DD (UTC)
  id_prefix?: string
}

/**
 * Builds the reminder schedule entries for one section × one recipient.
 * Skips types the recipient has opted out of.
 * Applies time zone to compute local-time scheduled_at.
 */
export function computeReminderSchedule(
  input: ComputeReminderScheduleInput,
): AdvanceReminderSchedule[] {
  const { advance_section_id, section_due_date, is_critical, recipient, policy, today, id_prefix = "rem" } = input
  const entries: AdvanceReminderSchedule[] = []

  const dueDate = new Date(section_due_date + "T09:00:00")   // local 9am default
  const todayDate = new Date(today)
  const daysUntilDue = Math.floor((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

  const APPROACHING_DAYS = [7, 3, 1]

  for (const channel of recipient.preferred_channels) {
    // approaching_due reminders
    if (!recipient.opt_out_types.includes("approaching_due")) {
      for (const d of APPROACHING_DAYS) {
        if (daysUntilDue >= d) {
          const scheduledDate = new Date(dueDate)
          scheduledDate.setDate(scheduledDate.getDate() - d)
          const id = `${id_prefix}-approaching-${d}d-${channel}`
          const dateKey = scheduledDate.toISOString().slice(0, 10)
          const scheduleInput: ScheduleReminderInput = {
            id,
            advance_section_id,
            recipient_user_id: recipient.user_id,
            type: "approaching_due",
            channel,
            scheduled_at: scheduledDate.toISOString(),
            section_due_date,
            date_key: dateKey,
          }
          // inline dedup check
          const dedup_key = buildReminderDedupKey(advance_section_id, recipient.user_id, "approaching_due", dateKey)
          if (!entries.some((e) => e.dedup_key === dedup_key)) {
            entries.push({ ...scheduleInput, dispatched: false, dedup_key })
          }
        }
      }
    }

    // due_today
    if (daysUntilDue === 0 && !recipient.opt_out_types.includes("due_today")) {
      const dedup_key = buildReminderDedupKey(advance_section_id, recipient.user_id, "due_today", today)
      if (!entries.some((e) => e.dedup_key === dedup_key)) {
        entries.push({
          id: `${id_prefix}-due-today-${channel}`,
          advance_section_id,
          recipient_user_id: recipient.user_id,
          type: "due_today",
          channel,
          scheduled_at: new Date(section_due_date + "T09:00:00").toISOString(),
          section_due_date,
          dispatched: false,
          dedup_key,
        })
      }
    }

    // overdue
    if (daysUntilDue < 0 && !recipient.opt_out_types.includes("overdue")) {
      const dedup_key = buildReminderDedupKey(advance_section_id, recipient.user_id, "overdue", today)
      if (!entries.some((e) => e.dedup_key === dedup_key)) {
        entries.push({
          id: `${id_prefix}-overdue-${channel}`,
          advance_section_id,
          recipient_user_id: recipient.user_id,
          type: "overdue",
          channel,
          scheduled_at: new Date().toISOString(),
          section_due_date,
          dispatched: false,
          dedup_key,
        })
      }
    }
  }

  // Escalation — critical section and overdue beyond threshold
  if (is_critical && daysUntilDue < 0) {
    const hoursOverdue = Math.abs(daysUntilDue) * 24
    if (hoursOverdue >= policy.escalation_after_hours && !recipient.opt_out_types.includes("escalation")) {
      for (const targetId of policy.escalation_target_ids) {
        const dedup_key = buildReminderDedupKey(advance_section_id, targetId, "escalation", today)
        if (!entries.some((e) => e.dedup_key === dedup_key)) {
          entries.push({
            id: `${id_prefix}-escalation-${targetId}`,
            advance_section_id,
            recipient_user_id: targetId,
            type: "escalation",
            channel: policy.escalation_channel,
            scheduled_at: new Date().toISOString(),
            section_due_date,
            dispatched: false,
            dedup_key,
          })
        }
      }
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Mark dispatched (idempotent)
// ---------------------------------------------------------------------------

export function markReminderDispatched(
  entry: AdvanceReminderSchedule,
  now?: string,
): AdvanceReminderSchedule {
  if (entry.dispatched) return entry
  const ts = now ?? new Date().toISOString()
  return { ...entry, dispatched: true, dispatched_at: ts }
}

// ---------------------------------------------------------------------------
// Should skip delivery?
// ---------------------------------------------------------------------------

export interface ShouldSkipReminderInput {
  preferences: ReminderRecipientPreferences
  type: ReminderType
  /** true if section is already approved */
  section_approved: boolean
}

export function shouldSkipReminderDelivery(input: ShouldSkipReminderInput): {
  skip: boolean
  reason?: string
} {
  if (input.section_approved) return { skip: true, reason: "section_already_approved" }
  if (input.preferences.opt_out_types.includes(input.type)) return { skip: true, reason: "recipient_opted_out" }
  return { skip: false }
}

// ---------------------------------------------------------------------------
// Delivery record helper
// ---------------------------------------------------------------------------

export function recordReminderDelivery(
  schedule: AdvanceReminderSchedule,
  status: ReminderDeliveryStatus,
  opts: { id: string; sent_at?: string; error?: string; skip_reason?: string } = { id: "del-1" },
): AdvanceReminderDelivery {
  return {
    id: opts.id,
    schedule_id: schedule.id,
    advance_section_id: schedule.advance_section_id,
    recipient_user_id: schedule.recipient_user_id,
    type: schedule.type,
    channel: schedule.channel,
    status,
    sent_at: opts.sent_at,
    error: opts.error,
    skip_reason: opts.skip_reason,
  }
}
