import { NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import {
  normalizeCommerceIdempotencyKey,
  readCommerceIdempotencyKey,
  requireCommerceIdempotencyKey,
} from "@/lib/admin/commerce/idempotency"

const commerceContext = {
  request: {
    correlationId: "request-idempotency",
    source: "header" as const,
  },
}

function requestWithHeaders(headers: Record<string, string> = {}) {
  return { headers: new Headers(headers) as unknown as globalThis.Headers }
}

describe("COM-038 Commerce idempotency framework", () => {
  it("normalizes header and body idempotency keys", () => {
    expect(normalizeCommerceIdempotencyKey("  payout-retry:123456  ")).toBe("payout-retry:123456")
    expect(readCommerceIdempotencyKey(requestWithHeaders({ "Idempotency-Key": "fee-rule-123456" }))).toEqual({
      idempotencyKey: "fee-rule-123456",
      source: "header",
    })
    expect(readCommerceIdempotencyKey(requestWithHeaders(), { idempotencyKey: "webhook-123456" })).toEqual({
      idempotencyKey: "webhook-123456",
      source: "body",
    })
  })

  it("rejects missing or malformed keys with structured Commerce errors", async () => {
    const missing = requireCommerceIdempotencyKey(requestWithHeaders(), commerceContext)
    expect(missing).toBeInstanceOf(NextResponse)
    expect(missing.status).toBe(422)
    await expect(missing.json()).resolves.toMatchObject({
      error: {
        code: "commerce_idempotency_key_required",
        details: {
          headers: ["Idempotency-Key", "X-Idempotency-Key"],
          bodyFields: ["idempotencyKey", "idempotency_key"],
        },
      },
      correlationId: "request-idempotency",
    })

    expect(() => normalizeCommerceIdempotencyKey("has spaces")).toThrow("commerce_idempotency_key_invalid")
    expect(() => normalizeCommerceIdempotencyKey("short")).toThrow("commerce_idempotency_key_required")
  })
})
