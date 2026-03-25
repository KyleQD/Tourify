import { createClient } from '@/lib/supabase'
import type { 
  FriendSuggestion, 
  FriendSuggestionParams, 
  FriendSuggestionResponse,
  User 
} from '@/lib/types/social'

export class FriendSuggestionService {
  private supabase = createClient()

  /**
   * Get friend suggestions using multiple algorithms
   */
  async getSuggestions(
    userId: string, 
    params: FriendSuggestionParams = {}
  ): Promise<FriendSuggestionResponse> {
    const {
      limit = 10,
      offset = 0,
      exclude_user_ids = [],
      include_mutual_friends = true,
      algorithm = 'popular',
      location,
      min_followers = 0,
      max_followers = 1000000
    } = params

    try {
      // Get user's current connections and pending requests
      const { connections, pendingRequests } = await this.getUserConnections(userId)
      
      // Build exclusion list
      const excludedIds = [
        userId,
        ...connections,
        ...pendingRequests,
        ...exclude_user_ids
      ]

      // Get suggestions based on algorithm
      let suggestions: FriendSuggestion[] = []
      
      switch (algorithm) {
        case 'mutual':
          suggestions = await this.getMutualFriendSuggestions(userId, excludedIds, limit)
          break
        case 'recent':
          suggestions = await this.getRecentUserSuggestions(excludedIds, limit, location)
          break
        case 'location':
          suggestions = await this.getLocationBasedSuggestions(userId, excludedIds, limit, location)
          break
        case 'popular':
        default:
          suggestions = await this.getPopularUserSuggestions(excludedIds, limit, min_followers, max_followers)
          break
      }

      // Enrich with mutual friends if requested
      if (include_mutual_friends && suggestions.length > 0) {
        suggestions = await this.enrichWithMutualFriends(userId, suggestions, connections)
      }

      // Add request status information
      suggestions = await this.enrichWithRequestStatus(userId, suggestions)

      // Calculate relevance scores
      suggestions = this.calculateRelevanceScores(suggestions, algorithm)

      // Sort by relevance score
      suggestions.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))

      return {
        suggestions: suggestions.slice(offset, offset + limit),
        total_count: suggestions.length,
        has_more: suggestions.length > offset + limit,
        algorithm_used: algorithm
      }

    } catch (error) {
      console.error('Error getting friend suggestions:', error)
      throw new Error('Failed to get friend suggestions')
    }
  }

  /**
   * Get user's current connections and pending requests
   */
  private async getUserConnections(userId: string) {
    const [connectionsResult, pendingResult] = await Promise.all([
      this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId),
      
      this.supabase
        .from('follow_requests')
        .select('target_id')
        .eq('requester_id', userId)
        .eq('status', 'pending')
    ])

    const connections = connectionsResult.data?.map(c => c.following_id) || []
    const pendingRequests = pendingResult.data?.map(r => r.target_id) || []

    return { connections, pendingRequests }
  }

  /**
   * Get suggestions based on mutual friends
   */
  private async getMutualFriendSuggestions(
    userId: string, 
    excludedIds: string[], 
    limit: number
  ): Promise<FriendSuggestion[]> {
    const { data, error } = await this.supabase
      .from('follows')
      .select(`
        following_id,
        profiles:follower_id(
          id,
          username,
          full_name,
          avatar_url,
          bio,
          location,
          is_verified,
          followers_count,
          following_count,
          created_at
        )
      `)
      .in('follower_id', await this.getUserFollowingIds(userId))
      .not('following_id', 'in', `(${excludedIds.join(',')})`)
      .limit(limit * 3) // Get more to account for filtering

    if (error) {
      console.error('Error getting mutual friend suggestions:', error)
      return []
    }

    // Group by user and count mutual connections
    const userMap = new Map<string, { user: User, mutualCount: number }>()
    
    data?.forEach((item: any) => {
      const userId = item.following_id
      const mutualFriend = item.profiles
      
      if (!userMap.has(userId)) {
        userMap.set(userId, { user: mutualFriend, mutualCount: 0 })
      }
      userMap.get(userId)!.mutualCount++
    })

    // Convert to array and sort by mutual count
    return Array.from(userMap.values())
      .map(({ user, mutualCount }) => ({
        ...user,
        mutual_count: mutualCount,
        relevance_score: mutualCount * 10 // Higher weight for mutual friends
      }))
      .sort((a, b) => (b.mutual_count || 0) - (a.mutual_count || 0))
      .slice(0, limit)
  }

  /**
   * Get suggestions based on popular users
   */
  private async getPopularUserSuggestions(
    excludedIds: string[], 
    limit: number,
    minFollowers: number,
    maxFollowers: number
  ): Promise<FriendSuggestion[]> {
    const { data, error } = await this.supabase
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
        created_at
      `)
      .not('id', 'in', `(${excludedIds.join(',')})`)
      .not('username', 'is', null)
      .not('full_name', 'is', null)
      .gte('followers_count', minFollowers)
      .lte('followers_count', maxFollowers)
      .order('followers_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting popular user suggestions:', error)
      return []
    }

    return data?.map(user => ({
      ...user,
      relevance_score: (user.followers_count || 0) * 0.1 // Lower weight for popularity alone
    })) || []
  }

  /**
   * Get suggestions based on recent users
   */
  private async getRecentUserSuggestions(
    excludedIds: string[], 
    limit: number,
    location?: string
  ): Promise<FriendSuggestion[]> {
    let query = this.supabase
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
        created_at
      `)
      .not('id', 'in', `(${excludedIds.join(',')})`)
      .not('username', 'is', null)
      .not('full_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting recent user suggestions:', error)
      return []
    }

    return data?.map(user => ({
      ...user,
      relevance_score: 5 // Base score for recent users
    })) || []
  }

  /**
   * Get suggestions based on location
   */
  private async getLocationBasedSuggestions(
    userId: string,
    excludedIds: string[], 
    limit: number,
    location?: string
  ): Promise<FriendSuggestion[]> {
    // First get user's location
    const { data: userProfile } = await this.supabase
      .from('profiles')
      .select('location')
      .eq('id', userId)
      .single()

    const userLocation = location || userProfile?.location
    if (!userLocation) {
      return this.getPopularUserSuggestions(excludedIds, limit, 0, 1000000)
    }

    const { data, error } = await this.supabase
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
        created_at
      `)
      .not('id', 'in', `(${excludedIds.join(',')})`)
      .not('username', 'is', null)
      .not('full_name', 'is', null)
      .ilike('location', `%${userLocation}%`)
      .order('followers_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting location-based suggestions:', error)
      return []
    }

    return data?.map(user => ({
      ...user,
      relevance_score: 8 // Higher score for location match
    })) || []
  }

  /**
   * Get user's following IDs
   */
  private async getUserFollowingIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    return data?.map(f => f.following_id) || []
  }

  /**
   * Enrich suggestions with mutual friends
   */
  private async enrichWithMutualFriends(
    userId: string, 
    suggestions: FriendSuggestion[], 
    userConnections: string[]
  ): Promise<FriendSuggestion[]> {
    if (suggestions.length === 0 || userConnections.length === 0) {
      return suggestions
    }

    const suggestionIds = suggestions.map(s => s.id)
    
    const { data } = await this.supabase
      .from('follows')
      .select(`
        following_id,
        profiles:follower_id(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .in('following_id', suggestionIds)
      .in('follower_id', userConnections)
      .limit(3) // Limit mutual friends per suggestion

    if (!data) return suggestions

    // Group mutual friends by suggestion user
    const mutualMap = new Map<string, User[]>()
    data.forEach((item: any) => {
      const suggestionId = item.following_id
      const mutualFriend = item.profiles
      
      if (!mutualMap.has(suggestionId)) {
        mutualMap.set(suggestionId, [])
      }
      mutualMap.get(suggestionId)!.push(mutualFriend)
    })

    // Add mutual friends to suggestions
    return suggestions.map(suggestion => ({
      ...suggestion,
      mutual_friends: mutualMap.get(suggestion.id) || [],
      mutual_count: mutualMap.get(suggestion.id)?.length || 0
    }))
  }

  /**
   * Enrich suggestions with request status
   */
  private async enrichWithRequestStatus(
    userId: string, 
    suggestions: FriendSuggestion[]
  ): Promise<FriendSuggestion[]> {
    if (suggestions.length === 0) return suggestions

    const suggestionIds = suggestions.map(s => s.id)

    const [outgoingResult, incomingResult] = await Promise.all([
      this.supabase
        .from('follow_requests')
        .select('target_id, id, status')
        .eq('requester_id', userId)
        .in('target_id', suggestionIds),
      
      this.supabase
        .from('follow_requests')
        .select('requester_id, id, status')
        .eq('target_id', userId)
        .in('requester_id', suggestionIds)
    ])

    const outgoingMap = new Map<string, { id: string, status: 'pending' | 'accepted' | 'rejected' }>()
    const incomingMap = new Map<string, { id: string, status: 'pending' | 'accepted' | 'rejected' }>()

    outgoingResult.data?.forEach((req: any) => {
      if (req.status === 'pending' || req.status === 'accepted' || req.status === 'rejected') {
        outgoingMap.set(req.target_id, { id: req.id, status: req.status })
      }
    })

    incomingResult.data?.forEach((req: any) => {
      if (req.status === 'pending' || req.status === 'accepted' || req.status === 'rejected') {
        incomingMap.set(req.requester_id, { id: req.id, status: req.status })
      }
    })

    return suggestions.map(suggestion => ({
      ...suggestion,
      outgoing_request: outgoingMap.get(suggestion.id),
      incoming_request: incomingMap.get(suggestion.id),
      can_send_request: !outgoingMap.has(suggestion.id) && !incomingMap.has(suggestion.id)
    }))
  }

  /**
   * Calculate relevance scores for suggestions
   */
  private calculateRelevanceScores(suggestions: FriendSuggestion[], algorithm: string): FriendSuggestion[] {
    return suggestions.map(suggestion => {
      let score = suggestion.relevance_score || 0

      // Boost score for verified users
      if (suggestion.is_verified) {
        score += 5
      }

      // Boost score for mutual friends
      if (suggestion.mutual_count && suggestion.mutual_count > 0) {
        score += suggestion.mutual_count * 15
      }

      // Boost score for users with bio
      if (suggestion.bio && suggestion.bio.length > 10) {
        score += 2
      }

      // Boost score for users with avatar
      if (suggestion.avatar_url) {
        score += 1
      }

      // Algorithm-specific adjustments
      switch (algorithm) {
        case 'mutual':
          score += (suggestion.mutual_count || 0) * 20
          break
        case 'location':
          score += 10
          break
        case 'recent':
          // Recent users get a time-based boost
          const daysSinceCreated = Math.max(0, 30 - Math.floor(
            (Date.now() - new Date(suggestion.created_at).getTime()) / (1000 * 60 * 60 * 24)
          ))
          score += daysSinceCreated
          break
      }

      return {
        ...suggestion,
        relevance_score: Math.max(0, score)
      }
    })
  }

  /**
   * Send a connection request
   */
  async sendConnectionRequest(requesterId: string, targetId: string): Promise<boolean> {
    try {
      // Check if already following
      const { data: existingFollow } = await this.supabase
        .from('follows')
        .select('id')
        .eq('follower_id', requesterId)
        .eq('following_id', targetId)
        .single()

      if (existingFollow) {
        return false // Already following
      }

      // Check if request already exists
      const { data: existingRequest } = await this.supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', requesterId)
        .eq('target_id', targetId)
        .single()

      if (existingRequest) {
        return false // Request already exists
      }

      // Create follow request
      const { error } = await this.supabase
        .from('follow_requests')
        .insert({
          requester_id: requesterId,
          target_id: targetId,
          status: 'pending'
        })

      if (error) {
        console.error('Error creating follow request:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending connection request:', error)
      return false
    }
  }
}

export const friendSuggestionService = new FriendSuggestionService()
