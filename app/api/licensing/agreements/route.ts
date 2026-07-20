import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { validateLicenseGrant } from "@/lib/music/licensing/license-grant-validator"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { createSandboxSignatureAdapter } from "@/lib/music/licensing/partner-adapters"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  request_id: z.string().uuid(),
  quote_id: z.string().uuid().optional().nullable(),
  terms: z.record(z.unknown()).default({}),
  start_signature: z.boolean().default(false),
})

const statusSchema = z.object({
  agreement_id: z.string().uuid(),
  status: z.enum(["draft", "pending_signatures", "executed", "effective", "suspended", "terminated", "expired", "amended"]),
  conditions_satisfied: z.boolean().default(false),
  payment_required: z.boolean().default(false),
  payment_confirmed: z.boolean().default(false),
  territories: z.array(z.string()).default(["US"]),
  media: z.array(z.string()).default(["film"]),
  uses: z.array(z.string()).default(["background"]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_agreements_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing agreements are not available.", retryable: false })

  const requestId = request.nextUrl.searchParams.get("request_id")
  let query = supabase
    .from("music_license_agreements")
    .select("id, public_id, request_id, quote_id, status, effective_at, expires_at, current_version, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
  if (requestId) query = query.eq("request_id", requestId)

  const { data, error } = await query
  if (error)
    return jsonError({ status: 500, code: "agreements_query_failed", message: "Unable to load agreements.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_agreements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing agreements are not available.", retryable: false })

    const body = await request.json()
    if (body?.agreement_id && body?.status) {
      const payload = statusSchema.parse(body)
      const grant = validateLicenseGrant({
        agreementExecuted: payload.status === "executed" || payload.status === "effective",
        conditionsSatisfied: payload.conditions_satisfied,
        paymentRequired: payload.payment_required,
        paymentConfirmed: payload.payment_confirmed,
        scope: {
          family: "sync",
          assetIds: ["placeholder"],
          territories: payload.territories,
          termStartsAt: new Date().toISOString(),
          media: payload.media,
          uses: payload.uses,
        },
        legs: [],
      })

      if (payload.status === "effective" && !grant.effective)
        return jsonError({
          status: 409,
          code: "grant_not_effective",
          message: "Agreement cannot become effective until grant validation passes.",
          retryable: false,
          issues: grant.errors,
        })

      const patch: Record<string, unknown> = {
        status: payload.status,
        updated_at: new Date().toISOString(),
      }
      if (payload.status === "effective") patch.effective_at = new Date().toISOString()

      const { data, error } = await supabase
        .from("music_license_agreements")
        .update(patch)
        .eq("id", payload.agreement_id)
        .select("id, status, effective_at")
        .single()
      if (error)
        return jsonError({ status: 500, code: "agreement_update_failed", message: "Unable to update agreement.", retryable: true })
      return NextResponse.json({ data, grant, disclaimer: LICENSING_DISCLAIMER })
    }

    const payload = createSchema.parse(body)
    let signatureEnvelopeId: string | null = null
    let status = "draft"
    if (payload.start_signature) {
      const adapter = createSandboxSignatureAdapter()
      const envelope = await adapter.createEnvelope(payload.request_id, [user.id])
      signatureEnvelopeId = envelope.envelopeId
      status = "pending_signatures"
    }

    const { data, error } = await supabase
      .from("music_license_agreements")
      .insert({
        request_id: payload.request_id,
        quote_id: payload.quote_id || null,
        terms: payload.terms,
        status,
        signature_provider: payload.start_signature ? "sandbox" : null,
        signature_envelope_id: signatureEnvelopeId,
        created_by: user.id,
        current_version: 1,
      })
      .select("id, public_id, request_id, status, signature_envelope_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "agreement_create_failed", message: "Unable to create agreement.", retryable: true })

    await supabase.from("music_license_agreement_versions").insert({
      agreement_id: data.id,
      version: 1,
      change_summary: "initial",
      created_by: user.id,
    })

    return NextResponse.json({
      data,
      disclaimer: LICENSING_DISCLAIMER,
      note: "Only an executed, effective agreement authorizes use.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid agreement payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "agreement_create_failed", message: "Unable to create agreement.", retryable: true })
  }
}
