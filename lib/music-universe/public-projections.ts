import { z } from "zod"
import {
  musicUniversePublicEntityRefSchema,
  musicUniversePublicHrefSchema,
  musicUniversePublicRelationSchema,
  musicUniversePublicResponseSchema,
  type MusicUniversePublicEntityRef,
  type MusicUniversePublicRelation,
  type MusicUniversePublicResponse,
} from "@tourify/api-contracts"

const publicNewsReadSchema = z.object({
  id: z.string().uuid(),
  origin_type: z.enum(["rss", "community", "editorial"]),
  source_name: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  excerpt: z.string(),
  canonical_url: musicUniversePublicHrefSchema,
  image_url: z.string().nullable(),
  topics: z.array(z.string()),
  story_id: z.string().uuid().nullable(),
  published_at: z.string().datetime({ offset: true }),
}).strict()

/**
 * Adapter input is the *public indexed News read DTO* returned by a server
 * query using published/approved RLS. Not raw RSS, private editorial tips,
 * or legacy social posts. Entity association is supplied by a trusted,
 * reviewed link table -- never inferred from a headline automatically.
 */
export function linkPublishedNewsToEntity(
  publishedPublicNewsDto: unknown,
  linkedEntity: unknown
): MusicUniversePublicRelation | null {
  const news = publicNewsReadSchema.safeParse(publishedPublicNewsDto)
  const entity = musicUniversePublicEntityRefSchema.safeParse(linkedEntity)
  if (!news.success || !entity.success) return null
  const row = news.data
  if (entity.data.kind === "professional" || entity.data.kind === "work_opportunity") return null

  const proposed = {
    schemaVersion: 1,
    subject: {
      kind: "news_story",
      id: row.id,
      label: row.headline,
    },
    object: entity.data,
    relationship: "reported_about",
    destination: { href: row.canonical_url, label: row.headline },
    provenance: {
      sourceSystem: "tourify_news",
      sourceRecordId: row.id,
      sourceName: row.source_name,
      evidence: "source_reported",
      publishedAt: row.published_at,
    },
    disclosure: { visibility: "public", professionalConsent: "not_applicable" }
  }
  const result = musicUniversePublicRelationSchema.safeParse(proposed)
  return result.success ? result.data : null
}

const publicWorkReadSchema = z.object({
  key: z.string().min(3),
  source: z.enum(["artist_job", "venue_staffing"]),
  sourceId: z.string().min(1),
  kind: z.enum(["paid_work", "creative_collaboration"]),
  title: z.string().trim().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  detailHref: musicUniversePublicHrefSchema,
  verifiedPaidEmployer: z.boolean(),
  // Additional public Work DTO fields are deliberately discarded rather than
  // projected; raw applicant details must never be accepted as Work DTOs.
})

/**
 * Takes only a server-produced, post-policy PublicWorkOpportunity DTO.
 * This helper NEVER grants hiring/publishing authority or checks Stripe.
 * Employer approvals, payment and quota checks belong in Work's guarded API.
 */
export function linkPublicWorkOpportunity(
  publicWorkDto: unknown,
  publisherEntity: unknown,
  now: Date = new Date()
): MusicUniversePublicRelation | null {
  const job = publicWorkReadSchema.safeParse(publicWorkDto)
  const publisher = musicUniversePublicEntityRefSchema.safeParse(publisherEntity)
  if (!job.success || !publisher.success || !Number.isFinite(now.getTime())) return null

  const data = job.data
  if (data.key !== data.source + ":" + data.sourceId) return null
  if (data.expiresAt && Date.parse(data.expiresAt) <= now.getTime()) return null
  if (data.kind === "paid_work" && !data.verifiedPaidEmployer) return null

  if (data.kind === "creative_collaboration" &&
      (data.source !== "artist_job" || publisher.data.kind !== "artist")) return null
  if (data.kind === "paid_work" &&
      !["artist", "venue", "organization", "service"].includes(publisher.data.kind)) return null

  const proposed = {
    schemaVersion: 1,
    subject: publisher.data,
    object: {
      kind: "work_opportunity",
      id: data.key,
      label: data.title
    },
    relationship: "offers_opportunity",
    destination: {
      href: data.detailHref,
      label: data.title,
      expiresAt: data.expiresAt
    },
    provenance: {
      sourceSystem: "tourify_work",
      sourceRecordId: data.key,
      sourceName: publisher.data.label,
      evidence: data.kind === "paid_work" ? "source_reported" : "self_claimed",
      publishedAt: data.publishedAt
    },
    disclosure: { visibility: "public", professionalConsent: "not_applicable" }
  }
  const result = musicUniversePublicRelationSchema.safeParse(proposed)
  return result.success ? result.data : null
}

export type MusicContextSurface = "home" | "news" | "work" | "artist" | "event" | "profile"

export interface PublicLinkPresentationPolicy {
  surface: MusicContextSurface
  /** Default false: Work opportunities must not silently enter Flow Home. */
  workRecommendationsOptIn?: boolean
  now?: Date
}

/**
 * User-facing allowlist and intent filter; only already-public link DTOs enter.
 * Does not replace the owning service's database RLS or moderation decisions.
 */
export function selectPublicMusicContextLinks(
  candidates: unknown[],
  policy: PublicLinkPresentationPolicy
): MusicUniversePublicResponse {
  const now = policy.now ?? new Date()
  const results: MusicUniversePublicRelation[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const parsed = musicUniversePublicRelationSchema.safeParse(candidate)
    if (!parsed.success) continue
    const link = parsed.data
    if (link.destination.expiresAt &&
        Date.parse(link.destination.expiresAt) <= now.getTime()) continue
    if (policy.surface === "home" && !policy.workRecommendationsOptIn &&
        (link.relationship === "offers_opportunity" ||
         link.provenance.sourceSystem === "tourify_work")) continue

    const key = [
      link.provenance.sourceSystem, link.provenance.sourceRecordId,
      link.relationship, link.object.kind, link.object.id
    ].join("|")
    if (seen.has(key)) continue
    seen.add(key)
    results.push(link)
    if (results.length === 50) break
  }
  return musicUniversePublicResponseSchema.parse({
    schemaVersion: 1,
    links: results
  })
}
