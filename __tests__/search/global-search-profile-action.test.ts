import { describe, expect, it } from "vitest"
import { resolveProfileRelationshipAction } from "@/lib/search/global-search-profile-action"

const empty = new Set<string>()

function resolve(overrides: Partial<Parameters<typeof resolveProfileRelationshipAction>[0]> = {}) {
  return resolveProfileRelationshipAction({
    profileType: "general",
    viewerId: "viewer",
    ownerUserId: "owner",
    ownerAccountId: "account",
    outgoingUsers: empty,
    incomingUsers: empty,
    followedAccounts: empty,
    outgoingFriendRequests: empty,
    incomingFriendRequests: empty,
    ...overrides,
  })
}

describe("resolveProfileRelationshipAction", () => {
  it("uses friendship for general and service profiles", () => {
    expect(resolve({ profileType: "general" })?.kind).toBe("friend")
    expect(resolve({ profileType: "service" })?.kind).toBe("friend")
  })

  it("uses account follows for professional profiles", () => {
    for (const profileType of ["artist", "venue", "organization"] as const) {
      expect(resolve({ profileType, followedAccounts: new Set(["account"]) })).toEqual({
        kind: "follow",
        status: "following",
        requiresAuthentication: false,
      })
    }
  })

  it("resolves outgoing, incoming, and accepted friend states", () => {
    expect(resolve({ outgoingFriendRequests: new Set(["owner"]) })?.status).toBe("pending")
    expect(resolve({ incomingFriendRequests: new Set(["owner"]) })?.status).toBe("incoming")
    expect(resolve({ outgoingUsers: new Set(["owner"]), incomingUsers: new Set(["owner"]) })?.status).toBe("friends")
  })

  it("requires sign-in for anonymous visitors and hides self-actions", () => {
    expect(resolve({ viewerId: null, profileType: "artist" })).toEqual({
      kind: "follow",
      status: "none",
      requiresAuthentication: true,
    })
    expect(resolve({ ownerUserId: "viewer" })).toBeNull()
  })
})
