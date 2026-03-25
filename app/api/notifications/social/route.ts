import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { SocialNotificationHelpers } from '@/lib/services/optimized-notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const socialInteractionSchema = z.object({
  type: z.enum(['like', 'comment', 'share']),
  postId: z.string().uuid(),
  content: z.string().optional(), // For comments
  sharedTo: z.string().optional() // For shares
})

const followActionSchema = z.object({
  action: z.enum(['follow', 'unfollow']),
  targetUserId: z.string().uuid()
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }

  return user
}

async function getPostInfo(postId: string) {
  const { data: post, error } = await supabase
    .from('posts')
    .select('user_id, content')
    .eq('id', postId)
    .single()

  if (error || !post) {
    throw new Error('Post not found')
  }

  return post
}

async function getUserInfo(userId: string) {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return { full_name: null, username: null }
  }

  return user
}

// =============================================================================
// SOCIAL INTERACTION ENDPOINTS
// =============================================================================

// POST /api/notifications/social - Handle social interactions
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

      const post = await getPostInfo(validatedData.postId)
      
      // Don't notify if interacting with own post
      if (post.user_id === user.id) {
        return NextResponse.json({
          success: true,
          message: 'Interaction recorded (no notification sent to self)'
        })
      }

      const postContentPreview = post.content.substring(0, 100)
      const userInfo = await getUserInfo(user.id)
      const userName = userInfo.full_name || userInfo.username || 'Someone'

      let notification
      
      switch (validatedData.type) {
        case 'like':
          // Create like record (this will trigger the database trigger)
          const { error: likeError } = await supabase
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

          const { error: commentError } = await supabase
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
          const { error: shareError } = await supabase
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
      // Handle follow/unfollow
      const validatedData = followActionSchema.parse({
        action: type,
        targetUserId
      })

      if (validatedData.targetUserId === user.id) {
        return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
      }

      if (validatedData.action === 'follow') {
        // Check if already following
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', validatedData.targetUserId)
          .single()

        if (existingFollow) {
          return NextResponse.json({
            success: true,
            message: 'Already following this user'
          })
        }

        // Create follow relationship (this will trigger notification)
        const { error: followError } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: validatedData.targetUserId
          })

        if (followError) throw followError

        return NextResponse.json({
          success: true,
          message: 'Followed user and notification sent'
        })

      } else if (validatedData.action === 'unfollow') {
        // Remove follow relationship
        const { error: unfollowError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', validatedData.targetUserId)

        if (unfollowError) throw unfollowError

        return NextResponse.json({
          success: true,
          message: 'Unfollowed user'
        })
      }

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
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const userId = searchParams.get('userId') || user.id

    if (postId) {
      // Get post interaction stats
      const [likesResult, commentsResult, sharesResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('id, user_id, created_at, profiles!post_likes_user_id_fkey(full_name, username)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('post_comments')
          .select('id, user_id, content, created_at, profiles!post_comments_user_id_fkey(full_name, username)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('post_shares')
          .select('id, user_id, created_at, shared_to, profiles!post_shares_user_id_fkey(full_name, username)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
      ])

      return NextResponse.json({
        postId,
        interactions: {
          likes: {
            count: likesResult.data?.length || 0,
            users: likesResult.data || []
          },
          comments: {
            count: commentsResult.data?.length || 0,
            users: commentsResult.data || []
          },
          shares: {
            count: sharesResult.data?.length || 0,
            users: sharesResult.data || []
          }
        }
      })
    } else {
      // Get user's social stats
      const [likesGiven, likesReceived, commentsGiven, commentsReceived, sharesGiven, sharesReceived] = await Promise.all([
        supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('posts.user_id', userId)
          .select(`
            id,
            posts!inner(user_id)
          `),
        
        supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('posts.user_id', userId)
          .select(`
            id,
            posts!inner(user_id)
          `),
        
        supabase
          .from('post_shares')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        supabase
          .from('post_shares')
          .select('id', { count: 'exact', head: true })
          .eq('posts.user_id', userId)
          .select(`
            id,
            posts!inner(user_id)
          `)
      ])

      return NextResponse.json({
        userId,
        stats: {
          likesGiven: likesGiven.count || 0,
          likesReceived: likesReceived.count || 0,
          commentsGiven: commentsGiven.count || 0,
          commentsReceived: commentsReceived.count || 0,
          sharesGiven: sharesGiven.count || 0,
          sharesReceived: sharesReceived.count || 0
        }
      })
    }

  } catch (error) {
    console.error('Error fetching social interaction stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social interaction stats' },
      { status: 500 }
    )
  }
}
