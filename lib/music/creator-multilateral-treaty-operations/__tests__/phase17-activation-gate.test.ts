import { evaluatePhase17Activation } from "../phase17-activation-gate"
import { evaluateCompetence } from "../legal-competence-gate"
import { mayExpandCompetence } from "../competence-expansion-gate"
import { mayTransitionReview } from "../review-cycle-state-machine"
import {
  HARD_DISABLED_TREATY_OPS_FLAGS,
  DISABLED_CREATOR_TREATY_OPS_FLAGS,
} from "../creator-treaty-ops-flags"

describe("Phase 17 multilateral treaty operations gates", () => {
  it("requires two independent operators for activation", () => {
    const result = evaluatePhase17Activation({
      multiYearEvidence: true,
      effectiveAuthority: true,
      reviewMandate: true,
      independentOperators: 1,
      tourifyUnavailablePassed: true,
      remediesReady: true,
      publicApproval: true,
      criticalBlockers: 0,
      scope: ["periodic_review"],
      jurisdiction: ["multilateral-sandbox"],
      expiresAt: "2027-07-19T00:00:00.000Z",
      rollbackReady: true,
    })
    expect(result.allowed).toBe(false)
    expect(result.mode).toBe("disabled")
    expect(result.blockers).toContain("independent_operators")
  })

  it("default-denies competence outside effective powers and blocks expansion without formal amendment", () => {
    expect(
      evaluateCompetence({
        requestedPower: "depositary",
        effectivePowers: ["periodic_review"],
        amendmentEffective: true,
        participantApprovalComplete: true,
        suspended: false,
      }).allowed,
    ).toBe(false)

    expect(
      mayExpandCompetence({
        formalAmendmentRequired: true,
        formalAmendmentEffective: false,
        participantApprovalsComplete: true,
        publicNoticeComplete: true,
        independentOpinionApproved: true,
      }).allowed,
    ).toBe(false)
  })

  it("allows only valid review-cycle transitions", () => {
    expect(mayTransitionReview("planned", "mandate_proposed")).toBe(true)
    expect(mayTransitionReview("planned", "outcome_adopted")).toBe(false)
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_TREATY_OPS_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_treaty_ops_formal_depositary_enabled",
        "creator_treaty_ops_competence_change_enabled",
        "creator_treaty_ops_external_public_activation_enabled",
        "creator_treaty_ops_collective_authority_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_TREATY_OPS_FLAGS).every((value) => value === false)).toBe(true)
  })
})
