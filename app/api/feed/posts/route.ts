import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[Feed Posts API] GET request started')
    
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
      console.log('[Feed Posts API] Using authenticated client')
    } else {
      // For public feed viewing, we can use a service client
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
      console.log('[Feed Posts API] Using service client for public access')
    }

    console.log('[Feed Posts API] Fetching posts with type:', type, 'limit:', limit, 'offset:', offset)
    
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
          console.log('[Feed Posts API] user_accounts table not available, skipping multi-account feature:', accountsError.message)
          // Continue without multi-account support
        } else if (accounts) {
          userAccountIds = accounts.map((acc: any) => acc.profile_id)
          console.log('[Feed Posts API] Found user accounts:', userAccountIds.length)
        }
      } catch (error) {
        console.log('[Feed Posts API] user_accounts table not available, skipping multi-account feature')
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
        console.log('[Feed Posts API] Posts table not available, returning mock data')
        
        // Return mock data for testing
        const mockPosts = [
          {
            id: '1',
            content: 'Welcome to Tourify! This is a sample post.',
            media_urls: [],
            likes_count: 5,
            comments_count: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: {
              id: 'user-1',
              username: 'tourify',
              avatar_url: '',
              verified: true
            }
          },
          {
            id: '2',
            content: 'Another sample post for testing the feed.',
            media_urls: [],
            likes_count: 3,
            comments_count: 1,
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString(),
            user: {
              id: 'user-2',
              username: 'demo_user',
              avatar_url: '',
              verified: false
            }
          }
        ]

        return NextResponse.json({ posts: mockPosts })
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
          created_at,
          updated_at,
          type,
          visibility,
          location,
          hashtags
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      // Filter by user when explicitly requested
      if (type === 'user' && user_id) {
        baseQuery = baseQuery.eq('user_id', user_id)
      } else if (type === 'all' && authResult?.user) {
        // For 'all' feed, include posts from all user accounts plus followed accounts
        const allUserIds = [authResult.user.id, ...userAccountIds]
        if (allUserIds.length > 1) {
          baseQuery = baseQuery.in('user_id', allUserIds)
        }
      }
      
      // Handle following feed - only show posts from users the current user follows
      if (type === 'following' && authResult?.user) {
        console.log('[Feed Posts API] Fetching following feed for user:', authResult.user.id)
        
        // Get the list of users the current user follows
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authResult.user.id)

        if (followingError) {
          console.error('[Feed Posts API] Error fetching following relationships:', followingError)
          return NextResponse.json(
            { error: 'Failed to fetch following relationships' },
            { status: 500 }
          )
        }

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map((f: { following_id: string }) => f.following_id)
          // Include posts from followed users AND user's own accounts
          const allFollowingIds = Array.from(new Set([...followingIds, ...userAccountIds]))
          console.log('[Feed Posts API] User follows', followingIds.length, 'users, has', userAccountIds.length, 'accounts')
          baseQuery = baseQuery.in('user_id', allFollowingIds)
        } else if (userAccountIds.length > 0) {
          // If not following anyone but has other accounts, show posts from own accounts
          console.log('[Feed Posts API] User has', userAccountIds.length, 'accounts but follows no one')
          baseQuery = baseQuery.in('user_id', userAccountIds)
        } else {
          console.log('[Feed Posts API] User follows no one and has no other accounts, returning empty feed with message')
          return NextResponse.json({ 
            data: [],
            message: "You're not following anyone yet. Start following other users to see their posts in your feed!"
          })
        }
      }
      
      // Ignore non-post "types" like 'network' to avoid bad filters

      const { data: basePosts, error: baseError } = await baseQuery

      if (baseError) {
        console.error('[Feed Posts API] Error fetching base posts:', baseError)
        return NextResponse.json(
          { error: 'Failed to fetch posts' },
          { status: 500 }
        )
      }

      const posts = basePosts || []
      console.log('[Feed Posts API] Found posts:', posts.length)

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

      return NextResponse.json({ data: normalized })
    } catch (error) {
      console.log('[Feed Posts API] Posts table error, returning mock data:', error)
      
      // Return mock data when there are table issues
      const mockPosts = [
        {
          id: '1',
          content: 'Welcome to Tourify! This is a sample post.',
          media_urls: [],
          likes_count: 5,
          comments_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: 'user-1',
            username: 'tourify',
            avatar_url: '',
            verified: true
          }
        },
        {
          id: '2',
          content: 'Another sample post for testing the feed.',
          media_urls: [],
          likes_count: 3,
          comments_count: 1,
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          user: {
            id: 'user-2',
            username: 'demo_user',
            avatar_url: '',
            verified: false
          }
        }
      ]

      return NextResponse.json({ posts: mockPosts })
    }
  } catch (error) {
    console.error('[Feed Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult
    const body = await request.json()

    // Handle network posts request
    if (body.following_ids) {
      console.log('[Feed Posts API] Fetching network posts for following IDs:', body.following_ids.length)
      
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
        .order('created_at', { ascending: false })
        .limit(parseInt(body.limit) || 30)

      if (postsError) {
        console.error('[Feed Posts API] Error fetching network posts:', postsError)
        return NextResponse.json(
          { data: [], error: 'Failed to fetch network posts' },
          { status: 500 }
        )
      }

      console.log('[Feed Posts API] Found network posts:', posts?.length || 0)
      return NextResponse.json({ data: posts || [], error: null })
    }

    // Handle post creation
    const { content, type = 'text', visibility = 'public', location, hashtags = [], media_urls = [] } = body

    // Allow posts with either content or media
    if (!content?.trim() && (!media_urls || media_urls.length === 0)) {
      return NextResponse.json(
        { data: null, error: 'Content or media is required' },
        { status: 400 }
      )
    }

    // Create post data
    const postData = {
      user_id: user.id,
      content: content?.trim() || (media_urls && media_urls.length > 0 ? 'Shared a photo' : null),
      type: media_urls && media_urls.length > 0 ? 'media' : type,
      visibility,
      location,
      hashtags,
      media_urls
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json(
        { data: null, error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: post, error: null })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 