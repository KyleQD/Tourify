import { describe, expect, it } from "vitest"

import {
  commerceErrorResponse,
  commerceJsonResponse,
  isCommerceErrorEnvelope,
} from "@/lib/admin/commerce/errors"

describe("COM-031 Commerce error envelopes", () => {
  it("returns structured errors with retryability and correlation ids", async () => {
    const response = commerceErrorResponse({
      status: 503,
      code: "commerce_source_unavailable",
      message: "Commerce source is unavailable.",
      retryable: true,
      correlationId: "request-errors",
      details: { source: "marketplace_orders" },
    })

    expect(response.status).toBe(503)
    expect(response.headers.get("x-correlation-id")).toBe("request-errors")
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: "commerce_source_unavailable",
        message: "Commerce source is unavailable.",
        retryable: true,
        details: { source: "marketplace_orders" },
      },
      correlationId: "request-errors",
    })
    expect(isCommerceErrorEnvelope(body)).toBe(true)
  })

  it("rejects legacy loose error shapes", () => {
    expect(isCommerceErrorEnvelope({ error: "Failed", code: "failed" })).toBe(false)
    expect(isCommerceErrorEnvelope({ error: { code: "failed", message: "Failed" } })).toBe(false)
  })

  it("returns successful Commerce responses with correlation ids", async () => {
    const response = commerceJsonResponse({
      data: { status: "ok" },
    }, {
      correlationId: "request-success",
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("x-correlation-id")).toBe("request-success")
    await expect(response.json()).resolves.toEqual({
      data: { status: "ok" },
      correlationId: "request-success",
    })
  })
})
