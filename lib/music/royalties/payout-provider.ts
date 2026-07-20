export interface PayoutRecipient {
  providerRecipientId: string
  currency: string
  amountMinor: bigint
  idempotencyKey: string
}

export interface PayoutSubmissionResult {
  status: "submitted" | "paid" | "failed" | "held"
  providerTransferId?: string
  failureReason?: string
}

export interface RoyaltyPayoutProvider {
  name: string
  submitPayout(input: PayoutRecipient): Promise<PayoutSubmissionResult>
}

/** Stripe Connect adapter — does not store bank numbers; uses connected account IDs only. */
export function createStripeConnectRoyaltyPayoutProvider(): RoyaltyPayoutProvider {
  return {
    name: "stripe_connect",
    async submitPayout(input) {
      if (!process.env.STRIPE_SECRET_KEY)
        return {
          status: "held",
          failureReason: "stripe_secret_missing",
        }

      // Lazy: real transfer creation requires Connect platform configuration.
      // Keep dry-run safe when royalty payouts flag is enabled in non-prod.
      if (process.env.MUSIC_ROYALTY_PAYOUTS_DRY_RUN !== "false")
        return {
          status: "submitted",
          providerTransferId: `dry_run_${input.idempotencyKey}`,
        }

      try {
        const Stripe = (await import("stripe")).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" as any })
        const transfer = await stripe.transfers.create({
          amount: Number(input.amountMinor),
          currency: input.currency.toLowerCase(),
          destination: input.providerRecipientId,
          transfer_group: input.idempotencyKey,
        }, { idempotencyKey: input.idempotencyKey })
        return { status: "submitted", providerTransferId: transfer.id }
      } catch (error) {
        return {
          status: "failed",
          failureReason: error instanceof Error ? error.message : "stripe_transfer_failed",
        }
      }
    },
  }
}

export function computePayoutReadiness(params: {
  providerStatus: string
  taxStatus: string
  kycStatus: string
  sanctionsStatus: string
}): { payoutReady: boolean; blockers: string[] } {
  const blockers: string[] = []
  if (params.providerStatus !== "ready") blockers.push("provider_not_ready")
  if (params.taxStatus !== "ready") blockers.push("tax_incomplete")
  if (params.kycStatus !== "passed") blockers.push("kyc_incomplete")
  if (params.sanctionsStatus !== "clear") blockers.push("sanctions_not_clear")
  return { payoutReady: blockers.length === 0, blockers }
}
