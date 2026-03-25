import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const authResult = await ProductionAuthService.authenticateRequest(request)
    const username = decodeURIComponent(params.username)

    console.log('[Profile Username API] Fetching profile for username:', username)

    // Use the authenticated supabase client if available, otherwise create a service client
    let supabase
    if (!('error' in authResult)) {
      supabase = authResult.supabase
      console.log('[Profile Username API] Using authenticated client')
    } else {
      // For public profile viewing, we can use a service client
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
      console.log('[Profile Username API] Using service client for public access')
    }

    // First, try to find the profile by username in the main profiles table
    let { data: profile, error: profileError } = await supabase
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
      .eq('username', username)
      .single()

    // Check if profile was found in main profiles table
    if (profileError || !profile) {
      console.log('[Profile Username API] Profile not found for username:', username)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    console.log('[Profile Username API] Found profile in main profiles table:', profile.username)

    console.log('[Profile Username API] Found profile:', profile.username)

    // Initialize stats with default values
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

    // Stats are now managed by the profiles table directly
    if (true) {
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
        console.log('[Profile Username API] Posts table not available, using profile data')
      }

      // Get like count (sum of likes on posts) if posts table exists
      try {
        const { data: posts } = await supabase
          .from('posts')
          .select('likes_count')
          .eq('user_id', profile.id)

        stats.likes = posts?.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0) || 0
      } catch (error) {
        console.log('[Profile Username API] Could not fetch likes data')
      }

      // Get view count (mock data for now)
      stats.views = Math.floor(Math.random() * 10000) + 1000
    }

    // Base profile shape that we will enrich per account type
    let accountType: 'general' | 'artist' | 'venue' | 'organization' = 'general'
    let profileData: any = {
      name: profile.full_name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website
    }
    let socialLinks: Record<string, any> = {
      website: profile.website,
      instagram: null,
      twitter: null
    }

    // Attempt to detect specialized profiles
    try {
      // Artist
      const { data: artist, error: artistError } = await supabase
        .from('artist_profiles')
        .select('artist_name,bio,genres,social_links,created_at,updated_at')
        .eq('user_id', profile.id)
        .limit(1)
        .single()

      if (!artistError && artist) {
        accountType = 'artist'
        profileData = {
          artist_name: artist.artist_name,
          bio: artist.bio ?? profile.bio,
          genre: Array.isArray(artist.genres) && artist.genres.length > 0 ? artist.genres[0] : undefined,
          website: profile.website,
          ...artist.social_links
        }
        socialLinks = {
          website: profile.website,
          ...(artist.social_links || {})
        }
      }
    } catch (e) {
      // Table may not exist; ignore
    }

    if (accountType === 'general') {
      try {
        // Venue by user
        const { data: venue, error: venueError } = await supabase
          .from('venue_profiles')
          .select('venue_name,description,address,city,state,country,capacity,venue_types,social_links,created_at')
          .eq('user_id', profile.id)
          .limit(1)
          .single()

        if (!venueError && venue) {
          accountType = 'venue'
          profileData = {
            venue_name: venue.venue_name,
            bio: venue.description ?? profile.bio,
            location: [venue.city, venue.state].filter(Boolean).join(', '),
            capacity: venue.capacity,
            venue_types: venue.venue_types,
            website: profile.website,
          }
          socialLinks = {
            website: profile.website,
            ...(venue.social_links || {})
          }
          // Map some venue stats if not present
          stats.events = stats.events || 0
        }
      } catch (e) {
        // Ignore if table missing
      }
    }

    if (accountType === 'general') {
      // Organization detection (two options: dedicated table or columns on profiles)
      try {
        const { data: org, error: orgError } = await supabase
          .from('organizer_profiles')
          .select('organization_name,organization_type,description,social_links')
          .eq('user_id', profile.id)
          .limit(1)
          .single()

        if (!orgError && org) {
          accountType = 'organization'
          profileData = {
            name: org.organization_name ?? profile.full_name,
            organization_type: org.organization_type,
            bio: org.description ?? profile.bio,
            website: profile.website,
          }
          socialLinks = {
            website: profile.website,
            ...(org.social_links || {})
          }
        }
      } catch (e) {
        // Fallback to organization_* columns if present in profiles (best-effort)
        try {
          const { data: orgCols } = await supabase
            .from('profiles')
            .select('organization_name,organization_type,organization_data')
            .eq('id', profile.id)
            .limit(1)
            .single()
          if (orgCols && (orgCols as any).organization_name) {
            accountType = 'organization'
            profileData = {
              name: (orgCols as any).organization_name,
              organization_type: (orgCols as any).organization_type,
              bio: (orgCols as any).organization_data?.description ?? profile.bio,
              website: profile.website,
            }
            socialLinks = {
              website: profile.website,
              ...(orgCols as any).organization_data?.social_links || {}
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Fetch public content tied to this profile
    let portfolio: any[] = []
    let experiences: any[] = []
    let certifications: any[] = []
    let topSkills: Array<{ name: string; endorsed_count: number }> = []

    try {
      const [{ data: portfolioRows }, { data: experienceRows }, { data: certRows }] = await Promise.all([
        supabase.from('portfolio_items').select('*').eq('user_id', profile.id).or('is_public.eq.true,is_public.is.null').order('created_at', { ascending: false }),
        supabase.from('profile_experiences').select('*').eq('user_id', profile.id).eq('is_visible', true).order('order_index', { ascending: true }),
        supabase.from('profile_certifications').select('*').eq('user_id', profile.id).eq('is_public', true).order('issue_date', { ascending: false })
      ])
      portfolio = portfolioRows || []
      experiences = experienceRows || []
      certifications = certRows || []
    } catch {
      // Ignore if tables missing
    }

    try {
      const [{ data: endorsements }, { data: top }] = await Promise.all([
        supabase.from('skill_endorsements').select('skill').eq('endorsed_id', profile.id),
        supabase.from('profiles').select('top_skills').eq('id', profile.id).single()
      ])
      const countMap: Record<string, number> = {}
      ;(endorsements || []).forEach((e: any) => { countMap[e.skill] = (countMap[e.skill] || 0) + 1 })
      const topList: string[] = (top as any)?.top_skills || []
      topSkills = topList.map(name => ({ name, endorsed_count: countMap[name] || 0 }))
    } catch {
      topSkills = []
    }

    const profileWithStats = {
      id: profile.id,
      username: profile.username,
      account_type: accountType,
      profile_data: profileData,
      avatar_url: profile.avatar_url,
      cover_image: (profile as any).cover_image || (profile as any).header_url || null,
      verified: profile.is_verified,
      bio: profile.bio,
      location: profile.location,
      social_links: socialLinks,
      stats,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }

    console.log('[Profile Username API] Returning profile with content')

    return NextResponse.json({ 
      profile: profileWithStats, 
      profileData,
      accountType,
      portfolio, 
      experiences, 
      certifications, 
      top_skills: topSkills 
    })
  } catch (error) {
    console.error('[Profile Username API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}