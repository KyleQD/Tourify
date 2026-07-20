import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { createSandboxFundAdminAdapter } from "@/lib/music/institutional/partner-adapters"
import { reconcileNavLines } from "@/lib/music/institutional/nav-reconciliation"

export const dynamic = "force-dynamic"

const syncSchema = z.object({
  fund_vehicle_id: z.string().uuid(),
  valuation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parallel_estimate_minor: z.number().int().optional(),
  version: z.number().int().positive().default(1),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_nav_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional NAV sync is not available.", retryable: false })

    const payload = syncSchema.parse(await request.json())
    const { data: fund } = await supabase
      .from("music_institutional_fund_vehicles")
      .select("id, administrator_provider_id, sponsor_organization_id")
      .eq("id", payload.fund_vehicle_id)
      .maybeSingle()
    if (!fund)
      return jsonError({ status: 404, code: "fund_not_found", message: "Fund vehicle not found.", retryable: false })

    const admin = createSandboxFundAdminAdapter()
    const official = await admin.fetchNav(fund.id, payload.valuation_date)
    if (!official)
      return jsonError({
        status: 503,
        code: "nav_provider_unavailable",
        message: "Official NAV unavailable. Parallel estimates are not used as official NAV.",
        retryable: true,
      })

    const diffs = reconcileNavLines(
      [{ key: "total", amountMinor: BigInt(official.totalNavMinor) }],
      [{
        key: "total",
        amountMinor: BigInt(payload.parallel_estimate_minor ?? official.totalNavMinor),
      }],
    )

    const { data, error } = await supabase
      .from("music_institutional_nav_periods")
      .insert({
        fund_vehicle_id: payload.fund_vehicle_id,
        valuation_date: payload.valuation_date,
        version: payload.version,
        status: "administrator_final",
        total_nav_minor: Number(official.totalNavMinor),
        currency: official.currency,
        administrator_reference: official.administratorReference,
        is_official: true,
        parallel_estimate_minor: payload.parallel_estimate_minor ?? null,
      })
      .select("id, fund_vehicle_id, valuation_date, version, status, total_nav_minor, is_official, administrator_reference")
      .single()

    if (error)
      return jsonError({ status: 500, code: "nav_sync_failed", message: "Unable to store NAV period.", retryable: true })

    if (diffs.some((d) => d.differenceMinor !== 0n)) {
      await supabase.from("music_institutional_reconciliation_exceptions").insert({
        provider_id: fund.administrator_provider_id || "sandbox_fund_admin",
        domain: "nav",
        subject_id: data.id,
        severity: "medium",
        status: "open",
        details: {
          diffs: diffs.map((d) => ({
            key: d.key,
            official: d.officialMinor.toString(),
            parallel: d.parallelMinor.toString(),
            difference: d.differenceMinor.toString(),
          })),
          actor: user.id,
        },
      })
    }

    return NextResponse.json({
      data,
      reconciliation: diffs.map((d) => ({
        key: d.key,
        officialMinor: d.officialMinor.toString(),
        parallelMinor: d.parallelMinor.toString(),
        differenceMinor: d.differenceMinor.toString(),
      })),
      note: "Official NAV is administrator-sourced. Parallel estimates never replace official NAV.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid NAV payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "nav_sync_failed", message: "Unable to sync NAV.", retryable: true })
  }
}
