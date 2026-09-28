import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { checkAuth } from "@/lib/auth/api-auth"
import { resolvePostCommentAccess } from "@/lib/feed/post-comment-access"
import { achievementEngine } from "@/lib/services/achievement-engine.service"
import { createClient as createServerClient } from "@/lib/supabase/server"

type RouteContext = { params: Promise<{ id: string }> }

function correlationIdFor(request: NextRequest) {
  return request.headers.get("x-request-id") || randomUUID()
}

function errorResponse(status: number, code: string, message: string, correlationId: string) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status, headers: { "x-correlation-id": correlationId } },
  )
}

async function readLikeState(supabase: any, postId: string, userId?: string | null) {
  const [postResult, likeResult] = await Promise.all([
    supabase.from("posts").select("likes_count").eq("id", postId).maybeSingle(),
    userId
      ? supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (postResult.error || !postResult.data) {
    throw new Error(postResult.error?.message || "Post not found")
  }
  if (likeResult.error) throw new Error(likeResult.error.message)

  return {
    is_liked: Boolean(likeResult.data),
    likes_count: Number(postResult.data.likes_count || 0),
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const correlationId = correlationIdFor(request)
  try {
    const { id: postId } = await params
    if (!postId) return errorResponse(400, "INVALID_POST_ID", "Post ID is required", correlationId)

    const auth = await checkAuth(request)
    const supabase = auth?.supabase || (await createServerClient())
    const access = await resolvePostCommentAccess({
      supabase,
      postId,
      viewerUserId: auth?.user?.id || null,
    })
    if (!access.allowed) {
      return errorResponse(404, "POST_NOT_FOUND", "Post not found", correlationId)
    }

    const state = await readLikeState(supabase, postId, auth?.user?.id)
    return NextResponse.json(
      { success: true, ...state },
      { headers: { "x-correlation-id": correlationId } },
    )
  } catch (error) {
    console.error("[Likes API] read failed", { correlationId, error })
    return errorResponse(500, "LIKES_READ_FAILED", "Failed to fetch like status", correlationId)
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const correlationId = correlationIdFor(request)
  try {
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", correlationId)
    }

    const { id: postId } = await params
    if (!postId) return errorResponse(400, "INVALID_POST_ID", "Post ID is required", correlationId)

    const access = await resolvePostCommentAccess({
      supabase: auth.supabase,
      postId,
      viewerUserId: auth.user.id,
    })
    if (!access.allowed || !access.post) {
      return errorResponse(404, "POST_NOT_FOUND", "Post not found", correlationId)
    }

    let action: unknown
    try {
      action = (await request.json())?.action
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON", correlationId)
    }
    if (action !== "like" && action !== "unlike") {
      return errorResponse(400, "INVALID_ACTION", 'Action must be "like" or "unlike"', correlationId)
    }

    let created = false
    if (action === "like") {
      const { data, error } = await auth.supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: auth.user.id })
        .select("id")
        .maybeSingle()

      if (error && error.code !== "23505") {
        console.error("[Likes API] insert failed", { correlationId, code: error.code })
        return errorResponse(500, "LIKE_CREATE_FAILED", "Failed to like post", correlationId)
      }
      created = Boolean(data)
    } else {
      const { error } = await auth.supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", auth.user.id)
      if (error) {
        console.error("[Likes API] delete failed", { correlationId, code: error.code })
        return errorResponse(500, "LIKE_DELETE_FAILED", "Failed to unlike post", correlationId)
      }
    }

    if (created && access.post.user_id) {
      await Promise.allSettled([
        achievementEngine.recordMetricEvent({
          supabase: auth.supabase,
          userId: access.post.user_id,
          metricKey: "post_interactions_total",
          eventType: "post_like_received",
          delta: 1,
          eventSource: "api_post_like",
          eventData: { post_id: postId },
        }),
      ])
    }

    const state = await readLikeState(auth.supabase, postId, auth.user.id)
    return NextResponse.json(
      { success: true, ...state },
      { headers: { "x-correlation-id": correlationId } },
    )
  } catch (error) {
    console.error("[Likes API] mutation failed", { correlationId, error })
    return errorResponse(500, "LIKE_MUTATION_FAILED", "Failed to update like", correlationId)
  }
}
