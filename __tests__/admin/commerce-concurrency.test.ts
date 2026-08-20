import { NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import {
  assertCommerceUpdatedAtMatches,
  normalizeCommerceExpectedUpdatedAt,
  requireCommerceExpectedUpdatedAt,
} from "@/lib/admin/commerce/concurrency"

const commerceContext = {
  request: {
    correlationId: "request-concurrency",
    source: "header" as const,
  },
}

describe("COM-039 Commerce optimistic concurrency framework", () => {
  it("normalizes expected updated_at preconditions", () => {
    expect(normalizeCommerceExpectedUpdatedAt(" 2026-08-12T10:00:00.000Z ")).toBe("2026-08-12T10:00:00.000Z")
    expect(requireCommerceExpectedUpdatedAt(commerceContext, {
      expected_updated_at: "2026-08-12T10:00:00.000Z",
    })).toEqual({ expectedUpdatedAt: "2026-08-12T10:00:00.000Z" })
  })

  it("returns structured precondition and conflict errors", async () => {
    const missing = requireCommerceExpectedUpdatedAt(commerceContext, {})
    expect(missing).toBeInstanceOf(NextResponse)
    expect(missing.status).toBe(428)
    await expect(missing.json()).resolves.toMatchObject({
      error: {
        code: "commerce_expected_updated_at_required",
        details: {
          bodyFields: ["expectedUpdatedAt", "expected_updated_at"],
        },
      },
      correlationId: "request-concurrency",
    })

    const conflict = assertCommerceUpdatedAtMatches(
      commerceContext,
      "2026-08-12T10:01:00.000Z",
      { expectedUpdatedAt: "2026-08-12T10:00:00.000Z" },
      {
        entityType: "marketplace_payout_ledger",
        message: "Payout changed.",
      },
    )
    expect(conflict).toBeInstanceOf(NextResponse)
    expect(conflict?.status).toBe(409)
    await expect(conflict?.json()).resolves.toMatchObject({
      error: {
        code: "commerce_version_conflict",
        details: {
          entityType: "marketplace_payout_ledger",
          expectedUpdatedAt: "2026-08-12T10:00:00.000Z",
          currentUpdatedAt: "2026-08-12T10:01:00.000Z",
        },
      },
      correlationId: "request-concurrency",
    })
  })
})
