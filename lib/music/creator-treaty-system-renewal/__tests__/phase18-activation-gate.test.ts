import { evaluatePhase18Activation } from "../phase18-activation-gate"
import { evaluateNonPerpetuity } from "../non-perpetuity-gate"
import { evaluateArchivePackage } from "../archive-preservation-policy"
import { evaluateAuthorityInheritance } from "../authority-inheritance-gate"
import { evaluateDissolution } from "../dissolution-asset-lock"
import { canTransitionRenewal } from "../renewal-cycle-state-machine"
import {
  HARD_DISABLED_TREATY_RENEWAL_FLAGS,
  DISABLED_CREATOR_TREATY_RENEWAL_FLAGS,
} from "../creator-treaty-renewal-flags"

describe("Phase 18 treaty system renewal gates", () => {
  const now = new Date("2026-07-19T00:00:00.000Z")

  it("requires expiresAt and two Phase 17 cycles for activation", () => {
    const result = evaluatePhase18Activation({
      repeatedPhase17Cycles: 2,
      legalReviewApproved: true,
      renewalAuthorityVerified: true,
      archiveRestorePassed: true,
      independentOperators: 2,
      tourifyUnavailablePassed: true,
      unresolvedCriticalBlockers: 0,
      now,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe("activation_denied")
    expect(result.blockers).toContain("expires_at_missing")
  })

  it("denies expired authority without renewal and rejects archive packages missing fixity", () => {
    expect(
      evaluateNonPerpetuity({
        now,
        effectiveAt: new Date("2025-01-01T00:00:00.000Z"),
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
        renewalDecisionEffective: false,
        currentAuthorityValid: true,
        unresolvedCriticalBlocker: false,
      }).reason,
    ).toBe("expired_without_renewal")

    expect(
      evaluateArchivePackage({
        manifestId: "m1",
        checksumVerified: false,
        provenanceComplete: true,
        representationInfoComplete: true,
        retentionAuthorized: true,
        accessPurposeApproved: true,
      }).accepted,
    ).toBe(false)
  })

  it("blocks inherited authority and dissolution when creator rights are affected", () => {
    expect(
      evaluateAuthorityInheritance({
        successorRecognized: false,
        currentInstrumentEffective: true,
        delegatedScopeMatches: true,
        localReservedPowerConflict: false,
        authorityExpired: false,
      }).allowed,
    ).toBe(false)

    expect(
      evaluateDissolution({
        dissolutionAuthorized: true,
        claimsProcessApproved: true,
        publicAssetScheduleApproved: true,
        archiveSuccessorConfirmed: true,
        essentialServicePlanApproved: true,
        creatorRightsAffected: true,
      }).allowed,
    ).toBe(false)
  })

  it("allows only valid renewal transitions and keeps hard-disabled flags off", () => {
    expect(canTransitionRenewal({ from: "draft", to: "proposed" })).toBe(true)
    expect(canTransitionRenewal({ from: "draft", to: "effective" })).toBe(false)
    expect(HARD_DISABLED_TREATY_RENEWAL_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_treaty_renewal_public_activation_enabled",
        "creator_treaty_renewal_privilege_revalidation_enabled",
        "creator_treaty_renewal_dissolution_enabled",
        "creator_treaty_renewal_phase19_handoff_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_TREATY_RENEWAL_FLAGS).every((value) => value === false)).toBe(true)
  })
})
