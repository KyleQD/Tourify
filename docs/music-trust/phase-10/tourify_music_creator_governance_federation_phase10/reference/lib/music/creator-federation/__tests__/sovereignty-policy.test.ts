import { describe, expect, it } from "vitest"
import { resolveFederationPower } from "../sovereignty-policy"

describe("resolveFederationPower", () => {
  it("denies reserved local powers", () => {
    expect(resolveFederationPower({ power: "change_local_membership", delegatedPowers: ["change_local_membership"], reservedPowers: ["change_local_membership"], localRatificationRequired: false, localRatified: false }).allowed).toBe(false)
  })
  it("requires ratification", () => {
    expect(resolveFederationPower({ power: "adopt_profile", delegatedPowers: ["adopt_profile"], reservedPowers: [], localRatificationRequired: true, localRatified: false }).reason).toBe("local_ratification_required")
  })
})
