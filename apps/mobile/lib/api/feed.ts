import { apiRequest } from "@/lib/api/client"

export interface FeedPostProfile {
  username: string
  full_name: string
  avatar_url?: string
  is_verified?: boolean
  account_context?: {
    type: string
    profile_id: string
    display_name: string
    profile_path?: string | null
  }
}

export interface FeedPost {
  id: string
  user_id: string
  content: string | null
  type: string
  visibility: string
  media_urls: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
  profiles: FeedPostProfile
  is_liked: boolean
  like_count: number
}

export type FeedTab = "following" | "all" | "personal"

interface FeedResponse {
  success: boolean
  data: FeedPost[]
  message?: string
}

export async function getFeedPosts(params: {
  type: FeedTab
  profileId?: string | null
  limit?: number
  offset?: number
  headers?: Record<string, string>
}) {
  const search = new URLSearchParams({
    type: params.type,
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
  })
  if (params.profileId) search.set("profile_id", params.profileId)

  const payload = await apiRequest<FeedResponse>(`/api/feed/posts?${search.toString()}`, {
    headers: params.headers,
  })
  return Array.isArray(payload.data) ? payload.data : []
}

export async function createFeedPost(params: {
  content: string
  visibility: string
  mediaUrls?: string[]
  headers?: Record<string, string>
}) {
  return apiRequest<{ success: boolean; data: FeedPost }>("/api/feed/posts", {
    method: "POST",
    headers: params.headers,
    body: JSON.stringify({
      content: params.content,
      visibility: params.visibility,
      media_urls: params.mediaUrls ?? [],
      type: params.mediaUrls && params.mediaUrls.length > 0 ? "image" : "text",
    }),
  })
}
