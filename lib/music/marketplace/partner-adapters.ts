import { createHash } from "crypto"

export interface PartnerWebhookEnvelope {
  partnerId: string
  providerEventId: string
  eventType: string
  payload: Record<string, unknown>
  signature?: string | null
  rawBody?: string
}

export interface PartnerEventReceipt {
  partnerId: string
  providerEventId: string
  eventType: string
  payload: Record<string, unknown>
  payloadHash: string
  signatureVerified: boolean
}

export interface IntermediaryAdapter {
  createSubscription(input: {
    offeringPartnerId: string
    investorPartnerAccountId: string
    amountMinor: string
    currency: string
    idempotencyKey: string
  }): Promise<{ partnerSubscriptionId: string; status: string }>
  getEligibility(partnerAccountId: string): Promise<{
    status: string
    eligibilityScope: Record<string, unknown>
    expiresAt?: string
  }>
}

export interface TransferAgentAdapter {
  fetchPositions(securityPartnerId: string): Promise<
    Array<{
      officialPositionId: string
      investorPartnerRef: string
      quantityMinor: string
      restrictionStatus: string
    }>
  >
  submitTransfer(input: {
    officialPositionId: string
    quantityMinor: string
    transfereePartnerRef: string
  }): Promise<{ partnerTransferId: string; status: string }>
}

export interface AtsAdapter {
  submitOrder(input: {
    securityPartnerId: string
    side: "buy" | "sell"
    quantityMinor: string
    priceMinor?: string
    currency?: string
  }): Promise<{ partnerOrderId: string; status: string }>
  /** Tourify never matches; this only returns partner-sourced ticks. */
  fetchMarketData(securityPartnerId: string): Promise<{
    bidMinor?: string
    askMinor?: string
    lastMinor?: string
    observedAt: string
    staleAfter: string
  }>
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

export function verifyPartnerWebhookSignature(input: {
  rawBody: string
  signature?: string | null
  secret?: string | null
}): boolean {
  if (!input.secret || !input.signature) return false
  const expected = createHash("sha256").update(`${input.secret}:${input.rawBody}`).digest("hex")
  return expected === input.signature
}

export function buildPartnerEventReceipt(
  envelope: PartnerWebhookEnvelope,
  signatureVerified: boolean,
): PartnerEventReceipt {
  return {
    partnerId: envelope.partnerId,
    providerEventId: envelope.providerEventId,
    eventType: envelope.eventType,
    payload: envelope.payload,
    payloadHash: hashPayload(envelope.payload),
    signatureVerified,
  }
}

/** Sandbox/fixture adapters — live partners remain unresolved until counsel contracts. */
export function createSandboxIntermediaryAdapter(): IntermediaryAdapter {
  return {
    async createSubscription(input) {
      return {
        partnerSubscriptionId: `sandbox-sub-${input.idempotencyKey}`,
        status: "partner_received",
      }
    },
    async getEligibility() {
      return {
        status: "approved",
        eligibilityScope: { sandbox: true, accreditation: "unknown" },
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      }
    },
  }
}

export function createSandboxTransferAgentAdapter(): TransferAgentAdapter {
  return {
    async fetchPositions() {
      return []
    },
    async submitTransfer(input) {
      return {
        partnerTransferId: `sandbox-xfer-${input.officialPositionId}`,
        status: "submitted",
      }
    },
  }
}

export function createSandboxAtsAdapter(): AtsAdapter {
  return {
    async submitOrder(input) {
      return {
        partnerOrderId: `sandbox-ord-${input.securityPartnerId}-${Date.now()}`,
        status: "submitted_to_partner",
      }
    },
    async fetchMarketData() {
      const observedAt = new Date().toISOString()
      return {
        observedAt,
        staleAfter: new Date(Date.now() + 60000).toISOString(),
      }
    },
  }
}
