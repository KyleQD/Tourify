import { describe, expect, it } from "vitest"

import {
  applicationStatusLabel,
  normalizeApplicationStatus,
  profileCompletion,
} from "@/lib/general/action-center"

describe("General action center", () => {
  it("calculates profile completion from real core fields", () => {
    expect(
      profileCompletion({
        fullName: "Alex Rivera",
        username: "alex",
        bio: "Tour crew",
        avatarUrl: null,
        location: "Los Angeles",
      }),
    ).toBe(80)
    expect(profileCompletion(null)).toBe(0)
  })

  it("normalizes compatible application statuses without changing stored values", () => {
    expect(normalizeApplicationStatus("pending")).toBe("submitted")
    expect(normalizeApplicationStatus("under_review")).toBe("in_review")
    expect(normalizeApplicationStatus("hired")).toBe("accepted")
    expect(normalizeApplicationStatus("rejected")).toBe("declined")
    expect(normalizeApplicationStatus("future_status")).toBe("submitted")
    expect(applicationStatusLabel("under_review")).toBe("in review")
  })
})
