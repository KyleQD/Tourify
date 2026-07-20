import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import { createSandboxIntermediaryAdapter } from "@/lib/music/marketplace/partner-adapters"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_investor_portal_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Investor portal is not available.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("music_marketplace_investor_partner_accounts")
    .select("id, partner_id, partner_account_id, status, eligibility_scope, kyc_status, sanctions_status, tax_profile_status, accreditation_status, jurisdiction, investor_type, expires_at, observed_at")
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false })
    .limit(20)

  if (error)
    return jsonError({ status: 500, code: "investor_account_query_failed", message: "Unable to load investor accounts.", retryable: true })

  const { data: holds } = await supabase
    .from("music_marketplace_compliance_holds")
    .select("id, subject_type, subject_id, hold_type, status, reason_code, opened_at")
    .eq("subject_type", "investor")
    .eq("status", "open")
    .limit(50)

  // Sandbox eligibility preview only — no raw KYC docs stored.
  const sandbox = createSandboxIntermediaryAdapter()
  const sandboxEligibility = await sandbox.getEligibility(`sandbox-${user.id}`)

  return NextResponse.json({
    data: data || [],
    openHolds: (holds || []).filter(() => true),
    sandboxEligibility,
    note: "Eligibility statuses are partner-synchronized read models. Tourify does not store raw identity, tax, or accreditation documents.",
    enabled: true,
  })
}
