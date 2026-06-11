'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  Link,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Smile,
  Calendar,
  Clock,
  Settings
} from 'lucide-react'
import { MediaPreview } from '@/components/ui/media-preview'
import { DragDropIndicator } from '@/components/ui/drag-drop-indicator'
import { 
  useMediaUpload, 
  MediaFile,
  MediaType,
  formatFileSize,
  formatDuration
} from '@/lib/utils/enhanced-media-upload'
import { useDragAndDrop } from '@/hooks/use-drag-and-drop'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CleanPostCreatorProps {
  onPostCreated?: (post: any) => void
  placeholder?: string
  maxMediaItems?: number
  className?: string
  defaultVisibility?: 'public' | 'followers' | 'private'
  showAdvancedOptions?: boolean
  user?: {
    id: string
    username?: string
    avatar_url?: string
  }
}

interface PostData {
  content: string
  visibility: 'public' | 'followers' | 'private'
  location?: string
  hashtags: string[]
  mediaItems: MediaFile[]
  scheduledFor?: Date
  allowComments: boolean
  allowSharing: boolean
}

export function CleanPostCreator({
  onPostCreated,
  placeholder = "What's happening in your world?",
  maxMediaItems = 10,
  className,
  defaultVisibility = 'public',
  showAdvancedOptions = true,
  user: propUser
}: CleanPostCreatorProps) {
  const { user: authUser } = useAuth()
  const { actingHeaders } = useActingContext()
  const user = propUser || authUser
  const [postData, setPostData] = useState<PostData>({
    content: '',
    visibility: defaultVisibility,
    location: '',
    hashtags: [],
    mediaItems: [],
    allowComments: true,
    allowSharing: true
  })
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hashtagInput, setHashtagInput] = useState('')
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [showMediaUpload, setShowMediaUpload] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Character count and limit calculations
  const characterCount = postData.content.length
  const maxCharacters = 280
  const isOverLimit = characterCount > maxCharacters

  // Handle media selection
  function handleMediaSelected(files: MediaFile[]) {
    const updatedMediaItems = [...postData.mediaItems, ...files]
    setPostData(prev => ({ ...prev, mediaItems: updatedMediaItems }))
    setShowMediaUpload(false)
    
    if (files.length > 0) {
      toast.success(`${files.length} file(s) added to post`)
    }
  }

  // Drag and drop hook
  const {
    isDragOver,
    isDragValid,
    errorMessage,
    dragHandlers,
    clearError
  } = useDragAndDrop({
    onFilesSelected: handleMediaSelected,
    maxFiles: maxMediaItems - postData.mediaItems.length,
    allowedTypes: ['image', 'video', 'audio', 'document']
  })

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [postData.content])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isSubmitting && !isOverLimit && (postData.content.trim() || postData.mediaItems.length > 0)) {
          // We'll handle the submit logic inline to avoid circular dependencies
          // The actual submit logic will be handled by the submit button click
          const submitButton = document.querySelector('[data-submit-post]') as HTMLButtonElement
          if (submitButton && !submitButton.disabled) {
            submitButton.click()
          }
        }
      }
      
      // Cmd/Ctrl + K to focus textarea
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, isOverLimit, postData.content, postData.mediaItems.length])

  // Handle content change
  const handleContentChange = useCallback((content: string) => {
    setPostData(prev => ({ ...prev, content }))
    
    // Auto-extract hashtags from content
    const hashtagMatches = content.match(/#[a-zA-Z0-9_]+/g)
    const extractedHashtags = hashtagMatches?.map(tag => tag.substring(1).toLowerCase()) || []
    
    // Merge with existing hashtags, avoiding duplicates
    const allHashtags = [...new Set([...postData.hashtags, ...extractedHashtags])]
    setPostData(prev => ({ ...prev, hashtags: allHashtags }))
  }, [postData.hashtags])

  // Add hashtag
  const addHashtag = useCallback((tag: string) => {
    const cleanTag = tag.replace('#', '').trim().toLowerCase()
    if (cleanTag && !postData.hashtags.includes(cleanTag)) {
      setPostData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, cleanTag]
      }))
    }
    setHashtagInput('')
  }, [postData.hashtags])

  // Remove hashtag
  const removeHashtag = useCallback((tag: string) => {
    setPostData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }))
  }, [])

  // Handle hashtag input
  const handleHashtagKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addHashtag(hashtagInput)
    }
  }, [hashtagInput, addHashtag])

  // Remove media item
  const removeMediaItem = useCallback((id: string) => {
    setPostData(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.filter(item => item.id !== id)
    }))
  }, [])

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const mediaFiles: MediaFile[] = Array.from(files).map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        file,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' : 'document',
        fileSize: file.size,
        altText: file.name
      }))
      handleMediaSelected(mediaFiles)
    }
    // Reset input
    e.target.value = ''
  }, [])

  // Submit post
  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to create posts')
      return
    }

    if (!postData.content.trim() && postData.mediaItems.length === 0) {
      toast.error('Please add some content or media to your post')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload media files if any
      let uploadedMediaUrls: string[] = []
      
      if (postData.mediaItems.length > 0) {
        // For now, we'll simulate upload by creating object URLs
        // In production, you'd upload to your server/storage
        uploadedMediaUrls = postData.mediaItems.map(item => 
          item.url || URL.createObjectURL(item.file)
        )
      }

      // Create post
      const postPayload = {
        content: postData.content.trim() || (postData.mediaItems.length > 0 ? 'Shared media' : ''),
        type: postData.mediaItems.length > 0 ? 'media' : 'text',
        visibility: postData.visibility,
        location: postData.location || null,
        hashtags: postData.hashtags,
        media_urls: uploadedMediaUrls,
        scheduled_for: postData.scheduledFor?.toISOString(),
        allow_comments: postData.allowComments,
        allow_sharing: postData.allowSharing,
        route_context: '/artist/feed',
        posted_as: 'artist'
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        credentials: 'include',
        body: JSON.stringify(postPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const result = await response.json()

      // Reset form
      setPostData({
        content: '',
        visibility: defaultVisibility,
        location: '',
        hashtags: [],
        mediaItems: [],
        allowComments: true,
        allowSharing: true
      })
      setHashtagInput('')
      setIsExpanded(false)
      setShowMediaUpload(false)

      toast.success(postData.scheduledFor ? 'Post scheduled successfully' : 'Post created successfully')
      onPostCreated?.(result.post || result.data)

    } catch (error) {
      console.error('Error creating post:', error)
      console.error('Post data that failed:', postData)
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }, [user, postData, defaultVisibility, onPostCreated])



  // Visibility icons
  const visibilityIcons = {
    public: <Globe className="h-4 w-4" />,
    followers: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        'bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg transition-all duration-300',
        isDragOver && 'border-purple-500/50 bg-purple-500/10',
        className
      )}>
        <CardContent className="p-6">
          {/* User header */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user ? (user as any).avatar_url || (user as any).avatar : undefined} />
              <AvatarFallback className="bg-purple-600 text-white font-medium">
                {(user as any)?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="font-medium text-white mb-1">
                {(user as any)?.username || 'User'}
              </div>
              <div className="text-sm text-gray-400">
                {postData.scheduledFor ? 'Scheduled post' : 'Create a post'}
              </div>
            </div>
          </div>

          {/* Main content area with drag and drop */}
          <DragDropIndicator
            isDragOver={isDragOver}
            isDragValid={isDragValid}
            errorMessage={errorMessage}
            allowedTypes={['image', 'video', 'audio', 'document']}
            className="transition-all duration-300"
          >
            <div {...dragHandlers}>
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                placeholder={placeholder}
                value={postData.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className={cn(
                  'min-h-[120px] resize-none border-slate-700 bg-slate-800/50 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300',
                  isDragOver && 'border-purple-500/50 bg-purple-500/10'
                )}
                maxLength={maxCharacters}
              />
            </div>
          </DragDropIndicator>

          {/* Character count */}
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className={cn(
              'text-gray-400',
              isOverLimit && 'text-red-400'
            )}>
              {characterCount}/{maxCharacters} characters
            </span>
            
            {isOverLimit && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Over limit
              </span>
            )}
          </div>

          {/* Media previews */}
          {postData.mediaItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">
                  Media ({postData.mediaItems.length}/{maxMediaItems})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPostData(prev => ({ ...prev, mediaItems: [] }))}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {postData.mediaItems.map((mediaItem) => (
                  <MediaPreview
                    key={mediaItem.id}
                    id={mediaItem.id}
                    type={mediaItem.type}
                    url={mediaItem.url || URL.createObjectURL(mediaItem.file)}
                    thumbnailUrl={mediaItem.thumbnailUrl}
                    altText={mediaItem.altText}
                    title={mediaItem.file.name}
                    duration={mediaItem.duration}
                    fileSize={mediaItem.fileSize}
                    metadata={mediaItem.metadata}
                    onRemove={removeMediaItem}
                    showControls={true}
                    maxHeight={150}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Hashtags */}
          {postData.hashtags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div className="flex flex-wrap gap-2">
                {postData.hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  >
                    #{tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHashtag(tag)}
                      className="h-auto p-0 ml-1 text-purple-400 hover:text-purple-300"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Hashtag input */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Add hashtags..."
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyPress}
                className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addHashtag(hashtagInput)}
                disabled={!hashtagInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errorMessage}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto h-auto p-1 text-red-400 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              {/* Media upload button */}
              {postData.mediaItems.length < maxMediaItems && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
              )}

              {/* Advanced options toggle */}
              {showAdvancedOptions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {isExpanded ? 'Hide' : 'Show'} options
                </Button>
              )}

              {/* Schedule button */}
              {!postData.scheduledFor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleDialog(true)}
                  className="text-gray-400 hover:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Visibility selector */}
              <Select
                value={postData.visibility}
                onValueChange={(value: 'public' | 'followers' | 'private') => 
                  setPostData(prev => ({ ...prev, visibility: value }))
                }
              >
                <SelectTrigger className="w-auto bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="public" className="text-white">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.public}
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="followers" className="text-white">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.followers}
                      Followers only
                    </div>
                  </SelectItem>
                  <SelectItem value="private" className="text-white">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.private}
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Post button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSubmit}
                    data-submit-post
                    disabled={isSubmitting || isOverLimit || (!postData.content.trim() && postData.mediaItems.length === 0)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {postData.scheduledFor ? 'Scheduling...' : 'Posting...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {postData.scheduledFor ? 'Schedule Post' : 'Post'}
                      </>
                    )}
                    <span className="ml-2 text-xs opacity-70">⌘↵</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Press ⌘+Enter to post quickly</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Advanced options */}
          <AnimatePresence>
            {isExpanded && showAdvancedOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-slate-700 space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </label>
                    <Input
                      placeholder="Where are you?"
                      value={postData.location}
                      onChange={(e) => setPostData(prev => ({ ...prev, location: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Post options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Post Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={postData.allowComments}
                        onChange={(e) => setPostData(prev => ({ ...prev, allowComments: e.target.checked }))}
                        className="rounded border-slate-600 bg-slate-800"
                      />
                      Allow comments
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={postData.allowSharing}
                        onChange={(e) => setPostData(prev => ({ ...prev, allowSharing: e.target.checked }))}
                        className="rounded border-slate-600 bg-slate-800"
                      />
                      Allow sharing
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Schedule dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-900 border-slate-700 w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-white mb-4">Schedule Post</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Date</label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Time</label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowScheduleDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (scheduledDate && scheduledTime) {
                        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
                        if (scheduledDateTime > new Date()) {
                          setPostData(prev => ({ ...prev, scheduledFor: scheduledDateTime }))
                          setShowScheduleDialog(false)
                          toast.success('Post scheduled successfully')
                        } else {
                          toast.error('Scheduled time must be in the future')
                        }
                      }
                    }}
                    disabled={!scheduledDate || !scheduledTime}
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </TooltipProvider>
  )
} 