import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { validateNewPassword } from "./reset-password-guard"

describe("validateNewPassword", () => {
  it("rejects short passwords", () => {
    const result = validateNewPassword({ password: "short", confirmPassword: "short" })
    assert.equal(result.ok, false)
  })

  it("rejects mismatched passwords", () => {
    const result = validateNewPassword({
      password: "longenough",
      confirmPassword: "different1",
    })
    assert.equal(result.ok, false)
  })

  it("accepts valid passwords", () => {
    const result = validateNewPassword({
      password: "longenough",
      confirmPassword: "longenough",
    })
    assert.equal(result.ok, true)
  })
})
