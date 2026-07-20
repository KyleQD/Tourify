import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { computePayoutReadiness } from "@/lib/music/royalties/payout-provider"

export const dynamic = "force-dynamic"

const onboardingSchema = z.object({
  party_id: z.string().min(1).max(120),
  provider: z.string().min(1).max(80).default("stripe_connect"),
  provider_account_id: z.string().min(1).max(200).optional().nullable(),
  status: z.enum(["pending", "onboarding", "ready", "restricted", "disabled"]).optional(),
  tax_status: z.enum(["unknown", "incomplete", "ready", "blocked"]).optional(),
  kyc_status: z.enum(["unknown", "pending", "passed", "failed"]).optional(),
  sanctions_status: z.enum(["unknown", "clear", "hit", "review"]).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_payouts_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty payouts are not available.", retryable: false })

  const { data: accounts, error } = await supabase
    .from("music_royalties_payee_accounts")
    .select("*, music_royalties_payout_readiness(*)")
    .or(`owner_user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })

  if (error)
    return jsonError({ status: 500, code: "payee_accounts_query_failed", message: "Unable to load payout onboarding.", retryable: true })

  const data = (accounts || []).map((account: any) => {
    const readiness = Array.isArray(account.music_royalties_payout_readiness)
      ? account.music_royalties_payout_readiness[0]
      : account.music_royalties_payout_readiness
    const computed = computePayoutReadiness({
      providerStatus: account.status,
      taxStatus: readiness?.tax_status || "unknown",
      kycStatus: readiness?.kyc_status || "unknown",
      sanctionsStatus: readiness?.sanctions_status || "unknown",
    })
    return { ...account, readiness: { ...readiness, ...computed } }
  })

  return NextResponse.json({ data, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_payouts_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty payouts are not available.", retryable: false })

    const payload = onboardingSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const accountStatus = payload.status
      || (payload.provider_account_id ? "onboarding" : "pending")

    const { data: account, error: accountError } = await trusted
      .from("music_royalties_payee_accounts")
      .upsert({
        owner_user_id: user.id,
        party_id: payload.party_id,
        linked_user_id: user.id,
        provider: payload.provider,
        provider_account_id: payload.provider_account_id || null,
        status: accountStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "owner_user_id,party_id,provider" })
      .select("*")
      .maybeSingle()

    if (accountError || !account)
      return jsonError({ status: 500, code: "payee_account_upsert_failed", message: "Unable to save payee account.", retryable: true })

    const taxStatus = payload.tax_status || "unknown"
    const kycStatus = payload.kyc_status || "unknown"
    const sanctionsStatus = payload.sanctions_status || "unknown"
    const computed = computePayoutReadiness({
      providerStatus: account.status,
      taxStatus,
      kycStatus,
      sanctionsStatus,
    })

    const { data: readiness, error: readinessError } = await trusted
      .from("music_royalties_payout_readiness")
      .upsert({
        payee_account_id: account.id,
        tax_status: taxStatus,
        kyc_status: kycStatus,
        sanctions_status: sanctionsStatus,
        payout_ready: computed.payoutReady,
        blockers: computed.blockers,
        updated_at: new Date().toISOString(),
      }, { onConflict: "payee_account_id" })
      .select("*")
      .maybeSingle()

    if (readinessError)
      return jsonError({ status: 500, code: "payout_readiness_upsert_failed", message: "Unable to save payout readiness.", retryable: true })

    return NextResponse.json({
      data: {
        account,
        readiness: { ...readiness, ...computed },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid onboarding payload.", issues: error.issues })
    console.error("payout onboarding failed", error)
    return jsonError({ status: 500, code: "payout_onboarding_internal", message: "Unexpected onboarding error.", retryable: true })
  }
}
