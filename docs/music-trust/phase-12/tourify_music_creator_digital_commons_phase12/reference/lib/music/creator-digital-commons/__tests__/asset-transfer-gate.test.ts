import { describe, expect, it } from "vitest"
import { evaluateAssetTransfer } from "../asset-transfer-gate"

describe("evaluateAssetTransfer", () => {
  it("denies an inferred transfer of creator rights", () => {
    const result = evaluateAssetTransfer({ titleVerified: true, transferAuthorityVerified: true, thirdPartyRestrictionsResolved: true, publicNoticeComplete: true, conflictReviewComplete: true, rollbackOrReplacementPlanTested: true, receivingStewardApproved: true, creatorRightsAffected: true, policyVersion: "1" })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("creator_rights_must_not_transfer_by_inference")
  })
})
