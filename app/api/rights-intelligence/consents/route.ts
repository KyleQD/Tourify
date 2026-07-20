import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { resolveConsent } from "@/lib/music/rights-intelligence/consent-policy"
import type { IntelligencePurpose } from "@/lib/music/rights-intelligence/rights-intelligence-domain"

export const dynamic = "force-dynamic"

const purposeEnum = z.enum([
  "private_diagnostics",
  "aggregate_benchmarking",
  "policy_research",
  "contract_education",
  "negotiation_readiness",
  "collective_licensing_feasibility",
])

const createSchema = z.object({
  purpose: purposeEnum,
  version: z.string().min(1).default("1.0.0"),
  data_categories: z.array(z.string()).default([]),
  output_classes: z.array(z.string()).default([]),
  expires_at: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_consent_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence consent is not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_consents")
    .select("id, purpose_id, version, data_categories, output_classes, status, effective_at, expires_at, revoked_at, created_at, music_intelligence_purposes(code)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "consents_query_failed", message: "Unable to load consents.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_consent_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence consent is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    if (payload.purpose === "collective_licensing_feasibility" && !flags.music_rights_intelligence_collective_licensing_enabled)
      return jsonError({ status: 403, code: "purpose_gated", message: "Collective licensing purpose remains separately gated.", retryable: false })

    const { data: purpose, error: purposeError } = await supabase
      .from("music_intelligence_purposes")
      .select("id, code, is_active")
      .eq("code", payload.purpose)
      .maybeSingle()

    if (purposeError || !purpose || !purpose.is_active)
      return jsonError({ status: 400, code: "purpose_unavailable", message: "Purpose is not active.", retryable: false })

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("music_intelligence_consents")
      .insert({
        user_id: user.id,
        purpose_id: purpose.id,
        version: payload.version,
        data_categories: payload.data_categories,
        output_classes: payload.output_classes,
        status: "active",
        effective_at: nowIso,
        expires_at: payload.expires_at || null,
      })
      .select("id, purpose_id, version, status, effective_at, expires_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "consent_create_failed", message: "Unable to create consent.", retryable: true })

    const decision = resolveConsent({
      consents: [{
        subjectId: user.id,
        purpose: payload.purpose as IntelligencePurpose,
        dataCategories: payload.data_categories,
        outputClasses: payload.output_classes,
        effectiveAt: nowIso,
        expiresAt: payload.expires_at || null,
      }],
      subjectId: user.id,
      purpose: payload.purpose as IntelligencePurpose,
      nowIso,
    })

    return NextResponse.json({
      data,
      consentDecision: decision,
      disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid consent payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "consent_create_failed", message: "Unable to create consent.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_consent_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence consent is not available.", retryable: false })

  const consentId = request.nextUrl.searchParams.get("id")
  if (!consentId)
    return jsonError({ status: 400, code: "validation_error", message: "Consent id is required.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("music_intelligence_consents")
    .update({ status: "revoked", revoked_at: nowIso })
    .eq("id", consentId)
    .eq("user_id", user.id)
    .select("id, status, revoked_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "consent_revoke_failed", message: "Unable to revoke consent.", retryable: true })

  await supabase.from("music_intelligence_outbox").insert({
    event_type: "consent.revoked",
    aggregate_id: data.id,
    payload: { user_id: user.id, consent_id: data.id },
    idempotency_key: `consent-revoke:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, optOutQueued: true })
}
