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

export interface FundAdminAdapter {
  fetchNav(fundPartnerId: string, valuationDate: string): Promise<{
    totalNavMinor: string
    currency: string
    administratorReference: string
    status: "administrator_final"
  } | null>
}

export interface CustodyAdapter {
  linkAccount(organizationPartnerRef: string): Promise<{
    providerAccountRef: string
    status: string
  }>
}

/** Sandbox adapters — live partners remain unresolved until counsel contracts. */
export function createSandboxFundAdminAdapter(): FundAdminAdapter {
  return {
    async fetchNav(fundPartnerId, valuationDate) {
      return {
        totalNavMinor: "0",
        currency: "USD",
        administratorReference: `sandbox-nav-${fundPartnerId}-${valuationDate}`,
        status: "administrator_final",
      }
    },
  }
}

export function createSandboxCustodyAdapter(): CustodyAdapter {
  return {
    async linkAccount(organizationPartnerRef) {
      return {
        providerAccountRef: `sandbox-cust-${organizationPartnerRef}`,
        status: "linked",
      }
    },
  }
}
