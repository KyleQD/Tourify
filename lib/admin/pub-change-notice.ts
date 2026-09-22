/**
 * PUB-403 — Structured change notices.
 *
 * Post-publication change sets:
 *  - Identify affected recipients and sections
 *  - Show before/after diffs in local-context-friendly format
 *  - Flag when re-acknowledgement is required per policy
 *  - Link to remediation steps
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChangeNoticeStatus = "draft" | "sent" | "superseded" | "cancelled"

export type ReAckPolicy = "required" | "recommended" | "none"

export interface ChangeNoticeField {
  field: string
  before: unknown
  after: unknown
  /** Display-friendly label in local context. */
  display_label: string | null
}

export interface ChangeNoticeSection {
  section_key: string
  fields: ChangeNoticeField[]
  re_ack_policy: ReAckPolicy
  /** Link to the admin surface where this can be remediated. */
  remediation_link: string | null
}

export interface ChangeNoticeRecipient {
  recipient_id: string
  /** Subset of sections relevant to this recipient. */
  affected_section_keys: string[]
  re_ack_required: boolean
  acknowledged_at: string | null
}

export interface PublicationChangeNotice {
  notice_id: string
  publication_id: string
  previous_publication_id: string | null
  status: ChangeNoticeStatus
  sections: ChangeNoticeSection[]
  recipients: ChangeNoticeRecipient[]
  created_by: string
  created_at: string
  sent_at: string | null
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createChangeNotice(params: {
  notice_id: string
  publication_id: string
  previous_publication_id: string | null
  sections: ChangeNoticeSection[]
  recipients: ChangeNoticeRecipient[]
  created_by: string
  now: string
}): PublicationChangeNotice {
  return {
    notice_id: params.notice_id,
    publication_id: params.publication_id,
    previous_publication_id: params.previous_publication_id,
    status: "draft",
    sections: params.sections,
    recipients: params.recipients,
    created_by: params.created_by,
    created_at: params.now,
    sent_at: null,
  }
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export function sendChangeNotice(
  notice: PublicationChangeNotice,
  now: string,
): { ok: boolean; notice: PublicationChangeNotice | null; error?: string } {
  if (notice.status !== "draft") {
    return { ok: false, notice: null, error: `Cannot send a notice with status '${notice.status}'.` }
  }
  if (notice.sections.length === 0) {
    return { ok: false, notice: null, error: "Change notice must have at least one section." }
  }
  return { ok: true, notice: { ...notice, status: "sent", sent_at: now } }
}

// ---------------------------------------------------------------------------
// Re-ack: project which recipients need to re-acknowledge
// ---------------------------------------------------------------------------

export function getReAckRequired(
  notice: PublicationChangeNotice,
): ChangeNoticeRecipient[] {
  return notice.recipients.filter((r) => r.re_ack_required && !r.acknowledged_at)
}

export function acknowledgeChangeNotice(
  notice: PublicationChangeNotice,
  recipient_id: string,
  now: string,
): PublicationChangeNotice {
  const recipients = notice.recipients.map((r) =>
    r.recipient_id === recipient_id ? { ...r, acknowledged_at: now } : r,
  )
  return { ...notice, recipients }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface ChangeNoticeSummary {
  total_sections: number
  sections_requiring_re_ack: number
  total_recipients: number
  re_ack_pending_count: number
  all_recipients_acked: boolean
}

export function summarizeChangeNotice(notice: PublicationChangeNotice): ChangeNoticeSummary {
  const sections_requiring_re_ack = notice.sections.filter((s) => s.re_ack_policy === "required").length
  const re_ack_pending = getReAckRequired(notice)
  return {
    total_sections: notice.sections.length,
    sections_requiring_re_ack,
    total_recipients: notice.recipients.length,
    re_ack_pending_count: re_ack_pending.length,
    all_recipients_acked: re_ack_pending.length === 0,
  }
}
