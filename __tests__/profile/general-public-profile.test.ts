import { describe, expect, it } from "vitest"

import { buildGeneralPublicIdentity } from "@/lib/profile/general-public-profile"

describe("General public profile contract", () => {
  it("never changes persona based on sub-accounts", () => {
    const result = buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      full_name: "Alex Rivera",
    })

    expect(result.accountType).toBe("general")
    expect(result.authorProfileId).toBe("user-1")
  })

  it("removes private contact fields from the renderer input", () => {
    const result = buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      location: "Los Angeles",
      show_location: false,
      show_phone: false,
      show_email: false,
      profile_data: {
        phone: "555-0100",
        email: "alex@example.com",
        location: "Los Angeles",
      },
      social_links: { email: "alex@example.com", instagram: "alex" },
    })

    expect(result.location).toBeNull()
    expect(result.profileData).not.toHaveProperty("phone")
    expect(result.profileData).not.toHaveProperty("email")
    expect(result.socialLinks).not.toHaveProperty("email")
    expect(result.socialLinks.instagram).toBe("alex")
  })
})
