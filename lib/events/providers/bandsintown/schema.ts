/**
 * lib/events/providers/bandsintown/schema.ts
 *
 * Zod schemas for the Bandsintown artist-events API subset. Re-verify
 * against current official docs before enabling any mode.
 */

import { z } from "zod"

export const bitVenueSchema = z.object({
  name: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
})

export const bitOfferSchema = z.object({
  type: z.string().optional(),
  url: z.string().url().optional(),
  status: z.string().optional(),
})

export const bitArtistSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  url: z.string().optional(),
})

export const bitEventSchema = z.object({
  id: z.union([z.string(), z.number()]),
  artist_id: z.union([z.string(), z.number()]).optional(),
  url: z.string().url().optional(),
  on_sale_datetime: z.string().optional(),
  datetime: z.string().optional(),
  description: z.string().optional(),
  title: z.string().optional(),
  venue: bitVenueSchema.optional(),
  offers: z.array(bitOfferSchema).optional(),
  lineup: z.array(z.string()).optional(),
  artist: bitArtistSchema.optional(),
})

export type BitEvent = z.infer<typeof bitEventSchema>

export const bitEventsResponseSchema = z.array(bitEventSchema)
