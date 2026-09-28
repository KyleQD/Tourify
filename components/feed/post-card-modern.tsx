'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  MapPin,
  Globe,
  Users,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { resolvePostAppearanceDTO } from '@/lib/feed/resolve-post-appearance-dto'
import { StyledPostRoot } from '@/components/posts/appearance/styled-post-root'

interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  alt_text?: string
}

interface Post {
  id: string
  content: string
  type: string
  visibility: string
  location?: string
  hashtags: string[]
  media_items?: MediaItem[]
  created_at: string
  user: {
    id: string
    username: string
    avatar_url?: string
  }
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked: boolean
  /**
   * Optional post_appearances snapshot.
   * Populated when the calling context joins post_appearances.
   */
  appearance?: {
    template_id?: string | null
    template_version?: number | null
    schema_version?: number | null
    snapshot_hash?: string | null
    status?: string | null
    snapshot?: unknown
  } | null
}

interface PostCardModernProps {
  post: Post
  onLike: (postId: string) => void
  onComment: (postId: string) => void
  onShare: (postId: string) => void
  className?: string
  /** When true, wraps in StyledPostRoot if a valid appearance snapshot is present. */
  enablePostStyles?: boolean
}

export function PostCardModern({
  post,
  onLike,
  onComment,
  onShare,
  className,
  enablePostStyles = false,
}: PostCardModernProps) {
  const appearanceDTO = enablePostStyles
    ? resolvePostAppearanceDTO(post.appearance ?? null, post.id)
    : { mode: 'standard' as const }
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'followers':
        return <Users className="h-3 w-3" />
      default:
        return <Globe className="h-3 w-3" />
    }
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'media':
        return '📷'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      default:
        return null
    }
  }

  const renderMedia = () => {
    if (!post.media_items || post.media_items.length === 0) return null

    return (
      <div className="mt-4">
        {post.media_items.length === 1 ? (
          // Single image/video - full width
          <div className="relative rounded-xl overflow-hidden">
            {post.media_items[0].type === 'image' ? (
              <img
                src={post.media_items[0].url}
                alt={post.media_items[0].alt_text || "Post media"}
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
            ) : (
              <video
                src={post.media_items[0].url}
                controls
                className="w-full h-auto max-h-96 object-cover"
                poster={post.media_items[0].thumbnail_url}
              />
            )}
          </div>
        ) : post.media_items.length === 2 ? (
          // Two images/videos - side by side
          <div className="grid grid-cols-2 gap-2">
            {post.media_items.slice(0, 2).map((item, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.alt_text || "Post media"}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={item.url}
                    controls
                    className="w-full h-48 object-cover"
                    poster={item.thumbnail_url}
                  />
                )}
              </div>
            ))}
          </div>
        ) : post.media_items.length === 3 ? (
          // Three images/videos - 2 on top, 1 on bottom
          <div className="grid grid-cols-2 gap-2">
            <div className="row-span-2">
              {post.media_items[0].type === 'image' ? (
                <img
                  src={post.media_items[0].url}
                  alt={post.media_items[0].alt_text || "Post media"}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : (
                <video
                  src={post.media_items[0].url}
                  controls
                  className="w-full h-full object-cover rounded-xl"
                  poster={post.media_items[0].thumbnail_url}
                />
              )}
            </div>
            <div className="space-y-2">
              {post.media_items.slice(1, 3).map((item, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.alt_text || "Post media"}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={item.url}
                      controls
                      className="w-full h-24 object-cover"
                      poster={item.thumbnail_url}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Four or more images/videos - 2x2 grid with overlay
          <div className="grid grid-cols-2 gap-2">
            {post.media_items.slice(0, 4).map((item, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.alt_text || "Post media"}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={item.url}
                    controls
                    className="w-full h-48 object-cover"
                    poster={item.thumbnail_url}
                  />
                )}
                {index === 3 && (post.media_items?.length || 0) > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      +{(post.media_items?.length || 0) - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const cardNode = (
    <Card className={cn("bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-purple-500/20 hover:ring-purple-500/40 transition-all duration-200">
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold">
                {post.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white hover:text-purple-300 transition-colors cursor-pointer">
                  {post.user.username}
                </span>
                {post.type !== 'text' && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    {getPostTypeIcon(post.type)}
                    <span className="ml-1 capitalize">{post.type}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  {getVisibilityIcon(post.visibility)}
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </span>
                {post.location && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{post.location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {/* Post content */}
        {post.content && (
          <div className="text-white leading-relaxed text-base mb-4">
            {post.content}
          </div>
        )}

        {/* Media display */}
        {renderMedia()}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 cursor-pointer transition-all duration-200 border-purple-500/30 text-xs font-medium"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Post actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(post.id)}
              className={cn(
                "flex items-center gap-2 transition-all duration-200 hover:bg-slate-800/50 rounded-lg px-3 py-2",
                post.is_liked 
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Heart className={cn("h-5 w-5 transition-transform", post.is_liked && "fill-current scale-110")} />
              <span className="font-medium">{post.likes_count}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment(post.id)}
              className="flex items-center gap-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 rounded-lg px-3 py-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{post.comments_count}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(post.id)}
              className="flex items-center gap-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 rounded-lg px-3 py-2"
            >
              <Share2 className="h-5 w-5" />
              <span className="font-medium">{post.shares_count}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 text-gray-400 text-sm">
            {getVisibilityIcon(post.visibility)}
            <span className="capitalize">{post.visibility}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // --- Styled path (appearance.mode === "styled" + enablePostStyles) ---
  if (appearanceDTO.mode === 'styled') {
    return (
      <StyledPostRoot postId={post.id} appearance={appearanceDTO} surface="feed">
        {cardNode}
      </StyledPostRoot>
    )
  }

  return cardNode
}