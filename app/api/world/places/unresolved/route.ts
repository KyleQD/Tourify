/**
 * POST /api/world/places/unresolved
 *
 * "Cannot find place" flow: persists an internal resolution candidate.
 * Authenticated users create their own rows (RLS-enforced); reviewers work
 * the queue in the console. No geo_places row is ever auto-created here.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, readJson, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

const BodySchema = z.object({
  queryText: z.string().trim().min(1).max(200),
  countryHint: z.string().regex(/^[A-Z]{2}$/i).max(2).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response
  const { user, supabase } = auth.auth

  const parsed = await readJson(request, BodySchema)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "INVALID_REQUEST", message: "Invalid unresolved-place payload.", retryable: false })
  }

  // Idempotency: same user + same normalized query while still open → return
  // the existing candidate instead of stacking duplicates.
  const normalized = parsed.data.queryText.replace(/\s+/g, " ").trim()
  const { data: existing } = await supabase
    .from("world_place_resolution_candidates")
    .select("id,status")
    .eq("requested_by", user.id)
    .eq("status", "open")
    .ilike("query_text", normalized)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ data: existing, error: null }, { status: 200 })
  }

  const { data, error } = await supabase
    .from("world_place_resolution_candidates")
    .insert({
      query_text: normalized,
      country_hint: parsed.data.countryHint?.toUpperCase() ?? null,
      requested_by: user.id,
    })
    .select("id,status")
    .single()

  if (error) {
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "Could not record the place request.", retryable: true })
  }
  return NextResponse.json({ data, error: null })
}
