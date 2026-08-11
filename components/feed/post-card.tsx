'use client'

import { useState } from 'react'
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
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import type { ExtendedPost as BaseExtendedPost } from '@/lib/services/feed.service'
import { getAccountAuthor, getAccountAuthorPath } from '@/lib/accounts/account-author'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
import Link from 'next/link'
import { PollVoteCard } from '@/components/polls/poll-vote-card'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import { toast } from 'sonner'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import {
  buildFeedMusicTrackFromPost,
  isMusicFeedPost,
  type FeedTrackPreview,
} from '@/lib/feed/music-post-preview'
import { FeedMediaGrid, normalizeMediaData } from '@/utils/media-utils'
import { resolvePostAppearanceDTO } from '@/lib/feed/resolve-post-appearance-dto'
import { StyledPostRoot } from '@/components/posts/appearance/styled-post-root'
import { setPostLike, sharePostExternally } from '@/lib/feed/post-engagement-client'

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
  onDelete?: (postId: string) => Promise<void> | void
  enablePostStyles?: boolean
}

function getProfileUrl(post: ExtendedPost) {
  const contextPath = post.profiles?.account_context?.profile_path
  if (contextPath) return contextPath

  const author = getAccountAuthor(post)
  return getAccountAuthorPath(author) || `/profile/${author.username || 'user'}`
}

export function PostCard({ post, onCommentClick, onShareClick, onDelete, enablePostStyles }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [sharesCount, setSharesCount] = useState(post.shares_count)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { user } = useAuth()

  const isLongContent = post.content.length > 300
  const musicTrack = isMusicFeedPost(post) ? buildFeedMusicTrackFromPost(post) : null
  const isOwner = Boolean(user?.id && user.id === post.user_id)

  const appearanceDTO = enablePostStyles
    ? resolvePostAppearanceDTO(post.appearance ?? null, post.id)
    : { mode: 'standard' as const }

  const handleLike = async () => {
    if (!user) return

    const wasLiked = isLiked
    const newCount = wasLiked ? likesCount - 1 : likesCount + 1

    // Optimistic update
    setIsLiked(!wasLiked)
    setLikesCount(newCount)

    try {
      const result = await setPostLike(post.id, wasLiked ? 'unlike' : 'like')
      setIsLiked(result.is_liked)
      setLikesCount(result.likes_count)
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

  const handleCopyLink = async () => {
    try {
      const result = await sharePostExternally(post.id, { preferNative: false })
      setSharesCount(result.shares_count)
      onShareClick?.()
      toast.success('Post link copied and share saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share post')
    }
  }

  const handleDelete = async () => {
    if (!isOwner) return
    setIsDeleting(true)
    try {
      await onDelete?.(post.id)
      setIsDeleteOpen(false)
      toast.success('Post deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
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

    return <FeedMediaGrid mediaItems={normalizeMediaData(post)} postId={post.id} />
  }

  // --- Styled path (appearance.mode === "styled" + enablePostStyles) ---
  if (appearanceDTO.mode === 'styled') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StyledPostRoot postId={post.id} appearance={appearanceDTO} surface="feed">
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
                  <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuItem className="text-slate-300 hover:text-white" onSelect={() => void handleCopyLink()}>
                        Copy link
                      </DropdownMenuItem>
                      {isOwner && (
                        <DropdownMenuItem
                          className="text-red-400 hover:text-red-300"
                          onSelect={(event) => {
                            event.preventDefault()
                            setIsMenuOpen(false)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete post
                        </DropdownMenuItem>
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
                      onShare={() => void handleCopyLink()}
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
                  {sharesCount > 0 && (
                    <span>{sharesCount} {sharesCount === 1 ? 'share' : 'shares'}</span>
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
                      onClick={() => void handleCopyLink()}
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
          </StyledPostRoot>
        </motion.div>
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="border-slate-700 bg-slate-900 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete post?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This removes the post from your feed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleDelete()
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // --- Standard path (existing rendering, unchanged) ---
  return (
    <>
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
            
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <DropdownMenuItem className="text-slate-300 hover:text-white" onSelect={() => void handleCopyLink()}>
                  Copy link
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300"
                    onSelect={(event) => {
                      event.preventDefault()
                      setIsMenuOpen(false)
                      setIsDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
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
                onShare={() => void handleCopyLink()}
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
            {sharesCount > 0 && (
              <span>{sharesCount} {sharesCount === 1 ? 'share' : 'shares'}</span>
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
                onClick={() => void handleCopyLink()}
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
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="border-slate-700 bg-slate-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This removes the post from your feed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
