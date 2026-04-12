import { supabase as supabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

export interface Account {
  id: string
  owner_user_id: string
  account_type: 'primary' | 'artist' | 'venue' | 'business' | 'organizer'
  profile_table: string
  profile_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  is_verified: boolean
  is_active: boolean
  metadata: Record<string, any>
  follower_count: number
  following_count: number
  post_count: number
  engagement_score: number
  created_at: string
  updated_at: string
}

export interface AccountDiscoveryResult {
  accounts: Account[]
  total: number
  hasMore: boolean
}

export interface PostWithAccount {
  id: string
  content: string
  created_at: string
  account: Account
  likes_count: number
  comments_count: number
  shares_count: number
  media_urls?: string[]
  hashtags?: string[]
}

export class EnhancedAccountService {
  private supabase = supabaseClient

  /**
   * Get all accounts owned by the current user
   */
  async getUserAccounts(): Promise<Account[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('owner_user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Create a new account for any profile type
   */
  async createAccount(
    accountType: Account['account_type'],
    profileTable: string,
    profileId: string
  ): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .rpc('upsert_account', {
        p_owner_user_id: user.id,
        p_account_type: accountType,
        p_profile_table: profileTable,
        p_profile_id: profileId
      })

    if (error) throw error
    return data
  }

  /**
   * Enhanced account discovery with search and filtering
   */
  async discoverAccounts(
    searchTerm: string = '',
    accountTypes: Account['account_type'][] = ['artist', 'venue', 'primary'],
    limit: number = 20,
    offset: number = 0
  ): Promise<AccountDiscoveryResult> {
    const { data, error } = await this.supabase
      .rpc('discover_accounts', {
        p_search_term: searchTerm,
        p_account_types: accountTypes,
        p_limit: limit + 1, // Get one extra to check if there are more
        p_offset: offset
      })

    if (error) throw error

    const accounts = data?.slice(0, limit) || []
    const hasMore = data?.length > limit

    return {
      accounts: accounts as Account[],
      total: accounts.length,
      hasMore: hasMore || false
    }
  }

  /**
   * Get account by ID with full details
   */
  async getAccount(accountId: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data
  }

  /**
   * Get account display info (cached for performance)
   */
  async getAccountDisplayInfo(accountId: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .rpc('get_account_display_info', {
        account_id: accountId
      })

    if (error) return null
    return data
  }

  /**
   * Update account statistics (followers, posts, engagement)
   */
  async updateAccountStats(accountId: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_account_stats', {
        account_id: accountId
      })

    if (error) throw error
  }

  /**
   * Get posts from a specific account with proper attribution
   */
  async getAccountPosts(
    accountId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PostWithAccount[]> {
    const { data, error } = await this.supabase
      .rpc('get_account_feed', {
        p_account_id: accountId,
        p_limit: limit,
        p_offset: offset
      })

    if (error) throw error

    return (data || []).map((post: any) => ({
      id: post.post_id,
      content: post.content,
      created_at: post.created_at,
      account: {
        id: post.account_id,
        account_type: post.account_type,
        display_name: post.display_name,
        username: post.username,
        avatar_url: post.avatar_url,
        is_verified: post.is_verified,
        // Include other required fields with defaults
        owner_user_id: '',
        profile_table: '',
        profile_id: '',
        is_active: true,
        metadata: {},
        follower_count: 0,
        following_count: 0,
        post_count: 0,
        engagement_score: 0,
        created_at: '',
        updated_at: ''
      },
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0
    }))
  }

  /**
   * Create a post from a specific account
   */
  async createPost(
    accountId: string,
    content: string,
    options: {
      type?: string
      visibility?: 'public' | 'followers' | 'private'
      media_urls?: string[]
      hashtags?: string[]
      location?: string
    } = {}
  ): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Verify user owns this account
    const account = await this.getAccount(accountId)
    if (!account || account.owner_user_id !== user.id) {
      throw new Error('Account not found or access denied')
    }

    const { data, error } = await this.supabase
      .from('posts')
      .insert({
        user_id: user.id,
        account_id: accountId,
        content,
        type: options.type || 'text',
        visibility: options.visibility || 'public',
        media_urls: options.media_urls || [],
        hashtags: options.hashtags || [],
        location: options.location || null
      })
      .select('id')
      .single()

    if (error) throw error

    // Update account stats after posting
    await this.updateAccountStats(accountId)

    return data.id
  }

  /**
   * Follow an account
   */
  async followAccount(targetAccountId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get the target account to find the user to follow
    const targetAccount = await this.getAccount(targetAccountId)
    if (!targetAccount) throw new Error('Account not found')

    const { error } = await this.supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetAccount.owner_user_id
      })

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error
    }

    // Update both accounts' follower counts
    await this.updateAccountStats(targetAccountId)
    
    // Update current user's following count for their accounts
    const userAccounts = await this.getUserAccounts()
    for (const account of userAccounts) {
      await this.updateAccountStats(account.id)
    }
  }

  /**
   * Unfollow an account
   */
  async unfollowAccount(targetAccountId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const targetAccount = await this.getAccount(targetAccountId)
    if (!targetAccount) throw new Error('Account not found')

    const { error } = await this.supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetAccount.owner_user_id)

    if (error) throw error

    // Update both accounts' follower counts
    await this.updateAccountStats(targetAccountId)
    
    const userAccounts = await this.getUserAccounts()
    for (const account of userAccounts) {
      await this.updateAccountStats(account.id)
    }
  }

  /**
   * Check if current user follows an account
   */
  async isFollowing(targetAccountId: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    const targetAccount = await this.getAccount(targetAccountId)
    if (!targetAccount) return false

    const { data, error } = await this.supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetAccount.owner_user_id)
      .single()

    return !error && !!data
  }

  /**
   * Get similar accounts based on engagement and content
   */
  async getSimilarAccounts(
    accountId: string,
    limit: number = 10
  ): Promise<Account[]> {
    const account = await this.getAccount(accountId)
    if (!account) return []

    // Get accounts with similar engagement levels and types
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('account_type', account.account_type)
      .eq('is_active', true)
      .neq('id', accountId)
      .order('engagement_score', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  /**
   * Get trending accounts by engagement
   */
  async getTrendingAccounts(
    accountType?: Account['account_type'],
    limit: number = 20
  ): Promise<Account[]> {
    let query = this.supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .order('engagement_score', { ascending: false })
      .limit(limit)

    if (accountType) {
      query = query.eq('account_type', accountType)
    }

    const { data, error } = await query

    if (error) return []
    return data || []
  }

  /**
   * Refresh account display info from source profile
   */
  async refreshDisplayInfo(accountId: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('refresh_account_display_info', {
        account_id: accountId
      })

    if (error) throw error
  }

  /**
   * Get account analytics
   */
  async getAccountAnalytics(accountId: string): Promise<{
    totalPosts: number
    totalLikes: number
    totalComments: number
    totalShares: number
    followerGrowth: number
    engagementRate: number
  }> {
    const account = await this.getAccount(accountId)
    if (!account) throw new Error('Account not found')

    // Get post analytics
    const { data: postStats, error: postError } = await this.supabase
      .from('posts')
      .select('likes_count, comments_count, shares_count')
      .eq('account_id', accountId)

    if (postError) throw postError

    const totalPosts = postStats?.length || 0
    const totalLikes = postStats?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0
    const totalComments = postStats?.reduce((sum, post) => sum + (post.comments_count || 0), 0) || 0
    const totalShares = postStats?.reduce((sum, post) => sum + (post.shares_count || 0), 0) || 0

    const engagementRate = account.follower_count > 0 
      ? (totalLikes + totalComments + totalShares) / account.follower_count 
      : 0

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      followerGrowth: 0, // Would need historical data
      engagementRate
    }
  }
}

export const enhancedAccountService = new EnhancedAccountService() 