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
