import { describe, expect, it } from "vitest"

import { OFFLINE_CHECK_IN_RESULT } from "@/lib/venue/door-check-in-state"

describe("Venue door offline behavior", () => {
  it("fails closed and does not claim an offline admission succeeded", () => {
    expect(OFFLINE_CHECK_IN_RESULT.success).toBe(false)
    expect(OFFLINE_CHECK_IN_RESULT.code).toBe("OFFLINE")
    expect(OFFLINE_CHECK_IN_RESULT.error).toContain("not accepted or stored")
  })
})
