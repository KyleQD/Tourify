import { canActivatePhase20, evaluatePhase20Activation } from "../phase20-activation-gate"
import { mayDisclose } from "../access-and-disclosure-policy"
import { evaluateCulturalAuthority } from "../cultural-authority-policy"
import { canTransitionCharter } from "../trust-charter-state-machine"
import { mayReuse } from "../future-reuse-policy"
import { isCustodianReady } from "../custodian-accreditation-policy"
import {
  HARD_DISABLED_CULTURAL_MEMORY_TRUST_FLAGS,
  DISABLED_CREATOR_CULTURAL_MEMORY_TRUST_FLAGS,
} from "../creator-cultural-memory-trust-flags"

describe("Phase 20 cultural memory trust gates", () => {
  const now = new Date("2026-07-20T00:00:00.000Z")

  it("fails closed without Tourify-unavailable and expiresAt", () => {
    expect(
      canActivatePhase20({
        legalEntity: true,
        charterEffective: true,
        communityGovernance: true,
        multipleCustodians: true,
        independentImplementations: true,
        restorePassed: true,
        restrictionPropagationPassed: true,
        providerReplacementPassed: true,
        tourifyUnavailablePassed: false,
        unresolvedCriticalBlockers: 0,
      }),
    ).toBe(false)

    const result = evaluatePhase20Activation({
      legalEntity: true,
      charterEffective: true,
      communityGovernance: true,
      multipleCustodians: true,
      independentImplementations: true,
      restorePassed: true,
      restrictionPropagationPassed: true,
      providerReplacementPassed: true,
      tourifyUnavailablePassed: true,
      unresolvedCriticalBlockers: 0,
      now,
    })
    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain("expires_at_missing")
  })

  it("denies sealed disclosure, disputed authority, and AI training without authority", () => {
    expect(
      mayDisclose({
        accessClass: "sealed",
        purposeApproved: true,
        culturalApproval: false,
        privacyApproval: true,
        legalHold: false,
        disputed: false,
      }),
    ).toBe(false)

    expect(
      evaluateCulturalAuthority({
        active: true,
        disputed: true,
        scope: ["x"],
        requestedScope: "x",
        effectiveAt: now.toISOString(),
      }).allowed,
    ).toBe(false)

    expect(
      mayReuse({
        type: "ai_training",
        explicitAuthority: false,
        privacyApproved: true,
        culturalApproved: true,
        outputReview: true,
        benefitPlan: true,
      }),
    ).toBe(false)
  })

  it("denies draft→effective charter and incomplete custodian readiness", () => {
    expect(canTransitionCharter({ from: "draft", to: "effective" })).toBe(false)
    expect(
      isCustodianReady({
        independentGovernance: true,
        defaultDenyAccess: true,
        restoreTestPassed: false,
        exportSupported: true,
        restrictionPropagationPassed: true,
        currentFunding: true,
        unresolvedCriticalFindings: 0,
      }),
    ).toBe(false)
  })

  it("keeps hard-disabled flags off", () => {
    for (const flag of HARD_DISABLED_CULTURAL_MEMORY_TRUST_FLAGS)
      expect(DISABLED_CREATOR_CULTURAL_MEMORY_TRUST_FLAGS[flag]).toBe(false)
  })
})
