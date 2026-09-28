'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
  MapPin, 
  Send,
  X,
  Globe,
  Users,
  Lock,
  Plus,
  AlertCircle,
  Loader2,
  Calendar,
  Settings,
  BarChart3,
  Palette,
} from 'lucide-react'
import { MediaPreview } from '@/components/ui/media-preview'
import { DragDropIndicator } from '@/components/ui/drag-drop-indicator'
import { 
  MediaFile,
  uploadMediaFiles,
} from '@/lib/utils/enhanced-media-upload'
import { useDragAndDrop } from '@/hooks/use-drag-and-drop'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AppearancePreviewColors } from '@/components/posts/appearance/appearance-editor'
import type { PostAppearanceInput } from '@/lib/appearance/contracts'
import { PollOptionEditor } from '@/components/polls/poll-option-editor'
import type { PollDuration } from '@/lib/polls/poll-duration'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ARTIST_CARD,
  ARTIST_GHOST_CHIP,
  ARTIST_INPUT,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
  ARTIST_SECONDARY_BTN,
  ARTIST_TEXTAREA,
} from '@/components/dashboard/artist-tokens'

const AppearanceEditor = dynamic(
  () => import('@/components/posts/appearance/appearance-editor').then((module) => module.AppearanceEditor),
  {
    ssr: false,
    loading: () => <div className="py-12 text-center text-sm text-slate-400">Loading Style Studio…</div>,
  },
)

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
  const { actingAccount, actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const user = propUser || authUser
  const [postData, setPostData] = useState<PostData>({
    content: '',
    visibility: defaultVisibility,
    location: '',
    hashtags: [],
    mediaItems: [],
    allowComments: true,
    allowSharing: true,
  })
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const [isPollMode, setIsPollMode] = useState(false)
  const [appearanceInput, setAppearanceInput] = useState<PostAppearanceInput | null>(null)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [previewColors, setPreviewColors] = useState<AppearancePreviewColors | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollDuration, setPollDuration] = useState<PollDuration>('7d')

  useEffect(() => {
    setAppearanceInput(null)
    setPreviewColors(null)
    setShowStylePanel(false)
  }, [actingContextKey])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Character count and limit calculations
  const characterCount = postData.content.length
  const maxCharacters = 280
  const isOverLimit = characterCount > maxCharacters
  const isUploadingMedia = isSubmitting && uploadProgress > 0 && uploadProgress < 100

  function isFeedMediaFile(file: File) {
    return file.type.startsWith('image/') || file.type.startsWith('video/')
  }

  // Handle media selection
  const handleMediaSelected = useCallback((files: MediaFile[]) => {
    const acceptedFiles = files.filter((item) => item.type === 'image' || item.type === 'video')
    const rejectedCount = files.length - acceptedFiles.length
    const remainingSlots = Math.max(0, maxMediaItems - postData.mediaItems.length)

    if (rejectedCount > 0) {
      toast.error('Only photos and videos can be attached to feed posts right now')
    }

    if (acceptedFiles.length === 0 || remainingSlots === 0) return

    const selectedFiles = acceptedFiles.slice(0, remainingSlots)
    const updatedMediaItems = [...postData.mediaItems, ...selectedFiles]
    setPostData(prev => ({ ...prev, mediaItems: updatedMediaItems }))
    setShowMediaUpload(false)
    
    toast.success(`${selectedFiles.length} file(s) added to post`)
  }, [maxMediaItems, postData.mediaItems])

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
    allowedTypes: ['image', 'video']
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
      const incomingFiles = Array.from(files)
      const rejectedCount = incomingFiles.filter((file) => !isFeedMediaFile(file)).length
      if (rejectedCount > 0) {
        toast.error('Only photos and videos can be attached to feed posts right now')
      }

      const mediaFiles: MediaFile[] = incomingFiles.filter(isFeedMediaFile).map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        file,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        fileSize: file.size,
        altText: file.name
      }))
      handleMediaSelected(mediaFiles)
    }
    // Reset input
    e.target.value = ''
  }, [handleMediaSelected])

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

    if (isPollMode) {
      const validOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
      if (validOptions.length < 2) {
        toast.error('Add at least two poll options')
        return
      }
    }

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      let uploadedMediaUrls: string[] = []
      
      if (!isPollMode && postData.mediaItems.length > 0) {
        const upload = await uploadMediaFiles({
          userId: user.id,
          mediaFiles: postData.mediaItems,
          onProgress: setUploadProgress,
        })

        if (!upload.success || !upload.mediaItems?.length) {
          throw new Error(upload.error || 'Failed to upload media')
        }

        uploadedMediaUrls = upload.mediaItems.map((item) => item.url)
      }

      const postPayload: Record<string, unknown> = {
        appearance: appearanceInput ?? { mode: "standard" },
        content: postData.content.trim() || (postData.mediaItems.length > 0 ? 'Shared media' : ''),
        type: isPollMode ? 'poll' : (postData.mediaItems.length > 0 ? 'media' : 'text'),
        visibility: isPollMode
          ? (postData.visibility === 'public' ? 'followers' : postData.visibility)
          : postData.visibility,
        location: postData.location || null,
        hashtags: postData.hashtags,
        media_urls: uploadedMediaUrls,
        scheduled_for: postData.scheduledFor?.toISOString(),
        allow_comments: postData.allowComments,
        allow_sharing: postData.allowSharing,
      }

      if (isPollMode) {
        postPayload.poll_options = pollOptions
        postPayload.poll_duration = pollDuration
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
        // Guard against non-JSON error responses (e.g. Next.js HTML 500 pages)
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to create post (${response.status})`)
        }
        const rawText = await response.text()
        console.error('[CleanPostCreator] Non-JSON error response:', response.status, rawText.slice(0, 300))
        throw new Error(`Server error (${response.status}) — check console for details`)
      }

      const result = await response.json()

      setPostData({
        content: '',
        visibility: defaultVisibility,
        location: '',
        hashtags: [],
        mediaItems: [],
        allowComments: true,
        allowSharing: true,
      })
      setIsExpanded(false)
      setShowMediaUpload(false)
      setIsPollMode(false)
      setAppearanceInput(null)
      setPreviewColors(null)
      setShowStylePanel(false)
      setUploadProgress(0)
      setPollOptions(['', ''])
      setPollDuration('7d')

      toast.success(isPollMode ? 'Poll created successfully' : (postData.scheduledFor ? 'Post scheduled successfully' : 'Post created successfully'))
      onPostCreated?.(result.post || result.data)

    } catch (error) {
      console.error('Error creating post:', error)
      console.error('Post data that failed:', postData)
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }, [user, postData, defaultVisibility, onPostCreated, actingHeaders, isPollMode, pollOptions, pollDuration, appearanceInput])



  // Visibility icons
  const visibilityIcons = {
    public: <Globe className="h-4 w-4" />,
    followers: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        ARTIST_CARD,
        'transition-all duration-300',
        isDragOver && 'border-purple-400/40 shadow-[0_0_28px_-10px_rgba(168,85,247,0.55)]',
        className
      )}>
        <CardContent className="p-5 sm:p-6">
          {/* Live style preview wrapper — colors animate when a style is selected */}
          <div
            data-composer-preview={previewColors ? previewColors.skinId : undefined}
            style={previewColors ? {
              backgroundColor: previewColors.bg,
              color: previewColors.text,
              borderColor: previewColors.border,
              borderWidth: '2px',
              borderStyle: 'solid',
              borderRadius: '1rem',
              padding: '16px',
              marginBottom: '4px',
              transition: 'background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease',
            } : {
              transition: 'background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease',
            }}
          >
            {/* Style active label */}
            {previewColors && (
              <div
                className="flex items-center gap-1.5 mb-3 text-xs font-medium opacity-75"
                style={{ color: previewColors.accent }}
              >
                <Palette className="h-3 w-3" />
                <span className="capitalize">{previewColors.skinId} style — live preview</span>
              </div>
            )}

            {/* User header */}
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-12 w-12 ring-2 ring-purple-500/25">
                <AvatarImage src={user ? (user as any).avatar_url || (user as any).avatar : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium">
                  {(user as any)?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div
                  className="font-semibold mb-0.5"
                  style={previewColors ? { color: previewColors.text } : undefined}
                >
                  {(user as any)?.username || 'User'}
                </div>
                <div
                  className="text-sm"
                  style={previewColors ? { color: previewColors.text, opacity: 0.6 } : { color: undefined }}
                >
                  {postData.scheduledFor ? 'Scheduled post' : isPollMode ? 'Create a poll' : 'Create a post'}
                </div>
              </div>
            </div>

            {/* Main content area with drag and drop */}
            <DragDropIndicator
              isDragOver={isDragOver}
              isDragValid={isDragValid}
              errorMessage={errorMessage}
              allowedTypes={['image', 'video']}
              className="transition-all duration-300"
            >
              <div {...dragHandlers}>
                <Textarea
                  ref={textareaRef}
                  placeholder={isPollMode ? 'Ask your followers a question...' : placeholder}
                  value={postData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className={cn(
                    // Strip bg-black/40 when a style preview is active — inline style backgroundColor wins
                    previewColors
                      ? ARTIST_TEXTAREA.replace('bg-black/40', 'bg-transparent')
                      : ARTIST_TEXTAREA,
                    isDragOver && 'border-purple-400/50 bg-purple-500/10'
                  )}
                  style={previewColors ? {
                    backgroundColor: 'transparent',
                    color: previewColors.text,
                    borderColor: previewColors.border,
                  } : undefined}
                  maxLength={maxCharacters}
                />
              </div>
            </DragDropIndicator>
          </div>

          {isPollMode && (
            <PollOptionEditor
              className="mt-4"
              options={pollOptions}
              duration={pollDuration}
              onOptionsChange={setPollOptions}
              onDurationChange={setPollDuration}
            />
          )}

          {/* Character count */}
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className={cn(
              'text-slate-500',
              isOverLimit && 'text-rose-400'
            )}>
              {characterCount}/{maxCharacters} characters
            </span>
            
            {isOverLimit && (
              <span className="text-rose-400 flex items-center gap-1">
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
                <div>
                  <h4 className="text-sm font-medium text-white">
                    Media ({postData.mediaItems.length}/{maxMediaItems})
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">Local previews. Files upload when you post.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPostData(prev => ({ ...prev, mediaItems: [] }))}
                  className={cn(ARTIST_GHOST_CHIP, 'h-8 text-rose-300 hover:text-rose-200')}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {postData.mediaItems.map((mediaItem) => (
                  <div key={mediaItem.id} className="space-y-1.5">
                    <MediaPreview
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
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Local preview</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {isUploadingMedia && (
            <div className="mt-4 rounded-xl border border-purple-400/25 bg-purple-500/10 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-purple-100">
                <span>Uploading media</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-purple-300 transition-all"
                  style={{ width: `${Math.max(4, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3"
            >
              <div className="flex items-center gap-2 text-rose-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errorMessage}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto h-auto p-1 text-rose-300 hover:text-rose-200"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {postData.mediaItems.length < maxMediaItems && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(ARTIST_GHOST_CHIP, 'h-9 px-3')}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Media
                </Button>
              )}

              {showAdvancedOptions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(ARTIST_GHOST_CHIP, 'h-9 px-3')}
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  {isExpanded ? 'Hide' : 'Show'} options
                </Button>
              )}

              {!postData.scheduledFor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleDialog(true)}
                  className={cn(ARTIST_GHOST_CHIP, 'h-9 px-3')}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Schedule
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStylePanel((prev) => !prev)}
                className={cn(
                  ARTIST_GHOST_CHIP,
                  'h-9 px-3',
                  (showStylePanel || (appearanceInput && appearanceInput.mode !== 'standard')) &&
                    'border-purple-400/40 bg-purple-500/15 text-purple-100 shadow-[0_0_16px_-8px_rgba(168,85,247,0.55)]'
                )}
              >
                <Palette className="h-4 w-4 mr-1.5" />
                Style
                {appearanceInput && appearanceInput.mode === 'profile' && (
                  <span className="ml-1 text-[10px] opacity-70">●</span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPollMode((prev) => !prev)
                  if (!isPollMode && postData.visibility === 'public')
                    setPostData((prev) => ({ ...prev, visibility: 'followers' }))
                }}
                className={cn(
                  ARTIST_GHOST_CHIP,
                  'h-9 px-3',
                  isPollMode && 'border-purple-400/40 bg-purple-500/15 text-purple-100 shadow-[0_0_16px_-8px_rgba(168,85,247,0.55)]'
                )}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Poll
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Select
                value={postData.visibility}
                onValueChange={(value: 'public' | 'followers' | 'private') => 
                  setPostData(prev => ({ ...prev, visibility: value }))
                }
              >
                <SelectTrigger className={cn(ARTIST_OUTLINE_BTN, 'h-10 w-auto min-w-[8.5rem] gap-2 px-3')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100">
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.public}
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.followers}
                      Followers
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      {visibilityIcons.private}
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSubmit}
                    data-submit-post
                    disabled={
                      isSubmitting
                      || !isActingReady
                      || isOverLimit
                      || (!postData.content.trim() && postData.mediaItems.length === 0)
                      || (isPollMode && pollOptions.filter((option) => option.trim()).length < 2)
                    }
                    className={cn(ARTIST_PRIMARY_BTN, 'h-10 px-5')}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isUploadingMedia ? 'Uploading...' : isPollMode ? 'Creating...' : (postData.scheduledFor ? 'Scheduling...' : 'Posting...')}
                      </>
                    ) : !isActingReady ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        {isPollMode ? <BarChart3 className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {isPollMode ? 'Create Poll' : (postData.scheduledFor ? 'Schedule' : 'Post')}
                      </>
                    )}
                    <span className="ml-2 text-[10px] uppercase tracking-wide opacity-80">⌘↵</span>
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
                className="mt-4 space-y-4 overflow-hidden border-t border-white/10 pt-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <MapPin className="h-4 w-4 text-purple-300" />
                      Location
                    </label>
                    <Input
                      placeholder="Where are you?"
                      value={postData.location}
                      onChange={(e) => setPostData(prev => ({ ...prev, location: e.target.value }))}
                      className={ARTIST_INPUT}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Post Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={postData.allowComments}
                        onChange={(e) => setPostData(prev => ({ ...prev, allowComments: e.target.checked }))}
                        className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40"
                      />
                      Allow comments
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={postData.allowSharing}
                        onChange={(e) => setPostData(prev => ({ ...prev, allowSharing: e.target.checked }))}
                        className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40"
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
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </CardContent>
      </Card>

      <Sheet open={showStylePanel} onOpenChange={setShowStylePanel}>
        <SheetContent
          side="right"
          className="h-dvh w-screen max-w-none overflow-y-auto border-white/10 bg-slate-950 p-4 text-white sm:w-[92vw] sm:max-w-6xl sm:p-6"
        >
          <SheetHeader className="mb-6 pr-10">
            <SheetTitle className="text-white">Post Style Studio</SheetTitle>
            <SheetDescription className="text-slate-400">
              Choose a template, tune its post-safe controls, and preview the exact published card.
            </SheetDescription>
          </SheetHeader>
          <AppearanceEditor
            value={appearanceInput}
            onChange={setAppearanceInput}
            onClose={() => setShowStylePanel(false)}
            onPreviewChange={setPreviewColors}
            preview={{
              authorName:
                actingAccount?.profile_data?.display_name ||
                actingAccount?.profile_data?.artist_name ||
                actingAccount?.profile_data?.venue_name ||
                actingAccount?.profile_data?.organization_name ||
                (user as any)?.username ||
                'Your account',
              handle:
                actingAccount?.profile_data?.url_slug ||
                actingAccount?.profile_data?.username ||
                (user as any)?.username ||
                'tourify',
              content: postData.content,
              mediaCount: postData.mediaItems.length,
              pollOptions: isPollMode ? pollOptions : undefined,
            }}
          />
        </SheetContent>
      </Sheet>

      {showScheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className={cn(ARTIST_CARD, 'w-full max-w-md')}>
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Schedule Post</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Date</label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={ARTIST_INPUT}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Time</label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={ARTIST_INPUT}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowScheduleDialog(false)}
                    className={ARTIST_OUTLINE_BTN}
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
                    className={ARTIST_PRIMARY_BTN}
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
