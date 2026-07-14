'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Image, 
  Video, 
  Music, 
  MapPin, 
  Hash, 
  Send,
  X,
  Globe,
  Users,
  Lock,
  BarChart3
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Database } from '@/lib/database.types'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'
import { toast } from 'sonner'
import { PollOptionEditor } from '@/components/polls/poll-option-editor'
import type { PollDuration } from '@/lib/polls/poll-duration'

interface PostCreatorProps {
  onPostCreated?: (post: any) => void
}

export function EnhancedPostCreator({ onPostCreated }: PostCreatorProps) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [location, setLocation] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPollMode, setIsPollMode] = useState(false)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollDuration, setPollDuration] = useState<PollDuration>('7d')

  const { user, loading } = useAuth()
  const { actingHeaders, isActingReady } = useActingContext()
  const createPost = async (postData: {
    content: string
    visibility: string
    location?: string
    hashtags: string[]
    type?: string
    poll_options?: string[]
    poll_duration?: PollDuration
  }) => {
    if (!user) throw new Error('User not authenticated')
    if (!isActingReady) throw new Error('Posting account is still loading. Please try again in a moment.')

    const hashtagMatches = postData.content.match(/#[a-zA-Z0-9_]+/g)
    const extractedHashtags = hashtagMatches?.map(tag => tag.substring(1).toLowerCase()) || []
    const allHashtags = [...extractedHashtags, ...postData.hashtags]

    const requestBody: Record<string, unknown> = {
      content: postData.content,
      type: postData.type || 'text',
      visibility: postData.visibility,
      location: postData.location || null,
      hashtags: allHashtags,
    }

    if (postData.type === 'poll') {
      requestBody.poll_options = postData.poll_options
      requestBody.poll_duration = postData.poll_duration
    }

    const response = await fetch('/api/posts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...actingHeaders,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const errorMessage = errorData.error || errorData.details || 'Failed to create post'
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || result.details || 'Post creation failed')
    }

    return result.data || result.post
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting || !user || !isActingReady) return

    if (isPollMode) {
      const validOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
      if (validOptions.length < 2) {
        toast.error('Invalid poll', { description: 'Add at least two poll options.' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const post = await createPost({
        content: content.trim(),
        visibility: isPollMode && visibility === 'public' ? 'followers' : visibility,
        location: location.trim() || undefined,
        hashtags,
        type: isPollMode ? 'poll' : 'text',
        poll_options: isPollMode ? pollOptions : undefined,
        poll_duration: isPollMode ? pollDuration : undefined,
      })

      setContent('')
      setLocation('')
      setHashtags([])
      setHashtagInput('')
      setIsExpanded(false)
      setIsPollMode(false)
      setPollOptions(['', ''])
      setPollDuration('7d')
      
      onPostCreated?.(post)
      
      toast.success(isPollMode ? 'Poll created!' : 'Post created successfully!', {
        description: isPollMode
          ? 'Your followers can vote in the feed.'
          : 'Your post has been published to your feed.'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        toast.error('Authentication Error', {
          description: 'Please refresh the page and try logging in again.',
          action: {
            label: 'Refresh Page',
            onClick: () => window.location.reload()
          }
        })
      } else {
        toast.error(isPollMode ? 'Failed to create poll' : 'Failed to create post', {
          description: errorMessage || 'An unknown error occurred. Please try again.'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace('#', '').trim().toLowerCase()
    if (cleanTag && !hashtags.includes(cleanTag)) {
      setHashtags([...hashtags, cleanTag])
    }
    setHashtagInput('')
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag))
  }

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addHashtag(hashtagInput)
    }
  }

  const visibilityIcons = {
    public: <Globe className="h-4 w-4" />,
    followers: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  }

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 rounded-xl">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 rounded-xl">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400">Please log in to create posts</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 rounded-xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <PostingAccountSelector className="border-slate-700/50 bg-slate-900/30" />
          </div>
          <div className="flex gap-4">
            <Avatar className="flex-shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.user_metadata?.full_name?.[0] || user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder={isPollMode ? 'Ask your followers a question...' : "What's happening in your world?"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="min-h-[120px] resize-none bg-slate-800/50 border-slate-600/50 focus:border-blue-500/50 placeholder:text-slate-400 rounded-xl"
                disabled={!isActingReady || isSubmitting}
              />

              {isPollMode && (
                <PollOptionEditor
                  options={pollOptions}
                  duration={pollDuration}
                  onOptionsChange={setPollOptions}
                  onDurationChange={setPollDuration}
                />
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Hashtags */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {hashtags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                          >
                            #{tag}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => removeHashtag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Add hashtags..."
                            value={hashtagInput}
                            onChange={(e) => setHashtagInput(e.target.value)}
                            onKeyDown={handleHashtagKeyPress}
                            className="pl-10 bg-slate-800/50 border-slate-600/50"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addHashtag(hashtagInput)}
                          disabled={!hashtagInput.trim()}
                          className="border-slate-600/50 hover:bg-slate-700/50"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Add location..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-600/50"
                      />
                    </div>

                    <Separator className="bg-slate-700/50" />

                    {/* Media Upload Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-600/50 hover:bg-slate-700/50"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-600/50 hover:bg-slate-700/50"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </Button>
                      <Button
                        type="button"
                        variant={isPollMode ? 'secondary' : 'outline'}
                        size="sm"
                        className="border-slate-600/50 hover:bg-slate-700/50"
                        onClick={() => {
                          setIsPollMode((prev) => !prev)
                          setIsExpanded(true)
                          if (!isPollMode && visibility === 'public')
                            setVisibility('followers')
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Poll
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isExpanded && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {isExpanded && (
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger className="w-32 bg-slate-800/50 border-slate-600/50">
                        <div className="flex items-center gap-2">
                          {visibilityIcons[visibility as keyof typeof visibilityIcons]}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="followers">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Followers
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {content.length > 0 && (
                    <span className="text-sm text-slate-400">
                      {content.length}/280
                    </span>
                  )}
                  
                  <Button
                    type="submit"
                    disabled={
                      !content.trim()
                      || isSubmitting
                      || !isActingReady
                      || (isPollMode && pollOptions.filter((option) => option.trim()).length < 2)
                    }
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isPollMode ? 'Creating...' : 'Posting...'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isPollMode ? <BarChart3 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        {isPollMode ? 'Create Poll' : 'Post'}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 
