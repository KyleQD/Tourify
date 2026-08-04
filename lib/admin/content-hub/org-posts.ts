import "server-only"

interface SupabaseLike {
  from: (table: string) => any
}

export interface OrgContentPost {
  id: string
  content: string | null
  created_at: string
  user_id: string
  posted_as_profile_id: string | null
  posted_as_type: string | null
  moderation_status: string
  is_visible: boolean
  is_pinned: boolean
  likes_count: number
  comments_count: number
  shares_count: number
  author_name: string | null
}

export async function listOrgScopedPosts(args: {
  supabase: SupabaseLike
  organizerAccountId: string
  status?: string | null
  limit?: number
}): Promise<{ items: OrgContentPost[]; error?: string }> {
  const limit = Math.min(args.limit || 50, 200)

  let query = args.supabase
    .from("posts")
    .select(
      "id, content, created_at, user_id, posted_as_profile_id, posted_as_type, moderation_status, is_visible, is_pinned, shares_count",
    )
    .eq("posted_as_profile_id", args.organizerAccountId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (args.status) query = query.eq("moderation_status", args.status)

  const { data: rows, error } = await query
  if (error) return { items: [], error: error.message }

  const posts = rows || []
  const postIds = posts.map((p: { id: string }) => p.id)
  const userIds = [...new Set(posts.map((p: { user_id: string }) => p.user_id).filter(Boolean))]

  const likesMap: Record<string, number> = {}
  const commentsMap: Record<string, number> = {}
  const profileMap: Record<string, { full_name?: string | null; username?: string | null }> = {}

  if (postIds.length > 0) {
    const [likesRes, commentsRes] = await Promise.all([
      args.supabase.from("post_likes").select("post_id").in("post_id", postIds),
      args.supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ])

    for (const row of likesRes.data || []) {
      likesMap[row.post_id] = (likesMap[row.post_id] || 0) + 1
    }
    for (const row of commentsRes.data || []) {
      commentsMap[row.post_id] = (commentsMap[row.post_id] || 0) + 1
    }
  }

  if (userIds.length > 0) {
    const { data: profiles } = await args.supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds)
    for (const profile of profiles || []) {
      profileMap[profile.id] = profile
    }
  }

  const items: OrgContentPost[] = posts.map((p: any) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    user_id: p.user_id,
    posted_as_profile_id: p.posted_as_profile_id,
    posted_as_type: p.posted_as_type,
    moderation_status: p.moderation_status || "approved",
    is_visible: p.is_visible ?? true,
    is_pinned: p.is_pinned ?? false,
    likes_count: likesMap[p.id] || 0,
    comments_count: commentsMap[p.id] || 0,
    shares_count: Number(p.shares_count) || 0,
    author_name: profileMap[p.user_id]?.full_name || profileMap[p.user_id]?.username || null,
  }))

  return { items }
}

export async function assertOrgOwnsPost(args: {
  supabase: SupabaseLike
  postId: string
  organizerAccountId: string
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await args.supabase
    .from("posts")
    .select("id, posted_as_profile_id")
    .eq("id", args.postId)
    .maybeSingle()

  if (error) return { ok: false, status: 500, error: error.message }
  if (!data) return { ok: false, status: 404, error: "Post not found" }
  if (data.posted_as_profile_id !== args.organizerAccountId) {
    return { ok: false, status: 403, error: "Post is outside this organization workspace" }
  }
  return { ok: true }
}
