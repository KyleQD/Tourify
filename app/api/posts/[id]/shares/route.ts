import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { checkAuth } from "@/lib/auth/api-auth"
import { resolvePostCommentAccess } from "@/lib/feed/post-comment-access"
import { recordPromoterNativeShare } from "@/lib/promoter-network/assets-command"

const SHARE_DESTINATIONS = new Set(["clipboard", "native", "feed"])
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

export async function POST(request: NextRequest, { params }: RouteContext) {
  const correlationId = correlationIdFor(request)
  try {
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", correlationId)
    }

    const { id: postId } = await params
    if (!postId) return errorResponse(400, "INVALID_POST_ID", "Post ID is required", correlationId)

    let destination: unknown
    try {
      destination = (await request.json())?.destination
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON", correlationId)
    }
    if (typeof destination !== "string" || !SHARE_DESTINATIONS.has(destination)) {
      return errorResponse(
        400,
        "INVALID_DESTINATION",
        'Destination must be "clipboard", "native", or "feed"',
        correlationId,
      )
    }

    const access = await resolvePostCommentAccess({
      supabase: auth.supabase,
      postId,
      viewerUserId: auth.user.id,
    })
    if (!access.allowed) {
      return errorResponse(404, "POST_NOT_FOUND", "Post not found", correlationId)
    }

    const { data: share, error } = await auth.supabase
      .from("post_shares")
      .insert({
        post_id: postId,
        user_id: auth.user.id,
        shared_to: destination,
      })
      .select("id, post_id, shared_to, created_at")
      .single()
    if (error || !share) {
      console.error("[Shares API] insert failed", { correlationId, code: error?.code })
      return errorResponse(500, "SHARE_CREATE_FAILED", "Failed to record share", correlationId)
    }

    await recordPromoterNativeShare({
      actorUserId: auth.user.id,
      postId,
      shareId: share.id,
    })

    const { data: post, error: countError } = await auth.supabase
      .from("posts")
      .select("shares_count")
      .eq("id", postId)
      .maybeSingle()
    if (countError || !post) {
      console.error("[Shares API] count read failed", { correlationId, code: countError?.code })
      return errorResponse(500, "SHARE_COUNT_FAILED", "Share saved but count could not be read", correlationId)
    }

    return NextResponse.json(
      {
        success: true,
        share: {
          id: share.id,
          post_id: share.post_id,
          destination: share.shared_to,
          created_at: share.created_at,
        },
        shares_count: Number(post.shares_count || 0),
      },
      { status: 201, headers: { "x-correlation-id": correlationId } },
    )
  } catch (error) {
    console.error("[Shares API] unexpected failure", { correlationId, error })
    return errorResponse(500, "SHARE_CREATE_FAILED", "Failed to record share", correlationId)
  }
}
