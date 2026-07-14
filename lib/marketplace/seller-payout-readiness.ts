import "server-only"

import {
  isConnectV1Express,
  isConnectV2,
  resolveStripeConnectAccountId,
} from "@/lib/stripe-connect-resolve"
import { getStripeClient } from "@/lib/stripe"

export interface SellerPayoutReadiness {
  ready: boolean
  accountId: string | null
  connectKind: "v1_express" | "v2" | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  reason: string | null
}

export async function getSellerPayoutReadiness({
  supabase,
  sellerUserId,
}: {
  supabase: any
  sellerUserId: string
}): Promise<SellerPayoutReadiness> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_v2_account_id, stripe_connect_account_kind")
    .eq("id", sellerUserId)
    .single()

  const accountId = resolveStripeConnectAccountId(profile)
  const connectKind =
    profile?.stripe_connect_account_kind === "v2"
      ? "v2"
      : profile?.stripe_connect_account_id
        ? "v1_express"
        : null

  if (!accountId) {
    return baseReadiness({ accountId: null, connectKind, reason: "stripe_connect_required" })
  }

  try {
    const stripe = getStripeClient()
    if (isConnectV2(profile)) {
      const account = await stripe.v2.core.accounts.retrieve(accountId, {
        include: ["configuration.merchant", "requirements"],
      })
      const row = account as unknown as {
        configuration?: { merchant?: { capabilities?: { card_payments?: { status?: string } } } }
        requirements?: { summary?: { minimum_deadline?: { status?: string } } }
      }
      const chargesEnabled = row.configuration?.merchant?.capabilities?.card_payments?.status === "active"
      const requirementsStatus = row.requirements?.summary?.minimum_deadline?.status
      const detailsSubmitted = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due"
      return {
        accountId,
        connectKind: "v2",
        chargesEnabled,
        payoutsEnabled: chargesEnabled,
        detailsSubmitted,
        ready: chargesEnabled && detailsSubmitted,
        reason: chargesEnabled && detailsSubmitted ? null : "stripe_onboarding_incomplete",
      }
    }

    if (isConnectV1Express(profile)) {
      const account = await stripe.accounts.retrieve(accountId)
      const ready = Boolean(account.charges_enabled && account.payouts_enabled && account.details_submitted)
      return {
        accountId,
        connectKind: "v1_express",
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        detailsSubmitted: Boolean(account.details_submitted),
        ready,
        reason: ready ? null : "stripe_onboarding_incomplete",
      }
    }

    return baseReadiness({ accountId, connectKind, reason: "stripe_connect_unknown_kind" })
  } catch (error) {
    console.error("Failed to verify seller payout readiness", error)
    return baseReadiness({ accountId, connectKind, reason: "stripe_status_unavailable" })
  }
}

function baseReadiness({
  accountId,
  connectKind,
  reason,
}: {
  accountId: string | null
  connectKind: "v1_express" | "v2" | null
  reason: string
}): SellerPayoutReadiness {
  return {
    ready: false,
    accountId,
    connectKind,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    reason,
  }
}
