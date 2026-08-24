/**
 * P8 — Content geography domain rules.
 *
 * Core invariants:
 * - `about_place` is the ONLY public content→place relationship (P8-T01).
 *   It answers "what is this content ABOUT", never "where was it posted
 *   from" — `posted_from` is private/internal by construction (P8-T04) and
 *   can never be promoted to public.
 * - Only content that passed its normal publication/moderation gates is
 *   projected into World (P8-T05).
 * - Feed copies / cross-posts collapse to one canonical item (P8-T06).
 */
import type { EntityKind } from "@/lib/world/contracts/v1"

export type ContentType = "post" | "blog_article" | "press_release"

export const CONTENT_TABLES: Readonly<Record<ContentType, string>> = Object.freeze({
  post: "posts",
  blog_article: "artist_blog_posts",
  press_release: "press_releases",
})

/** P8-T01 — the only public relation for content. */
export const ABOUT_PLACE_RELATION: { domain: "content_place"; key: "about_place" } = {
  domain: "content_place",
  key: "about_place",
}

/** P8-T04 — posted_from visibility ceiling. */
export type PostedFromVisibility = "private" | "internal"

export function postedFromVisibilityCeiling(): "private" | "internal" {
  return "private"
}

// ─── P8-T03 deterministic derivation from linked event/venue ────────────

export interface LinkedEventRef {
  /** Deterministic only when the link is a hard FK, not a text mention. */
  linkType: "hard_fk"
  placeId: string | null
}

/**
 * Derive about_place from a canonical linked event. Deterministic means a
 * hard foreign-key relationship with a resolved event place — text mentions,
 * tags, or inferred venue names do NOT qualify.
 */
export function deriveAboutPlaceFromEvent(
  link: LinkedEventRef | null,
): string | null {
  if (!link || link.linkType !== "hard_fk") return null
  return link.placeId
}

// ─── P8-T07 relevance scoring ────────────────────────────────────────────

export interface RelevanceInput {
  explicitTag: boolean
  derivedFromEvent: boolean
  editorialCurated: boolean
}

/**
 * Location relevance score combining three signals (P8-T07):
 *   explicit editorial tag      → strongest (0.6)
 *   deterministic event link    → strong (0.3)
 *   editorial curation boost    → +0.1
 * Score never exceeds 1 and never implies verified fact status — it ranks,
 * it does not verify.
 */
export function relevanceScore(input: RelevanceInput): number {
  let score = 0
  if (input.explicitTag) score += 0.6
  if (input.derivedFromEvent) score += 0.3
  if (input.editorialCurated) score += 0.1
  return Math.min(Math.round(score * 100) / 100, 1)
}

// ─── P8-T05 moderation/publication gate ──────────────────────────────────

export type ContentPublicationState =
  | "draft"
  | "scheduled"
  | "published"
  | "removed"
export type ContentModerationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"

/**
 * World projection requires the content to pass its OWN normal gates first.
 * Drafts, scheduled-but-unpublished, removed, and rejected content are all
 * excluded from regional discovery.
 */
export function canProjectContent(
  publicationState: ContentPublicationState,
  moderationStatus: ContentModerationStatus,
): boolean {
  if (publicationState !== "published") return false
  if (moderationStatus === "rejected") return false
  return true
}

// ─── P8-T08 dispute/correction behavior ──────────────────────────────────

export interface PlaceDispute {
  contentId: string
  disputedPlaceId: string
  reason?: string | null
}

export interface DisputeResolutionPlan {
  /** Immediately hide from public while under review (fail closed). */
  suspendPublicProjection: boolean
  keepInternalRecord: boolean
  /** Editorial re-review required before any public restoration. */
  requiresEditorialReview: boolean
}

/**
 * A disputed place association suspends PUBLIC projection immediately and
 * routes to editorial review. Internal records persist for audit; nothing
 * is deleted silently.
 */
export function planDisputeResolution(dispute: PlaceDispute): DisputeResolutionPlan {
  if (!dispute.contentId || !dispute.disputedPlaceId) {
    throw new Error("dispute requires contentId and disputedPlaceId")
  }
  return {
    suspendPublicProjection: true,
    keepInternalRecord: true,
    requiresEditorialReview: true,
  }
}
