import { describe, expect, it } from "vitest"
import { evaluateIdentifierPolicy } from "../identifier-policy"

describe("evaluateIdentifierPolicy", () => {
  it("defaults to deny without explicit participation", () => {
    expect(evaluateIdentifierPolicy({ explicitParticipation: false, controllerVerified: true, publicFieldsContainPii: false, methodApproved: true, jurisdictionApproved: true }).allowed).toBe(false)
  })
})
