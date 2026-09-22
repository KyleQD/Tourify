import { describe, expect, it } from "vitest"

import {
  buildVendorIdentityRow,
  canAcknowledgeDistinctDuplicate,
  findVendorDuplicateMatches,
  normalizeVendorName,
  planVendorMerge,
  scoreVendorDuplicate,
  vendorIdentityInputSchema,
  VENDOR_DUPLICATE_HARD_THRESHOLD,
} from "@/lib/admin/vendor-identity"

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"

describe("VEND-102 vendor identity", () => {
  it("normalizes legal names by stripping suffixes and punctuation", () => {
    expect(normalizeVendorName("Acme Production, Inc.")).toBe("acme production")
    expect(normalizeVendorName("ACME PRODUCTION LLC")).toBe("acme production")
  })

  it("builds identity rows with normalized legal name and default display", () => {
    const parsed = vendorIdentityInputSchema.parse({
      legal_name: "Soundwave LLC",
      category: "production",
    })
    const row = buildVendorIdentityRow({
      orgId: ORG,
      input: parsed,
      actorUserId: A,
    })
    expect(row.display_name).toBe("Soundwave LLC")
    expect(row.normalized_legal_name).toBe("soundwave")
    expect(row.org_id).toBe(ORG)
  })

  it("scores hard duplicates on normalized legal name and accounting id", () => {
    const existing = {
      id: A,
      org_id: ORG,
      legal_name: "Acme Production Inc",
      display_name: "Acme",
      normalized_legal_name: "acme production",
      category: "production",
      status: "approved",
      external_accounting_id: "ERP-9",
    }

    const byName = scoreVendorDuplicate({
      incoming: { legal_name: "Acme Production, LLC" },
      existing,
    })
    expect(byName.severity).toBe("hard")
    expect(byName.score).toBeGreaterThanOrEqual(VENDOR_DUPLICATE_HARD_THRESHOLD)

    const byAcct = scoreVendorDuplicate({
      incoming: {
        legal_name: "Totally Different Name",
        external_accounting_id: "ERP-9",
      },
      existing,
    })
    expect(byAcct.severity).toBe("hard")
  })

  it("requires acknowledge reason for hard duplicates", () => {
    expect(
      canAcknowledgeDistinctDuplicate({ score: 100, acknowledgeReason: null }),
    ).toBe(false)
    expect(
      canAcknowledgeDistinctDuplicate({ score: 100, acknowledgeReason: "dba entity" }),
    ).toBe(true)
    expect(
      canAcknowledgeDistinctDuplicate({ score: 50, acknowledgeReason: null }),
    ).toBe(true)
  })

  it("plans merge with retained aliases and org scope", () => {
    const survivor = {
      id: A,
      org_id: ORG,
      legal_name: "Acme Production",
      display_name: "Acme",
      normalized_legal_name: "acme production",
      category: "production",
      status: "approved",
    }
    const absorbed = {
      id: B,
      org_id: ORG,
      legal_name: "Acme Prod LLC",
      display_name: "Acme Prod",
      normalized_legal_name: "acme prod",
      category: "production",
      status: "prospective",
      aliases: ["Acme Audio"],
    }

    const plan = planVendorMerge({ survivor, absorbed: [absorbed] })
    expect(plan.survivorId).toBe(A)
    expect(plan.absorbedIds).toEqual([B])
    expect(plan.repointEngagements).toBe(true)
    expect(plan.aliasesToRetain.some((a) => a.alias_normalized.includes("acme"))).toBe(true)

    expect(() =>
      planVendorMerge({
        survivor,
        absorbed: [{ ...absorbed, org_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
      }),
    ).toThrow(/org-scoped/)
  })

  it("finds duplicate matches and skips inactive/merged rows", () => {
    const matches = findVendorDuplicateMatches({
      incoming: { legal_name: "Acme Production Inc" },
      existing: [
        {
          id: A,
          org_id: ORG,
          legal_name: "Acme Production",
          display_name: "Acme",
          normalized_legal_name: "acme production",
          category: "production",
          status: "approved",
        },
        {
          id: B,
          org_id: ORG,
          legal_name: "Acme Production",
          display_name: "Old",
          normalized_legal_name: "acme production",
          category: "production",
          status: "inactive",
          merged_into_id: A,
        },
      ],
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].candidateId).toBe(A)
  })
})
