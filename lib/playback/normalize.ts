import { z } from "zod"
import type { MediaResolveRequest } from "./types"

const sessionSurface = {
  playbackSessionId: z.string().uuid().optional().nullable(),
  sourceSurface: z.string().max(100).optional().nullable(),
}

/**
 * Discriminated resolution requests (plan section 5). Absent `kind` means
 * `track` for backwards compatibility. Each kind validates exactly the one
 * identifier it expects; mixed or unexpected identifiers fail closed.
 */
export const MediaResolveRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("track"), trackId: z.string().uuid(), ...sessionSurface }),
  z.object({
    kind: z.literal("radio_stream"),
    stationId: z.string().uuid(),
    ...sessionSurface,
  }),
  z.object({
    kind: z.literal("sound_guide"),
    mediaAssetId: z.string().uuid(),
    ...sessionSurface,
  }),
  z.object({
    kind: z.literal("archive_audio"),
    mediaAssetId: z.string().uuid(),
    ...sessionSurface,
  }),
  z.object({
    kind: z.literal("narration"),
    mediaAssetId: z.string().uuid(),
    ...sessionSurface,
  }),
])

export interface ParsedResolveRequest {
  ok: true
  request: MediaResolveRequest
}

export interface RejectedResolveRequest {
  ok: false
  reason: string
}

/**
 * Parse a resolve body. Legacy `{ trackId, ... }` bodies are accepted as
 * tracks. A `kind` must match exactly one expected identifier; supplying the
 * wrong identifier for the declared kind is rejected.
 */
export function parseResolveRequest(body: unknown): ParsedResolveRequest | RejectedResolveRequest {
  if (
    body !== null &&
    typeof body === "object" &&
    !("kind" in (body as Record<string, unknown>)) &&
    typeof (body as Record<string, unknown>).trackId === "string"
  ) {
    // Legacy shape — validate with the track branch.
    const parsed = MediaResolveRequestSchema.safeParse({ kind: "track", ...(body as object) })
    if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid request" }
    return { ok: true, request: parsed.data }
  }

  const parsed = MediaResolveRequestSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid request" }
  }

  const request = parsed.data
  if ("kind" in request && request.kind !== "track") {
    const forbidden =
      ("stationId" in request && request.kind !== "radio_stream") ||
      ("mediaAssetId" in request && !(request.kind === "sound_guide" || request.kind === "archive_audio" || request.kind === "narration")) ||
      ("trackId" in request && request.kind !== "track")
    if (forbidden) return { ok: false, reason: "identifier does not match requested media kind" }
  }
  return { ok: true, request }
}
