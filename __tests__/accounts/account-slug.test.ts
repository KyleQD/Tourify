import { describe, expect, it } from "vitest"

import { normalizeAccountSlug, validateAccountSlug } from "@/lib/accounts/account-slug"

describe("account slug", () => {
  it("normalizes display names deterministically", () => {
    expect(normalizeAccountSlug("  Kyle’s Touring Co.  ")).toBe("kyles-touring-co")
  })

  it("rejects short and reserved routes", () => {
    expect(validateAccountSlug("ab")).toMatchObject({ valid: false, reason: "length" })
    expect(validateAccountSlug("dashboard")).toMatchObject({
      valid: false,
      reason: "reserved",
    })
  })
})
