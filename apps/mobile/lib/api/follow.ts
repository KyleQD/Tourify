import { apiRequest } from "@/lib/api/client"

export async function followUser(followingId: string) {
  return apiRequest<{ success: boolean; message?: string }>("/api/follow", {
    method: "POST",
    body: JSON.stringify({
      following_id: followingId,
      action: "follow"
    })
  })
}

export async function unfollowUser(followingId: string) {
  return apiRequest<{ success: boolean; message?: string }>("/api/follow", {
    method: "POST",
    body: JSON.stringify({
      following_id: followingId,
      action: "unfollow"
    })
  })
}
