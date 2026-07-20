import { evaluateInfrastructureActivation } from "../infrastructure-activation-gate"
import { evaluateIdentifierPolicy } from "../identifier-policy"
import { resolveRightsReference } from "../rights-reference-resolver"
import { HARD_DISABLED_PUBLIC_INFRASTRUCTURE_FLAGS, DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS } from "../creator-public-infrastructure-flags"

describe("Phase 11 public infrastructure gates", () => {
  it("does not allow infrastructure activation without the full package", () => {
    const result = evaluateInfrastructureActivation({
      separateEntityApproved: true,
      governanceApproved: true,
      fundingApproved: true,
      standardsProfilesApproved: true,
      twoIndependentImplementationsPassed: false,
      securityApproved: true,
      privacyApproved: true,
      accessibilityApproved: true,
      jurisdictionApproved: true,
      rollbackProven: true,
    })
    expect(result.allowed).toBe(false)
    expect(result.failedRequirements).toContain("twoIndependentImplementationsPassed")
  })

  it("requires explicit participation and forbids public PII on identifiers", () => {
    expect(
      evaluateIdentifierPolicy({
        explicitParticipation: false,
        controllerVerified: true,
        publicFieldsContainPii: false,
        methodApproved: true,
        jurisdictionApproved: true,
      }).allowed,
    ).toBe(false)

    expect(
      evaluateIdentifierPolicy({
        explicitParticipation: true,
        controllerVerified: true,
        publicFieldsContainPii: true,
        methodApproved: true,
        jurisdictionApproved: true,
      }).reason,
    ).toBe("public_pii_forbidden")
  })

  it("resolver returns source metadata and rejects disputed/stale references", () => {
    const now = new Date("2026-07-17T12:00:00.000Z")
    const ok = resolveRightsReference({
      reference: {
        publicId: "ref-1",
        sourceType: "approved_projection",
        sourceId: "proj-1",
        sourceVersion: "1",
        status: "active",
        publicScopes: ["status_view"],
        refreshedAt: "2026-07-17T11:00:00.000Z",
      },
      requestedScope: "status_view",
      maxAgeSeconds: 86_400,
      now,
    })
    expect(ok.resolved).toBe(true)
    expect(ok.sourceType).toBe("approved_projection")
    expect(ok.sourceVersion).toBe("1")

    const disputed = resolveRightsReference({
      reference: {
        publicId: "ref-2",
        sourceType: "approved_projection",
        sourceId: "proj-2",
        sourceVersion: "1",
        status: "disputed",
        publicScopes: ["status_view"],
        refreshedAt: "2026-07-17T11:00:00.000Z",
      },
      requestedScope: "status_view",
      maxAgeSeconds: 86_400,
      now,
    })
    expect(disputed.resolved).toBe(false)
    expect(disputed.reason).toBe("disputed")
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_PUBLIC_INFRASTRUCTURE_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_public_infrastructure_universal_identifier_enabled",
        "creator_public_infrastructure_global_mandate_enabled",
        "creator_public_infrastructure_collective_action_enabled",
        "creator_public_infrastructure_tokenized_identity_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS).every((value) => value === false)).toBe(true)
  })
})
