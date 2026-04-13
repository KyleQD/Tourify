'use client'

import { supabase } from '@/lib/supabase/client'
import React, { useState, useEffect } from 'react'
import { useEnhancedAccounts } from '@/hooks/use-enhanced-accounts'
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
  Image, 
  Calendar as CalendarIcon,
  Copy,
  Lightbulb,
  FileText,
  Settings,
  Target,
  Zap,
  BarChart3,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Database } from '@/types/supabase'

interface CrossPlatformComposerProps {
  onPostCreated?: (postId: string) => void
  defaultContent?: string
  preselectedAccounts?: string[]
}

export function CrossPlatformComposer({ 
  onPostCreated, 
  defaultContent = '', 
  preselectedAccounts = [] 
}: CrossPlatformComposerProps) {
  // Hooks
  const { accounts, currentAccount } = useEnhancedAccounts()
  const { 
    createCrossPlatformPost, 
    schedulePost, 
    templates, 
    hashtagGroups, 
    useTemplate: applyTemplate,
    createTemplate,
    loading 
  } = useCrossPlatformPosting()
  
  // Form state
  const [content, setContent] = useState(defaultContent)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(preselectedAccounts)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState('12:00')
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'audio' | 'poll' | 'event'>('text')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [newHashtag, setNewHashtag] = useState('')
  const [activeTab, setActiveTab] = useState('compose')
  const [isUploading, setIsUploading] = useState(false)
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({})
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['instagram','facebook','youtube','tiktok'])
  const platformLimits: Record<string, number> = { twitter: 280, instagram: 2200, facebook: 63206, youtube: 5000, tiktok: 2200 }
  
  // Template creation state
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState<'general' | 'promotion' | 'announcement' | 'event' | 'personal' | 'business'>('general')
  
  // Posting state
  const [isPosting, setIsPosting] = useState(false)
  
  // Content suggestions
  const { suggestions } = useContentSuggestions(currentAccount?.account_type || 'primary')

  // Auto-select user's accounts if none preselected
  useEffect(() => {
    if (preselectedAccounts.length === 0 && accounts.length > 0) {
      setSelectedAccounts([accounts[0].id])
    }
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

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    try {
      const { processedContent, template } = await applyTemplate(templateId, templateVariables)
      setContent(processedContent)
      setSelectedTemplate(templateId)
      
      // Auto-populate hashtags if template has them
      if (template.hashtag_groups?.length > 0) {
        const templateHashtags = template.hashtag_groups.flat()
        setHashtags(prev => [...new Set([...prev, ...templateHashtags])])
      }
      
      toast.success('Template applied successfully!')
    } catch (error) {
      toast.error('Failed to apply template')
    }
  }

  // Handle content suggestion selection
  const applySuggestion = (suggestion: any) => {
    setContent(suggestion.content)
    setHashtags(suggestion.hashtags || [])
  }

  // Create new template
  const handleCreateTemplate = async () => {
    if (!templateName || !content) {
      toast.error('Template name and content are required')
      return
    }

    try {
      setIsCreatingTemplate(true)
      await createTemplate(templateName, content, {
        category: templateCategory,
        hashtagGroups: [hashtags],
        accountTypes: selectedAccounts.map(id => {
          const account = accounts.find(a => a.id === id)
          return account?.account_type || 'primary'
        })
      })
      
      setTemplateName('')
      setTemplateCategory('general')
      setIsCreatingTemplate(false)
      toast.success('Template created successfully!')
    } catch (error) {
      toast.error('Failed to create template')
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  // Handle posting
  const handlePost = async () => {
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }

    if (selectedAccounts.length === 0) {
      toast.error('Please select at least one account')
      return
    }

    try {
      setIsPosting(true)
      
      if (isScheduled && scheduledDate) {
        // Create scheduled post
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const scheduledDateTime = new Date(scheduledDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        
        await schedulePost(content, selectedAccounts, scheduledDateTime, {
          mediaUrls,
          hashtags,
          postType,
          visibility,
          templateId: selectedTemplate || undefined
        })
        
        toast.success('Post scheduled successfully!')
      } else {
        // Create immediate post
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
        
        toast.success('Posted to all selected accounts!')
        onPostCreated?.(postId)

        // If YouTube is a target and there is a video, trigger background upload
        const isYouTube = targetPlatforms.includes('youtube')
        const firstVideo = mediaUrls.find(u => u.match(/\.(mp4|mov|webm|m4v)(\?|$)/i))
        if (isYouTube && firstVideo) {
          // Ask the social-post function to initiate session; it returns uploadUrl in results
          // We already call provider posting inside the hook; here we can directly call the upload worker if uploadUrl present from analytics later.
          // For UX, just notify user that upload will continue in background.
          toast.message('YouTube upload continuing in background')
        }
      }
      
      // Reset form
      setContent('')
      setHashtags([])
      setMediaUrls([])
      setSelectedTemplate('')
      setTemplateVariables({})
      
    } catch (error) {
      toast.error(isScheduled ? 'Failed to schedule post' : 'Failed to create post')
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
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin'
        const path = `${user.id}/social/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const bucket = 'post-media'
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
        uploaded.push(publicUrl)
      }
      setMediaUrls(prev => [...prev, ...uploaded])
      toast.success(`Uploaded ${uploaded.length} file(s)`) 
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Character count with account-specific limits
  const getCharacterLimit = () => {
    // Different platforms have different limits
    const hasTwitter = selectedAccounts.some(id => {
      const account = accounts.find(a => a.id === id)
      return account?.account_type === 'artist' // Simplified logic
    })
    return hasTwitter ? 280 : 500
  }

  const characterCount = content.length
  const characterLimit = getCharacterLimit()
  const isOverLimit = characterCount > characterLimit

  return (
    <Card className="w-full max-w-4xl mx-auto bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <Target className="h-5 w-5" />
          Cross-Platform Composer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <TabsTrigger value="compose" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Compose</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Accounts</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Templates</TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">AI Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            {/* Content Input */}
            <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="What would you like to share?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40"
              />
              <div className="flex justify-between items-center text-sm">
                <span className={`${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                  {characterCount}/{characterLimit} characters
                </span>
                {isOverLimit && (
                  <span className="text-red-500">Content too long for some platforms</span>
                )}
              </div>
            {/* Per-platform overrides */}
            <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {['instagram','facebook','youtube','tiktok','twitter'].map(p => (
                  <Button key={p} variant={targetPlatforms.includes(p) ? 'default' : 'outline'} size="sm" onClick={() => {
                    setTargetPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
                  }} className={`rounded-xl ${targetPlatforms.includes(p) ? 'bg-purple-600' : 'border-slate-700/50'}`}>
                    {p}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetPlatforms.map(p => (
                  <div key={p} className="space-y-1">
                    <Label className="capitalize">{p} text (optional)</Label>
                    <Textarea value={platformOverrides[p] || ''} onChange={e => setPlatformOverrides(prev => ({ ...prev, [p]: e.target.value }))} placeholder={`Custom text for ${p}`} className="rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Previews */}
            <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label>Previews</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetPlatforms.map(p => {
                  const text = (platformOverrides[p] || content).trim()
                  const limit = platformLimits[p] || 10000
                  const over = text.length > limit
                  const preview = over ? text.slice(0, limit - 1) + '…' : text
                  return (
                    <Card key={p} className="border-slate-700/50 bg-slate-800/40 rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-sm capitalize">{p} preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{preview}</p>
                        <div className={`text-xs mt-2 ${over ? 'text-red-400' : 'text-slate-400'}`}>{text.length}/{limit}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label>Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add hashtag..."
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                  className="flex-1 rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40"
                />
                <Button onClick={addHashtag} variant="outline">
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="hidden" id="composer-files" />
                <Button asChild variant="outline" disabled={isUploading} className="rounded-xl">
                  <label htmlFor="composer-files">{isUploading ? 'Uploading…' : 'Add Media'}</label>
                </Button>
                {mediaUrls.length > 0 && (
                  <span className="text-xs text-gray-500">{mediaUrls.length} file(s) attached</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="cursor-pointer">
                    #{hashtag}
                    <button
                      onClick={() => removeHashtag(hashtag)}
                      className="ml-1 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Post Options */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Post Type</Label>
                <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="followers">Followers Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduling</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isScheduled}
                    onCheckedChange={setIsScheduled}
                  />
                  <span className="text-sm">Schedule for later</span>
                </div>
              </div>
            </div>

            {/* Scheduling Options */}
            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-2xl border-slate-700/50 bg-slate-900/40">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
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
                    className="rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handlePost}
                disabled={isPosting || !content.trim() || selectedAccounts.length === 0 || isOverLimit}
                className="flex-1 rounded-xl"
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
              
              <Button variant="outline" className="rounded-xl" onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Accounts to Post To</Label>
              <p className="text-sm text-gray-600">
                Choose which accounts you want to post to. Content will be posted to all selected accounts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccounts.includes(account.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleAccountSelection(account.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.avatar_url || ''} />
                      <AvatarFallback>
                        {account.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{account.display_name}</p>
                        {selectedAccounts.includes(account.id) && (
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.account_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {account.follower_count} followers
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedAccounts.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Selected {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} for posting
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {/* Template Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      placeholder="e.g., Event Announcement"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={templateCategory} onValueChange={(value: any) => setTemplateCategory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateTemplate} 
                  disabled={isCreatingTemplate || !templateName || !content}
                  className="w-full"
                >
                  {isCreatingTemplate ? 'Creating...' : 'Create Template'}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Templates */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Available Templates</h3>
              {templates.length === 0 ? (
                <p className="text-gray-500">No templates available. Create your first template above!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{template.template_name}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {template.content_template}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {template.template_category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Used {template.usage_count} times
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTemplateSelect(template.id)}
                          >
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Content Suggestions
              </Label>
              <p className="text-sm text-gray-600">
                AI-powered content suggestions based on your account type and performance history.
              </p>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-gray-500">No suggestions available at the moment.</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">{suggestion.content}</p>
                          {suggestion.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {suggestion.hashtags.slice(0, 5).map((hashtag: string) => (
                                <Badge key={hashtag} variant="outline" className="text-xs">
                                  #{hashtag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <BarChart3 className="h-3 w-3" />
                            <span className="text-xs text-gray-500">
                              {Math.round(suggestion.average_performance * 100)}% avg performance
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
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