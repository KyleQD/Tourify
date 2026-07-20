import { resolveFederationPower } from "../sovereignty-policy"
import { verifyFederationCredential } from "../credential-trust-policy"
import { resolveMandate } from "../mandate-delegation"
import { authorizeCrossBorderTransfer } from "../cross-border-transfer-gate"
import { evaluateFederationActivation } from "../federation-activation-gate"
import { canTransitionFederationMembership } from "../membership-state-machine"
import { evaluateFederationDecision } from "../federation-decision-state-machine"
import { DISABLED_CREATOR_FEDERATION_FLAGS } from "../creator-federation-flags"

describe("Phase 10 creator-federation core", () => {
  it("default-denies federation powers that are reserved or not delegated", () => {
    expect(resolveFederationPower({
      power: "local_pricing",
      delegatedPowers: [],
      reservedPowers: ["local_pricing"],
      localRatificationRequired: false,
      localRatified: false,
    }).reason).toBe("reserved_local_power")

    expect(resolveFederationPower({
      power: "service_directory_admin",
      delegatedPowers: [],
      reservedPowers: ["local_pricing"],
      localRatificationRequired: false,
      localRatified: false,
    }).reason).toBe("not_delegated")
  })

  it("requires live source check for high-risk credential actions", () => {
    expect(verifyFederationCredential({
      issuerTrusted: true,
      schemaApproved: true,
      proofValid: true,
      holderBindingValid: true,
      status: "active",
      jurisdictionAllowed: true,
      scopeAllowed: true,
      sourceRecordCurrent: false,
      highRiskAction: true,
    }).reason).toBe("live_source_check_required")
  })

  it("enforces exact-scoped mandates", () => {
    expect(resolveMandate({
      mandate: {
        principalOrganizationId: "org1",
        delegateFederationId: "fed1",
        service: "service_directory_admin",
        territories: ["SANDBOX"],
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2027-01-01T00:00:00.000Z",
        allowSubdelegation: false,
        status: "active",
      },
      service: "representation",
      territory: "SANDBOX",
      at: new Date("2026-07-17T00:00:00.000Z"),
    }).reason).toBe("service_out_of_scope")
  })

  it("blocks cross-border transfer without purpose and contribution authority", () => {
    expect(authorizeCrossBorderTransfer({
      purposeAuthorized: false,
      contributionAuthorized: false,
      transferMechanismApproved: false,
      localizationSatisfied: false,
      onwardTransferControlled: false,
      retentionDefined: false,
      legalHoldAllowsTransfer: true,
    }).allowed).toBe(false)
  })

  it("keeps federation activation not ready without full package", () => {
    const result = evaluateFederationActivation({
      entityApproved: true,
      governingDocumentsApproved: true,
      memberOrganizationsApproved: 1,
      trustFrameworkApproved: true,
      securityReviewApproved: true,
      privacyReviewApproved: true,
      competitionReviewApproved: true,
      jurisdictionApproved: true,
      operationalOwnersAssigned: true,
      rollbackTested: true,
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain("memberOrganizationsApproved")
  })

  it("requires submitted before active membership", () => {
    expect(canTransitionFederationMembership({ from: "draft", to: "submitted" })).toBe(true)
    expect(canTransitionFederationMembership({ from: "draft", to: "active" })).toBe(false)
  })

  it("requires quorum and local ratification for federation decisions", () => {
    expect(evaluateFederationDecision({
      yes: 2,
      no: 0,
      abstain: 0,
      quorum: 2,
      threshold: 0.5,
      vetoed: false,
      requiredOrganizations: ["org-a"],
      ratifiedOrganizations: [],
    }).reason).toBe("local_ratification_incomplete")
  })

  it("keeps all federation flags disabled by default", () => {
    expect(Object.values(DISABLED_CREATOR_FEDERATION_FLAGS).every((value) => value === false)).toBe(true)
    expect(DISABLED_CREATOR_FEDERATION_FLAGS.creator_federation_representation_network_enabled).toBe(false)
    expect(DISABLED_CREATOR_FEDERATION_FLAGS.creator_federation_collective_bargaining_enabled).toBe(false)
    expect(DISABLED_CREATOR_FEDERATION_FLAGS.creator_federation_public_api_enabled).toBe(false)
  })
})
