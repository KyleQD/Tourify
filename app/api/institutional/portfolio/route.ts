import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { INSTITUTIONAL_DISCLAIMER } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { calculateConcentration } from "@/lib/music/institutional/risk-metrics"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
  if (!flags.music_institutional_deals_enabled && !flags.music_institutional_funds_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institutional portfolio is not available.", retryable: false })

  const { data: memberships } = await supabase
    .from("music_institutional_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
  const orgIds = (memberships || []).map((m) => m.organization_id)

  const { data: commitments } = orgIds.length
    ? await supabase
      .from("music_institutional_capital_commitments")
      .select("id, fund_vehicle_id, amount_minor, currency, status")
      .in("investor_organization_id", orgIds)
      .limit(100)
    : { data: [] }

  const exposures = (commitments || []).map((c) => ({
    key: c.fund_vehicle_id,
    amountMinor: BigInt(c.amount_minor || 0),
  }))
  const concentration = calculateConcentration(exposures)
  const inputManifestHash = createHash("sha256")
    .update(JSON.stringify({ commitments: commitments || [], at: new Date().toISOString().slice(0, 10) }))
    .digest("hex")

  if (orgIds[0]) {
    await supabase.from("music_institutional_risk_snapshots").insert({
      subject_type: "organization",
      subject_id: orgIds[0],
      model_version: "concentration_v1",
      snapshot: concentration,
      input_manifest_hash: inputManifestHash,
    })
  }

  return NextResponse.json({
    data: {
      commitments: commitments || [],
      concentration,
    },
    disclaimer: INSTITUTIONAL_DISCLAIMER,
    note: "Risk metrics are analytical estimates, not investment advice.",
    enabled: true,
  })
}
