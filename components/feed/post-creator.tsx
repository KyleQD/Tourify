'use client'

import { useState } from 'react'
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
  Smile, 
  Send,
  X,
  Globe,
  Users,
  Lock
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
import { useFeed } from '@/hooks/use-feed'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState as useReactState } from 'react'

interface PostCreatorProps {
  onPostCreated?: () => void
}

export function PostCreator({ onPostCreated }: PostCreatorProps) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [location, setLocation] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [media, setMedia] = useState<File[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createPost } = useFeed()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await createPost({
        content: content.trim(),
        visibility,
        location: location.trim() || undefined,
        hashtags,
        // TODO: Handle media upload
      })

      if (result.success) {
        setContent('')
        setLocation('')
        setHashtags([])
        setHashtagInput('')
        setMedia([])
        setIsExpanded(false)
        onPostCreated?.()
      }
    } catch (error) {
      console.error('Error creating post:', error)
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

  return (
    <Card className="mb-6 overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <Avatar className="flex-shrink-0">
              <AvatarImage src={undefined} />
              <AvatarFallback>
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="What's happening in your world?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="min-h-[120px] resize-none bg-slate-800/50 border-slate-600/50 focus:border-blue-500/50 placeholder:text-slate-400"
              />

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
                        variant="outline"
                        size="sm"
                        className="border-slate-600/50 hover:bg-slate-700/50"
                      >
                        <Music className="h-4 w-4 mr-2" />
                        Audio
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
                    disabled={!content.trim() || isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Posting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Post
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