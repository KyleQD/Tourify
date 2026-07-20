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

export interface RegistryAdapter {
  submitRegistration(input: {
    caseId: string
    subjectType: string
    subjectId: string
    idempotencyKey: string
  }): Promise<{ externalId: string; status: "submitted" }>
}

export interface PlatformClaimsAdapter {
  submitClaimPolicy(input: {
    assetId: string
    policy: Record<string, unknown>
  }): Promise<{ providerRef: string; status: "pending_review" }>
}

/** Sandbox adapters — live CMO/MLC/platform/counsel partners remain unresolved. */
export function createSandboxRegistryAdapter(): RegistryAdapter {
  return {
    async submitRegistration(input) {
      return { externalId: `sandbox-reg-${input.caseId}`, status: "submitted" }
    },
  }
}

export function createSandboxPlatformClaimsAdapter(): PlatformClaimsAdapter {
  return {
    async submitClaimPolicy(input) {
      return { providerRef: `sandbox-pol-${input.assetId}`, status: "pending_review" }
    },
  }
}
