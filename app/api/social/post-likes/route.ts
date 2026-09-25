import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth/api-auth'
import {
  MAX_POST_LIKE_BATCH,
  parsePostIdsParam,
  resolveViewerPostLikeState,
} from '@/lib/social/post-like-state'

/**
 * GET /api/social/post-likes?postIds=<uuid>[,<uuid>...]
 *
 * The canonical server-authorized replacement for the browser `post_likes`
 * reads that `components/artist/artist-home-feed.tsx` and
 * `components/profile/public-profile-view.tsx` used to perform
 * (SOCIAL-007, `HF-DB-006-SOCIAL-007`).
 *
 * Contract:
 *   200 { success: true, likedPostIds: string[], degraded: boolean }
 *   400 { error: 'invalid_post_ids' | 'too_many_post_ids' }
 *   401 { error: 'Unauthorized' }
 *
 * - Authentication is required. `checkAuth` accepts a Bearer token or the SSR
 *   cookie session, and the client it returns is caller-scoped, so the caller's
 *   own RLS applies (CP-058). No service-role client is reachable from here.
 * - Only the caller's own like rows are read (`.eq('user_id', viewerId)`), so
 *   the response can never contain another actor's like.
 * - Requested posts are gated on post visibility *before* the like read, using
 *   the same predicate as `app/api/posts/[id]/likes`. A missing post and a
 *   non-entitled post are both simply absent from `likedPostIds`; neither
 *   produces a distinguishable answer, so this is not an existence oracle.
 * - `degraded: true` means an authorization or read step failed and the set is
 *   empty because it failed closed. A caller must not present that as
 *   "not liked" (CP-049).
 * - The batch is bounded at 50 ids (the feed's own page limit) and an oversized
 *   request is refused rather than silently truncated, so a caller never gets a
 *   false "not liked" for a post that was dropped.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { postIds, invalid, overLimit } = parsePostIdsParam(searchParams.get('postIds'))

    if (invalid) {
      return NextResponse.json(
        { error: 'invalid_post_ids', maxPostIds: MAX_POST_LIKE_BATCH },
        { status: 400 },
      )
    }
    if (overLimit) {
      return NextResponse.json(
        { error: 'too_many_post_ids', maxPostIds: MAX_POST_LIKE_BATCH },
        { status: 400 },
      )
    }

    const state = await resolveViewerPostLikeState({
      supabase: auth.supabase,
      postIds,
      viewerUserId: auth.user.id,
    })

    if (state.degraded) {
      // Fail closed on the data, and say so loudly enough to be observable.
      return NextResponse.json(
        { error: 'Failed to fetch like state', code: 'like_state_unavailable' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      likedPostIds: state.likedPostIds,
      degraded: false,
    })
  } catch (error) {
    console.error('[Social Post Likes] read failed', { error })
    return NextResponse.json(
      { error: 'Failed to fetch like state' },
      { status: 500 },
    )
  }
}
