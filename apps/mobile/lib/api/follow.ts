import { apiRequest } from "@/lib/api/client"

export interface ProfileFollowResult {
  success: true
  action: "followed" | "unfollowed"
  isFollowing: boolean
  changed: boolean
}

export async function followUser(followingId: string) {
  return apiRequest<ProfileFollowResult>("/api/social/follow", {
    method: "POST",
    body: JSON.stringify({
      followingId,
      action: "follow"
    })
  })
}

export async function unfollowUser(followingId: string) {
  return apiRequest<ProfileFollowResult>("/api/social/follow", {
    method: "POST",
    body: JSON.stringify({
      followingId,
      action: "unfollow"
    })
  })
}
