// REFERENCE ONLY: public verification must return a narrow allowlisted payload.
import { jsonError } from "@/lib/api/route-helpers"

export interface PublicMusicOriginPayload {
  publicId: string
  trackTitle: string
  artistName: string
  recordedAt: string
  status: "active" | "suspended" | "superseded" | "revoked"
  manifestHash: string
  disclaimer: string
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params

  if (!publicId) {
    return jsonError("origin_record_not_found", 404)
  }

  // Use a server-only client, load the public origin record, confirm the linked track
  // is publicly playable, and map only allowlisted fields. Never return manifest_json,
  // storage paths, declarations, evidence, internal scores, or user contact data.

  return jsonError("reference_route_not_implemented", 501)
}
