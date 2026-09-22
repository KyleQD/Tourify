import { canViewPostComments } from "@/lib/feed/post-comment-access"

const parent = {
  id: "post-1",
  user_id: "author-1",
  visibility: "public",
  is_visible: true,
  moderation_status: "approved",
  posted_as_profile_id: null,
}

const noRelationships = {
  viewerFollowsAuthor: false,
  authorFollowsViewer: false,
  viewerFollowsAccount: false,
}

describe("AUDIT:API-001 parent-aware comment visibility", () => {
  it("allows approved public parents and the owner", () => {
    expect(canViewPostComments(parent, null, noRelationships)).toBe(true)
    expect(
      canViewPostComments(
        { ...parent, visibility: "private", is_visible: false, moderation_status: "pending" },
        "author-1",
        noRelationships,
      ),
    ).toBe(true)
  })

  it("requires an approved follower relationship for follower-only parents", () => {
    const followersOnly = { ...parent, visibility: "followers" }
    expect(canViewPostComments(followersOnly, "viewer-1", noRelationships)).toBe(false)
    expect(
      canViewPostComments(followersOnly, "viewer-1", {
        ...noRelationships,
        viewerFollowsAuthor: true,
      }),
    ).toBe(true)
    expect(
      canViewPostComments(followersOnly, "viewer-1", {
        ...noRelationships,
        viewerFollowsAccount: true,
      }),
    ).toBe(true)
  })

  it("requires mutual follows for friend-only parents", () => {
    const friendsOnly = { ...parent, visibility: "friends" }
    expect(
      canViewPostComments(friendsOnly, "viewer-1", {
        ...noRelationships,
        viewerFollowsAuthor: true,
      }),
    ).toBe(false)
    expect(
      canViewPostComments(friendsOnly, "viewer-1", {
        ...noRelationships,
        viewerFollowsAuthor: true,
        authorFollowsViewer: true,
      }),
    ).toBe(true)
  })

  it("fails closed for hidden, moderated, private, and unknown visibility", () => {
    expect(canViewPostComments({ ...parent, is_visible: false }, "viewer-1", noRelationships)).toBe(false)
    expect(
      canViewPostComments({ ...parent, moderation_status: "removed" }, "viewer-1", noRelationships),
    ).toBe(false)
    expect(
      canViewPostComments({ ...parent, visibility: "private" }, "viewer-1", noRelationships),
    ).toBe(false)
    expect(
      canViewPostComments({ ...parent, visibility: "unexpected" }, "viewer-1", noRelationships),
    ).toBe(false)
  })
})

