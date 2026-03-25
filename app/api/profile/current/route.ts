import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[Profile Current API] GET request started')
    
    const authResult = await ProductionAuthService.authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    console.log('[Profile Current API] User authenticated:', user.id)

    // Get the user's profile with the correct field names
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        cover_image,
        location,
        website,
        is_verified,
        followers_count,
        following_count,
        posts_count,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('[Profile Current API] Profile not found for user:', user.id)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    console.log('[Profile Current API] Profile found:', profile.username)

    // Get stats based on available data
    let stats = {
      followers: profile.followers_count || 0,
      following: profile.following_count || 0,
      posts: profile.posts_count || 0,
      likes: 0,
      views: 0,
      streams: 0,
      events: 0,
      monthly_listeners: 0,
      total_revenue: 0,
      engagement_rate: 0
    }

    // Try to get additional stats from posts table if it exists
    try {
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      if (postCount !== null) {
        stats.posts = postCount
      }
    } catch (error) {
      console.log('[Profile Current API] Posts table not available, using profile data')
    }

    // Get like count (sum of likes on posts) if posts table exists
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('user_id', profile.id)

      stats.likes = posts?.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0) || 0
    } catch (error) {
      console.log('[Profile Current API] Could not fetch likes data')
    }

    // Get view count (mock data for now)
    stats.views = Math.floor(Math.random() * 10000) + 1000

    // Transform the profile to match the expected format
    const profileWithStats = {
      id: profile.id,
      username: profile.username,
      account_type: 'general' as const,
      profile_data: {
        name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website
      },
      avatar_url: profile.avatar_url,
      cover_image: (profile as any).cover_image || (profile as any).header_url || null,
      verified: profile.is_verified,
      bio: profile.bio,
      location: profile.location,
      social_links: {
        website: profile.website,
        instagram: null,
        twitter: null
      },
      stats,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }

    console.log('[Profile Current API] Returning profile with stats')

    // Fetch portfolio data for the current user
    let portfolio: any[] = []
    try {
      const { data: portfolioRows } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      portfolio = portfolioRows || []
      console.log('[Profile Current API] Found portfolio items:', portfolio.length)
    } catch (error) {
      console.log('[Profile Current API] Could not fetch portfolio data:', error)
    }

    return NextResponse.json({ profile: profileWithStats, portfolio })
  } catch (error) {
    console.error('[Profile Current API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 