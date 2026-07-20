// REFERENCE ONLY: adapt Supabase helper imports and table types after repository audit.
import { z } from "zod"

import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

const createCertificationCaseSchema = z.object({
  trackId: z.string().uuid(),
  certificationType: z.enum(["origin_record", "human_created"]).default("human_created"),
  standardVersion: z.string().min(1).max(64),
  requestedLevel: z.number().int().min(0).max(5).default(1),
})

export async function POST(request: Request) {
  const authResult = await requireApiUser(request)
  if (!authResult.ok) return authResult.response

  const parsed = createCertificationCaseSchema.safeParse(await request.json())
  if (!parsed.success) {
    return jsonError("invalid_request", 400, parsed.error.flatten())
  }

  // Audit the repository's route-scoped Supabase client before implementing.
  // Required behavior:
  // 1. Load artist_music by trackId and authenticated user.id.
  // 2. Reject materially_generated or unknown tracks.
  // 3. Idempotently return an existing active draft/submitted case.
  // 4. Insert the case and append an event.
  // 5. Return the narrow case payload.

  return jsonError("reference_route_not_implemented", 501)
}
