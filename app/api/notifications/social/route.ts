import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAuth } from '@/lib/auth/api-auth'
import { resolvePostCommentAccess } from '@/lib/feed/post-comment-access'
import { POST as canonicalFollowPost } from '@/app/api/social/follow/route'

// =============================================================================
// AUTH / SCOPE MODEL (SOCIAL-007, SIM-20260922-SOC-003)
//
// This route never uses a service-role client. Every read runs on the
// caller-scoped client returned by `checkAuth`, so PostgREST applies the
// caller's RLS (for example `post_shares` is `auth.uid() = user_id`).
//
// `post_likes` and `post_comments` still carry a permissive `USING (true)`
// SELECT policy in the migration chain, so RLS alone is not a sufficient
// boundary for those two tables. The mandatory, fail-closed authorization
// decision is therefore the application-level post-visibility gate
// (`resolvePostCommentAccess`), which runs BEFORE any interaction read and
// returns the same 404 for a missing post and a non-entitled post so it
// cannot be used as an existence oracle.
//
// Per-user aggregate stats are self-only: `?userId=` is rejected unless it
// equals the authenticated user, so counters cannot be used to enumerate
// another user's activity.
// =============================================================================

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DEFAULT_INTERACTION_PAGE_SIZE = 50
const MAX_INTERACTION_PAGE_SIZE = 100

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const socialInteractionSchema = z.object({
  type: z.enum(['like', 'comment', 'share']),
  postId: z.string().uuid(),
  content: z.string().optional(), // For comments
  sharedTo: z.enum(['clipboard', 'native', 'feed']).optional() // For shares
})

const followActionSchema = z.object({
  action: z.enum(['follow', 'unfollow']),
  targetUserId: z.string().uuid()
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function isUuid(value: string | null): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * Public display projection for an interaction actor. Only fields that are
 * already exposed by the public comment list are returned; no account or
 * privacy columns are read.
 */
function publicUser(profile: any, userId: string) {
  return {
    id: userId,
    username: profile?.username || 'user',
    full_name: profile?.full_name || 'Anonymous User',
    avatar_url: profile?.avatar_url || '',
    is_verified: Boolean(profile?.is_verified),
  }
}

async function hydrateActors(supabase: any, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  if (ids.length === 0) return new Map<string, any>()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .in('id', ids)

  if (error) {
    console.warn('[Notifications Social] actor hydration failed', { code: error.code })
    return new Map<string, any>()
  }

  return new Map<string, any>((data || []).map((profile: any) => [profile.id, profile]))
}

/**
 * Mandatory, fail-closed post authorization for interaction reads and writes.
 * Returns null when the caller is entitled; the caller must answer 404.
 */
async function authorizePost(supabase: any, postId: string, viewerUserId: string | null) {
  try {
    const access = await resolvePostCommentAccess({ supabase, postId, viewerUserId })
    return access.allowed ? access : null
  } catch (error) {
    console.error('[Notifications Social] post authorization failed', { error })
    return null
  }
}

// =============================================================================
// SOCIAL INTERACTION ENDPOINTS
// =============================================================================

// POST /api/notifications/social - Handle social interactions
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user } = auth

    const body = await request.json()
    const { action, type, postId, content, sharedTo, targetUserId } = body

    if (action === 'social_interaction') {
      // Handle like, comment, share
      const validatedData = socialInteractionSchema.parse({
        type,
        postId,
        content,
        sharedTo
      })

      // Same visibility gate as the canonical interaction routes so an outsider
      // cannot like, comment on, or share a followers-only or private post.
      const access = await authorizePost(auth.supabase, validatedData.postId, user.id)
      if (!access) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      switch (validatedData.type) {
        case 'like':
          // Create like record (this will trigger the database trigger)
          const { error: likeError } = await auth.supabase
            .from('post_likes')
            .insert({
              post_id: validatedData.postId,
              user_id: user.id
            })

          if (likeError) {
            if (likeError.code === '23505') {
              // Already liked
              return NextResponse.json({
                success: true,
                message: 'Already liked this post'
              })
            }
            throw likeError
          }

          return NextResponse.json({
            success: true,
            message: 'Like recorded and notification sent'
          })

        case 'comment':
          // Create comment record (this will trigger the database trigger)
          if (!validatedData.content) {
            return NextResponse.json({ error: 'Content is required for comments' }, { status: 400 })
          }

          const { error: commentError } = await auth.supabase
            .from('post_comments')
            .insert({
              post_id: validatedData.postId,
              user_id: user.id,
              content: validatedData.content
            })

          if (commentError) throw commentError

          return NextResponse.json({
            success: true,
            message: 'Comment posted and notification sent'
          })

        case 'share':
          // Create share record (this will trigger the database trigger)
          const { error: shareError } = await auth.supabase
            .from('post_shares')
            .insert({
              post_id: validatedData.postId,
              user_id: user.id,
              shared_to: validatedData.sharedTo || 'feed'
            })

          if (shareError) {
            if (shareError.code === '23505') {
              // Already shared
              return NextResponse.json({
                success: true,
                message: 'Already shared this post'
              })
            }
            throw shareError
          }

          return NextResponse.json({
            success: true,
            message: 'Post shared and notification sent'
          })

        default:
          return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 })
      }

    } else if (action === 'follow') {
      // Legacy envelope: keep old callers working, but make the user-scoped
      // canonical route the only writer and side-effect owner for follows.
      const validatedData = followActionSchema.parse({
        action: type,
        targetUserId
      })
      const headers = new Headers(request.headers)
      headers.delete('content-length')
      return canonicalFollowPost(new NextRequest(request.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          followingId: validatedData.targetUserId,
          action: validatedData.action,
        }),
      }))

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error handling social interaction:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to handle social interaction' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/social - Get social interaction stats
export async function GET(request: NextRequest) {
  try {
    // Bearer or cookie session; the returned client is caller-scoped so RLS
    // applies. No service-role read is available on this path.
    const auth = await checkAuth(request)
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, supabase } = auth

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const requestedUserId = searchParams.get('userId')

    if (postId) {
      if (!isUuid(postId)) {
        return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
      }

      // Fail-closed authorization before any interaction read. Identical 404
      // for missing and non-entitled posts: no existence oracle.
      const access = await authorizePost(supabase, postId, user.id)
      if (!access) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      const limit = boundedInteger(
        searchParams.get('limit'),
        DEFAULT_INTERACTION_PAGE_SIZE,
        1,
        MAX_INTERACTION_PAGE_SIZE,
      )
      const offset = boundedInteger(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER)

      const [likesResult, commentsResult, sharesResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('id, user_id, created_at', { count: 'exact' })
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),

        supabase
          .from('post_comments')
          .select('id, user_id, content, created_at', { count: 'exact' })
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),

        // `post_shares` SELECT policy is `auth.uid() = user_id`, so this
        // returns at most the caller's own share. `posts.shares_count`
        // remains the aggregate surface.
        supabase
          .from('post_shares')
          .select('id, user_id, created_at, shared_to', { count: 'exact' })
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
      ])

      const readError = likesResult.error || commentsResult.error || sharesResult.error
      if (readError) {
        console.error('[Notifications Social] interaction read failed', {
          code: readError.code,
        })
        return NextResponse.json(
          { error: 'Failed to fetch social interaction stats' },
          { status: 500 }
        )
      }

      const likes = likesResult.data || []
      const comments = commentsResult.data || []
      const shares = sharesResult.data || []

      const actors = await hydrateActors(supabase, [
        ...likes.map((row: any) => row.user_id),
        ...comments.map((row: any) => row.user_id),
        ...shares.map((row: any) => row.user_id),
      ])

      return NextResponse.json({
        postId,
        interactions: {
          likes: {
            count: likesResult.count ?? likes.length,
            users: likes.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              created_at: row.created_at,
              user: publicUser(actors.get(row.user_id), row.user_id),
            })),
          },
          comments: {
            count: commentsResult.count ?? comments.length,
            users: comments.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              content: row.content,
              created_at: row.created_at,
              user: publicUser(actors.get(row.user_id), row.user_id),
            })),
          },
          shares: {
            count: sharesResult.count ?? shares.length,
            users: shares.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              created_at: row.created_at,
              shared_to: row.shared_to,
              user: publicUser(actors.get(row.user_id), row.user_id),
            })),
          },
        },
        limit,
        offset,
      })
    }

    // Per-user aggregate stats are self-only. A caller-supplied `userId` that
    // is not the authenticated user is refused so counters cannot be used to
    // enumerate another user's activity.
    if (requestedUserId && !isUuid(requestedUserId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'not_own_interaction_stats' },
        { status: 403 }
      )
    }

    const [likesGiven, likesReceived, commentsGiven, commentsReceived, sharesGiven, sharesReceived] = await Promise.all([
      supabase
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      supabase
        .from('post_likes')
        .select('id, posts!inner(user_id)', { count: 'exact', head: true })
        .eq('posts.user_id', user.id),

      supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      supabase
        .from('post_comments')
        .select('id, posts!inner(user_id)', { count: 'exact', head: true })
        .eq('posts.user_id', user.id),

      supabase
        .from('post_shares')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // `post_shares` SELECT is `auth.uid() = user_id`, so this counts only
      // share rows the caller is permitted to read — never another actor's.
      // The permissive service-role value it replaced was a disclosure
      // primitive; `posts.shares_count` remains the aggregate surface.
      supabase
        .from('post_shares')
        .select('id, posts!inner(user_id)', { count: 'exact', head: true })
        .eq('posts.user_id', user.id),
    ])

    const countError =
      likesGiven.error || likesReceived.error || commentsGiven.error
      || commentsReceived.error || sharesGiven.error || sharesReceived.error
    if (countError) {
      console.error('[Notifications Social] self stats read failed', { code: countError.code })
      return NextResponse.json(
        { error: 'Failed to fetch social interaction stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      stats: {
        likesGiven: likesGiven.count || 0,
        likesReceived: likesReceived.count || 0,
        commentsGiven: commentsGiven.count || 0,
        commentsReceived: commentsReceived.count || 0,
        sharesGiven: sharesGiven.count || 0,
        sharesReceived: sharesReceived.count || 0
      }
    })

  } catch (error) {
    console.error('Error fetching social interaction stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social interaction stats' },
      { status: 500 }
    )
  }
}
