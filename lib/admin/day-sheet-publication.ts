/**
 * LIVE-404 — Publish recipient-specific day sheets
 *
 * A DaySheetPublication records one versioned publication event that
 * distributes audience-filtered day sheets.  Each recipient receives their
 * own projected copy; sensitive contacts/travel are filtered per audience.
 *
 * Features:
 *   - Version/diff against a previous publication
 *   - Per-recipient acknowledgement (token-based)
 *   - Offline package manifest for worker offline access
 *   - Delivery status tracking per recipient
 *
 * Pure domain logic; no Supabase imports.
 */
import type { DaySheet } from "./day-sheet-composer"

// ---------------------------------------------------------------------------
// Publication status
// ---------------------------------------------------------------------------

export type DaySheetPublicationStatus =
  | "draft"
  | "publishing"   // in flight
  | "published"
  | "superseded"   // replaced by a newer publication

// ---------------------------------------------------------------------------
// Recipient role used for audience filtering
// ---------------------------------------------------------------------------

export type RecipientAudienceRole =
  | "crew"
  | "management"
  | "artist"
  | "vendor"
  | "press"

// ---------------------------------------------------------------------------
// Recipient entry
// ---------------------------------------------------------------------------

export interface DaySheetRecipient {
  user_id: string
  audience_role: RecipientAudienceRole
  /** Whether this recipient's day sheet version includes sensitive data */
  include_sensitive: boolean
  /** IANA time zone for local time display */
  time_zone: string
}

// ---------------------------------------------------------------------------
// Projected day sheet — recipient-specific version
// ---------------------------------------------------------------------------

export interface ProjectedDaySheet {
  recipient_user_id: string
  audience_role: RecipientAudienceRole
  day_sheet: DaySheet
  /** Short content hash to detect changes between publications */
  content_hash: string
  /** Offline access token (caller generates and stores; we record the ref) */
  offline_token_ref?: string
}

// ---------------------------------------------------------------------------
// Acknowledgement record
// ---------------------------------------------------------------------------

export type AckStatus = "pending" | "acknowledged" | "declined_to_ack"

export interface DaySheetAcknowledgement {
  user_id: string
  publication_id: string
  status: AckStatus
  ack_token: string
  ack_deadline?: string    // ISO-8601
  acknowledged_at?: string
  declined_at?: string
}

/** Verify and apply acknowledgement — idempotent */
export function applyDaySheetAcknowledgement(
  ack: DaySheetAcknowledgement,
  suppliedToken: string,
  now?: string,
): DaySheetAcknowledgement {
  if (ack.status === "acknowledged") return ack  // idempotent
  if (ack.ack_token !== suppliedToken) {
    throw new Error("Acknowledgement token mismatch.")
  }
  const ts = now ?? new Date().toISOString()
  return { ...ack, status: "acknowledged", acknowledged_at: ts }
}

// ---------------------------------------------------------------------------
// Per-recipient delivery record
// ---------------------------------------------------------------------------

export type DeliveryStatus = "pending" | "sent" | "delivered" | "failed" | "skipped"

export interface DaySheetDelivery {
  id: string
  publication_id: string
  recipient_user_id: string
  status: DeliveryStatus
  sent_at?: string
  error?: string
  retry_count: number
}

export function applyDeliveryOutcome(
  delivery: DaySheetDelivery,
  outcome: "sent" | "delivered" | "failed",
  opts: { sent_at?: string; error?: string; now?: string } = {},
): DaySheetDelivery {
  const ts = opts.now ?? new Date().toISOString()
  return {
    ...delivery,
    status: outcome,
    sent_at: outcome === "sent" || outcome === "delivered" ? (opts.sent_at ?? ts) : delivery.sent_at,
    error: outcome === "failed" ? opts.error : undefined,
    retry_count: outcome === "failed" ? delivery.retry_count + 1 : delivery.retry_count,
  }
}

// ---------------------------------------------------------------------------
// Publication diff — per-recipient summary of what changed
// ---------------------------------------------------------------------------

export interface RecipientDiff {
  user_id: string
  has_changes: boolean
  previous_hash?: string
  current_hash: string
}

export function computeRecipientDiffs(
  previous: ProjectedDaySheet[],
  current: ProjectedDaySheet[],
): RecipientDiff[] {
  const prevMap = new Map(previous.map((p) => [p.recipient_user_id, p]))

  return current.map((curr) => {
    const prev = prevMap.get(curr.recipient_user_id)
    return {
      user_id: curr.recipient_user_id,
      has_changes: !prev || prev.content_hash !== curr.content_hash,
      previous_hash: prev?.content_hash,
      current_hash: curr.content_hash,
    }
  })
}

// ---------------------------------------------------------------------------
// DaySheetPublication record
// ---------------------------------------------------------------------------

export interface DaySheetPublication {
  id: string
  org_id: string
  event_id: string
  version_number: number
  status: DaySheetPublicationStatus
  previous_publication_id?: string

  /** Pre-composed recipient projections (one per recipient) */
  projections: ProjectedDaySheet[]
  acknowledgements: DaySheetAcknowledgement[]
  deliveries: DaySheetDelivery[]

  published_by?: string
  published_at?: string

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Build a new publication
// ---------------------------------------------------------------------------

export interface BuildPublicationInput {
  id: string
  org_id: string
  event_id: string
  projections: ProjectedDaySheet[]
  acknowledgements: DaySheetAcknowledgement[]
  deliveries: DaySheetDelivery[]
  previous_publication_id?: string
  previous_version_number?: number
  published_by: string
  now?: string
}

export function buildDaySheetPublication(
  input: BuildPublicationInput,
): DaySheetPublication {
  const ts = input.now ?? new Date().toISOString()

  return {
    id: input.id,
    org_id: input.org_id,
    event_id: input.event_id,
    version_number: (input.previous_version_number ?? 0) + 1,
    status: "published",
    previous_publication_id: input.previous_publication_id,
    projections: input.projections,
    acknowledgements: input.acknowledgements,
    deliveries: input.deliveries,
    published_by: input.published_by,
    published_at: ts,
    created_at: ts,
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Supersede old publication
// ---------------------------------------------------------------------------

export function supersedePublication(
  pub: DaySheetPublication,
  now?: string,
): DaySheetPublication {
  if (pub.status === "superseded") return pub  // idempotent
  const ts = now ?? new Date().toISOString()
  return { ...pub, status: "superseded", updated_at: ts }
}

// ---------------------------------------------------------------------------
// Publication summary
// ---------------------------------------------------------------------------

export interface DaySheetPublicationSummary {
  id: string
  version_number: number
  status: DaySheetPublicationStatus
  recipient_count: number
  ack_pending: number
  ack_complete: number
  delivery_failed: number
  can_supersede: boolean
}

export function summarizePublication(pub: DaySheetPublication): DaySheetPublicationSummary {
  const ack_pending = pub.acknowledgements.filter((a) => a.status === "pending").length
  const ack_complete = pub.acknowledgements.filter((a) => a.status === "acknowledged").length
  const delivery_failed = pub.deliveries.filter((d) => d.status === "failed").length

  return {
    id: pub.id,
    version_number: pub.version_number,
    status: pub.status,
    recipient_count: pub.projections.length,
    ack_pending,
    ack_complete,
    delivery_failed,
    can_supersede: pub.status === "published",
  }
}
