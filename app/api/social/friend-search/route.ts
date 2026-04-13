import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const location = searchParams.get('location')
    const mutualOnly = searchParams.get('mutualOnly') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const authResult = await authenticateApiRequest(request)
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    console.log('🔍 Friend search for:', user.id, 'query:', query)

    // Get user's current connections to avoid showing them
    const { data: currentConnections } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const connectionIds = currentConnections?.map((c: any) => c.following_id) || []

    // Get user's pending requests to avoid showing them
    const { data: pendingRequests } = await supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', user.id)
      .eq('status', 'pending')

    const pendingIds = pendingRequests?.map((r: any) => r.target_id) || []

    // Combine excluded IDs
    const excludedIds = [user.id, ...connectionIds, ...pendingIds]

    // Build the main search query
    let searchQuery = supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        bio,
        location,
        is_verified,
        followers_count,
        following_count,
        created_at,
        metadata
      `)
      .neq('id', user.id) // Exclude current user
      .not('username', 'is', null) // Only users with usernames
      .not('full_name', 'is', null) // Only users with names
      .order('followers_count', { ascending: false })

    // Apply search query
    if (query.trim()) {
      const searchTerms = query.trim().split(/\s+/).filter(Boolean)
      const searchConditions = searchTerms.flatMap(term => [
        `username.ilike.%${term}%`,
        `full_name.ilike.%${term}%`,
        `bio.ilike.%${term}%`
      ])
      searchQuery = searchQuery.or(searchConditions.join(','))
    }

    // Apply location filter
    if (location) {
      searchQuery = searchQuery.ilike('location', `%${location}%`)
    }

    // Exclude already connected users
    if (excludedIds.length > 0) {
      searchQuery = searchQuery.not('id', 'in', `(${excludedIds.join(',')})`)
    }

    const { data: searchResults, error: searchError } = await searchQuery
      .range(offset, offset + limit - 1)

    if (searchError) {
      console.error('❌ Friend search error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // If mutual friends filter is enabled, we need to check mutual connections
    let enrichedResults = searchResults || []

    if (mutualOnly && enrichedResults.length > 0) {
      // Get mutual connections for each user
      const userIds = enrichedResults.map((r: any) => r.id)
      
      const { data: mutualData } = await supabase
        .from('follows')
        .select(`
          follower_id,
          following_id,
          profiles:follower_id(id, username, full_name, avatar_url)
        `)
        .in('following_id', userIds)
        .in('follower_id', connectionIds)

      // Group mutual connections by user
      const mutualMap = new Map()
      mutualData?.forEach((connection: any) => {
        if (!mutualMap.has(connection.following_id)) {
          mutualMap.set(connection.following_id, [])
        }
        mutualMap.get(connection.following_id).push(connection.profiles)
      })

      // Filter to only users with mutual connections
      enrichedResults = enrichedResults.filter((user: any) => 
        mutualMap.has(user.id) && mutualMap.get(user.id).length > 0
      )
    }

    // Enrich results with additional data
    const enrichedUsers = await Promise.all(
      enrichedResults.map(async (profile: any) => {
        // Check if there are any mutual connections
        const { data: mutualConnections } = await supabase
          .from('follows')
          .select(`
            follower_id,
            profiles:follower_id(id, username, full_name, avatar_url)
          `)
          .eq('following_id', profile.id)
          .in('follower_id', connectionIds)
          .limit(3)

        const mutualFriends = mutualConnections?.map((mc: any) => mc.profiles) || []

        // Check if user has sent a follow request to this person
        const { data: outgoingRequest } = await supabase
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', user.id)
          .eq('target_id', profile.id)
          .single()

        // Check if this person has sent a follow request to user
        const { data: incomingRequest } = await supabase
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', profile.id)
          .eq('target_id', user.id)
          .single()

        return {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          location: profile.location,
          is_verified: profile.is_verified,
          followers_count: profile.followers_count || 0,
          following_count: profile.following_count || 0,
          created_at: profile.created_at,
          mutual_friends: mutualFriends,
          mutual_count: mutualFriends.length,
          outgoing_request: outgoingRequest,
          incoming_request: incomingRequest,
          can_send_request: !outgoingRequest && !incomingRequest
        }
      })
    )

    // Sort by relevance: mutual friends first, then by follower count
    enrichedUsers.sort((a, b) => {
      if (a.mutual_count > b.mutual_count) return -1
      if (a.mutual_count < b.mutual_count) return 1
      if (a.followers_count > b.followers_count) return -1
      if (a.followers_count < b.followers_count) return 1
      return 0
    })

    console.log('✅ Found', enrichedUsers.length, 'friend search results')

    return NextResponse.json({
      users: enrichedUsers,
      total: enrichedUsers.length,
      has_more: enrichedUsers.length === limit
    })

  } catch (error) {
    console.error('💥 Friend search API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
