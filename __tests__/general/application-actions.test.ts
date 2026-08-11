import { describe, expect, it } from "vitest"

import { canApplicantWithdraw } from "@/lib/general/application-actions"

describe("applicant actions", () => {
  it("allows withdrawal while an application is active", () => {
    expect(canApplicantWithdraw("pending")).toBe(true)
    expect(canApplicantWithdraw("interview")).toBe(true)
    expect(canApplicantWithdraw("accepted")).toBe(true)
  })

  it("blocks withdrawal from terminal states", () => {
    expect(canApplicantWithdraw("withdrawn")).toBe(false)
    expect(canApplicantWithdraw("rejected")).toBe(false)
    expect(canApplicantWithdraw("declined")).toBe(false)
  })
})
