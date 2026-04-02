"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { Send, Globe, Users, Lock, Loader2 } from 'lucide-react'
import { uploadFeedPhotos } from '@/lib/utils/feed-photo-upload'
import { useAuth } from '@/contexts/auth-context'
import { dashboardCreatePattern } from '@/components/dashboard/dashboard-create-pattern'

export function QuickPostCreator() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 })
  const { toast } = useToast()

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
        visibility,
        media_urls: mediaUrls,
        accountId: user.id
      }

      console.log('[QuickPostCreator] POST /api/feed/posts payload (sanitized):', {
        contentLength: payload.content.length,
        type: payload.type,
        visibility: payload.visibility,
        mediaUrlsCount: payload.media_urls.length,
        accountId: payload.accountId
      })

      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const data = await response.json()
      const created = data?.data

      toast({
        title: "Post Created! 🎉",
        description: mediaUrls.length > 0 
          ? `Your post with ${mediaUrls.length} photo(s) has been published!`
          : "Your post has been published successfully.",
        className: "bg-green-500 text-white"
      })
      
      setContent('')
      setSelectedFiles([])
      setVisibility('public')

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


  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'followers':
        return <Users className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <Card className="rounded-2xl border-slate-700/60 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Send className="h-5 w-5 text-purple-400" />
          Quick Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening? Share your thoughts..."
            className={`${dashboardCreatePattern.input} resize-none`}
            rows={3}
            disabled={isSubmitting || isUploadingMedia}
            maxLength={2000}
          />

          {/* Photo Upload Section */}
          <div className="space-y-3">
            <PhotoUpload
              onPhotosSelected={handlePhotosSelected}
              maxFiles={5}
              maxSize={5}
              disabled={isSubmitting || isUploadingMedia}
              showPreview={true}
            />
            
            {isUploadingMedia && (
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {uploadProgress.completed}/{uploadProgress.total}...
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <Select value={visibility} onValueChange={setVisibility} disabled={isSubmitting}>
              <SelectTrigger className={`w-36 ${dashboardCreatePattern.selectTrigger}`}>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(visibility)}
                    <span className="capitalize">{visibility}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="public" className="hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="followers" className="hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Followers
                  </div>
                </SelectItem>
                <SelectItem value="private" className="hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {content.length}/2000
              </span>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingMedia || (!content.trim() && selectedFiles.length === 0)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
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