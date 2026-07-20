import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import { extractCreatorCapabilitiesV1 } from '@/lib/creator/capability-system'
import { getCustomProfileDesignState } from '@/lib/profile/custom-profile-layout'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const authResult = await ProductionAuthService.authenticateRequest(request)
    const username = decodeURIComponent(params.username)


    // Use the authenticated supabase client if available, otherwise create a service client
    let supabase
    if (!('error' in authResult)) {
      supabase = authResult.supabase
    } else {
      // For public profile viewing, we can use a service client
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

    // First, try to find the profile by username in the main profiles table
    let lookupMethod: 'username' | 'custom_url' = 'username'

    let { data: profile, error: profileError } = await supabase
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
        is_verified,
        followers_count,
        following_count,
        posts_count,
        created_at,
        updated_at
      `)
      .eq('username', username)
      .single()

    // If not found, try matching the custom_url instead
    if (profileError || !profile) {
      lookupMethod = 'custom_url'

      ;({ data: profile, error: profileError } = await supabase
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
          is_verified,
          followers_count,
          following_count,
          posts_count,
          created_at,
          updated_at
        `)
        .eq('custom_url', username)
        .single())

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
    }


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
    }

    const baseProfileData = ((profile as any).profile_data || {}) as Record<string, any>
    const baseSocialLinks = ((profile as any).social_links || {}) as Record<string, any>

    // Base profile shape that we will enrich per account type
    let accountType: 'general' | 'artist' | 'venue' | 'organization' = 'general'
    let authorProfileId: string = profile.id
    const ownerUserId: string = profile.id
    let profileData: any = {
      ...baseProfileData,
      name: profile.full_name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website
    }
    let socialLinks: Record<string, any> = {
      ...baseSocialLinks,
      website: profile.website || baseSocialLinks.website || null,
      instagram: (profile as any).instagram || baseSocialLinks.instagram || null,
      twitter: (profile as any).twitter || baseSocialLinks.twitter || null
    }

    // Attempt to detect specialized profiles
    try {
      // Artist
      const { data: artist, error: artistError } = await supabase
        .from('artist_profiles')
        .select('id,artist_name,url_slug,bio,genres,social_links,settings,created_at,updated_at')
        .eq('user_id', profile.id)
        .limit(1)
        .single()

      if (!artistError && artist) {
        const capabilities = extractCreatorCapabilitiesV1(artist.settings)
        accountType = 'artist'
        authorProfileId = artist.id
        profileData = {
          artist_name: artist.artist_name,
          url_slug: artist.url_slug,
          bio: artist.bio ?? profile.bio,
          genre: Array.isArray(artist.genres) && artist.genres.length > 0 ? artist.genres[0] : undefined,
          creator_type: capabilities.creatorType,
          service_offerings: capabilities.serviceOfferings,
          products_for_sale: capabilities.productsForSale,
          credentials: capabilities.credentials,
          work_highlights: capabilities.workHighlights,
          available_for_hire: capabilities.availableForHire,
          collaboration_interest: capabilities.collaborationInterest,
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
          .select('id,venue_name,description,address,city,state,country,capacity,venue_types,social_links,created_at')
          .eq('user_id', profile.id)
          .limit(1)
          .single()

        if (!venueError && venue) {
          accountType = 'venue'
          authorProfileId = venue.id
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

    // General profiles stay General. Organization brands resolve via /organization/{slug}.
    // Do not rewrite this response to organization when the user also owns an org.

    profileData = {
      ...baseProfileData,
      ...profileData,
      profile_experience: baseProfileData.profile_experience || profileData.profile_experience
    }
    socialLinks = {
      ...baseSocialLinks,
      ...socialLinks
    }

    try {
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .or(`posted_as_profile_id.eq.${authorProfileId},user_id.eq.${ownerUserId}`)
        .eq('visibility', 'public')

      if (postCount !== null) {
        stats.posts = postCount
      }
    } catch {
      // Keep profile table count if posts are unavailable.
    }

    try {
      const { data: postLikes } = await supabase
        .from('posts')
        .select('likes_count')
        .or(`posted_as_profile_id.eq.${authorProfileId},user_id.eq.${ownerUserId}`)
        .eq('visibility', 'public')

      stats.likes = postLikes?.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0) || 0
    } catch {
      // Keep default likes if posts are unavailable.
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

    const customDesign = getCustomProfileDesignState((profile as any).metadata)
    const publishedCustomLayout =
      accountType === 'general' && customDesign.status === 'published'
        ? customDesign.published
        : null

    const resolvedCoverImage =
      (profile as any).cover_image ||
      (profile as any).metadata?.header_url ||
      (profile as any).header_url ||
      null

    const profileWithStats = {
      id: profile.id,
      author_profile_id: authorProfileId,
      owner_user_id: ownerUserId,
      username: profile.username,
      account_type: accountType,
      profile_data: {
        ...profileData,
        avatar_url: profile.avatar_url || (profileData as any)?.avatar_url || null,
        cover_image: resolvedCoverImage,
      },
      avatar_url: profile.avatar_url,
      cover_image: resolvedCoverImage,
      verified: profile.is_verified,
      bio: profile.bio,
      location: profile.location,
      social_links: socialLinks,
      stats,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      custom_profile_layout: publishedCustomLayout,
    }


    return NextResponse.json({ 
      profile: profileWithStats, 
      profileData,
      accountType,
      portfolio, 
      experiences, 
      certifications, 
      top_skills: topSkills,
      custom_profile_layout: publishedCustomLayout,
    })
  } catch (error) {
    console.error('[Profile Username API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
