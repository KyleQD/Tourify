import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { checkAuth } from "@/lib/auth/api-auth"
import { resolvePostCommentAccess } from "@/lib/feed/post-comment-access"
import { achievementEngine } from "@/lib/services/achievement-engine.service"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createRateLimiter } from "@/lib/utils/rate-limit"

const MAX_COMMENT_LENGTH = 2_000
const MAX_PAGE_SIZE = 100
const commentMutationLimiter = createRateLimiter({
  namespace: "feed:comments:create",
  limit: 20,
  windowSec: 60,
})

function correlationIdFor(request: NextRequest) {
  return request.headers.get("x-request-id") || randomUUID()
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string,
) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status, headers: { "x-correlation-id": correlationId } },
  )
}

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function publicUser(profile: any, userId: string) {
  return {
    id: userId,
    username: profile?.metadata?.username || profile?.username || "user",
    full_name: profile?.metadata?.full_name || profile?.full_name || "Anonymous User",
    avatar_url: profile?.avatar_url || "",
    is_verified: Boolean(profile?.is_verified),
  }
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const searchParams = request.nextUrl.searchParams
    const limit = boundedInteger(searchParams.get("limit"), 20, 1, MAX_PAGE_SIZE)
    const offset = boundedInteger(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER)
    const { data: comments, error, count } = await supabase
      .from("post_comments")
      .select("id, content, created_at, updated_at, user_id", { count: "exact" })
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[Comments API] comment read failed", { correlationId, code: error.code })
      return errorResponse(500, "COMMENTS_READ_FAILED", "Failed to fetch comments", correlationId)
    }

    const userIds = [...new Set((comments || []).map((comment: any) => comment.user_id))]
    let profiles: any[] = []
    if (userIds.length > 0) {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, metadata")
        .in("id", userIds)
      if (profileError) {
        console.warn("[Comments API] author hydration failed", {
          correlationId,
          code: profileError.code,
        })
      } else profiles = data || []
    }

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
    const transformed = (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: publicUser(profileById.get(comment.user_id), comment.user_id),
    }))

    return NextResponse.json(
      { comments: transformed, total: count ?? transformed.length, offset, limit },
      { headers: { "x-correlation-id": correlationId } },
    )
  } catch (error) {
    console.error("[Comments API] unexpected read failure", { correlationId, error })
    return errorResponse(500, "COMMENTS_READ_FAILED", "Failed to fetch comments", correlationId)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = correlationIdFor(request)
  try {
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", correlationId)
    }

    const rateLimit = await commentMutationLimiter.check(auth.user.id)
    if (!rateLimit.success) {
      return errorResponse(429, "RATE_LIMITED", "Too many comment requests", correlationId)
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON", correlationId)
    }
    const content =
      typeof body === "object" && body !== null && typeof (body as any).content === "string"
        ? (body as any).content.trim()
        : ""
    if (!content) {
      return errorResponse(400, "COMMENT_REQUIRED", "Comment content is required", correlationId)
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return errorResponse(
        400,
        "COMMENT_TOO_LONG",
        `Comment content must be ${MAX_COMMENT_LENGTH} characters or fewer`,
        correlationId,
      )
    }

    const { data: comment, error } = await auth.supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: auth.user.id,
        content,
      })
      .select("id, content, created_at, updated_at, user_id")
      .single()

    if (error || !comment) {
      console.error("[Comments API] comment insert failed", { correlationId, code: error?.code })
      return errorResponse(500, "COMMENT_CREATE_FAILED", "Failed to add comment", correlationId)
    }

    const { data: profile } = await auth.supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_verified, metadata")
      .eq("id", auth.user.id)
      .maybeSingle()

    if (access.post.user_id) {
      const events = [
        ["post_interactions_total", "post_comment_received"],
        ["post_comments_total", "post_comment_received"],
      ] as const
      await Promise.allSettled(
        events.map(([metricKey, eventType]) =>
          achievementEngine.recordMetricEvent({
            supabase: auth.supabase,
            userId: access.post!.user_id,
            metricKey,
            eventType,
            delta: 1,
            eventSource: "api_post_comment",
            eventData: { post_id: postId },
          }),
        ),
      )
    }

    const { data: updatedPost, error: countError } = await auth.supabase
      .from("posts")
      .select("comments_count")
      .eq("id", postId)
      .maybeSingle()
    if (countError) {
      console.warn("[Comments API] canonical count read failed", {
        correlationId,
        code: countError.code,
      })
    }

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user: publicUser(profile, auth.user.id),
        },
        comments_count: Number(updatedPost?.comments_count || 0),
      },
      { status: 201, headers: { "x-correlation-id": correlationId } },
    )
  } catch (error) {
    console.error("[Comments API] unexpected create failure", { correlationId, error })
    return errorResponse(500, "COMMENT_CREATE_FAILED", "Failed to add comment", correlationId)
  }
}
