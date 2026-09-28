/**
 * lib/events/providers/schemas.ts
 *
 * Zod runtime validation for the normalized provider contract.
 * Every third-party payload crosses this boundary before touching the
 * canonical event service.
 */

import { z } from "zod"

const isoDateTime = z.string().min(10).nullable()
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

export const normalizedVenueSchema = z.object({
  providerVenueId: z.string().nullable(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  stateCode: z.string().nullable(),
  countryCode: z.string().nullable(),
  postalCode: z.string().nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  timezone: z.string().nullable(),
})

export const normalizedPerformerSchema = z.object({
  providerPerformerId: z.string().nullable(),
  name: z.string().min(1),
  isHeadliner: z.boolean(),
})

export const normalizedClassificationSchema = z.object({
  kind: z.enum(["segment", "genre", "subGenre", "type", "subType"]),
  key: z.string().min(1),
  label: z.string().nullable(),
})

export const normalizedImageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  ratio: z.string().nullable(),
  isFallback: z.boolean(),
})

export const normalizedTicketOfferSchema = z.object({
  label: z.string().nullable(),
  url: z.string().url(),
  currency: z.string().length(3).nullable(),
  minPrice: z.number().nonnegative().nullable(),
  maxPrice: z.number().nonnegative().nullable(),
  saleStartAt: isoDateTime,
  saleEndAt: isoDateTime,
  status: z.enum(["onsale", "offsale", "presale", "cancelled", "unknown"]),
  isPrimary: z.boolean(),
})

export const normalizedExternalEventSchema = z.object({
  provider: z.enum(["ticketmaster", "bandsintown", "native"]),
  providerEventId: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  title: z.string().min(1),
  normalizedTitle: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(["scheduled", "cancelled", "postponed", "rescheduled", "unknown"]),
  startAt: isoDateTime,
  endAt: isoDateTime,
  localDate: isoDate,
  localTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(),
  timezone: z.string().nullable(),
  venue: normalizedVenueSchema.nullable(),
  performers: z.array(normalizedPerformerSchema),
  classifications: z.array(normalizedClassificationSchema),
  images: z.array(normalizedImageSchema),
  ticketOffers: z.array(normalizedTicketOfferSchema),
  providerUpdatedAt: isoDateTime,
  rawPayloadHash: z.string().min(8),
  fetchedAt: z.string().min(10),
})

export type NormalizedExternalEventInput = z.input<typeof normalizedExternalEventSchema>
export type NormalizedExternalEventOutput = z.output<typeof normalizedExternalEventSchema>

/** Normalize a display title for matching: lowercase, strip punctuation/diacritics. */
export function normalizeTitleKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // strip combining diacritical marks (U+0300–U+036F)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** SHA-256 hex of a stable serialization, for change detection on refetch. */
export async function hashRawPayload(payload: unknown): Promise<string> {
  const text = stableStringify(payload)
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(",")}}`
}
