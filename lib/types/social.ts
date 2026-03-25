export interface User {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  bio?: string
  location?: string
  is_verified?: boolean
  followers_count?: number
  following_count?: number
  created_at: string
  metadata?: Record<string, any>
}

export interface FriendSuggestion extends User {
  mutual_friends?: User[]
  mutual_count?: number
  outgoing_request?: {
    id: string
    status: 'pending' | 'accepted' | 'rejected'
  }
  incoming_request?: {
    id: string
    status: 'pending' | 'accepted' | 'rejected'
  }
  can_send_request?: boolean
  relevance_score?: number
}

export interface ConnectionRequest {
  id: string
  requester_id: string
  target_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface FriendSuggestionParams {
  limit?: number
  offset?: number
  exclude_user_ids?: string[]
  include_mutual_friends?: boolean
  algorithm?: 'popular' | 'mutual' | 'recent' | 'location'
  location?: string
  min_followers?: number
  max_followers?: number
}

export interface FriendSuggestionResponse {
  suggestions: FriendSuggestion[]
  total_count: number
  has_more: boolean
  algorithm_used: string
}

