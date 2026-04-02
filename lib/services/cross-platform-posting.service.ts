import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

export interface PostTemplate {
  id: string
  user_id: string
  template_name: string
  template_category: 'general' | 'promotion' | 'announcement' | 'event' | 'personal' | 'business'
  content_template: string
  media_templates: any[]
  hashtag_groups: any[]
  account_types: string[]
  variables: Record<string, any>
  usage_count: number
  is_public: boolean
  is_active: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ScheduledPost {
  id: string
  user_id: string
  template_id?: string
  content: string
  media_urls: string[]
  hashtags: string[]
  location?: string
  post_type: 'text' | 'image' | 'video' | 'audio' | 'poll' | 'event'
  visibility: 'public' | 'followers' | 'private'
  scheduled_for: string
  timezone: string
  repeat_pattern: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
  repeat_config: Record<string, any>
  target_accounts: string[]
  account_specific_content: Record<string, any>
  status: 'scheduled' | 'posting' | 'completed' | 'failed' | 'cancelled'
  posted_at?: string
  failed_accounts: string[]
  success_accounts: string[]
  error_details: Record<string, any>
  created_post_ids: string[]
  total_reach: number
  total_engagement: number
  created_at: string
  updated_at: string
}

export interface CrossPostAnalytics {
  total_scheduled_posts: number
  total_posted: number
  total_failed: number
  average_success_rate: number
  total_reach: number
  total_engagement: number
  best_performing_account_type: string
  optimal_posting_hour: number
}

export interface HashtagGroup {
  id: string
  user_id: string
  group_name: string
  hashtags: string[]
  account_types: string[]
  category: string
  performance_score: number
  usage_count: number
  is_active: boolean
  created_at: string
}

export class CrossPlatformPostingService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Create a cross-platform post to multiple accounts
   */
  async createCrossPlatformPost(
    content: string,
    targetAccounts: string[],
    options: {
      scheduledFor?: Date
      mediaUrls?: string[]
      hashtags?: string[]
      postType?: ScheduledPost['post_type']
      visibility?: ScheduledPost['visibility']
      templateId?: string
      accountSpecificContent?: Record<string, any>
    } = {}
  ): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const {
      scheduledFor = new Date(),
      mediaUrls = [],
      hashtags = [],
      postType = 'text',
      visibility = 'public',
      templateId,
      accountSpecificContent = {}
    } = options

    const { data, error } = await this.supabase.rpc('create_cross_platform_post', {
      p_user_id: user.id,
      p_content: content,
      p_target_accounts: targetAccounts,
      p_scheduled_for: scheduledFor.toISOString(),
      p_media_urls: mediaUrls,
      p_hashtags: hashtags,
      p_post_type: postType,
      p_visibility: visibility,
      p_template_id: templateId
    })

    if (error) throw error
    return data
  }

  /**
   * Call Edge Function to post immediately to connected providers
   */
  async postToProviders(
    content: string,
    mediaUrls: string[] = [],
    targets?: string[],
    overrides?: Record<string, { content?: string }>,
    scheduledPostId?: string
  ): Promise<Record<string, any>> {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session) throw new Error('User not authenticated')
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-post`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ content, mediaUrls, targets, overrides, scheduledPostId })
    })
    if (!res.ok) throw new Error('Provider post failed')
    return await res.json()
  }

  /**
   * Schedule a post for later
   */
  async schedulePost(
    content: string,
    targetAccounts: string[],
    scheduledFor: Date,
    options: {
      mediaUrls?: string[]
      hashtags?: string[]
      postType?: ScheduledPost['post_type']
      visibility?: ScheduledPost['visibility']
      repeatPattern?: ScheduledPost['repeat_pattern']
      repeatConfig?: Record<string, any>
      templateId?: string
      timezone?: string
      targets?: string[]
      overrides?: Record<string, string>
    } = {}
  ): Promise<ScheduledPost> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const {
      mediaUrls = [],
      hashtags = [],
      postType = 'text',
      visibility = 'public',
      repeatPattern = 'none',
      repeatConfig = {},
      templateId,
      timezone = 'UTC'
    } = options

    const { data, error } = await this.supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        content,
        media_urls: mediaUrls,
        hashtags,
        post_type: postType,
        visibility,
        scheduled_for: scheduledFor.toISOString(),
        timezone,
        repeat_pattern: repeatPattern,
        repeat_config: repeatConfig,
        target_accounts: targetAccounts,
        status: 'scheduled',
        platform_status: (options.targets || ['instagram','facebook','youtube','tiktok','twitter']).reduce((acc: any, p: string) => { acc[p] = 'scheduled'; return acc }, {}),
        account_specific_content: options.overrides || {}
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get scheduled posts for user
   */
  async getScheduledPosts(
    filters: {
      status?: ScheduledPost['status']
      startDate?: Date
      endDate?: Date
      accountId?: string
    } = {}
  ): Promise<ScheduledPost[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = this.supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.startDate) {
      query = query.gte('scheduled_for', filters.startDate.toISOString())
    }

    if (filters.endDate) {
      query = query.lte('scheduled_for', filters.endDate.toISOString())
    }

    if (filters.accountId) {
      query = query.contains('target_accounts', [filters.accountId])
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<void> {
    const { error } = await this.supabase
      .from('scheduled_posts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', postId)

    if (error) throw error
  }

  /**
   * Create a post template
   */
  async createTemplate(
    templateName: string,
    contentTemplate: string,
    options: {
      category?: PostTemplate['template_category']
      hashtagGroups?: any[]
      accountTypes?: string[]
      variables?: Record<string, any>
      isPublic?: boolean
    } = {}
  ): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const {
      category = 'general',
      hashtagGroups = [],
      accountTypes = [],
      variables = {},
      isPublic = false
    } = options

    const { data, error } = await this.supabase.rpc('create_post_template', {
      p_user_id: user.id,
      p_template_name: templateName,
      p_content_template: contentTemplate,
      p_template_category: category,
      p_hashtag_groups: hashtagGroups,
      p_account_types: accountTypes,
      p_variables: variables,
      p_is_public: isPublic
    })

    if (error) throw error
    return data
  }

  /**
   * Get post templates
   */
  async getTemplates(
    filters: {
      category?: PostTemplate['template_category']
      accountType?: string
      includePublic?: boolean
    } = {}
  ): Promise<PostTemplate[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = this.supabase
      .from('post_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    // Add user templates
    const userQuery = query.eq('user_id', user.id)

    // Add public templates if requested
    let finalQuery = userQuery
    if (filters.includePublic) {
      finalQuery = this.supabase
        .from('post_templates')
        .select('*')
        .eq('is_active', true)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('usage_count', { ascending: false })
    }

    if (filters.category) {
      finalQuery = finalQuery.eq('template_category', filters.category)
    }

    if (filters.accountType) {
      finalQuery = finalQuery.contains('account_types', [filters.accountType])
    }

    const { data, error } = await finalQuery

    if (error) throw error
    return data || []
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(templateId: string): Promise<PostTemplate> {
    // First get the current usage count
    const { data: currentTemplate } = await this.supabase
      .from('post_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single()

    const { data, error } = await this.supabase
      .from('post_templates')
      .update({ usage_count: (currentTemplate?.usage_count || 0) + 1 })
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Process template variables
   */
  processTemplate(
    template: string,
    variables: Record<string, any>,
    accountContext?: {
      account_type: string
      display_name: string
      metadata?: Record<string, any>
    }
  ): string {
    let processedContent = template

    // Replace user-defined variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value))
    })

    // Replace account-specific variables if context provided
    if (accountContext) {
      processedContent = processedContent.replace(
        /{account_name}/g,
        accountContext.display_name
      )
      processedContent = processedContent.replace(
        /{account_type}/g,
        accountContext.account_type
      )
    }

    // Replace date/time variables
    const now = new Date()
    processedContent = processedContent.replace(/{today}/g, formatSafeDate(now.toISOString()))
    processedContent = processedContent.replace(
      /{time}/g,
      new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(now)
    )
    processedContent = processedContent.replace(/{date}/g, now.toISOString().split('T')[0])

    return processedContent
  }

  /**
   * Create hashtag group
   */
  async createHashtagGroup(
    groupName: string,
    hashtags: string[],
    options: {
      accountTypes?: string[]
      category?: string
    } = {}
  ): Promise<HashtagGroup> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { accountTypes = [], category = 'general' } = options

    const { data, error } = await this.supabase
      .from('hashtag_groups')
      .insert({
        user_id: user.id,
        group_name: groupName,
        hashtags,
        account_types: accountTypes,
        category
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get hashtag groups
   */
  async getHashtagGroups(
    filters: {
      accountType?: string
      category?: string
    } = {}
  ): Promise<HashtagGroup[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = this.supabase
      .from('hashtag_groups')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('performance_score', { ascending: false })

    if (filters.accountType) {
      query = query.contains('account_types', [filters.accountType])
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get cross-platform analytics
   */
  async getCrossPlatformAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CrossPostAnalytics> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .rpc('get_cross_platform_analytics', {
        p_user_id: user.id,
        p_start_date: startDate?.toISOString(),
        p_end_date: endDate?.toISOString()
      })
      .single()

    if (error) throw error
    return data as CrossPostAnalytics
  }

  /**
   * Get posting performance by account
   */
  async getAccountPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    account_id: string
    account_type: string
    display_name: string
    total_posts: number
    average_engagement: number
    total_reach: number
    performance_score: number
  }>> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const startDateStr = startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDateStr = endDate?.toISOString() || new Date().toISOString()

    const { data, error } = await this.supabase
      .from('posting_analytics')
      .select(`
        account_id,
        accounts!inner (
          account_type,
          display_name
        ),
        performance_score,
        reach,
        engagement_rate
      `)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)

    if (error) throw error

    // Aggregate by account
    const accountMap = new Map()
    
    data?.forEach(record => {
      const accountId = record.account_id
      const accountData = Array.isArray(record.accounts) ? record.accounts[0] : record.accounts
      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, {
          account_id: accountId,
          account_type: accountData?.account_type || 'unknown',
          display_name: accountData?.display_name || 'Unknown',
          total_posts: 0,
          total_engagement: 0,
          total_reach: 0,
          total_performance: 0
        })
      }
      
      const account = accountMap.get(accountId)
      account.total_posts++
      account.total_engagement += record.engagement_rate || 0
      account.total_reach += record.reach || 0
      account.total_performance += record.performance_score || 0
    })

    return Array.from(accountMap.values()).map(account => ({
      ...account,
      average_engagement: account.total_engagement / account.total_posts || 0,
      performance_score: account.total_performance / account.total_posts || 0
    }))
  }

  /**
   * Get optimal posting times by account type
   */
  async getOptimalPostingTimes(): Promise<Array<{
    account_type: string
    hour: number
    performance_score: number
    post_count: number
  }>> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // This would require more complex analytics - for now return mock data
    // In a real implementation, this would analyze posting times vs engagement
    return [
      { account_type: 'artist', hour: 18, performance_score: 0.85, post_count: 45 },
      { account_type: 'venue', hour: 12, performance_score: 0.78, post_count: 32 },
      { account_type: 'business', hour: 9, performance_score: 0.72, post_count: 28 }
    ]
  }

  /**
   * Duplicate a scheduled post
   */
  async duplicateScheduledPost(postId: string, newScheduledFor?: Date): Promise<ScheduledPost> {
    const { data: originalPost, error: fetchError } = await this.supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (fetchError) throw fetchError

    const newPost = {
      ...originalPost,
      id: undefined, // Let database generate new ID
      scheduled_for: newScheduledFor?.toISOString() || originalPost.scheduled_for,
      status: 'scheduled' as const,
      posted_at: null,
      failed_accounts: [],
      success_accounts: [],
      error_details: {},
      created_post_ids: [],
      total_reach: 0,
      total_engagement: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('scheduled_posts')
      .insert(newPost)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get content suggestions based on performance history
   */
  async getContentSuggestions(
    accountType: string,
    limit: number = 10
  ): Promise<Array<{
    content: string
    hashtags: string[]
    average_performance: number
    usage_count: number
  }>> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // This would analyze high-performing content patterns
    // For now, return top-performing templates
    const { data, error } = await this.supabase
      .from('post_templates')
      .select('content_template, hashtag_groups, usage_count')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .contains('account_types', [accountType])
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map(template => ({
      content: template.content_template,
      hashtags: template.hashtag_groups?.flat() || [],
      average_performance: 0.75, // Would be calculated from actual performance data
      usage_count: template.usage_count
    }))
  }
}

export const crossPlatformPostingService = new CrossPlatformPostingService() 