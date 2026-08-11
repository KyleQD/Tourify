/**
 * lib/events/providers/ticketmaster/schema.ts
 *
 * Zod schemas for the subset of the Ticketmaster Discovery API v2 event
 * payload that Tourify consumes. Unknown fields are tolerated (passthrough
 * is not used — we simply don't model them), but everything we read is
 * validated. Re-verify against the official docs before enabling.
 */

import { z } from "zod"

const tmImageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  ratio: z.string().optional(),
  fallback: z.boolean().optional(),
})

const tmVenueSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: z.object({ line1: z.string().optional() }).optional(),
  city: z.object({ name: z.string().optional() }).optional(),
  state: z.object({ stateCode: z.string().optional(), name: z.string().optional() }).optional(),
  country: z.object({ countryCode: z.string().optional(), name: z.string().optional() }).optional(),
  postalCode: z.string().optional(),
  location: z.object({ longitude: z.string().optional(), latitude: z.string().optional() }).optional(),
  timezone: z.string().optional(),
})

const tmAttractionSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
})

const tmClassificationSchema = z.object({
  segment: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  genre: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  subGenre: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  type: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  subType: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
})

const tmPriceRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().optional(),
})

export const tmEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  info: z.string().optional(),
  dates: z
    .object({
      start: z
        .object({
          dateTime: z.string().optional(),
          localDate: z.string().optional(),
          localTime: z.string().optional(),
        })
        .optional(),
      end: z.object({ dateTime: z.string().optional() }).optional(),
      status: z.object({ code: z.string().optional() }).optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  images: z.array(tmImageSchema).optional(),
  classifications: z.array(tmClassificationSchema).optional(),
  priceRanges: z.array(tmPriceRangeSchema).optional(),
  sales: z
    .object({
      public: z
        .object({
          startDateTime: z.string().optional(),
          endDateTime: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  _embedded: z
    .object({
      venues: z.array(tmVenueSchema).optional(),
      attractions: z.array(tmAttractionSchema).optional(),
    })
    .optional(),
})

export const tmSearchResponseSchema = z.object({
  _embedded: z.object({ events: z.array(tmEventSchema) }).optional(),
  page: z
    .object({
      size: z.number().optional(),
      totalElements: z.number().optional(),
      totalPages: z.number().optional(),
      number: z.number().optional(),
    })
    .optional(),
})

export type TmEvent = z.infer<typeof tmEventSchema>
export type TmSearchResponse = z.infer<typeof tmSearchResponseSchema>
