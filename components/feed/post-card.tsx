'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Clock,
  Verified,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useFeed } from '@/hooks/use-feed'
import { useAuth } from '@/hooks/use-auth'
import type { ExtendedPost as BaseExtendedPost } from '@/lib/services/feed.service'
import { getAccountAuthor, getAccountAuthorPath } from '@/lib/accounts/account-author'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
import Link from 'next/link'
import { PollVoteCard } from '@/components/polls/poll-vote-card'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import { toast } from 'sonner'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import {
  buildFeedMusicTrackFromPost,
  isMusicFeedPost,
  type FeedTrackPreview,
} from '@/lib/feed/music-post-preview'

// Extend the base post with optional account/media fields used by the card UI
type ExtendedPost = Omit<BaseExtendedPost, 'profiles'> & {
  media?: any[]
  media_items?: any[]
  poll?: PollPayload | null
  poll_ends_at?: string | null
  poll_total_votes?: number
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
  account_display_name?: string | null
  account_username?: string | null
  account_avatar_url?: string | null
  account_is_verified?: boolean | null
  track_preview?: FeedTrackPreview | null
  metadata?: Record<string, unknown> | null
  profiles: (NonNullable<BaseExtendedPost['profiles']> & {
    id?: string
    account_context?: {
      type?: string
      profile_id?: string
      display_name?: string
      profile_path?: string | null
    }
  }) | null
}

interface PostCardProps {
  post: ExtendedPost
  onCommentClick?: () => void
  onShareClick?: () => void
}

function getProfileUrl(post: ExtendedPost) {
  const contextPath = post.profiles?.account_context?.profile_path
  if (contextPath) return contextPath

  const author = getAccountAuthor(post)
  return getAccountAuthorPath(author) || `/profile/${author.username || 'user'}`
}

export function PostCard({ post, onCommentClick, onShareClick }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const jukebox = useJukeboxOptional()
  const [showFullContent, setShowFullContent] = useState(false)
  const [isMediaPlaying, setIsMediaPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const { likePost, unlikePost } = useFeed()
  const { user } = useAuth()

  const isLongContent = post.content.length > 300
  const musicTrack = isMusicFeedPost(post) ? buildFeedMusicTrackFromPost(post) : null

  const handleLike = async () => {
    if (!user) return

    const wasLiked = isLiked
    const newCount = wasLiked ? likesCount - 1 : likesCount + 1

    // Optimistic update
    setIsLiked(!wasLiked)
    setLikesCount(newCount)

    try {
      const action = wasLiked ? 'unlike' : 'like'
      
      const response = await fetch(`/api/posts/${post.id}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle like')
      }

      console.log('✅ Successfully toggled like')
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked)
      setLikesCount(likesCount)
      console.error('Error toggling like:', error)
    }
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // TODO: Implement bookmark functionality
  }

  const formatContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const hashtagRegex = /#(\w+)/g
    const mentionRegex = /@(\w+)/g

    return content
      .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')
      .replace(hashtagRegex, '<span class="text-blue-400 hover:text-blue-300 cursor-pointer">#$1</span>')
      .replace(mentionRegex, '<span class="text-purple-400 hover:text-purple-300 cursor-pointer">@$1</span>')
  }

  const renderMedia = () => {
    // Music posts render FeedMusicPlayer separately; cover art must not show as an image.
    if (musicTrack) return null

    // Handle multiple possible media data structures
    let mediaItems: any[] = []
    
    if (post.post_media && Array.isArray(post.post_media)) {
      mediaItems = post.post_media
    } else if (post.media_urls && Array.isArray(post.media_urls)) {
      mediaItems = post.media_urls.map((url: string, index: number) => ({
        id: `${post.id}-media-${index}`,
        type: 'image',
        url: url,
        alt_text: `Media ${index + 1}`
      }))
    } else if (post.media && Array.isArray(post.media)) {
      mediaItems = post.media
    } else if (post.media_items && Array.isArray(post.media_items)) {
      mediaItems = post.media_items
    }

    if (!mediaItems || mediaItems.length === 0) return null

    return (
      <div className="mt-4">
        {mediaItems.length === 1 ? (
          // Single image/video - full width
          <div className="relative rounded-xl overflow-hidden">
            {mediaItems[0].type === 'image' || !mediaItems[0].type ? (
              <img
                src={mediaItems[0].url}
                alt={mediaItems[0].alt_text || mediaItems[0].alt || 'Post media'}
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
            ) : mediaItems[0].type === 'video' ? (
              <video
                src={mediaItems[0].url}
                poster={mediaItems[0].thumbnail_url ?? undefined}
                className="w-full h-auto max-h-96 object-cover"
                controls
              />
            ) : mediaItems[0].type === 'audio' ? (
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {post.content?.slice(0, 48) || 'Audio'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-white text-black hover:bg-white/90"
                    onClick={() => {
                      const audioUrl = mediaItems[0]?.url
                      const trackId = mediaItems[0]?.id || `${post.id}-audio`
                      if (!jukebox || !audioUrl) {
                        toast.error('Music player is unavailable')
                        return
                      }
                      const player = jukebox
                      const isCurrent =
                        player.state.currentTrack?.id === trackId && player.state.isPlaying
                      if (isCurrent) {
                        player.pause()
                        return
                      }
                      player.play(
                        {
                          id: String(trackId),
                          title: post.content?.slice(0, 48) || 'Audio',
                          artist_name: post.profiles?.full_name || 'Artist',
                          artist_id: post.profiles?.id || undefined,
                          file_url: audioUrl,
                        },
                        { source: 'feed_post' }
                      )
                    }}
                  >
                    {Boolean(
                      jukebox?.state.currentTrack?.id ===
                        (mediaItems[0]?.id || `${post.id}-audio`) &&
                        jukebox?.state.isPlaying
                    ) ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : mediaItems.length === 2 ? (
          // Two images/videos - side by side
          <div className="grid grid-cols-2 gap-2">
            {mediaItems.slice(0, 2).map((media, index) => (
              <div key={media.id || index} className="relative rounded-xl overflow-hidden">
                {media.type === 'image' || !media.type ? (
                  <img
                    src={media.url}
                    alt={media.alt_text || media.alt || 'Post media'}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : media.type === 'video' ? (
                <video
                  src={media.url}
                    poster={media.thumbnail_url ?? undefined}
                    className="w-full h-48 object-cover"
                    controls
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : mediaItems.length === 3 ? (
          // Three images/videos - 2 on top, 1 on bottom
          <div className="grid grid-cols-2 gap-2">
            <div className="row-span-2">
              {mediaItems[0].type === 'image' || !mediaItems[0].type ? (
                <img
                  src={mediaItems[0].url}
                  alt={mediaItems[0].alt_text || mediaItems[0].alt || 'Post media'}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : mediaItems[0].type === 'video' ? (
                <video
                  src={mediaItems[0].url}
                  poster={mediaItems[0].thumbnail_url ?? undefined}
                  className="w-full h-full object-cover rounded-xl"
                  controls
                />
              ) : null}
            </div>
            <div className="space-y-2">
              {mediaItems.slice(1, 3).map((media, index) => (
                <div key={media.id || index} className="relative rounded-xl overflow-hidden">
                  {media.type === 'image' || !media.type ? (
                    <img
                      src={media.url}
                      alt={media.alt_text || media.alt || 'Post media'}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                  ) : media.type === 'video' ? (
                    <video
                      src={media.url}
                      poster={media.thumbnail_url ?? undefined}
                      className="w-full h-24 object-cover"
                      controls
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Four or more images/videos - 2x2 grid with overlay
          <div className="grid grid-cols-2 gap-2">
            {mediaItems.slice(0, 4).map((media, index) => (
              <div key={media.id || index} className="relative rounded-xl overflow-hidden">
                {media.type === 'image' || !media.type ? (
                  <img
                    src={media.url}
                    alt={media.alt_text || media.alt || 'Post media'}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : media.type === 'video' ? (
                  <video
                    src={media.url}
                    poster={media.thumbnail_url ?? undefined}
                    className="w-full h-48 object-cover"
                    controls
                  />
                ) : null}
                {index === 3 && mediaItems.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      +{mediaItems.length - 4}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-4 overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <Link href={getProfileUrl(post)} className="flex-shrink-0">
                <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200">
                  <AvatarImage src={post.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={getProfileUrl(post)} className="hover:underline">
                    <h4 className="font-semibold text-white">
                      {post.profiles?.full_name || post.profiles?.username}
                    </h4>
                  </Link>
                  {post.profiles?.is_verified && (
                    <Verified className="h-4 w-4 text-blue-400" />
                  )}
                  <Link href={getProfileUrl(post)} className="hover:underline">
                    <span className="text-slate-400">@{post.profiles?.username}</span>
                  </Link>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <DropdownMenuItem className="text-slate-300 hover:text-white">
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 hover:text-white">
                  Report post
                </DropdownMenuItem>
                {user?.id === post.user_id && (
                  <>
                    <DropdownMenuItem className="text-slate-300 hover:text-white">
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 hover:text-red-300">
                      Delete post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Post Content */}
          <div className="mb-4">
            <div
              className="text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatContent(
                  isLongContent && !showFullContent
                    ? post.content.substring(0, 300) + '...'
                    : post.content
                )
              }}
            />
            
            {/* Link Preview for URLs in content */}
            {hasUrls(post.content) && (
              <LinkPreview 
                url={extractUrls(post.content)[0]} 
                className="mt-3"
              />
            )}
            
            {isLongContent && (
              <Button
                variant="link"
                className="p-0 h-auto text-blue-400 hover:text-blue-300"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? 'Show less' : 'Show more'}
              </Button>
            )}

            {post.poll && (
              <PollVoteCard postId={post.id} poll={post.poll} />
            )}
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.hashtags.map((hashtag) => (
                <Badge
                  key={hashtag}
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer"
                >
                  #{hashtag}
                </Badge>
              ))}
            </div>
          )}

          {musicTrack && (
            <div className="mb-4">
              <FeedMusicPlayer
                track={musicTrack}
                compact
                playSource="feed_post"
                onComment={() => onCommentClick?.()}
                onShare={() => onShareClick?.()}
              />
            </div>
          )}

          {/* Media */}
          {renderMedia()}

          <Separator className="my-4 bg-slate-700/50" />

          {/* Engagement Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
            {likesCount > 0 && (
              <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
            )}
            {post.comments_count > 0 && (
              <span>{post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}</span>
            )}
            {post.shares_count > 0 && (
              <span>{post.shares_count} {post.shares_count === 1 ? 'share' : 'shares'}</span>
            )}
            {post.views_count > 0 && (
              <span>{post.views_count} {post.views_count === 1 ? 'view' : 'views'}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`transition-colors ${
                  isLiked
                    ? 'text-red-500 hover:text-red-400'
                    : 'text-slate-400 hover:text-red-400'
                }`}
                onClick={handleLike}
              >
                <Heart
                  className={`h-5 w-5 mr-2 transition-all ${
                    isLiked ? 'fill-current' : ''
                  }`}
                />
                Like
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-blue-400"
                onClick={onCommentClick}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Comment
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-green-400"
                onClick={onShareClick}
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={`transition-colors ${
                isBookmarked
                  ? 'text-yellow-500 hover:text-yellow-400'
                  : 'text-slate-400 hover:text-yellow-400'
              }`}
              onClick={handleBookmark}
            >
              <Bookmark
                className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
