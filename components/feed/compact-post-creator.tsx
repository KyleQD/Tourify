'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Image, 
  Video, 
  MapPin, 
  Hash, 
  Send, 
  Globe, 
  Users, 
  Lock, 
  Loader2,
  Music
} from 'lucide-react'
import { Database } from '@/lib/database.types'
import { toast } from 'sonner'
import { useRouteAccountContext } from '@/hooks/use-route-account-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'

interface CompactPostCreatorProps {
  onPostCreated?: (post: any) => void
  artistUser?: any
  artistProfile?: any
  displayName?: string
  avatarInitial?: string
}

export function CompactPostCreator({ 
  onPostCreated, 
  artistUser, 
  artistProfile, 
  displayName, 
  avatarInitial 
}: CompactPostCreatorProps) {
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [isPosting, setIsPosting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Use route-based account context detection
  const { accountType, routeContext, displayContext } = useRouteAccountContext()
  const { actingHeaders } = useActingContext()

  // Auto-resize textarea
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    // Extract hashtags
    const hashtagMatches = value.match(/#\w+/g)
    if (hashtagMatches) {
      const cleanHashtags = hashtagMatches.map(tag => tag.substring(1))
      setHashtags(cleanHashtags)
    } else {
      setHashtags([])
    }
  }

  const handlePost = async () => {
    if (!content.trim() || isPosting) return

    // Check if artist user is authenticated
    if (!artistUser) {
      toast.error('Authentication Required', {
        description: 'Please complete your artist profile setup to start posting.'
      })
      return
    }

    setIsPosting(true)
    try {
      console.log('Creating post with route-based account system:', {
        user_id: artistUser.id,
        route_context: routeContext,
        account_type: accountType,
        display_context: displayContext,
        content: content.trim()
      })

      // Create post via main API endpoint
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          type: 'text',
          visibility,
          location: location || null,
          hashtags: hashtags.length > 0 ? hashtags : null,
        }),
      })

      console.log('API Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: `Server error: ${response.status} ${response.statusText}` }
        }
        
        console.error('API Error:', errorData)
        
        // Provide more specific error messages
        let errorMessage = 'Failed to create post'
        if (response.status === 401) {
          errorMessage = 'Authentication required - please sign in'
        } else if (response.status === 403) {
          errorMessage = 'Not authorized to post as artist'
        } else if (response.status === 500) {
          errorMessage = 'Server error - please try again'
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
        
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.error('Failed to parse successful response:', parseError)
        throw new Error('Invalid response from server')
      }
      
      console.log('Post created successfully with unified accounts:', result.post)

      if (!result.post) {
        throw new Error('Invalid response from server - no post data returned')
      }

      // The API now returns complete account information, so we can use it directly
      const displayPost = {
        ...result.post,
        // The API provides complete account context, so we don't need to override it
        id: result.post.id,
        user_id: artistUser.id,
        content: content.trim(),
        type: result.post.type || 'text',
        visibility: result.post.visibility || visibility,
        location: result.post.location || location || null,
        hashtags: result.post.hashtags || (hashtags.length > 0 ? hashtags : null),
        likes_count: result.post.likes_count || 0,
        comments_count: result.post.comments_count || 0,
        shares_count: result.post.shares_count || 0,
        created_at: result.post.created_at || new Date().toISOString(),
        updated_at: result.post.updated_at || new Date().toISOString(),
        is_liked: false,
        // Use the complete account info from the unified system
        profiles: result.post.user || result.post.profiles,
        user: result.post.user || result.post.profiles,
        // Include account context for the frontend
        account_id: result.post.account_id,
        account_type: result.post.account_type,
        // Handle media fields based on schema
        media_urls: result.post.media_urls || result.post.images || [],
        images: result.post.images || result.post.media_urls || []
      }

      console.log('✅ Created display post with unified account system:', {
        id: displayPost.id,
        account_id: displayPost.account_id,
        account_type: displayPost.account_type,
        display_name: displayPost.profiles?.full_name || displayPost.user?.full_name,
        account_context_type: displayPost.profiles?.account_type || displayPost.user?.account_type
      })

      // Call the callback with the new post
      if (onPostCreated) {
        onPostCreated(displayPost)
      }

      // Reset form
      setContent('')
      setHashtags([])
      setLocation('')
      setShowOptions(false)
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      // Dynamic success message based on route-based account context
      const accountDisplayName = displayPost.profiles?.full_name || displayPost.user?.full_name || displayContext
      toast.success('Post created successfully!', {
        description: `Posted as ${accountDisplayName} (${displayContext})`
      })

    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setIsPosting(false)
    }
  }

  const visibilityOptions = [
    { value: 'public' as const, icon: Globe, label: 'Public', desc: 'Anyone can see' },
    { value: 'followers' as const, icon: Users, label: 'Followers', desc: 'Only followers' },
    { value: 'private' as const, icon: Lock, label: 'Private', desc: 'Only you' }
  ]

  const currentVisibility = visibilityOptions.find(opt => opt.value === visibility)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl"
    >
      <div className="flex gap-4">
        {/* Artist Avatar */}
        <Avatar className="h-12 w-12 border-2 border-purple-500/30">
          <AvatarImage src="" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
            {avatarInitial || 'A'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-4">
          <PostingAccountSelector className="border-slate-700/50 bg-slate-900/40" />
          {/* Artist Info */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {displayName || 'Artist'}
            </span>
            {artistProfile?.verification_status === 'verified' && (
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                ✓ Verified
              </Badge>
            )}
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              Artist Account
            </Badge>
          </div>

          {/* Content Input */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onFocus={() => setShowOptions(true)}
            placeholder="What's happening in your music world?"
            className="w-full min-h-[80px] max-h-[200px] bg-transparent text-white placeholder-slate-400 border-0 outline-0 resize-none text-lg leading-relaxed"
            disabled={isPosting}
          />

          {/* Hashtags Preview */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Expanded Options */}
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Location Input */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location..."
                  className="flex-1 bg-transparent text-slate-300 placeholder-slate-500 border-0 outline-0"
                  disabled={isPosting}
                />
              </div>

              <Separator className="bg-slate-700/50" />
            </motion.div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            {/* Media & Options */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-purple-400 hover:bg-purple-500/20">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-purple-400 hover:bg-purple-500/20">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-purple-400 hover:bg-purple-500/20">
                <Music className="h-4 w-4" />
              </Button>
            </div>

            {/* Visibility & Post */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                <currentVisibility.icon className="h-4 w-4" />
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-400 border-0 focus:outline-none cursor-pointer"
                  disabled={isPosting}
                >
                  {visibilityOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Character Count & Post Button */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {content.length}/280
                </span>
                <Button
                  onClick={handlePost}
                  disabled={!content.trim() || isPosting || content.length > 280}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 h-8 rounded-full"
                >
                  {isPosting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Auth hint if not authenticated as artist */}
          {!artistUser && !isPosting && (
            <div className="mt-2 text-xs text-amber-400">
              Please complete your artist profile setup to start posting
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
} 
