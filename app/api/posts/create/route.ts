import { NextRequest, NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

// Helper function to get account type from route context
function getAccountTypeFromRoute(routeContext: string): string {
  if (routeContext.includes('/artist/') || routeContext.includes('artist')) {
    return 'artist'
  } else if (routeContext.includes('/venue/') || routeContext.includes('venue')) {
    return 'venue'
  } else if (routeContext.includes('/business/') || routeContext.includes('business')) {
    return 'business'
  } else if (routeContext.includes('/admin/') || routeContext.includes('admin')) {
    return 'admin'
  } else {
    return 'primary'
  }
}

// Helper function to get account info using route-based system
async function getAccountInfoFromRoute(
  supabase: any, 
  userId: string, 
  routeContext: string
): Promise<{ accountInfo: any; profileId: string; accountType: string } | null> {
  try {
    // Determine account type from route
    const accountType = getAccountTypeFromRoute(routeContext)
    

    let accountInfo: any = null
    let profileId: string = userId

    if (accountType === 'artist') {
      // Get artist profile directly
      const { data: artistData, error: artistError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, user_id')
        .eq('user_id', userId)
        .single()

      if (!artistError && artistData) {
        accountInfo = {
          display_name: artistData.artist_name,
          username: artistData.artist_name.toLowerCase().replace(/\s+/g, ''),
          avatar_url: '',
          is_verified: false,
          account_type: 'artist'
        }
        profileId = artistData.id
      } else {
        return null
      }
    } else {
      // Get primary profile directly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .eq('id', userId)
        .single()

      if (!profileError && profileData) {
        accountInfo = {
          display_name: profileData.full_name,
          username: profileData.username || 'user',
          avatar_url: profileData.avatar_url || '',
          is_verified: profileData.is_verified || false,
          account_type: 'primary'
        }
        profileId = profileData.id
      } else {
        return null
      }
    }

    return { 
      accountInfo, 
      profileId,
      accountType
    }

  } catch (error) {
    console.error('❌ Error in getAccountInfoFromRoute:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const userId = user.id

    const body = await request.json()
    const { 
      content, 
      type = 'text', 
      visibility = 'public', 
      location, 
      hashtags, 
      media_urls,
      // Route-based account detection
      route_context = '/feed',
      posted_as // Fallback to explicit posted_as if provided
    } = body

    // Ensure arrays are properly initialized
    const cleanHashtags = Array.isArray(hashtags) ? hashtags : []
    const cleanMediaUrls = Array.isArray(media_urls) ? media_urls : []


    if (!content?.trim()) {
      return NextResponse.json({ 
        error: 'Content is required' 
      }, { status: 400 })
    }

    // Get account info using route-based detection
    let accountResult = await getAccountInfoFromRoute(supabase, userId, route_context)
    
    // Fallback to explicit posted_as if route detection fails
    if (!accountResult && posted_as) {
      // Try direct query fallback
      try {
        if (posted_as === 'artist') {
          const { data: artistData, error: artistError } = await supabase
            .from('artist_profiles')
            .select('id, artist_name, user_id')
            .eq('user_id', userId)
            .single()

          if (!artistError && artistData) {
            const accountInfo = {
              display_name: artistData.artist_name,
              username: artistData.artist_name.toLowerCase().replace(/\s+/g, ''),
              avatar_url: '',
              is_verified: false,
              account_type: 'artist'
            }
            accountResult = {
              accountInfo,
              profileId: artistData.id,
              accountType: 'artist'
            }
          }
        } else {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_verified')
            .eq('id', userId)
            .single()

          if (!profileError && profileData) {
            const accountInfo = {
              display_name: profileData.full_name,
              username: profileData.username || 'user',
              avatar_url: profileData.avatar_url || '',
              is_verified: profileData.is_verified || false,
              account_type: 'primary'
            }
            accountResult = {
              accountInfo,
              profileId: profileData.id,
              accountType: 'primary'
            }
          }
        }
      } catch (fallbackError) {
      }
    }
    
    if (!accountResult) {
      return NextResponse.json({ 
        error: `Unable to determine account for posting. Route: ${route_context}` 
      }, { status: 400 })
    }

    const { accountInfo, profileId, accountType } = accountResult

    // Create the post with complete route-based account context
    const postData = {
      user_id: userId,
      content: content.trim(),
      type,
      visibility,
      location,
      hashtags: cleanHashtags,
      media_urls: cleanMediaUrls,
      // Route-based account context
      posted_as_account_type: accountType,
      posted_as_profile_id: profileId,
      route_context: route_context,
      // Cached account display info for performance
      account_display_name: accountInfo.display_name,
      account_username: accountInfo.username,
      account_avatar_url: accountInfo.avatar_url
    }

    
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single()

    if (postError) {
      console.error('❌ Failed to create post:', postError)
      return NextResponse.json({ 
        error: 'Failed to create post: ' + postError.message 
      }, { status: 500 })
    }


    if (visibility === 'public') {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId,
        metricKey: 'posts_public_total',
        eventType: 'post_created',
        delta: 1,
        eventSource: 'api_posts_create',
        eventData: { post_id: post.id, media_count: cleanMediaUrls.length }
      })
      if (cleanMediaUrls.length > 0) {
        await achievementEngine.recordMetricEvent({
          supabase: supabase as any,
          userId,
          metricKey: 'media_items_total',
          eventType: 'post_media_added',
          delta: cleanMediaUrls.length,
          eventSource: 'api_posts_create',
          eventData: { post_id: post.id }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      post: {
        ...post,
        // Return the complete account info for client-side display
        account_info: accountInfo,
        profiles: {
          id: profileId,
          username: accountInfo.username,
          full_name: accountInfo.display_name,
          avatar_url: accountInfo.avatar_url,
          is_verified: accountInfo.is_verified,
          account_type: accountType
        }
      }
    })

  } catch (error) {
    console.error('💥 Posts API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 })
  }
} 