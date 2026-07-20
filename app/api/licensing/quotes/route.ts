import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { canTransitionQuote } from "@/lib/music/licensing/quote-state-machine"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  request_id: z.string().uuid(),
  currency: z.string().length(3).default("USD"),
  amount_minor: z.number().int().nonnegative().optional(),
  terms: z.record(z.unknown()).default({}),
  valid_until: z.string().datetime().optional().nullable(),
  issue: z.boolean().default(false),
})

const transitionSchema = z.object({
  quote_id: z.string().uuid(),
  to_status: z.enum(["draft", "issued", "countered", "accepted", "expired", "withdrawn", "superseded"]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_quotes_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing quotes are not available.", retryable: false })

  const requestId = request.nextUrl.searchParams.get("request_id")
  if (!requestId)
    return jsonError({ status: 400, code: "validation_error", message: "request_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_license_quotes")
    .select("id, request_id, version, status, currency, amount_minor, valid_until, created_at")
    .eq("request_id", requestId)
    .order("version", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "quotes_query_failed", message: "Unable to load quotes.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: LICENSING_DISCLAIMER,
    note: "A quote is not a licence.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_quotes_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing quotes are not available.", retryable: false })

    const body = await request.json()
    if (body?.quote_id && body?.to_status) {
      const transition = transitionSchema.parse(body)
      const { data: existing } = await supabase
        .from("music_license_quotes")
        .select("id, status")
        .eq("id", transition.quote_id)
        .single()
      if (!existing)
        return jsonError({ status: 404, code: "not_found", message: "Quote not found.", retryable: false })
      if (!canTransitionQuote(existing.status as any, transition.to_status))
        return jsonError({ status: 409, code: "invalid_transition", message: "Invalid quote transition.", retryable: false })

      const { data, error } = await supabase
        .from("music_license_quotes")
        .update({ status: transition.to_status })
        .eq("id", transition.quote_id)
        .select("id, status, version")
        .single()
      if (error)
        return jsonError({ status: 500, code: "quote_transition_failed", message: "Unable to update quote.", retryable: true })
      return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER })
    }

    const payload = createSchema.parse(body)
    const { data: requestRow } = await supabase
      .from("music_license_requests")
      .select("id, classification_status")
      .eq("id", payload.request_id)
      .single()
    if (!requestRow)
      return jsonError({ status: 404, code: "not_found", message: "Request not found.", retryable: false })
    if (!["classified", "counsel_review", "partner_routed"].includes(requestRow.classification_status))
      return jsonError({ status: 409, code: "classification_required", message: "Classify request before quoting.", retryable: false })

    const { data: latest } = await supabase
      .from("music_license_quotes")
      .select("version")
      .eq("request_id", payload.request_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabase
      .from("music_license_quotes")
      .insert({
        request_id: payload.request_id,
        version: (latest?.version || 0) + 1,
        status: payload.issue ? "issued" : "draft",
        currency: payload.currency,
        amount_minor: payload.amount_minor ?? null,
        terms: payload.terms,
        valid_until: payload.valid_until || null,
        created_by: user.id,
      })
      .select("id, request_id, version, status, amount_minor, currency")
      .single()

    if (error)
      return jsonError({ status: 500, code: "quote_create_failed", message: "Unable to create quote.", retryable: true })

    return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER, note: "Quote is not a licence." }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid quote payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "quote_create_failed", message: "Unable to create quote.", retryable: true })
  }
}
