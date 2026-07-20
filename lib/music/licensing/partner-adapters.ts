import { createHash } from "crypto"

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

export interface SignatureAdapter {
  createEnvelope(agreementId: string, parties: string[]): Promise<{
    envelopeId: string
    status: "pending_signatures"
  }>
}

export interface PaymentAdapter {
  createInvoice(input: {
    agreementId: string
    amountMinor: number
    currency: string
  }): Promise<{ providerInvoiceId: string; status: "issued" }>
}

export interface DdexAdapter {
  validateMessage(rawXml: string): Promise<{ valid: boolean; version: string; errors: string[] }>
}

/** Sandbox adapters — live CMO/DDEX/signature/payment partners remain unresolved. */
export function createSandboxSignatureAdapter(): SignatureAdapter {
  return {
    async createEnvelope(agreementId) {
      return { envelopeId: `sandbox-sign-${agreementId}`, status: "pending_signatures" }
    },
  }
}

export function createSandboxPaymentAdapter(): PaymentAdapter {
  return {
    async createInvoice(input) {
      return {
        providerInvoiceId: `sandbox-inv-${input.agreementId}-${input.amountMinor}`,
        status: "issued",
      }
    },
  }
}

export function createSandboxDdexAdapter(): DdexAdapter {
  return {
    async validateMessage(rawXml) {
      if (!rawXml.trim()) return { valid: false, version: "ERN-4.3", errors: ["empty_message"] }
      return { valid: true, version: "ERN-4.3", errors: [] }
    },
  }
}
