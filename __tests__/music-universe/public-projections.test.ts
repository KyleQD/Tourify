import { describe, expect, it } from "vitest"
import {
  isSafePublicMusicHref,
  musicUniversePublicRelationSchema,
  musicUniversePublicResponseSchema,
} from "@tourify/api-contracts"
import {
  linkPublishedNewsToEntity,
  linkPublicWorkOpportunity,
  selectPublicMusicContextLinks,
} from "@/lib/music-universe/public-projections"

const artist = {
  kind: "artist" as const,
  id: "artist-public-001",
  label: "The Aurora Group",
  href: "/artists/aurora-group"
}
const venue = {
  kind: "venue" as const,
  id: "venue-public-002",
  label: "The Glasshouse",
  href: "/venues/glasshouse"
}
const news = {
  id: "11111111-1111-4111-8111-111111111111",
  origin_type: "editorial",
  source_name: "Tourify News",
  headline: "The Aurora Group Announces New Tour",
  excerpt: "The group shared confirmed dates.",
  canonical_url: "https://example.org/story",
  image_url: null,
  topics: ["Tour"],
  story_id: null,
  published_at: "2026-10-18T10:00:00Z",
}
const work = {
  key: "artist_job:22222222-2222-4222-8222-222222222222",
  source: "artist_job",
  sourceId: "22222222-2222-4222-8222-222222222222",
  kind: "creative_collaboration",
  title: "Looking for a songwriting partner",
  publishedAt: "2026-10-18T10:00:00Z",
  expiresAt: "2026-12-18T10:00:00Z",
  detailHref: "/jobs/22222222-2222-4222-8222-222222222222?source=artist",
  verifiedPaidEmployer: false,
  description: "Original collaborative songwriting",
  location: "Las Vegas",
  contact_email: "never-expose@example.org",
  applicant_notes: "Sensitive internal fields stay out of this linkage",
}

describe("Music Universe public integration contract v1", () => {
  it("projects a published News DTO only with an explicitly supplied public entity", () => {
    const link = linkPublishedNewsToEntity(news, artist)
    expect(link).not.toBeNull()
    expect(link?.relationship).toBe("reported_about")
    expect(link?.object).toEqual(artist)
    expect(link?.provenance.evidence).toBe("source_reported")
    expect(JSON.stringify(link)).not.toContain("verified_source")
  })

  it("rejects a draft / raw News record with undisclosed moderation fields", () => {
    expect(linkPublishedNewsToEntity({
      ...news, moderation_state: "pending", draft_body: "Confidential reporting"
    }, artist)).toBeNull()
  })

  it("projects only the public Work DTO fields, never private contact or applicant data", () => {
    const link = linkPublicWorkOpportunity(work, artist, new Date("2026-10-20T10:00:00Z"))
    expect(link?.relationship).toBe("offers_opportunity")
    expect(link?.destination.href).toBe(work.detailHref)
    expect(JSON.stringify(link)).not.toContain("never-expose")
    expect(JSON.stringify(link)).not.toContain("applicant_notes")
    expect(link?.provenance.evidence).toBe("self_claimed")
  })

  it("does not let collaborations impersonate paid hiring, or nonartists publish them", () => {
    const date = new Date("2026-10-20T10:00:00Z")
    expect(linkPublicWorkOpportunity({ ...work, kind: "paid_work" }, artist, date)).toBeNull()
    expect(linkPublicWorkOpportunity(work, venue, date)).toBeNull()
    expect(linkPublicWorkOpportunity({
      ...work, key: "artist_job:mismatched-id"
    }, artist, date)).toBeNull()
  })

  it("does not link expired Work opportunities", () => {
    expect(linkPublicWorkOpportunity(work, artist, new Date("2027-02-01T00:00:00Z"))).toBeNull()
  })

  it("requires professional consent for career credit and person references", () => {
    const base = linkPublishedNewsToEntity(news, artist)
    expect(base).not.toBeNull()
    const claim = {
      ...base!,
      subject: { kind: "person", id: "public-person-1", label: "Guest Crew Member" },
      object: { kind: "event", id: "public-event-1", label: "Example Show" },
      relationship: "credited_on",
      disclosure: { visibility: "public", professionalConsent: "not_applicable" }
    }
    expect(musicUniversePublicRelationSchema.safeParse(claim).success).toBe(false)
    const optedIn = { ...claim, disclosure: { visibility: "public", professionalConsent: "opted_in" } }
    expect(musicUniversePublicRelationSchema.safeParse(optedIn).success).toBe(true)
  })

  it("hides Work from the general Home feed until the user explicitly opts in", () => {
    const date = new Date("2026-10-20T10:00:00Z")
    const workLink = linkPublicWorkOpportunity(work, artist, date)!
    const newsLink = linkPublishedNewsToEntity(news, artist)!
    const defaultHome = selectPublicMusicContextLinks([workLink, newsLink], { surface: "home", now: date })
    expect(defaultHome.links.map(link => link.relationship)).toEqual(["reported_about"])

    const optedIn = selectPublicMusicContextLinks([workLink, newsLink], {
      surface: "home", workRecommendationsOptIn: true, now: date
    })
    expect(optedIn.links).toHaveLength(2)
    expect(selectPublicMusicContextLinks([workLink], { surface: "work", now: date }).links).toHaveLength(1)
  })

  it("rejects extra sensitive fields rather than serializing arbitrary objects", () => {
    const published = linkPublishedNewsToEntity(news, artist)!
    const polluted = { ...published, direct_message_contents: "secret" }
    expect(musicUniversePublicRelationSchema.safeParse(polluted).success).toBe(false)
    expect(selectPublicMusicContextLinks([polluted], { surface: "news" }).links).toEqual([])
    expect(musicUniversePublicResponseSchema.safeParse({
      schemaVersion: 1, links: [published], userEmail: "secret@example.org"
    }).success).toBe(false)
  })

  it("rejects dangerous and internal private URLs", () => {
    expect(isSafePublicMusicHref("javascript:alert(1)")).toBe(false)
    expect(isSafePublicMusicHref("//evil.example.org/path")).toBe(false)
    expect(isSafePublicMusicHref("/%2e%2e/admin")).toBe(false)
    expect(isSafePublicMusicHref("/../admin")).toBe(false)
    expect(isSafePublicMusicHref("https://127.0.0.1/secrets")).toBe(false)
    expect(isSafePublicMusicHref("/jobs/safe-public-id?source=artist")).toBe(true)
  })

  it("deduplicates the same public relationship and applies expiry even to cached links", () => {
    const date = new Date("2026-10-20T10:00:00Z")
    const link = linkPublicWorkOpportunity(work, artist, date)!
    expect(selectPublicMusicContextLinks([link, link], {
      surface: "work", now: date
    }).links).toHaveLength(1)
    expect(selectPublicMusicContextLinks([link], {
      surface: "work", now: new Date("2026-12-19T00:00:00Z")
    }).links).toHaveLength(0)
  })
})
