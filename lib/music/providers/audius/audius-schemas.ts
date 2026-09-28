/**
 * lib/music/providers/audius/audius-schemas.ts
 *
 * Zod runtime schemas for Audius API responses.
 * Unknown fields are stripped (z.object strips by default).
 * All fields outside the required set are nullable/optional.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const AudiusArtworkSchema = z
  .object({
    "150x150": z.string().optional(),
    "480x480": z.string().optional(),
    "1000x1000": z.string().optional(),
  })
  .optional()
  .nullable()

const AudiusUserSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  handle: z.string().optional().nullable(),
  profile_picture: AudiusArtworkSchema,
})

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

export const AudiusTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  user: AudiusUserSchema,
  artwork: AudiusArtworkSchema,
  /** Duration in seconds (integer) */
  duration: z.number().int().nonnegative().optional().nullable(),
  genre: z.string().optional().nullable(),
  /** Audius permalink, e.g. https://audius.co/artist/track */
  permalink: z.string().optional().nullable(),
  /** Whether the track is available for streaming */
  is_streamable: z.boolean().optional().nullable(),
  /** Whether the track has been deleted */
  is_delete: z.boolean().optional().nullable(),
  /** Whether the track is unlisted/private */
  is_unlisted: z.boolean().optional().nullable(),
})

export type AudiusTrack = z.infer<typeof AudiusTrackSchema>

// ---------------------------------------------------------------------------
// Search response
// ---------------------------------------------------------------------------

export const AudiusSearchResponseSchema = z.object({
  data: z.array(AudiusTrackSchema).optional().nullable(),
})

export type AudiusSearchResponse = z.infer<typeof AudiusSearchResponseSchema>

// ---------------------------------------------------------------------------
// Trending response — same shape as search response
// ---------------------------------------------------------------------------

export const AudiusTrendingResponseSchema = AudiusSearchResponseSchema
export type AudiusTrendingResponse = AudiusSearchResponse

// ---------------------------------------------------------------------------
// Single track response
// ---------------------------------------------------------------------------

export const AudiusSingleTrackResponseSchema = z.object({
  data: AudiusTrackSchema.optional().nullable(),
})

export type AudiusSingleTrackResponse = z.infer<typeof AudiusSingleTrackResponseSchema>

// ---------------------------------------------------------------------------
// Stream URL response (GET /v1/tracks/{id}/stream returns a redirect,
// we capture the final URL from the response or Location header)
// ---------------------------------------------------------------------------

export const AudiusStreamResponseSchema = z.object({
  // Some discovery nodes return a JSON wrapper with the URL
  url: z.string().optional().nullable(),
})
