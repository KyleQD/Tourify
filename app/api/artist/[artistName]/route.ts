import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const authResult = await authenticateApiRequest(request)
    const artistName = decodeURIComponent(params.artistName)


    // Use the authenticated supabase client if available, otherwise create a service client
    let supabase
    if (authResult) {
      supabase = authResult.supabase
    } else {
      // For public profile viewing, we can use a service client
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

    // Look up artist profile by artist name (not username)
    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select(`
        id,
        user_id,
        artist_name,
        bio,
        genres,
        social_links,
        verification_status,
        account_tier,
        settings,
        created_at,
        updated_at
      `)
      .ilike('artist_name', artistName)
      .single()

    if (artistError || !artistProfile) {
      return NextResponse.json(
        { error: 'Artist profile not found' },
        { status: 404 }
      )
    }


    // Get the main profile for this artist
    const { data: mainProfile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        location,
        website,
        is_verified,
        followers_count,
        following_count,
        posts_count,
        created_at,
        updated_at
      `)
      .eq('id', artistProfile.user_id)
      .single()

    if (profileError || !mainProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Initialize stats with default values
    let stats = {
      followers: mainProfile.followers_count || 0,
      following: mainProfile.following_count || 0,
      posts: mainProfile.posts_count || 0,
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
        .or(`posted_as_profile_id.eq.${artistProfile.id},user_id.eq.${mainProfile.id}`)
        .eq('visibility', 'public')

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
        .or(`posted_as_profile_id.eq.${artistProfile.id},user_id.eq.${mainProfile.id}`)
        .eq('visibility', 'public')

      stats.likes = posts?.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0) || 0
    } catch (error) {
    }

    // Load public content: portfolio (music/video preferred), experiences, certifications, top skills
    let portfolio: any[] = []
    let experiences: any[] = []
    let certifications: any[] = []
    let topSkills: Array<{ name: string; endorsed_count: number }> = []

    try {
      const [{ data: portfolioRows }, { data: expRows }, { data: certRows }, { data: endorsements }, { data: top }] = await Promise.all([
        supabase.from('portfolio_items').select('*').eq('user_id', mainProfile.id).eq('is_public', true).order('order_index', { ascending: true }),
        supabase.from('profile_experiences').select('*').eq('user_id', mainProfile.id).eq('is_visible', true).order('order_index', { ascending: true }),
        supabase.from('profile_certifications').select('*').eq('user_id', mainProfile.id).eq('is_public', true).order('issue_date', { ascending: false }),
        supabase.from('skill_endorsements').select('skill').eq('endorsed_id', mainProfile.id),
        supabase.from('profiles').select('top_skills').eq('id', mainProfile.id).single()
      ])
      portfolio = (portfolioRows || []).filter((it: any) => ['music','video','link','text','image'].includes(it.type || ''))
      experiences = expRows || []
      certifications = certRows || []
      const countMap: Record<string, number> = {}
      ;(endorsements || []).forEach((e: any) => { countMap[e.skill] = (countMap[e.skill] || 0) + 1 })
      const topList: string[] = (top as any)?.top_skills || []
      topSkills = topList.map(name => ({ name, endorsed_count: countMap[name] || 0 }))
    } catch {}

    // Build the artist profile response
    const profileWithStats = {
      id: mainProfile.id,
      author_profile_id: artistProfile.id,
      owner_user_id: mainProfile.id,
      username: mainProfile.username, // Keep the main username for internal use
      artist_name: artistProfile.artist_name, // The public artist name
      account_type: 'artist',
      profile_data: {
        artist_name: artistProfile.artist_name,
        bio: artistProfile.bio || mainProfile.bio,
        genre: Array.isArray(artistProfile.genres) && artistProfile.genres.length > 0 
          ? artistProfile.genres[0] 
          : undefined,
        genres: artistProfile.genres,
        location: mainProfile.location,
        website: mainProfile.website,
        ...artistProfile.social_links
      },
      avatar_url: mainProfile.avatar_url,
      cover_image: null,
      verified: artistProfile.verification_status === 'verified' || mainProfile.is_verified,
      bio: artistProfile.bio || mainProfile.bio,
      location: mainProfile.location,
      social_links: {
        website: mainProfile.website,
        ...(artistProfile.social_links || {})
      },
      stats,
      settings: artistProfile.settings,
      created_at: artistProfile.created_at,
      updated_at: artistProfile.updated_at
    }


    return NextResponse.json({ profile: profileWithStats, portfolio, experiences, certifications, top_skills: topSkills })
  } catch (error) {
    console.error('[Artist API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
