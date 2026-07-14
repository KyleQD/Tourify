"use client"

import { format } from "date-fns"
import {
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Send,
  Share2,
  Video,
} from "lucide-react"
import Image from "next/image"
import { useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { EventPost } from "./types"

interface EventPostsTabProps {
  posts: EventPost[]
  canPost: boolean
  userAvatarUrl?: string
  userInitial?: string
  newPostContent: string
  newPostType: "text" | "image" | "video"
  newPostVisibility: "public" | "attendees"
  newMediaUrls: string[]
  isPostingUpdate: boolean
  uploadingMedia: boolean
  onContentChange: (value: string) => void
  onTypeChange: (value: "text" | "image" | "video") => void
  onVisibilityChange: (value: "public" | "attendees") => void
  onRemoveMedia: (index: number) => void
  onMediaUpload: (files: FileList) => void
  onCreatePost: () => void
}

export function EventPostsTab({
  posts,
  canPost,
  userAvatarUrl,
  userInitial,
  newPostContent,
  newPostType,
  newPostVisibility,
  newMediaUrls,
  isPostingUpdate,
  uploadingMedia,
  onContentChange,
  onTypeChange,
  onVisibilityChange,
  onRemoveMedia,
  onMediaUpload,
  onCreatePost,
}: EventPostsTabProps) {
  const { tokens } = useEventSkin()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      {canPost && (
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <MessageSquare className="h-5 w-5 text-purple-300" />
              Create Post
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userAvatarUrl} />
                <AvatarFallback className="bg-purple-500/20 text-purple-300">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  {(
                    [
                      { type: "text" as const, icon: MessageSquare, label: "Text" },
                      { type: "image" as const, icon: ImageIcon, label: "Image" },
                      { type: "video" as const, icon: Video, label: "Video" },
                    ] as const
                  ).map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      variant={newPostType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => onTypeChange(type)}
                      className={
                        newPostType === type
                          ? "rounded-full bg-purple-600 hover:bg-purple-700"
                          : "rounded-full border-white/20 text-white hover:bg-white/10"
                      }
                    >
                      <Icon className="mr-1 h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>

                <Textarea
                  value={newPostContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Share something about this event..."
                  rows={3}
                  className="border-white/20 bg-black/25 text-white placeholder:text-white/45 focus:border-purple-400"
                />

                {newMediaUrls.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {newMediaUrls.map((url, index) => (
                      <div key={url} className="relative h-20 w-20">
                        <Image src={url} alt="Media" fill className="rounded-lg object-cover" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -right-2 -top-2 h-6 w-6 bg-red-500 p-0 hover:bg-red-600"
                          onClick={() => onRemoveMedia(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="rounded-full border-white/20 text-white hover:bg-white/10"
                    >
                      {uploadingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Media
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => e.target.files && onMediaUpload(e.target.files)}
                      className="hidden"
                    />
                    <Select
                      value={newPostVisibility}
                      onValueChange={(value: "public" | "attendees") => onVisibilityChange(value)}
                    >
                      <SelectTrigger className="w-32 rounded-full border-white/20 bg-black/25 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border border-white/20 bg-slate-950/95 backdrop-blur-xl">
                        <SelectItem value="public" className="text-white focus:bg-white/10">
                          Public
                        </SelectItem>
                        <SelectItem value="attendees" className="text-white focus:bg-white/10">
                          Attendees
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={onCreatePost}
                    disabled={!newPostContent.trim() || isPostingUpdate}
                    className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                  >
                    {isPostingUpdate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <Card key={post.id} className={cn(tokens.card, tokens.body)}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.user.avatar_url} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-300">
                      {post.user.full_name?.charAt(0) || post.user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{post.user.full_name}</span>
                      {post.user.is_verified && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-xs text-blue-300">
                          ✓
                        </Badge>
                      )}
                      <span className={'text-sm '}>
                        {format(new Date(post.created_at), "MMM d, h:mm a")}
                      </span>
                      {post.is_announcement && (
                        <Badge className="bg-red-500/20 text-xs text-red-300">Announcement</Badge>
                      )}
                      {post.is_pinned && (
                        <Badge variant="outline" className="border-amber-500/30 text-xs text-amber-300">
                          <Pin className="mr-1 h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mb-4 leading-relaxed text-white/90">{post.content}</p>
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-4 flex gap-2">
                        {post.media_urls.map((url) => (
                          <div key={url} className="relative h-32 w-32">
                            <Image src={url} alt="Post media" fill className="rounded-lg object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <button type="button" className={'flex items-center gap-2  transition-colors hover:text-white'}>
                        <Heart className="h-4 w-4" />
                        <span>{post.likes_count}</span>
                      </button>
                      <button type="button" className={'flex items-center gap-2  transition-colors hover:text-white'}>
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments_count}</span>
                      </button>
                      <button type="button" className={'flex items-center gap-2  transition-colors hover:text-white'}>
                        <Share2 className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className={cn(tokens.card, tokens.body)}>
            <CardContent className="py-12 text-center">
              <div className={cn(tokens.inset, "mx-auto mb-4 flex h-16 w-16 items-center justify-center")}>
                <MessageSquare className="h-8 w-8 text-white/35" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">No posts yet</h3>
              <p className={tokens.muted}>
                {canPost
                  ? "Be the first to share something about this event."
                  : "Posts from event attendees will appear here."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
