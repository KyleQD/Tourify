'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { 
  crossPlatformPostingService, 
  ScheduledPost, 
  PostTemplate, 
  HashtagGroup,
  CrossPostAnalytics 
} from '@/lib/services/cross-platform-posting.service'

interface UseCrossPlatformPostingOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useCrossPlatformPosting(options: UseCrossPlatformPostingOptions = {}) {
  const { user } = useAuth()
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([])
  const [analytics, setAnalytics] = useState<CrossPostAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { autoRefresh = true, refreshInterval = 30000 } = options

  // Load initial data
  const loadData = useCallback(async () => {
    if (!user) {
      setScheduledPosts([])
      setTemplates([])
      setHashtagGroups([])
      setAnalytics(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      try {
        await crossPlatformPostingService.seedStarterTemplatesIfEmpty()
      } catch {
        // Seeding is best-effort (table may not exist yet)
      }

      const [posts, publicTemplates, groups, analyticsData] = await Promise.all([
        crossPlatformPostingService.getScheduledPosts(),
        crossPlatformPostingService.getTemplates({ includePublic: true }),
        crossPlatformPostingService.getHashtagGroups(),
        crossPlatformPostingService.getCrossPlatformAnalytics()
      ])
      
      setScheduledPosts(posts)
      setTemplates(publicTemplates)
      setHashtagGroups(groups)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create cross-platform post
  const createCrossPlatformPost = useCallback(async (
    content: string,
    targetAccounts: string[],
    options: {
      scheduledFor?: Date
      mediaUrls?: string[]
      hashtags?: string[]
      postType?: ScheduledPost['post_type']
      visibility?: ScheduledPost['visibility']
      templateId?: string
      overrides?: Record<string, { content?: string }>
      targets?: string[]
    } = {}
  ) => {
    try {
      setError(null)
      // Create internal record and also try provider publishing when not scheduled
      const { overrides, targets, ...dbOptions } = options
      const postId = await crossPlatformPostingService.createCrossPlatformPost(content, targetAccounts, dbOptions)
      if (!options.scheduledFor) {
        const result = await crossPlatformPostingService.postToProviders(content, options.mediaUrls, targets, overrides)
        // Optionally surface
        try { console.debug('provider results', result) } catch {}
      }
      
      // Refresh data to show new post
      await loadData()
      
      return postId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
      throw err
    }
  }, [loadData])

  // Schedule a post
  const schedulePost = useCallback(async (
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
  ) => {
    try {
      setError(null)
      const post = await crossPlatformPostingService.schedulePost(
        content,
        targetAccounts,
        scheduledFor,
        options
      )
      
      // Add to local state
      setScheduledPosts(prev => [post, ...prev])
      
      return post
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule post')
      throw err
    }
  }, [])

  // Cancel scheduled post
  const cancelScheduledPost = useCallback(async (postId: string) => {
    try {
      setError(null)
      await crossPlatformPostingService.cancelScheduledPost(postId)
      
      // Update local state
      setScheduledPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, status: 'cancelled' as const }
            : post
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel post')
      throw err
    }
  }, [])

  // Create template
  const createTemplate = useCallback(async (
    templateName: string,
    contentTemplate: string,
    options: {
      category?: PostTemplate['template_category']
      hashtagGroups?: any[]
      accountTypes?: string[]
      variables?: Record<string, any>
      isPublic?: boolean
    } = {}
  ) => {
    try {
      setError(null)
      const templateId = await crossPlatformPostingService.createTemplate(
        templateName,
        contentTemplate,
        options
      )
      
      // Refresh templates
      const updatedTemplates = await crossPlatformPostingService.getTemplates({ includePublic: true })
      setTemplates(updatedTemplates)
      
      return templateId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
      throw err
    }
  }, [])

  // Use template
  const useTemplate = useCallback(async (templateId: string, variables: Record<string, any> = {}) => {
    try {
      setError(null)
      const template = await crossPlatformPostingService.useTemplate(templateId)
      
      // Process template content with variables
      const processedContent = crossPlatformPostingService.processTemplate(
        template.content_template,
        variables
      )

      const hashtags = crossPlatformPostingService.flattenHashtagGroups(template.hashtag_groups)
      
      return {
        template,
        processedContent,
        hashtags
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use template')
      throw err
    }
  }, [])

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      setError(null)
      await crossPlatformPostingService.deleteTemplate(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
      throw err
    }
  }, [])

  const updateTemplate = useCallback(async (
    templateId: string,
    updates: {
      templateName?: string
      contentTemplate?: string
      category?: PostTemplate['template_category']
      hashtagGroups?: any[]
      accountTypes?: string[]
      variables?: Record<string, any>
      isPublic?: boolean
    }
  ) => {
    try {
      setError(null)
      const updated = await crossPlatformPostingService.updateTemplate(templateId, updates)
      setTemplates(prev => prev.map(t => t.id === templateId ? updated : t))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
      throw err
    }
  }, [])

  // Create hashtag group
  const createHashtagGroup = useCallback(async (
    groupName: string,
    hashtags: string[],
    options: {
      accountTypes?: string[]
      category?: string
    } = {}
  ) => {
    try {
      setError(null)
      const group = await crossPlatformPostingService.createHashtagGroup(
        groupName,
        hashtags,
        options
      )
      
      // Add to local state
      setHashtagGroups(prev => [group, ...prev])
      
      return group
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hashtag group')
      throw err
    }
  }, [])

  // Duplicate scheduled post
  const duplicatePost = useCallback(async (postId: string, newScheduledFor?: Date) => {
    try {
      setError(null)
      const duplicatedPost = await crossPlatformPostingService.duplicateScheduledPost(
        postId,
        newScheduledFor
      )
      
      // Add to local state
      setScheduledPosts(prev => [duplicatedPost, ...prev])
      
      return duplicatedPost
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate post')
      throw err
    }
  }, [])

  // Get filtered posts
  const getFilteredPosts = useCallback((
    filters: {
      status?: ScheduledPost['status']
      accountId?: string
      startDate?: Date
      endDate?: Date
    }
  ) => {
    return scheduledPosts.filter(post => {
      if (filters.status && post.status !== filters.status) return false
      if (filters.accountId && !post.target_accounts.includes(filters.accountId)) return false
      if (filters.startDate && new Date(post.scheduled_for) < filters.startDate) return false
      if (filters.endDate && new Date(post.scheduled_for) > filters.endDate) return false
      return true
    })
  }, [scheduledPosts])

  // Get templates by category
  const getTemplatesByCategory = useCallback((category?: PostTemplate['template_category']) => {
    if (!category) return templates
    return templates.filter(template => template.template_category === category)
  }, [templates])

  // Get hashtags by group
  const getHashtagsByGroup = useCallback((groupName: string) => {
    const group = hashtagGroups.find(g => g.group_name === groupName)
    return group?.hashtags || []
  }, [hashtagGroups])

  // Auto-refresh data
  useEffect(() => {
    loadData()
    
    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [loadData, autoRefresh, refreshInterval])

  return {
    // Data
    scheduledPosts,
    templates,
    hashtagGroups,
    analytics,
    loading,
    error,
    
    // Actions
    createCrossPlatformPost,
    schedulePost,
    cancelScheduledPost,
    createTemplate,
    useTemplate,
    deleteTemplate,
    updateTemplate,
    createHashtagGroup,
    duplicatePost,
    
    // Utility functions
    getFilteredPosts,
    getTemplatesByCategory,
    getHashtagsByGroup,
    flattenHashtagGroups: crossPlatformPostingService.flattenHashtagGroups.bind(crossPlatformPostingService),
    refreshData: loadData
  }
}

// Hook for posting analytics
export function useCrossPlatformAnalytics(
  startDate?: Date,
  endDate?: Date
) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<CrossPostAnalytics | null>(null)
  const [accountPerformance, setAccountPerformance] = useState<any[]>([])
  const [optimalTimes, setOptimalTimes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      
      const [analyticsData, performance, times] = await Promise.all([
        crossPlatformPostingService.getCrossPlatformAnalytics(startDate, endDate),
        crossPlatformPostingService.getAccountPerformance(startDate, endDate),
        crossPlatformPostingService.getOptimalPostingTimes()
      ])
      
      setAnalytics(analyticsData)
      setAccountPerformance(performance)
      setOptimalTimes(times)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [user, startDate, endDate])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    accountPerformance,
    optimalTimes,
    loading,
    error,
    refreshAnalytics: loadAnalytics
  }
}

// Hook for content suggestions
export function useContentSuggestions(accountType: string) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSuggestions = useCallback(async () => {
    if (!user || !accountType) return

    try {
      setLoading(true)
      setError(null)
      
      const suggestionsData = await crossPlatformPostingService.getContentSuggestions(accountType)
      setSuggestions(suggestionsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }, [user, accountType])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  return {
    suggestions,
    loading,
    error,
    refreshSuggestions: loadSuggestions
  }
}
