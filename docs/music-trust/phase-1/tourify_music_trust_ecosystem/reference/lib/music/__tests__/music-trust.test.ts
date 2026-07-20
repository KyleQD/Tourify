import { describe, expect, it } from "vitest"

import { deriveMusicTrustDisplay, resolveMusicPublicationTrust } from "../music-trust"

describe("resolveMusicPublicationTrust", function () {
  it("allows incomplete private drafts", function () {
    expect(
      resolveMusicPublicationTrust({
        rightsConfirmed: false,
        aiUseCategory: "unknown",
        policyVersionsAccepted: false,
        isPublic: false,
      }),
    ).toEqual({ allowed: true, blockingReasons: [] })
  })

  it("blocks public music with unknown AI disclosure", function () {
    const result = resolveMusicPublicationTrust({
      rightsConfirmed: true,
      aiUseCategory: "unknown",
      policyVersionsAccepted: true,
      isPublic: true,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockingReasons).toContain("ai_disclosure_required")
  })

  it("blocks materially generated music from the human catalog", function () {
    const result = resolveMusicPublicationTrust({
      rightsConfirmed: true,
      aiUseCategory: "materially_generated",
      policyVersionsAccepted: true,
      isPublic: true,
    })

    expect(result.allowed).toBe(false)
  })
})

describe("deriveMusicTrustDisplay", function () {
  it("shows a badge only for active approval", function () {
    expect(
      deriveMusicTrustDisplay({
        originStatus: "recorded",
        certificationStatus: "approved",
        certificationLevel: 1,
      }).showCertificationBadge,
    ).toBe(true)
  })

  it("does not display a badge for suspended certification", function () {
    expect(
      deriveMusicTrustDisplay({
        originStatus: "recorded",
        certificationStatus: "suspended",
        certificationLevel: 1,
      }).showCertificationBadge,
    ).toBe(false)
  })
})
