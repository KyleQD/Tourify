/**
 * P14-T07 — publication transitions with reviewer/publisher separation.
 *
 * Built strictly on the frozen P2 vocabulary:
 *   draft → published | retired; published → retired; retired terminal.
 * Corrections never edit published rows — they supersede them with new
 * draft rows. Publishing requires `world.knowledge.publish` (publisher);
 * retiring requires it too; superseding requires only review authority.
 */
import type { WorldAuditAction } from "./audit-events"
import { nextVersion } from "./concurrency"

export type PublicationState = "draft" | "published" | "retired"

export const REQUIRED_PUBLISH_PERMISSION = "world.knowledge.publish"
export const REQUIRED_RETIRE_PERMISSION = "world.knowledge.publish"
/** Superseding is a review-authority operation (new row starts as draft). */
export const REQUIRED_SUPERSEDE_PERMISSION = "world.knowledge.review"

export interface PublicationSnapshot {
  id: string
  publication_status: PublicationState
  /** Candidates must be review-approved before publish. */
  review_status?: string | null
  version?: number | null
}

export interface PublicationPatch {
  publication_status?: PublicationState
  version: number
}

export type PublicationPlan =
  | { ok: true; patch: PublicationPatch; auditAction: WorldAuditAction }
  | { ok: false; error: string }

function fail(error: string): PublicationPlan {
  return { ok: false, error }
}

export function planPublish(
  snapshot: PublicationSnapshot,
  opts: { hasPublishPermission: boolean },
): PublicationPlan {
  if (!opts.hasPublishPermission) return fail("publish_permission_required")
  if (snapshot.publication_status !== "draft") return fail(`publish_requires_draft_got_${snapshot.publication_status}`)
  if (snapshot.review_status && snapshot.review_status !== "approved") {
    return fail(`publish_requires_approved_review_got_${snapshot.review_status}`)
  }
  return {
    ok: true,
    patch: { publication_status: "published", version: nextVersion(snapshot.version) },
    auditAction: "publication.publish",
  }
}

export function planRetire(
  snapshot: PublicationSnapshot,
  opts: { hasPublishPermission: boolean; reason: string },
): PublicationPlan {
  if (!opts.hasPublishPermission) return fail("retire_permission_required")
  if (!opts.reason?.trim()) return fail("reason_required")
  if (snapshot.publication_status !== "published" && snapshot.publication_status !== "draft") {
    return fail(`retire_requires_published_or_draft_got_${snapshot.publication_status}`)
  }
  return {
    ok: true,
    patch: { publication_status: "retired", version: nextVersion(snapshot.version) },
    auditAction: "publication.retire",
  }
}

/**
 * Revert-by-supersede: the frozen contract forbids published→draft edits.
 * A correction creates a NEW draft referencing the original; the original
 * stays intact until the successor publishes and retires it.
 */
export function planSupersede(
  snapshot: PublicationSnapshot,
  opts: { hasReviewPermission: boolean },
): PublicationPlan {
  if (!opts.hasReviewPermission) return fail("review_permission_required")
  if (snapshot.publication_status === "draft") return fail("supersede_requires_published_or_retired")
  // The successor draft row is created by the orchestrator; the original
  // row itself is never edited (frozen: corrections create new rows).
  return {
    ok: true,
    patch: { version: nextVersion(snapshot.version) },
    auditAction: "publication.supersede",
  }
}
