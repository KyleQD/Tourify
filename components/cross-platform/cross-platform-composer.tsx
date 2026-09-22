'use client'

import { supabase } from '@/lib/supabase'
import React, { useState, useEffect, useRef } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useCrossPlatformPosting, useContentSuggestions } from '@/hooks/use-cross-platform-posting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Send,
  Clock,
  Hash,
  Calendar as CalendarIcon,
  Copy,
  Lightbulb,
  FileText,
  Target,
  BarChart3,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Database } from '@/types/supabase'
import { PollOptionEditor } from '@/components/polls/poll-option-editor'
import type { PollDuration } from '@/lib/polls/poll-duration'
import { useActingContext } from '@/hooks/use-acting-context'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import type { PostTemplate } from '@/lib/services/cross-platform-posting.service'
import { ComposerStyleControl } from '@/components/posts/appearance/composer-style-control'
import type { PostAppearanceInput } from '@/lib/appearance/contracts'
import Link from 'next/link'
import {
  ARTIST_CARD,
  ARTIST_GHOST_CHIP,
  ARTIST_INPUT,
  ARTIST_INSET,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
  ARTIST_SECONDARY_BTN,
  ARTIST_TEXTAREA,
} from '@/components/dashboard/artist-tokens'

const EMPTY_PRESELECTED_ACCOUNTS: string[] = []

type ComposerPostType = 'text' | 'image' | 'video' | 'audio' | 'poll' | 'event'

interface CrossPlatformComposerProps {
  onPostCreated?: (postId: string) => void
  defaultContent?: string
  preselectedAccounts?: string[]
  defaultPostType?: ComposerPostType
  initialHashtags?: string[]
}

export function CrossPlatformComposer({
  onPostCreated,
  defaultContent = '',
  preselectedAccounts = EMPTY_PRESELECTED_ACCOUNTS,
  defaultPostType = 'text',
  initialHashtags = [],
}: CrossPlatformComposerProps) {
  // Hooks
  const { user } = useAuth()
  const { userAccounts: accounts, currentAccount } = useMultiAccount()
  const { actingHeaders, isActingReady } = useActingContext()
  const {
    createCrossPlatformPost,
    schedulePost,
    templates,
    hashtagGroups,
    useTemplate: applyTemplate,
    createTemplate,
    deleteTemplate,
    flattenHashtagGroups,
    loading
  } = useCrossPlatformPosting()

  // Form state
  const [content, setContent] = useState(defaultContent)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(preselectedAccounts)
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState('12:00')
  const [postType, setPostType] = useState<ComposerPostType>(defaultPostType)
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedTemplateName, setSelectedTemplateName] = useState('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [pendingVariableTemplate, setPendingVariableTemplate] = useState<PostTemplate | null>(null)
  const [newHashtag, setNewHashtag] = useState('')
  const [activeTab, setActiveTab] = useState('compose')
  const [isUploading, setIsUploading] = useState(false)
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({})
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['instagram','facebook','youtube','tiktok'])
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollDuration, setPollDuration] = useState<PollDuration>('7d')
  const [alsoPostToTourify, setAlsoPostToTourify] = useState(true)
  const [appearanceInput, setAppearanceInput] = useState<PostAppearanceInput | null>(null)
  const platformLimits: Record<string, number> = { twitter: 280, instagram: 2200, facebook: 63206, youtube: 5000, tiktok: 2200 }

  useEffect(() => {
    if (defaultPostType) setPostType(defaultPostType)
  }, [defaultPostType])

  useEffect(() => {
    if (initialHashtags.length > 0) {
      setHashtags(prev => {
        const merged = [...prev]
        for (const tag of initialHashtags) {
          const clean = tag.replace(/^#/, '').trim()
          if (clean && !merged.includes(clean)) merged.push(clean)
        }
        return merged
      })
    }
  }, [initialHashtags])

  // Template creation state
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateHashtagsInput, setTemplateHashtagsInput] = useState('')
  const [templateCategory, setTemplateCategory] = useState<'general' | 'promotion' | 'announcement' | 'event' | 'personal' | 'business'>('general')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | PostTemplate['template_category']>('all')
  const [isDeletingTemplateId, setIsDeletingTemplateId] = useState<string | null>(null)

  // Posting state
  const [isPosting, setIsPosting] = useState(false)
  const hasAutoSelectedRef = useRef(preselectedAccounts.length > 0)

  // Content suggestions
  const { suggestions } = useContentSuggestions(currentAccount?.account_type || 'primary')

  const TEMPLATE_CATEGORIES = ['general', 'promotion', 'announcement', 'event', 'personal', 'business'] as const

  function extractTemplateVariables(body: string): string[] {
    const matches = body.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || []
    const reserved = new Set(['today', 'time', 'date', 'account_name', 'account_type'])
    return Array.from(new Set(
      matches.map(m => m.slice(1, -1)).filter(key => !reserved.has(key))
    ))
  }

  function parseHashtagsInput(raw: string): string[] {
    return Array.from(new Set(
      raw
        .split(/[\s,]+/)
        .map(t => t.replace(/^#/, '').trim())
        .filter(Boolean)
    ))
  }

  // Prefill template body from compose content when opening Templates
  useEffect(() => {
    if (activeTab !== 'templates') return
    if (templateBody.trim()) return
    if (!content.trim()) return
    setTemplateBody(content)
    if (!templateHashtagsInput.trim() && hashtags.length > 0)
      setTemplateHashtagsInput(hashtags.map(h => `#${h}`).join(' '))
  }, [activeTab, content, hashtags, templateBody, templateHashtagsInput])

  // Auto-select user's accounts once if none preselected
  useEffect(() => {
    if (hasAutoSelectedRef.current || accounts.length === 0) return
    if (preselectedAccounts.length > 0) {
      hasAutoSelectedRef.current = true
      return
    }
    const firstId = accounts[0].profile_id
    hasAutoSelectedRef.current = true
    setSelectedAccounts(prev =>
      prev.length === 1 && prev[0] === firstId ? prev : [firstId]
    )
  }, [accounts, preselectedAccounts])

  // Handle account selection
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  // Handle hashtag addition
  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      setHashtags(prev => [...prev, newHashtag.replace('#', '')])
      setNewHashtag('')
    }
  }

  // Remove hashtag
  const removeHashtag = (hashtag: string) => {
    setHashtags(prev => prev.filter(h => h !== hashtag))
  }

  async function applyTemplateToCompose(
    templateId: string,
    variables: Record<string, string> = {}
  ) {
    const { processedContent, template, hashtags: templateHashtags } = await applyTemplate(
      templateId,
      variables
    )
    setContent(processedContent)
    setSelectedTemplate(templateId)
    setSelectedTemplateName(template.template_name)
    const flattened = templateHashtags.length > 0
      ? templateHashtags
      : flattenHashtagGroups(template.hashtag_groups)
    if (flattened.length > 0)
      setHashtags(prev => [...new Set([...prev, ...flattened])])
    setPendingVariableTemplate(null)
    setTemplateVariables({})
    setActiveTab('compose')
    toast.success('Template applied')
  }

  // Handle template selection — prompt for variables when placeholders exist
  const handleTemplateSelect = async (template: PostTemplate) => {
    try {
      const keys = extractTemplateVariables(template.content_template)
      if (keys.length > 0) {
        const initial: Record<string, string> = {}
        for (const key of keys) {
          initial[key] = templateVariables[key]
            || (typeof template.variables?.[key] === 'string' ? template.variables[key] : '')
            || ''
        }
        setTemplateVariables(initial)
        setPendingVariableTemplate(template)
        return
      }
      await applyTemplateToCompose(template.id)
    } catch {
      toast.error('Failed to apply template')
    }
  }

  const confirmVariableApply = async () => {
    if (!pendingVariableTemplate) return
    const missing = extractTemplateVariables(pendingVariableTemplate.content_template)
      .filter(key => !templateVariables[key]?.trim())
    if (missing.length > 0) {
      toast.error(`Fill in: ${missing.join(', ')}`)
      return
    }
    try {
      await applyTemplateToCompose(pendingVariableTemplate.id, templateVariables)
    } catch {
      toast.error('Failed to apply template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setIsDeletingTemplateId(templateId)
      await deleteTemplate(templateId)
      if (selectedTemplate === templateId) {
        setSelectedTemplate('')
        setSelectedTemplateName('')
      }
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setIsDeletingTemplateId(null)
    }
  }

  // Handle content suggestion selection
  const applySuggestion = (suggestion: any) => {
    setContent(suggestion.content)
    setHashtags(suggestion.hashtags || [])
    setActiveTab('compose')
  }

  // Create new template from Templates tab (or Save as Template on Compose)
  const handleCreateTemplate = async (bodyOverride?: string) => {
    const body = (bodyOverride ?? templateBody).trim()
    const name = templateName.trim()
    if (!name || !body) {
      toast.error('Template name and body are required')
      return
    }

    try {
      setIsCreatingTemplate(true)
      const tagList = parseHashtagsInput(templateHashtagsInput).length > 0
        ? parseHashtagsInput(templateHashtagsInput)
        : hashtags
      const vars = extractTemplateVariables(body)
      const variablesObj = Object.fromEntries(vars.map(v => [v, '']))

      await createTemplate(name, body, {
        category: templateCategory,
        hashtagGroups: tagList,
        variables: variablesObj,
        accountTypes: selectedAccounts.map(id => {
          const account = accounts.find(a => a.profile_id === id)
          return account?.account_type || 'primary'
        })
      })

      setTemplateName('')
      setTemplateBody('')
      setTemplateHashtagsInput('')
      setTemplateCategory('general')
      toast.success('Template created')
    } catch {
      toast.error('Failed to create template')
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  const filteredTemplates = templateCategoryFilter === 'all'
    ? templates
    : templates.filter(t => t.template_category === templateCategoryFilter)

  // Handle posting
  const handlePost = async () => {
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
      if (validOptions.length < 2) {
        toast.error('Polls need at least two options')
        return
      }
    }

    const shouldPostExternally = selectedAccounts.length > 0 && postType !== 'poll'
    if (!shouldPostExternally && !alsoPostToTourify && postType !== 'poll') {
      toast.error('Select at least one account or enable Tourify feed posting')
      return
    }

    if (isScheduled && !scheduledDate) {
      toast.error('Pick a date to schedule this post')
      return
    }

    try {
      setIsPosting(true)
      let tourifyPostId: string | null = null

      // Schedule path — never post immediately when scheduling is enabled
      if (isScheduled && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const scheduledDateTime = new Date(scheduledDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)

        const scheduleAccounts =
          selectedAccounts.length > 0
            ? selectedAccounts
            : currentAccount?.profile_id
              ? [currentAccount.profile_id]
              : []

        if (scheduleAccounts.length === 0) {
          toast.error('Select an account to schedule this post')
          return
        }

        await schedulePost(content, scheduleAccounts, scheduledDateTime, {
          mediaUrls,
          hashtags,
          postType,
          visibility,
          templateId: selectedTemplate || undefined,
          targets: shouldPostExternally ? targetPlatforms : ['tourify'],
        })

        toast.success('Post scheduled successfully!')
        setContent('')
        setHashtags([])
        setMediaUrls([])
        setSelectedTemplate('')
        setTemplateVariables({})
        setPollOptions(['', ''])
        setPollDuration('7d')
        setIsScheduled(false)
        setScheduledDate(undefined)
        return
      }

      // Always publish polls (and optionally other posts) to the Tourify feed
      if (alsoPostToTourify || postType === 'poll') {
        if (!isActingReady) throw new Error('Posting account is still loading')
        const response = await fetch('/api/posts/create', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...actingHeaders,
          },
          body: JSON.stringify({
            content: content.trim(),
            type: postType === 'poll' ? 'poll' : (mediaUrls.length > 0 ? postType : 'text'),
            visibility: postType === 'poll' && visibility === 'public' ? 'followers' : visibility,
            hashtags,
            media_urls: mediaUrls,
            poll_options: postType === 'poll' ? pollOptions : undefined,
            poll_duration: postType === 'poll' ? pollDuration : undefined,
            appearance: appearanceInput ?? { mode: 'standard' },
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.success)
          throw new Error(payload.error || 'Failed to create Tourify post')
        tourifyPostId = payload.data?.id || payload.post?.id || null
      }

      if (shouldPostExternally) {
        const postId = await createCrossPlatformPost(content, selectedAccounts, {
          mediaUrls,
          hashtags,
          postType,
          visibility,
          templateId: selectedTemplate || undefined,
          targets: targetPlatforms,
          overrides: Object.fromEntries(
            Object.entries(platformOverrides)
              .filter(([_, v]) => v && v.trim())
              .map(([k, v]) => [k, { content: v }])
          )
        })

        toast.success(tourifyPostId ? 'Posted to Tourify and selected accounts!' : 'Posted to selected accounts!')
        onPostCreated?.(tourifyPostId || postId)

        const isYouTube = targetPlatforms.includes('youtube')
        const firstVideo = mediaUrls.find(u => u.match(/\.(mp4|mov|webm|m4v)(\?|$)/i))
        if (isYouTube && firstVideo) {
          toast.message('YouTube upload continuing in background')
        }
      } else {
        toast.success(postType === 'poll' ? 'Poll posted to your followers!' : 'Posted to Tourify feed!')
        if (tourifyPostId) onPostCreated?.(tourifyPostId)
      }

      setContent('')
      setHashtags([])
      setMediaUrls([])
      setSelectedTemplate('')
      setTemplateVariables({})
      setPollOptions(['', ''])
      setPollDuration('7d')
      setAppearanceInput(null)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isScheduled ? 'Failed to schedule post' : 'Failed to create post'))
    } finally {
      setIsPosting(false)
    }
  }

  // Upload media to storage and add to mediaUrls
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const uploaded: string[] = []
      let detectedType: ComposerPostType | null = null
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/')) detectedType = 'video'
        else if (file.type.startsWith('image/') && detectedType !== 'video') detectedType = 'image'
        const ext = file.name.split('.').pop() || 'bin'
        const path = `${user.id}/social/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const bucket = 'post-media'
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
        uploaded.push(publicUrl)
      }
      setMediaUrls(prev => [...prev, ...uploaded])
      if (detectedType && postType === 'text') setPostType(detectedType)
      else if (detectedType === 'video') setPostType('video')
      toast.success(`Uploaded ${uploaded.length} file(s)`)
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  function removeMedia(url: string) {
    setMediaUrls(prev => prev.filter(item => item !== url))
  }

  function applyHashtagGroup(tags: string[]) {
    setHashtags(prev => {
      const merged = [...prev]
      for (const tag of tags) {
        const clean = tag.replace(/^#/, '').trim()
        if (clean && !merged.includes(clean)) merged.push(clean)
      }
      return merged
    })
    setActiveTab('compose')
    toast.success('Hashtags applied')
  }

  // Character count with account-specific limits
  const getCharacterLimit = () => {
    // Different platforms have different limits
    const hasTwitter = selectedAccounts.some(id => {
      const account = accounts.find(a => a.profile_id === id)
      return account?.account_type === 'artist' // Simplified logic
    })
    return hasTwitter ? 280 : 500
  }

  const characterCount = content.length
  const characterLimit = getCharacterLimit()
  const isOverLimit = characterCount > characterLimit

  return (
    <Card className={cn(ARTIST_CARD, 'mx-auto w-full max-w-4xl')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="h-5 w-5 text-purple-300" />
          Cross-Platform Composer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-full border border-white/10 bg-black/30 p-1">
            <TabsTrigger value="compose" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">Compose</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">Accounts</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">Templates</TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            {/* Content Input */}
            <div className={cn(ARTIST_INSET, 'space-y-3 p-4')}>
              {selectedTemplateName && (
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full border border-purple-400/30 bg-purple-500/15 text-purple-200">
                    Template: {selectedTemplateName}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-slate-400 hover:text-white"
                    onClick={() => {
                      setSelectedTemplate('')
                      setSelectedTemplateName('')
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear template
                  </Button>
                </div>
              )}
              <Label htmlFor="content" className="text-slate-300">Content</Label>
              <Textarea
                id="content"
                placeholder="What would you like to share?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={ARTIST_TEXTAREA}
              />
              <div className="flex justify-between items-center text-sm">
                <span className={`${isOverLimit ? 'text-rose-400' : 'text-slate-500'}`}>
                  {characterCount}/{characterLimit} characters
                </span>
                {isOverLimit && (
                  <span className="text-rose-400">Content too long for some platforms</span>
                )}
              </div>
            {/* Per-platform overrides */}
            <div className={cn(ARTIST_INSET, 'space-y-3 p-4')}>
              <Label className="text-slate-300">Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {['instagram','facebook','youtube','tiktok','twitter'].map(p => (
                  <Button key={p} variant={targetPlatforms.includes(p) ? 'default' : 'outline'} size="sm" onClick={() => {
                    setTargetPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
                  }} className={cn(
                    'rounded-full capitalize',
                    targetPlatforms.includes(p) ? ARTIST_SECONDARY_BTN : ARTIST_OUTLINE_BTN
                  )}>
                    {p}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetPlatforms.map(p => {
                  const overrideText = platformOverrides[p] ?? ''
                  const effective = (overrideText || content).trim()
                  const limit = platformLimits[p] || 10000
                  const over = effective.length > limit
                  return (
                    <div key={p} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="capitalize text-slate-300">{p} text (optional)</Label>
                        <span className={cn('text-xs', over ? 'text-rose-400' : 'text-slate-500')}>
                          {effective.length}/{limit}
                        </span>
                      </div>
                      <Textarea
                        value={overrideText}
                        onChange={e => setPlatformOverrides(prev => ({ ...prev, [p]: e.target.value }))}
                        placeholder={`Custom text for ${p}`}
                        className={ARTIST_TEXTAREA}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Previews */}
            <div className={cn(ARTIST_INSET, 'space-y-3 p-4')}>
              <Label className="text-slate-300">Previews</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetPlatforms.map(p => {
                  const text = (platformOverrides[p] || content).trim()
                  const limit = platformLimits[p] || 10000
                  const over = text.length > limit
                  const preview = over ? text.slice(0, limit - 1) + '…' : text
                  return (
                    <Card key={p} className={cn(ARTIST_CARD, 'rounded-xl')}>
                      <CardHeader>
                        <CardTitle className="text-sm capitalize text-white">{p} preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{preview}</p>
                        <div className={`text-xs mt-2 ${over ? 'text-rose-400' : 'text-slate-400'}`}>{text.length}/{limit}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
            </div>

            {/* Hashtags */}
            <div className={cn(ARTIST_INSET, 'space-y-3 p-4')}>
              <Label className="text-slate-300">Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add hashtag..."
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                  className={cn(ARTIST_INPUT, 'flex-1')}
                />
                <Button onClick={addHashtag} variant="outline" className={cn(ARTIST_SECONDARY_BTN, 'h-10 px-4')}>
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="hidden" id="composer-files" />
                <Button asChild variant="outline" disabled={isUploading} className={cn(ARTIST_GHOST_CHIP, 'rounded-full')}>
                  <label htmlFor="composer-files">{isUploading ? 'Uploading…' : 'Add Media'}</label>
                </Button>
                {mediaUrls.length > 0 && (
                  <span className="text-xs text-slate-500">{mediaUrls.length} file(s) attached</span>
                )}
              </div>
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaUrls.map(url => {
                    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
                    return (
                      <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/80">
                        {isVideo ? (
                          <video src={url} className="h-full w-full object-cover" muted />
                        ) : (

                          <img src={url} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          type="button"
                          aria-label="Remove media"
                          onClick={() => removeMedia(url)}
                          className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {hashtagGroups.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Hashtag groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {hashtagGroups.map(group => (
                      <Button
                        key={group.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(ARTIST_OUTLINE_BTN, 'rounded-full h-8 text-xs')}
                        onClick={() => applyHashtagGroup(group.hashtags)}
                      >
                        Use {group.group_name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="cursor-pointer rounded-full border border-purple-400/25 bg-purple-500/15 text-purple-200">
                    #{hashtag}
                    <button
                      type="button"
                      aria-label={`Remove hashtag ${hashtag}`}
                      onClick={() => removeHashtag(hashtag)}
                      className="ml-1 text-purple-300 hover:text-white"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Post Options */}
            <div className={cn(ARTIST_INSET, 'grid grid-cols-1 gap-4 p-4 md:grid-cols-3')}>
              <div className="space-y-2">
                <Label className="text-slate-300">Post Type</Label>
                <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
                  <SelectTrigger className={ARTIST_INPUT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100">
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="poll">Poll</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Visibility</Label>
                <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                  <SelectTrigger className={ARTIST_INPUT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="followers">Followers Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Scheduling</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isScheduled}
                    onCheckedChange={setIsScheduled}
                    disabled={postType === 'poll'}
                  />
                  <span className="text-sm text-slate-300">Schedule for later</span>
                </div>
              </div>
            </div>

            {postType === 'poll' && (
              <div className="rounded-2xl border border-purple-400/25 bg-purple-500/10 p-4 shadow-[0_0_24px_-12px_rgba(168,85,247,0.45)]">
                <PollOptionEditor
                  options={pollOptions}
                  duration={pollDuration}
                  onOptionsChange={setPollOptions}
                  onDurationChange={setPollDuration}
                />
                <p className="mt-3 text-xs text-slate-400">
                  Polls publish to your Tourify followers feed (external platforms do not support native Tourify polls).
                </p>
              </div>
            )}

            <div className={cn(ARTIST_INSET, 'flex items-center space-x-2 px-3 py-2')}>
              <Switch
                checked={alsoPostToTourify || postType === 'poll'}
                onCheckedChange={setAlsoPostToTourify}
                disabled={postType === 'poll'}
              />
              <span className="text-sm text-slate-300">Also post to Tourify feed</span>
              <ComposerStyleControl
                value={appearanceInput}
                onChange={setAppearanceInput}
                preview={{
                  content,
                  mediaCount: mediaUrls.length,
                  pollOptions: postType === 'poll' ? pollOptions : undefined,
                }}
                className="ml-auto border-purple-400/25 bg-purple-500/10 text-purple-100"
              />
            </div>

            {/* Scheduling Options */}
            {isScheduled && (
              <div className={cn(ARTIST_INSET, 'grid grid-cols-1 gap-4 p-4 md:grid-cols-2')}>
                <div className="space-y-2">
                  <Label className="text-slate-300">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn(ARTIST_OUTLINE_BTN, 'w-full justify-start text-left')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={ARTIST_INPUT}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handlePost}
                disabled={
                  isPosting
                  || !content.trim()
                  || isOverLimit
                  || (postType === 'poll'
                    ? pollOptions.filter((option) => option.trim()).length < 2
                    : (selectedAccounts.length === 0 && !alsoPostToTourify))
                }
                className={cn(ARTIST_PRIMARY_BTN, 'flex-1 h-11')}
              >
                {isPosting ? (
                  'Posting...'
                ) : isScheduled ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Post
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Now
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className={cn(ARTIST_OUTLINE_BTN, 'rounded-full')}
                onClick={() => {
                  if (!content.trim()) {
                    toast.error('Write content before saving as a template')
                    return
                  }
                  setTemplateBody(content)
                  setTemplateHashtagsInput(hashtags.map(h => `#${h}`).join(' '))
                  if (!templateName.trim()) setTemplateName('Untitled template')
                  setActiveTab('templates')
                }}
                disabled={isCreatingTemplate}
              >
                <FileText className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Select Accounts to Post To</Label>
              <p className="text-sm text-slate-400">
                Choose which accounts you want to post to. Content will be posted to all selected accounts.
              </p>
            </div>

            {accounts.length === 0 ? (
              <div className={cn(ARTIST_INSET, 'space-y-3 p-6 text-center')}>
                <p className="text-slate-200 font-medium">No Tourify accounts yet</p>
                <p className="text-sm text-slate-400">
                  Connect a profile or open Socials to link platforms before cross-posting.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <Button asChild className={ARTIST_PRIMARY_BTN}>
                    <Link href="/artist/content?tab=socials">Open Socials</Link>
                  </Button>
                  <Button asChild variant="outline" className={ARTIST_OUTLINE_BTN}>
                    <Link href="/artist/settings">Account settings</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map((account) => {
                  const displayName = account.profile_data?.artist_name
                    ?? account.profile_data?.venue_name
                    ?? account.profile_data?.organization_name
                    ?? account.profile_data?.full_name
                    ?? account.account_type
                  return (
                    <div
                      key={account.profile_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAccounts.includes(account.profile_id)
                          ? 'border-purple-500/60 bg-purple-500/10'
                          : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500'
                      }`}
                      onClick={() => toggleAccountSelection(account.profile_id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={account.profile_data?.avatar_url || ''} />
                          <AvatarFallback>
                            {displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-slate-100">{displayName}</p>
                            {selectedAccounts.includes(account.profile_id) && (
                              <CheckCircle2 className="h-4 w-4 text-purple-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                              {account.account_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedAccounts.length > 0 && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-300">
                  Selected {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} for posting
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card className={cn(ARTIST_CARD, 'rounded-xl')}>
              <CardHeader>
                <CardTitle className="text-lg text-white">Create New Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName" className="text-slate-300">Template Name</Label>
                    <Input
                      id="templateName"
                      placeholder="e.g., Event Announcement"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className={ARTIST_INPUT}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Category</Label>
                    <Select value={templateCategory} onValueChange={(value: any) => setTemplateCategory(value)}>
                      <SelectTrigger className={ARTIST_INPUT}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100">
                        {TEMPLATE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateBody" className="text-slate-300">Template body</Label>
                  <Textarea
                    id="templateBody"
                    placeholder="Write reusable copy. Use {venue_name}, {event_date}, etc. for variables."
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className={ARTIST_TEXTAREA}
                    rows={5}
                  />
                  {extractTemplateVariables(templateBody).length > 0 && (
                    <p className="text-xs text-slate-400">
                      Variables detected:{' '}
                      {extractTemplateVariables(templateBody).map(v => `{${v}}`).join(', ')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateHashtags" className="text-slate-300">Hashtags (optional)</Label>
                  <Input
                    id="templateHashtags"
                    placeholder="#tour #live #newmusic"
                    value={templateHashtagsInput}
                    onChange={(e) => setTemplateHashtagsInput(e.target.value)}
                    className={ARTIST_INPUT}
                  />
                </div>

                <Button
                  onClick={() => handleCreateTemplate()}
                  disabled={isCreatingTemplate || !templateName.trim() || !templateBody.trim()}
                  className={cn(ARTIST_PRIMARY_BTN, 'w-full')}
                >
                  {isCreatingTemplate ? 'Creating...' : 'Create Template'}
                </Button>
              </CardContent>
            </Card>

            {pendingVariableTemplate && (
              <Card className={cn(ARTIST_CARD, 'rounded-xl border-purple-500/40')}>
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Fill variables — {pendingVariableTemplate.template_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {extractTemplateVariables(pendingVariableTemplate.content_template).map(key => (
                    <div key={key} className="space-y-1">
                      <Label className="text-slate-300 capitalize">{key.replace(/_/g, ' ')}</Label>
                      <Input
                        value={templateVariables[key] || ''}
                        onChange={(e) => setTemplateVariables(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`{${key}}`}
                        className={ARTIST_INPUT}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={confirmVariableApply} className={cn(ARTIST_PRIMARY_BTN, 'flex-1')}>
                      Apply to Compose
                    </Button>
                    <Button
                      variant="outline"
                      className={ARTIST_OUTLINE_BTN}
                      onClick={() => {
                        setPendingVariableTemplate(null)
                        setTemplateVariables({})
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">Available Templates</h3>
                {loading && <span className="text-xs text-slate-500">Loading…</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    'rounded-full capitalize',
                    templateCategoryFilter === 'all' ? ARTIST_SECONDARY_BTN : ARTIST_OUTLINE_BTN
                  )}
                  onClick={() => setTemplateCategoryFilter('all')}
                >
                  All
                </Button>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      'rounded-full capitalize',
                      templateCategoryFilter === cat ? ARTIST_SECONDARY_BTN : ARTIST_OUTLINE_BTN
                    )}
                    onClick={() => setTemplateCategoryFilter(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              {filteredTemplates.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No templates in this category. Create one above — or clear the filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates.map((template) => {
                    const isOwn = user?.id === template.user_id
                    const previewTags = flattenHashtagGroups(template.hashtag_groups)
                    return (
                      <Card key={template.id} className={cn(ARTIST_CARD, 'rounded-xl')}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-100 truncate">{template.template_name}</h4>
                              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {template.content_template}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs border-slate-600 text-slate-300 capitalize">
                                  {template.template_category}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  Used {template.usage_count} times
                                </span>
                                {extractTemplateVariables(template.content_template).length > 0 && (
                                  <Badge className="text-xs bg-purple-500/15 text-purple-200 border border-purple-400/25">
                                    Variables
                                  </Badge>
                                )}
                              </div>
                              {previewTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {previewTags.slice(0, 4).map(tag => (
                                    <span key={tag} className="text-xs text-slate-500">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className={ARTIST_OUTLINE_BTN}
                                onClick={() => handleTemplateSelect(template)}
                              >
                                Use
                              </Button>
                              {isOwn && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                                  disabled={isDeletingTemplateId === template.id}
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-300">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                Content Suggestions
              </Label>
              <p className="text-sm text-slate-400">
                Suggested templates based on your account type and history. Performance scores are estimates (not live synced).
              </p>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No suggestions yet. Create templates or post more to unlock personalized ideas.
              </p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="cursor-pointer border-slate-700/50 bg-slate-900/50 hover:border-purple-500/40 transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{suggestion.content}</p>
                          {suggestion.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {suggestion.hashtags.slice(0, 5).map((hashtag: string) => (
                                <Badge key={hashtag} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                  #{hashtag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <BarChart3 className="h-3 w-3 text-slate-500" />
                            <span className="text-xs text-slate-500">
                              Suggested (not synced) · {Math.round(suggestion.average_performance * 100)}% est.
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={ARTIST_OUTLINE_BTN}
                          onClick={() => applySuggestion(suggestion)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
