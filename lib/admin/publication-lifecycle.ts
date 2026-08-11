/**
 * PUB-207 — Publication retract / supersede lifecycle (pure).
 * Snapshots stay immutable; only status/reason/superseded_by change.
 * Access must reflect state immediately; history is retained.
 */

import type { PublicationSnapshotStatus } from "@/lib/admin/publication-schema"

export type PublicationLifecycleAction = "retract" | "supersede"

export interface PublicationLifecycleSnapshot {
  id: string
  orgId: string
  status: PublicationSnapshotStatus | string
  supersededBy?: string | null
  retractedAt?: string | null
  retractedReason?: string | null
  sequence?: number | null
  version?: number | null
  publicationType?: string | null
  tourId?: string | null
  eventId?: string | null
  title?: string | null
  checksum?: string | null
}

export type PublicationLifecycleDenyReason =
  | "missing"
  | "already_retracted"
  | "already_superseded"
  | "not_committed"
  | "invalid_successor"
  | "reason_required"

export function canRetractPublication(
  snapshot: PublicationLifecycleSnapshot | null,
): { ok: true } | { ok: false; reason: PublicationLifecycleDenyReason } {
  if (!snapshot) return { ok: false, reason: "missing" }
  if (snapshot.status === "retracted" || snapshot.retractedAt)
    return { ok: false, reason: "already_retracted" }
  if (snapshot.status === "superseded")
    return { ok: false, reason: "already_superseded" }
  if (snapshot.status !== "committed") return { ok: false, reason: "not_committed" }
  return { ok: true }
}

export function canSupersedePublication(
  snapshot: PublicationLifecycleSnapshot | null,
  successorId?: string | null,
): { ok: true } | { ok: false; reason: PublicationLifecycleDenyReason } {
  if (!snapshot) return { ok: false, reason: "missing" }
  if (snapshot.status === "retracted" || snapshot.retractedAt)
    return { ok: false, reason: "already_retracted" }
  if (snapshot.status === "superseded")
    return { ok: false, reason: "already_superseded" }
  if (snapshot.status !== "committed") return { ok: false, reason: "not_committed" }
  if (successorId && successorId === snapshot.id)
    return { ok: false, reason: "invalid_successor" }
  return { ok: true }
}

export function validateRetractionReason(reason: string | null | undefined): {
  ok: true
  reason: string
} | { ok: false; reason: PublicationLifecycleDenyReason } {
  const trimmed = reason?.trim() || ""
  if (!trimmed || trimmed.length < 3) return { ok: false, reason: "reason_required" }
  return { ok: true, reason: trimmed.slice(0, 2000) }
}

export interface PublicationLifecyclePatch {
  status: "retracted" | "superseded"
  retracted_at?: string | null
  retracted_reason?: string | null
  superseded_by?: string | null
  updated_at: string
}

export function buildRetractionPatch(input: {
  reason: string
  at?: string
}): PublicationLifecyclePatch {
  const at = input.at || new Date().toISOString()
  return {
    status: "retracted",
    retracted_at: at,
    retracted_reason: input.reason,
    updated_at: at,
  }
}

export function buildSupersedePatch(input: {
  successorSnapshotId: string
  at?: string
}): PublicationLifecyclePatch {
  const at = input.at || new Date().toISOString()
  return {
    status: "superseded",
    superseded_by: input.successorSnapshotId,
    updated_at: at,
  }
}

/** Structured notice for recipients (change_notice / outbox payload). */
export function buildPublicationLifecycleNotice(input: {
  action: PublicationLifecycleAction
  snapshot: PublicationLifecycleSnapshot
  reason?: string | null
  successorSnapshotId?: string | null
  actorUserId: string
  correlationId: string
}): Record<string, unknown> {
  return {
    kind:
      input.action === "retract" ? "publication.retracted" : "publication.superseded",
    action: input.action,
    snapshotId: input.snapshot.id,
    publicationType: input.snapshot.publicationType ?? null,
    title: input.snapshot.title ?? null,
    sequence: input.snapshot.sequence ?? null,
    version: input.snapshot.version ?? null,
    tourId: input.snapshot.tourId ?? null,
    eventId: input.snapshot.eventId ?? null,
    checksum: input.snapshot.checksum ?? null,
    reason: input.reason ?? null,
    successorSnapshotId: input.successorSnapshotId ?? null,
    actorUserId: input.actorUserId,
    correlationId: input.correlationId,
    accessInvalidated: true,
    payloadImmutable: true,
    historyRetained: true,
  }
}

export function accessStateForSnapshot(
  snapshot: Pick<PublicationLifecycleSnapshot, "status" | "retractedAt">,
): "active" | "superseded" | "retracted" | "unavailable" {
  if (snapshot.status === "retracted" || snapshot.retractedAt) return "retracted"
  if (snapshot.status === "superseded") return "superseded"
  if (snapshot.status === "committed") return "active"
  return "unavailable"
}

/** History rows remain readable for authorized audit even after retract/supersede. */
export function isRetainedInPublicationHistory(
  status: string,
): boolean {
  return ["committed", "superseded", "retracted"].includes(status)
}
