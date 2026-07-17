"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { Send, Users, Loader2 } from 'lucide-react'
import { uploadFeedPhotos } from '@/lib/utils/feed-photo-upload'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'
import { dashboardCreatePattern } from '@/components/dashboard/dashboard-create-pattern'

const DASHBOARD_POST_VISIBILITY = 'followers'

export function QuickPostCreator() {
  const { user } = useAuth()
  const { actingHeaders, isActingReady } = useActingContext()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 })
  const { toast } = useToast()
  const isPostEmpty = !content.trim() && selectedFiles.length === 0
  const isSubmitDisabled = isSubmitting || isUploadingMedia || !isActingReady || isPostEmpty

  const handlePhotosSelected = (files: File[]) => {
    setSelectedFiles(files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user?.id) {
      toast({
        title: 'Sign in required',
        description: 'You must be signed in to post.',
        variant: 'destructive'
      })
      return
    }

    if (!isActingReady) {
      toast({
        title: 'Posting account loading',
        description: 'Please wait a moment for your posting account to finish loading.',
        variant: 'destructive'
      })
      return
    }

    if (!content.trim() && selectedFiles.length === 0) {
      toast({
        title: "Content Required",
        description: "Please write something or add photos to post!",
        variant: "destructive"
      })
      return
    }

    if (content.length > 2000) {
      toast({
        title: "Content Too Long",
        description: "Posts must be under 2000 characters.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      let mediaUrls: string[] = []
      
      // Upload photos if any
      if (selectedFiles.length > 0) {
        setIsUploadingMedia(true)
        
        // Get current user ID from auth context
        if (!user?.id) {
          throw new Error('User not authenticated')
        }
        const userId = user.id
        
        const uploadResult = await uploadFeedPhotos(
          selectedFiles,
          userId,
          (completed, total) => {
            setUploadProgress({ completed, total })
          }
        )
        
        if (uploadResult.success) {
          mediaUrls = uploadResult.urls
        } else {
          throw new Error(`Photo upload failed: ${uploadResult.errors.join(', ')}`)
        }
        
        setIsUploadingMedia(false)
      }

      const payload = {
        content: content.trim(),
        type: mediaUrls.length > 0 ? 'media' : 'text',
        visibility: DASHBOARD_POST_VISIBILITY,
        media_urls: mediaUrls
      }

      console.log('[QuickPostCreator] POST /api/feed/posts payload (sanitized):', {
        contentLength: payload.content.length,
        type: payload.type,
        visibility: payload.visibility,
        mediaUrlsCount: payload.media_urls.length
      })

      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to create post')
      }

      const data = await response.json()
      const created = data?.data || data?.post

      toast({
        title: "Post shared with friends",
        description: mediaUrls.length > 0 
          ? `Your post with ${mediaUrls.length} photo(s) is visible to your friends.`
          : "Your post is visible to your friends.",
        className: "bg-green-500 text-white"
      })
      
      setContent('')
      setSelectedFiles([])

      // Notify dashboard surfaces to refresh without a full page reload.
      window.dispatchEvent(
        new CustomEvent('dashboard:post-created', { detail: created ?? null })
      )
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Failed to Create Post",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
      setIsUploadingMedia(false)
    }
  }


  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950/45 shadow-2xl shadow-purple-950/10 backdrop-blur-xl">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PostingAccountSelector className="border-white/10 bg-white/[0.04]" />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening? Share your thoughts..."
            className={`${dashboardCreatePattern.input} min-h-[128px] resize-none border-white/10 bg-black/30 px-4 py-4 text-[15px] leading-relaxed shadow-inner shadow-black/20 placeholder:text-slate-500`}
            rows={3}
            disabled={isSubmitting || isUploadingMedia}
            maxLength={2000}
          />

          {/* Photo Upload Section */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <PhotoUpload
              onPhotosSelected={handlePhotosSelected}
              maxFiles={5}
              maxSize={5}
              disabled={isSubmitting || isUploadingMedia || !isActingReady}
              showPreview={true}
              className="[&_button]:rounded-xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/[0.04] [&_button]:text-slate-300 [&_button:hover]:bg-purple-500/15 [&_button:hover]:text-purple-200"
            />
            
            {isUploadingMedia && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-sm text-purple-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {uploadProgress.completed}/{uploadProgress.total}...
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-100 shadow-inner shadow-white/5">
              <Users className="h-4 w-4 text-purple-200" />
              <span>Friends</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="min-w-[66px] text-right text-sm tabular-nums text-slate-400">
                {content.length}/2000
              </span>
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className={`${dashboardCreatePattern.btnPrimary} min-w-[104px] px-5 shadow-lg shadow-purple-950/25 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isSubmitting || isUploadingMedia ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isUploadingMedia ? 'Uploading...' : 'Posting...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 
