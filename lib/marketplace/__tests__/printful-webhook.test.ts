import crypto from "crypto"
import { parsePrintfulWebhookPayload, verifyPrintfulWebhookSignature } from "../printful-webhook"

describe("printful webhook helpers", () => {
  it("validates HMAC signatures", () => {
    const payload = JSON.stringify({ type: "order_shipped", order: { external_id: "order-1" } })
    const secret = "printful-secret"
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

    const valid = verifyPrintfulWebhookSignature({
      payload,
      signature,
      secret,
    })
    expect(valid.isValid).toBe(true)

    const invalid = verifyPrintfulWebhookSignature({
      payload,
      signature: "bad-signature",
      secret,
    })
    expect(invalid.isValid).toBe(false)
  })

  it("parses webhook payloads and rejects invalid JSON", () => {
    const payload = JSON.stringify({ type: "order_fulfilled" })
    expect(parsePrintfulWebhookPayload(payload)).toEqual({ type: "order_fulfilled" })

    expect(() => parsePrintfulWebhookPayload("not-json")).toThrow()
  })
})
