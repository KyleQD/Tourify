import { z } from "zod"

/**
 * Flow Music Universe public linkage contract, v1.
 * Public projection only. NOT a staff record, identity authorization token,
 * News approval decision, employment credential or hiring entitlement.
 */
export const musicUniverseEntityKindSchema = z.enum([
  "artist", "person", "professional", "release", "recording",
  "venue", "event", "organization", "news_story", "work_opportunity",
])

const publicIdentifierSchema = z.string().min(1).max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9:_-]*$/)

export function isSafePublicMusicHref(value: string): boolean {
  if (value.length > 700 || /[\\\u0000-\u001F\u007F]/.test(value)) return false
  try {
    // No protocol-relative, backslash, userinfo, URL fragments or traversal.
    if (value.startsWith("/") && !value.startsWith("//")) {
      if (value.includes("#") || /%2f|%5c|%25/i.test(value)) return false
      const url = new URL(value, "https://flow.invalid")
      if (url.origin !== "https://flow.invalid" || url.pathname.includes("..")) return false
      const segments = decodeURIComponent(url.pathname).split("/")
      if (segments.some(segment => segment === "." || segment === "..")) return false
      return true
    }
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname) &&
      !url.username && !url.password && !url.port &&
      !/^(localhost|.*\.localhost|.*\.local)$/i.test(url.hostname) &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) &&
      !url.hostname.includes(":")
  } catch {
    return false
  }
}

export const musicUniversePublicHrefSchema = z.string().min(2).max(700)
  .refine(isSafePublicMusicHref, "Unsafe public music destination")

export const musicUniversePublicEntityRefSchema = z.object({
  kind: musicUniverseEntityKindSchema,
  id: publicIdentifierSchema,
  label: z.string().trim().min(1).max(180),
  href: musicUniversePublicHrefSchema.optional(),
}).strict()

export const musicUniverseSourceSystemSchema = z.enum([
  "tourify_news", "tourify_work", "tourify_events",
  "dreamstream", "werk", "prez", "music_catalog",
])

export const musicUniversePublicRelationSchema = z.object({
  schemaVersion: z.literal(1),
  subject: musicUniversePublicEntityRefSchema,
  object: musicUniversePublicEntityRefSchema,
  relationship: z.enum([
    "reported_about", "offers_opportunity", "credited_on",
    "performed_at", "featured_on_release", "appears_at",
  ]),
  destination: z.object({
    href: musicUniversePublicHrefSchema,
    label: z.string().trim().min(1).max(180),
    // Public Work cards must expire even when cached by a consumer.
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  }).strict(),
  provenance: z.object({
    sourceSystem: musicUniverseSourceSystemSchema,
    sourceRecordId: publicIdentifierSchema,
    sourceName: z.string().trim().min(1).max(180),
    // A publisher reporting a statement is NOT the same as verifying it.
    evidence: z.enum([
      "source_reported", "self_claimed", "editorial_reviewed",
      "employer_attested", "independently_corrob", "disputed",
    ]),
    publishedAt: z.string().datetime({ offset: true }),
  }).strict(),
  disclosure: z.object({
    visibility: z.literal("public"),
    professionalConsent: z.enum(["not_applicable", "opted_in"]),
  }).strict(),
}).strict().superRefine((link, ctx) => {
  const professional = link.subject.kind === "professional" ||
    link.object.kind === "professional" ||
    link.relationship === "credited_on"
  if (professional && link.disclosure.professionalConsent !== "opted_in") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Professional credit requires explicit public disclosure" })
  }
  if (link.relationship === "offers_opportunity" &&
      (link.object.kind !== "work_opportunity" ||
       link.provenance.sourceSystem !== "tourify_work")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only public Work opportunities may use offers_opportunity" })
  }
  if (link.relationship === "reported_about" &&
      (link.subject.kind !== "news_story" ||
       link.provenance.sourceSystem !== "tourify_news")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "News associations must originate in the public News projection" })
  }
})

export const musicUniversePublicResponseSchema = z.object({
  schemaVersion: z.literal(1),
  links: z.array(musicUniversePublicRelationSchema).max(50),
}).strict()

export type MusicUniversePublicEntityRef = z.infer<typeof musicUniversePublicEntityRefSchema>
export type MusicUniversePublicRelation = z.infer<typeof musicUniversePublicRelationSchema>
export type MusicUniversePublicResponse = z.infer<typeof musicUniversePublicResponseSchema>
