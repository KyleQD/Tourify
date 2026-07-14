'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Smile,
  Calendar,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { MediaUpload } from '@/components/ui/media-upload'
import { MediaPreview } from '@/components/ui/media-preview'
import { MediaPlayer } from '@/components/ui/media-player'
import { 
  useMediaUpload, 
  MediaFile,
  MediaType,
  formatFileSize,
  formatDuration
} from '@/lib/utils/enhanced-media-upload'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RobustPostCreatorProps {
  onPostCreated?: (post: any) => void
  placeholder?: string
  maxMediaItems?: number
  className?: string
  defaultVisibility?: 'public' | 'followers' | 'private'
  showAdvancedOptions?: boolean
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

export function RobustPostCreator({
  onPostCreated,
  placeholder = "What's happening in your tour life?",
  maxMediaItems = 10,
  className,
  defaultVisibility = 'public',
  showAdvancedOptions = true
}: RobustPostCreatorProps) {
  const { user } = useAuth()
  const { actingHeaders } = useActingContext()
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
  const [activeTab, setActiveTab] = useState('post')
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { uploadFiles } = useMediaUpload()

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [postData.content])

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

  // Handle media selection
  const handleMediaSelected = useCallback((mediaFiles: MediaFile[]) => {
    setPostData(prev => ({ ...prev, mediaItems: mediaFiles }))
  }, [])

  // Handle media upload
  const handleMediaUploaded = useCallback((uploadedMedia: any[]) => {
    console.log('Media uploaded:', uploadedMedia)
    toast.success(`${uploadedMedia.length} media item(s) uploaded successfully`)
  }, [])

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

  // Schedule post
  const handleSchedulePost = useCallback(() => {
    if (!scheduledDate || !scheduledTime) return
    
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    if (scheduledDateTime <= new Date()) {
      toast.error('Scheduled time must be in the future')
      return
    }
    
    setPostData(prev => ({ ...prev, scheduledFor: scheduledDateTime }))
    setShowScheduleDialog(false)
    toast.success('Post scheduled successfully')
  }, [scheduledDate, scheduledTime])

  // Remove scheduled post
  const removeScheduledPost = useCallback(() => {
    setPostData(prev => ({ ...prev, scheduledFor: undefined }))
    toast.success('Post scheduling removed')
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
        const uploadResult = await uploadFiles({
          userId: user.id,
          mediaFiles: postData.mediaItems,
          onProgress: (progress) => {
            console.log('Upload progress:', progress)
          },
          onFileProgress: (fileId, progress) => {
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
          }
        })

        if (uploadResult.success && uploadResult.mediaItems) {
          uploadedMediaUrls = uploadResult.mediaItems.map(item => item.url)
          toast.success('Media uploaded successfully')
        } else {
          throw new Error(uploadResult.error || 'Media upload failed')
        }
      }

      // Create post
      const postPayload = {
        content: postData.content.trim(),
        type: postData.mediaItems.length > 0 ? 'media' : 'text',
        visibility: postData.visibility,
        location: postData.location || null,
        hashtags: postData.hashtags,
        media_urls: uploadedMediaUrls,
        scheduled_for: postData.scheduledFor?.toISOString(),
        allow_comments: postData.allowComments,
        allow_sharing: postData.allowSharing
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
      setUploadProgress({})
      setUploadErrors({})

      toast.success(postData.scheduledFor ? 'Post scheduled successfully' : 'Post created successfully')
      onPostCreated?.(result.data)

    } catch (error) {
      console.error('Error creating post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }, [user, postData, uploadFiles, defaultVisibility, onPostCreated])

  // Visibility icons
  const visibilityIcons = {
    public: <Globe className="h-4 w-4" />,
    followers: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  }

  // Character count
  const characterCount = postData.content.length
  const maxCharacters = 280
  const isOverLimit = characterCount > maxCharacters

  return (
    <Card className={cn('bg-slate-900 border-slate-700 shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-purple-600 text-white">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="font-medium text-white">{user?.user_metadata?.username || user?.email || 'User'}</div>
            <div className="text-sm text-gray-400">
              {postData.scheduledFor ? 'Scheduled post' : 'Create a post'}
            </div>
          </div>

          {postData.scheduledFor && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
              <Clock className="h-3 w-3 mr-1" />
              Scheduled
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <PostingAccountSelector className="border-slate-700/50 bg-slate-900/30" />
        {/* Main content area */}
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={postData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[100px] resize-none border-slate-700 bg-slate-800 text-white placeholder:text-gray-400"
            maxLength={maxCharacters}
          />

          {/* Character count */}
          <div className="flex justify-between items-center text-xs">
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
        </div>

        {/* Media upload */}
        {postData.mediaItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Media ({postData.mediaItems.length}/{maxMediaItems})</h4>
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
                  onRemove={(id) => {
                    setPostData(prev => ({
                      ...prev,
                      mediaItems: prev.mediaItems.filter(item => item.id !== id)
                    }))
                  }}
                  showControls={true}
                  maxHeight={200}
                />
              ))}
            </div>
          </div>
        )}

        {/* Media upload component */}
        {postData.mediaItems.length < maxMediaItems && (
          <MediaUpload
            onMediaSelected={handleMediaSelected}
            onMediaUploaded={handleMediaUploaded}
            maxFiles={maxMediaItems - postData.mediaItems.length}
            allowedTypes={['image', 'video', 'audio', 'document', 'embedded']}
            showPreview={false}
            autoUpload={false}
            userId={user?.id}
          />
        )}

        {/* Hashtags */}
        {postData.hashtags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Hashtags</h4>
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
          </div>
        )}

        {/* Hashtag input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Add hashtags..."
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKeyPress}
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
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

        {/* Advanced options */}
        {showAdvancedOptions && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                <Separator className="bg-slate-700" />
                
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
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
                    />
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Visibility</label>
                    <Select
                      value={postData.visibility}
                      onValueChange={(value: 'public' | 'followers' | 'private') => 
                        setPostData(prev => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="h-4 w-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} options
            </Button>

            {!postData.scheduledFor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScheduleDialog(true)}
                className="text-gray-400 hover:text-white"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {postData.scheduledFor && (
              <Button
                variant="outline"
                size="sm"
                onClick={removeScheduledPost}
                className="text-orange-400 border-orange-500/50 hover:bg-orange-500/20"
              >
                <X className="h-4 w-4 mr-1" />
                Remove schedule
              </Button>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isOverLimit || (!postData.content.trim() && postData.mediaItems.length === 0)}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
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
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Schedule dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-900 border-slate-700 w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-medium text-white">Schedule Post</h3>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  onClick={handleSchedulePost}
                  disabled={!scheduledDate || !scheduledTime}
                >
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
} 
