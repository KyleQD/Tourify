import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    console.log('🔍 Getting simple suggestions for:', user.id)

    // Get users that the current user is already following
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = followingData?.map((f: any) => f.following_id) || []
    console.log('👥 User is already following:', followingIds.length, 'users')

    // Build the query for suggested users
    let query = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_verified, followers_count, following_count, metadata, created_at')
      .neq('id', user.id) // Exclude current user
      .not('username', 'is', null) // Only users with usernames
      .not('full_name', 'is', null) // Only users with names
      .order('followers_count', { ascending: false }) // Order by most followed
      .limit(limit * 2) // Get more than needed to filter properly

    // Exclude already followed users if any
    if (followingIds.length > 0) {
      query = query.not('id', 'in', `(${followingIds.join(',')})`)
    }

    const { data: suggestedData, error: suggestedError } = await query

    if (suggestedError) {
      console.error('❌ Error fetching suggested users:', suggestedError)
      return NextResponse.json({ error: 'Failed to fetch suggested users' }, { status: 500 })
    }

    console.log('📋 Raw suggested users found:', suggestedData?.length || 0)

    // Transform and filter the data
    const transformedUsers = suggestedData?.map((profile: any) => {
      // Use direct column values first, then fallback to metadata
      const username = profile.username || profile.metadata?.username
      const fullName = profile.full_name || profile.metadata?.full_name
      
      // Skip profiles without proper data
      if (!username || !fullName || fullName === 'Anonymous User') {
        return null
      }

      return {
        id: profile.id,
        username: username,
        full_name: fullName,
        avatar_url: profile.avatar_url || '',
        is_verified: profile.is_verified || false,
        followers_count: profile.followers_count || 0,
        following_count: profile.following_count || 0,
        created_at: profile.created_at
      }
    }).filter(Boolean).slice(0, limit) || [] // Remove nulls and limit results

    console.log('✅ Returning', transformedUsers.length, 'suggested users')

    return NextResponse.json({ 
      suggestions: transformedUsers,
      count: transformedUsers.length 
    })

  } catch (error) {
    console.error('💥 Simple suggestions API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}




