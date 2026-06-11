import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const user_id = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Use the authenticated supabase client if available, otherwise create a service client
    let supabase
    if (authResult) {
      supabase = authResult.supabase
    } else {
      // For public feed viewing, we can use a service client
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

    
    // Get all user accounts for multi-account feed
    let userAccountIds: string[] = []
    if (authResult?.user) {
      try {
        // Try to fetch from user_accounts table if it exists
        const { data: accounts, error: accountsError } = await supabase
          .from('user_accounts')
          .select('profile_id')
          .eq('user_id', authResult.user.id)
        
        if (accountsError) {
          // Continue without multi-account support
        } else if (accounts) {
          userAccountIds = accounts.map((acc: any) => acc.profile_id)
        }
      } catch (error) {
        // Continue without multi-account support
      }
    }

    // Check if posts table exists and has the correct structure
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('posts')
        .select('id, user_id')
        .limit(1)

      if (tableError) {
        console.error('[Feed Posts API] Posts table not available', tableError)
        return NextResponse.json(
          { success: false, error: { code: 'feed_unavailable', message: 'Feed is temporarily unavailable' }, data: [] },
          { status: 503 }
        )
      }

      // Build a SAFE base query that does not rely on implicit FK joins or optional columns
      // Select only guaranteed columns to prevent "column does not exist" errors
      let baseQuery = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          media_urls,
          likes_count,
          comments_count,
          shares_count,
          is_pinned,
          created_at,
          updated_at,
          type,
          visibility,
          location,
          hashtags
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      // Filter by user when explicitly requested.
      // Support ?profile_id= to show only posts made by a specific entity account.
      const profileIdFilter = searchParams.get('profile_id')
      if (type === 'user' && user_id) {
        if (profileIdFilter) {
          baseQuery = baseQuery.eq('posted_as_profile_id', profileIdFilter)
        } else {
          baseQuery = baseQuery.eq('user_id', user_id)
        }
      } else if (type === 'all' && authResult?.user) {
        // For 'all' feed, include posts from all user accounts plus followed accounts
        const allUserIds = [authResult.user.id, ...userAccountIds]
        if (allUserIds.length > 1) {
          baseQuery = baseQuery.in('user_id', allUserIds)
        }
      }
      
      // Handle following feed - only show posts from users the current user follows
      if (type === 'following' && authResult?.user) {
        
        // Get the list of users the current user follows
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authResult.user.id)

        if (followingError) {
          console.error('[Feed Posts API] Error fetching following relationships:', followingError)
          return NextResponse.json(
            { success: false, error: { code: 'following_lookup_failed', message: 'Failed to fetch following relationships' }, data: [] },
            { status: 500 }
          )
        }

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map((f: { following_id: string }) => f.following_id)
          // Include posts from followed users AND user's own accounts
          const allFollowingIds = Array.from(new Set([...followingIds, ...userAccountIds]))
          baseQuery = baseQuery.in('user_id', allFollowingIds)
        } else if (userAccountIds.length > 0) {
          // If not following anyone but has other accounts, show posts from own accounts
          baseQuery = baseQuery.in('user_id', userAccountIds)
        } else {
          return NextResponse.json({
            success: true,
            data: [],
            message: "You're not following anyone yet. Start following other users to see their posts in your feed!",
          })
        }
      }
      
      // Ignore non-post "types" like 'network' to avoid bad filters

      const { data: basePosts, error: baseError } = await baseQuery

      if (baseError) {
        console.error('[Feed Posts API] Error fetching base posts:', baseError)
        return NextResponse.json(
          { success: false, error: { code: 'fetch_posts_failed', message: 'Failed to fetch posts' }, data: [] },
          { status: 500 }
        )
      }

      const posts = basePosts || []

      // Enrich with profile data in a separate, RLS-safe query
      const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)))
      let profileById: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified')
          .in('id', userIds as string[])

        if (!profilesError && profilesData) {
          profileById = profilesData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p
            return acc
          }, {})
        } else if (profilesError) {
          console.warn('[Feed Posts API] Profiles join failed; continuing with defaults:', profilesError.message)
        }
      }

      // Normalize shape for DashboardFeed which expects a `profiles` field
      const normalized = posts.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        type: p.type || 'text',
        visibility: p.visibility || 'public',
        location: p.location || null,
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        media_urls: Array.isArray(p.media_urls) ? p.media_urls : [],
        likes_count: p.likes_count || 0,
        comments_count: p.comments_count || 0,
        shares_count: p.shares_count || 0,
        is_pinned: Boolean(p.is_pinned),
        created_at: p.created_at,
        updated_at: p.updated_at,
        profiles: profileById[p.user_id] || {
          id: p.user_id,
          username: 'user',
          full_name: 'User',
          avatar_url: '',
          is_verified: false
        },
        // Provide a consistent like flag expected by some UIs
        is_liked: false,
        like_count: p.likes_count || 0
      }))

      return NextResponse.json({ success: true, data: normalized })
    } catch (error) {
      console.error('[Feed Posts API] Posts table error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'feed_query_failed', message: 'Failed to fetch feed posts' }, data: [] },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Feed Posts API] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' }, data: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult
    const body = await request.json()


    // Handle network posts request
    if (body.following_ids) {
      
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          type,
          visibility,
          location,
          hashtags,
          media_urls,
          likes_count,
          comments_count,
          shares_count,
          is_pinned,
          created_at,
          updated_at,
          user_id,
          account_username,
          account_avatar_url,
          profiles:user_id (
            id,
            username,
            avatar_url,
            full_name,
            is_verified
          )
        `)
        .in('user_id', body.following_ids)
        .eq('visibility', 'public') // Only show public posts
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(parseInt(body.limit) || 30)

      if (postsError) {
        console.error('[Feed Posts API] Error fetching network posts:', postsError)
        return NextResponse.json(
          { success: false, data: [], error: { code: 'network_posts_failed', message: 'Failed to fetch network posts' } },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data: posts || [], error: null })
    }

    // Handle post creation — resolve acting entity from session/headers
    const { resolveActingContext } = await import('@/lib/auth/acting-context')
    const actingCtx = await resolveActingContext(request)
    if (actingCtx instanceof NextResponse) return actingCtx

    const { userId: actingUserId, accountType, profileId } = actingCtx

    const {
      content,
      type = 'text',
      visibility = 'public',
      location,
      hashtags = [],
      media_urls = [],
    } = body

    // Allow posts with either content or media
    if (!content?.trim() && (!media_urls || media_urls.length === 0)) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'content_required', message: 'Content or media is required' } },
        { status: 400 }
      )
    }

    const postData = {
      user_id: actingUserId,
      content: content?.trim() || (media_urls && media_urls.length > 0 ? 'Shared a photo' : null),
      type: type || (media_urls && media_urls.length > 0 ? 'image' : 'text'),
      visibility,
      location,
      hashtags,
      media_urls,
      // Acting-entity attribution
      posted_as_type:       accountType,
      posted_as_profile_id: profileId,
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json(
        { success: false, data: null, error: { code: 'create_post_failed', message: 'Failed to create post' } },
        { status: 500 }
      )
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_verified')
      .eq('id', actingUserId)
      .maybeSingle()

    if (profileError) {
      console.warn('[Feed Posts API] Profile fetch after create (continuing):', profileError.message)
    }

    const profiles = profileRow
      ? {
          username: profileRow.username || 'user',
          full_name: profileRow.full_name || profileRow.username || 'User',
          avatar_url: profileRow.avatar_url || '',
          is_verified: Boolean(profileRow.is_verified)
        }
      : { username: 'user', full_name: 'User', avatar_url: '', is_verified: false }

    const normalized = {
      ...post,
      profiles,
      is_liked: false,
      like_count: (post as { likes_count?: number }).likes_count ?? 0
    }

    return NextResponse.json({ success: true, data: normalized, error: null })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
} 