import crypto from "crypto"

export interface PrintfulWebhookValidationResult {
  isValid: boolean
  reason?: string
}

export function verifyPrintfulWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: string
  signature: string | null
  secret: string | undefined
}): PrintfulWebhookValidationResult {
  if (!signature) return { isValid: false, reason: "Missing signature" }
  if (!secret) return { isValid: false, reason: "Missing webhook secret" }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  if (signature.length !== expected.length) return { isValid: false, reason: "Invalid signature" }

  const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  if (!isValid) return { isValid: false, reason: "Invalid signature" }
  return { isValid: true }
}

export function parsePrintfulWebhookPayload(payload: string): Record<string, unknown> {
  const parsed = JSON.parse(payload)
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid Printful payload")
  return parsed as Record<string, unknown>
}
