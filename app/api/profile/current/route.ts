import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import { startRouteTiming } from '@/lib/observability/route-timing'
import { getCustomProfileDesignState } from '@/lib/profile/custom-profile-layout'

export async function GET(request: NextRequest) {
  const endTiming = startRouteTiming('/api/profile/current')
  try {
    
    const authResult = await ProductionAuthService.authenticateRequest(request)
    if ('error' in authResult) {
      endTiming({ metadata: { status: authResult.status } })
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult


    // Get the user's profile with the correct field names
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        custom_url,
        full_name,
        bio,
        avatar_url,
        cover_image,
        location,
        website,
        profile_data,
        social_links,
        metadata,
        instagram,
        twitter,
        show_email,
        show_phone,
        show_location,
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
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }


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
    }

    // Get like count (sum of likes on posts) if posts table exists
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('user_id', profile.id)

      stats.likes = posts?.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0) || 0
    } catch (error) {
    }

    // Get view count (mock data for now)
    stats.views = Math.floor(Math.random() * 10000) + 1000

    const customDesign = getCustomProfileDesignState((profile as any).metadata)
    const publishedCustomLayout =
      customDesign.status === 'published' ? customDesign.published : null

    // Transform the profile to match the expected format
    const profileWithStats = {
      id: profile.id,
      username: profile.username,
      custom_url: (profile as any).custom_url,
      account_type: 'general' as const,
      profile_data: {
        ...((profile as any).profile_data || {}),
        name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatar_url: profile.avatar_url,
        cover_image:
          (profile as any).cover_image ||
          (profile as any).metadata?.header_url ||
          (profile as any).header_url ||
          null,
      },
      avatar_url: profile.avatar_url,
      cover_image:
        (profile as any).cover_image ||
        (profile as any).metadata?.header_url ||
        (profile as any).header_url ||
        null,
      verified: profile.is_verified,
      bio: profile.bio,
      location: profile.location,
      social_links: {
        ...((profile as any).social_links || {}),
        website: profile.website || (profile as any).social_links?.website || null,
        instagram: (profile as any).instagram || (profile as any).social_links?.instagram || null,
        twitter: (profile as any).twitter || (profile as any).social_links?.twitter || null
      },
      show_email: (profile as any).show_email ?? true,
      show_phone: (profile as any).show_phone ?? false,
      show_location: (profile as any).show_location ?? true,
      stats,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      custom_profile_layout: publishedCustomLayout,
    }


    // Fetch portfolio data for the current user
    let portfolio: any[] = []
    try {
      const { data: portfolioRows } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      portfolio = portfolioRows || []
    } catch (error) {
    }

    endTiming({ userId: user.id, rowCount: 1 })
    return NextResponse.json({
      profile: profileWithStats,
      portfolio,
      custom_profile_layout: publishedCustomLayout,
    })
  } catch (error) {
    endTiming({ metadata: { error: true } })
    console.error('[Profile Current API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 