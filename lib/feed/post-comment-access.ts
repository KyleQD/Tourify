export interface CommentParentPost {
  id: string
  user_id: string
  visibility: string | null
  is_visible: boolean
  moderation_status: string
  posted_as_profile_id: string | null
}

export interface CommentVisibilityRelationships {
  viewerFollowsAuthor: boolean
  authorFollowsViewer: boolean
  viewerFollowsAccount: boolean
}

export function canViewPostComments(
  post: CommentParentPost,
  viewerUserId: string | null,
  relationships: CommentVisibilityRelationships,
): boolean {
  if (viewerUserId && viewerUserId === post.user_id) return true
  if (!post.is_visible || post.moderation_status !== "approved") return false

  switch (post.visibility || "public") {
    case "public":
      return true
    case "followers":
      return relationships.viewerFollowsAuthor || relationships.viewerFollowsAccount
    case "friends":
      return relationships.viewerFollowsAuthor && relationships.authorFollowsViewer
    case "private":
    default:
      return false
  }
}

async function resolvesAccountFollow(
  supabase: any,
  viewerUserId: string,
  profileId: string | null,
): Promise<boolean> {
  if (!profileId) return false
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle()
  if (accountError || !account?.id) return false

  const { data: follow, error: followError } = await supabase
    .from("account_follows")
    .select("id")
    .eq("account_id", account.id)
    .eq("follower_user_id", viewerUserId)
    .maybeSingle()
  return !followError && Boolean(follow)
}

export async function resolvePostCommentAccess(params: {
  supabase: any
  postId: string
  viewerUserId: string | null
}): Promise<{ allowed: boolean; post: CommentParentPost | null }> {
  const { data, error } = await params.supabase
    .from("posts")
    .select("id, user_id, visibility, is_visible, moderation_status, posted_as_profile_id")
    .eq("id", params.postId)
    .maybeSingle()

  if (error || !data) return { allowed: false, post: null }
  const post = data as CommentParentPost
  if (!params.viewerUserId || params.viewerUserId === post.user_id) {
    return {
      allowed: canViewPostComments(post, params.viewerUserId, {
        viewerFollowsAuthor: false,
        authorFollowsViewer: false,
        viewerFollowsAccount: false,
      }),
      post,
    }
  }

  const [viewerFollow, authorFollow, accountFollow] = await Promise.all([
    params.supabase
      .from("follows")
      .select("id")
      .eq("follower_id", params.viewerUserId)
      .eq("following_id", post.user_id)
      .maybeSingle(),
    params.supabase
      .from("follows")
      .select("id")
      .eq("follower_id", post.user_id)
      .eq("following_id", params.viewerUserId)
      .maybeSingle(),
    resolvesAccountFollow(params.supabase, params.viewerUserId, post.posted_as_profile_id),
  ])

  return {
    allowed: canViewPostComments(post, params.viewerUserId, {
      viewerFollowsAuthor: !viewerFollow.error && Boolean(viewerFollow.data),
      authorFollowsViewer: !authorFollow.error && Boolean(authorFollow.data),
      viewerFollowsAccount: accountFollow,
    }),
    post,
  }
}

