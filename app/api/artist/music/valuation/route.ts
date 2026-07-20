import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { buildValuationRange, VALUATION_DISCLAIMER } from "@/lib/music/valuation/catalog-valuation"
import { parseMinorUnits } from "@/lib/music/royalties/money"
import { enqueueRoyaltyOutboxEvent, minorUnitsToDb, sha256Hex } from "@/lib/music/royalties/royalties-access"

export const dynamic = "force-dynamic"

const cashFlowSchema = z.object({
  period: z.string().min(1).max(40),
  net_cash_minor: z.string().regex(/^-?\d+$/),
  discount_factor_micros: z.string().regex(/^\d+$/),
})

const createValuationSchema = z.object({
  currency: z.string().length(3).default("USD"),
  valuation_date: z.string().min(8).max(32).optional(),
  model_key: z.string().min(1).max(80).default("tourify_dcf_v1"),
  model_version: z.string().min(1).max(40).default("1.0.0"),
  confidence_score: z.number().min(0).max(100).default(50),
  assumptions: z.record(z.string(), z.unknown()).default({}),
  exclusions: z.array(z.unknown()).default([]),
  downside: z.array(cashFlowSchema).min(1),
  base: z.array(cashFlowSchema).min(1),
  upside: z.array(cashFlowSchema).min(1),
})

function toForecast(flows: z.infer<typeof cashFlowSchema>[]) {
  return flows.map((flow) => ({
    period: flow.period,
    netCashMinor: parseMinorUnits(flow.net_cash_minor),
    discountFactorMicros: parseMinorUnits(flow.discount_factor_micros),
  }))
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_valuation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Catalog valuation is not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_valuation_catalog_valuations")
    .select("*, music_valuation_scenarios(*), music_valuation_input_snapshots(id, input_sha256, created_at)")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "valuations_query_failed", message: "Unable to load valuations.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true, disclaimer: VALUATION_DISCLAIMER })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_valuation_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Catalog valuation is not available.", retryable: false })

    const payload = createValuationSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const range = buildValuationRange({
      currency: payload.currency.toUpperCase(),
      downside: toForecast(payload.downside),
      base: toForecast(payload.base),
      upside: toForecast(payload.upside),
    })

    const inputPayload = {
      currency: payload.currency.toUpperCase(),
      model_key: payload.model_key,
      model_version: payload.model_version,
      downside: payload.downside,
      base: payload.base,
      upside: payload.upside,
      assumptions: payload.assumptions,
      exclusions: payload.exclusions,
    }
    const inputSha = sha256Hex(JSON.stringify(inputPayload))

    const { data: inputSnapshot, error: inputError } = await trusted
      .from("music_valuation_input_snapshots")
      .upsert({
        owner_user_id: user.id,
        input_sha256: inputSha,
        payload: inputPayload,
      }, { onConflict: "owner_user_id,input_sha256" })
      .select("*")
      .maybeSingle()

    if (inputError || !inputSnapshot)
      return jsonError({ status: 500, code: "valuation_input_failed", message: "Unable to store valuation inputs.", retryable: true })

    const { data: model } = await trusted
      .from("music_valuation_model_versions")
      .select("id")
      .eq("model_key", payload.model_key)
      .eq("version", payload.model_version)
      .eq("status", "active")
      .maybeSingle()

    if (!model)
      return jsonError({ status: 400, code: "model_not_active", message: "Valuation model version is not active.", retryable: false })

    const { data: valuation, error: valuationError } = await trusted
      .from("music_valuation_catalog_valuations")
      .insert({
        owner_user_id: user.id,
        input_snapshot_id: inputSnapshot.id,
        model_version_id: model.id,
        valuation_date: payload.valuation_date || new Date().toISOString().slice(0, 10),
        currency: payload.currency.toUpperCase(),
        downside_minor: minorUnitsToDb(range.downside.presentValueMinor),
        base_minor: minorUnitsToDb(range.base.presentValueMinor),
        upside_minor: minorUnitsToDb(range.upside.presentValueMinor),
        confidence_score: payload.confidence_score,
        assumptions: payload.assumptions,
        exclusions: payload.exclusions,
        disclaimer: VALUATION_DISCLAIMER,
        status: "draft",
      })
      .select("*")
      .maybeSingle()

    if (valuationError || !valuation)
      return jsonError({ status: 500, code: "valuation_create_failed", message: "Unable to store valuation.", retryable: true })

    const scenarioRows = [
      { valuation_id: valuation.id, name: "downside", present_value_minor: minorUnitsToDb(range.downside.presentValueMinor), cash_flows: payload.downside },
      { valuation_id: valuation.id, name: "base", present_value_minor: minorUnitsToDb(range.base.presentValueMinor), cash_flows: payload.base },
      { valuation_id: valuation.id, name: "upside", present_value_minor: minorUnitsToDb(range.upside.presentValueMinor), cash_flows: payload.upside },
    ]
    const { data: scenarios, error: scenarioError } = await trusted
      .from("music_valuation_scenarios")
      .insert(scenarioRows)
      .select("*")

    if (scenarioError)
      return jsonError({ status: 500, code: "valuation_scenarios_failed", message: "Unable to store valuation scenarios.", retryable: true })

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.valuation.completed",
      dedupeKey: valuation.id,
      payload: { valuationId: valuation.id, inputSha },
    })

    return NextResponse.json({
      data: {
        valuation,
        scenarios: scenarios || [],
        range: {
          downside_minor: range.downside.presentValueMinor.toString(),
          base_minor: range.base.presentValueMinor.toString(),
          upside_minor: range.upside.presentValueMinor.toString(),
        },
        disclaimer: VALUATION_DISCLAIMER,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid valuation payload.", issues: error.issues })
    if (error instanceof Error && error.message === "invalid_discount_factor")
      return jsonError({ status: 400, code: "invalid_discount_factor", message: "Discount factors must be non-negative integer micros.", retryable: false })
    console.error("valuation create failed", error)
    return jsonError({ status: 500, code: "valuation_internal", message: "Unexpected valuation error.", retryable: true })
  }
}
