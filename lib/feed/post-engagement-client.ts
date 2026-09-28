export type PostShareDestination = "clipboard" | "native" | "feed"

export interface PostLikeState {
  success: true
  is_liked: boolean
  likes_count: number
}

export interface PostCommentAuthor {
  id: string
  username: string
  full_name: string
  avatar_url: string
  is_verified: boolean
}

export interface PostComment {
  id: string
  content: string
  created_at: string
  updated_at?: string | null
  user: PostCommentAuthor
}

export interface PostShareResult {
  success: true
  share: {
    id: string
    post_id: string
    destination: PostShareDestination
    created_at: string
  }
  shares_count: number
}

function messageFromPayload(payload: any, fallback: string) {
  const error = payload?.error
  if (typeof error === "string") return error
  if (error && typeof error.message === "string") return error.message
  if (typeof payload?.message === "string") return payload.message
  return fallback
}

async function engagementRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, `Engagement request failed (${response.status})`))
  }
  return payload as T
}

export function setPostLike(postId: string, action: "like" | "unlike") {
  return engagementRequest<PostLikeState>(`/api/posts/${encodeURIComponent(postId)}/likes`, {
    method: "POST",
    body: JSON.stringify({ action }),
  })
}

export function getPostComments(postId: string, limit = 40) {
  return engagementRequest<{ comments: PostComment[]; total: number }>(
    `/api/posts/${encodeURIComponent(postId)}/comments?limit=${limit}`,
  )
}

export function createPostComment(postId: string, content: string) {
  return engagementRequest<{ comment: PostComment; comments_count: number }>(
    `/api/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  )
}

export function recordPostShare(postId: string, destination: PostShareDestination) {
  return engagementRequest<PostShareResult>(
    `/api/posts/${encodeURIComponent(postId)}/shares`,
    {
      method: "POST",
      body: JSON.stringify({ destination }),
    },
  )
}

export async function sharePostExternally(
  postId: string,
  options?: { title?: string; text?: string; preferNative?: boolean },
) {
  const url = `${window.location.origin}/posts/${encodeURIComponent(postId)}`
  if (options?.preferNative !== false && typeof navigator.share === "function") {
    await navigator.share({ title: options?.title, text: options?.text, url })
    return recordPostShare(postId, "native")
  }

  await navigator.clipboard.writeText(url)
  return recordPostShare(postId, "clipboard")
}
