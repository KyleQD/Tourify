import { evaluateCommonsActivation } from "../commons-activation-gate"
import { evaluateAssetTransfer } from "../asset-transfer-gate"
import { evaluateRegistryProjection } from "../registry-projection-policy"
import { evaluateContinuity } from "../service-continuity-policy"
import {
  HARD_DISABLED_DIGITAL_COMMONS_FLAGS,
  DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS,
} from "../creator-digital-commons-flags"

describe("Phase 12 digital commons gates", () => {
  it("does not allow commons activation without the full package", () => {
    const result = evaluateCommonsActivation({
      separateStewardApproved: true,
      publicGovernanceApproved: true,
      localSovereigntyTested: true,
      criticalAssetCustodyVerified: true,
      independentImplementations: 1,
      independentOperators: 2,
      conformancePassed: true,
      tourifyExitDrillPassed: true,
      fundingRunwayMonths: 12,
      legalPrivacySecurityAccessibilityApproved: true,
      publicReviewComplete: true,
      scopeAndJurisdictionsDefined: true,
      policyVersion: "1.0.0",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("two_implementations_required")
  })

  it("blocks irreversible asset transfer when creator rights would be inferred", () => {
    const result = evaluateAssetTransfer({
      titleVerified: true,
      transferAuthorityVerified: true,
      thirdPartyRestrictionsResolved: true,
      publicNoticeComplete: true,
      conflictReviewComplete: true,
      rollbackOrReplacementPlanTested: true,
      receivingStewardApproved: true,
      creatorRightsAffected: true,
      policyVersion: "1.0.0",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("creator_rights_must_not_transfer_by_inference")
  })

  it("rejects registry projections with sensitive evidence or revoked sources", () => {
    expect(
      evaluateRegistryProjection({
        purposeApproved: true,
        source: {
          sourceType: "approved_projection",
          sourceId: "x",
          sourceVersion: "1",
          disputed: false,
          revoked: true,
        },
        sourceFresh: true,
        fieldsApproved: true,
        leakageReviewPassed: true,
        containsSensitiveEvidence: false,
        policyVersion: "1.0.0",
      }).allowed,
    ).toBe(false)

    expect(
      evaluateRegistryProjection({
        purposeApproved: true,
        source: {
          sourceType: "approved_projection",
          sourceId: "x",
          sourceVersion: "1",
          disputed: false,
          revoked: false,
        },
        sourceFresh: true,
        fieldsApproved: true,
        leakageReviewPassed: true,
        containsSensitiveEvidence: true,
        policyVersion: "1.0.0",
      }).reasons,
    ).toContain("sensitive_evidence_prohibited")
  })

  it("requires Tourify-unavailable continuity drills", () => {
    const result = evaluateContinuity({
      tourifyUnavailable: false,
      independentBuildSucceeded: true,
      independentOperatorAvailable: true,
      currentAssetEscrowVerified: true,
      exportRestoreSucceeded: true,
      keyAndDomainRecoverySucceeded: true,
      participantRecordsPreserved: true,
      rightsSourcesUnchanged: true,
      policyVersion: "1.0.0",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("test_must_exclude_tourify")
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_DIGITAL_COMMONS_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_digital_commons_irreversible_asset_transfer_enabled",
        "creator_digital_commons_universal_identifier_enabled",
        "creator_digital_commons_global_mandate_enabled",
        "creator_digital_commons_collective_action_enabled",
        "creator_digital_commons_tokenized_identity_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS).every((value) => value === false)).toBe(true)
  })
})
