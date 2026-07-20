'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  MapPin,
  Users,
  Globe,
  Lock,
  BarChart3,
  Pin,
  Send,
  Loader2,
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
import { cn } from '@/lib/utils'
import {
  ARTIST_CARD_INTERACTIVE,
  ARTIST_INPUT,
  ARTIST_INSET,
  ARTIST_PRIMARY_BTN,
} from '@/components/dashboard/artist-tokens'
import { PollVoteCard } from '@/components/polls/poll-vote-card'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import {
  buildFeedMusicTrackFromPost,
  isMusicFeedPost,
  type FeedTrackPreview,
} from '@/lib/feed/music-post-preview'
import { FeedMediaGrid, normalizeMediaData } from '@/utils/media-utils'

export interface ArtistFeedPost {
  id: string
  content: string
  type: string
  visibility: string
  location?: string | null
  hashtags?: string[]
  tagged_users?: string[]
  collaborators?: ArtistFeedCollaborator[]
  media_items?: ArtistFeedMediaItem[]
  media_urls?: string[]
  metadata?: Record<string, unknown> | null
  track_preview?: FeedTrackPreview | null
  created_at: string
  user: {
    id: string
    username: string
    avatar_url?: string | null
    profile_path?: string | null
  }
  owner_user_id?: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked: boolean
  is_pinned?: boolean
  poll?: PollPayload | null
}

export interface ArtistFeedCollaborator {
  user_id?: string
  profile_id?: string | null
  status?: string
  username?: string
  avatar_url?: string | null
}

interface ArtistFeedMediaItem {
  id?: string
  type?: string
  url: string
  thumbnail_url?: string
  altText?: string
}

interface ArtistPostComment {
  id: string
  content: string
  created_at: string
  profiles?: {
    username?: string
    avatar_url?: string | null
  } | null
}

interface ArtistPostCardProps {
  post: ArtistFeedPost
  currentUserId?: string | null
  showFollow?: boolean
  canPin?: boolean
  interactive?: boolean
  className?: string
  onLike?: (postId: string) => void | Promise<void>
  onShare?: (postId: string) => void | Promise<void>
  onFollow?: (userId: string) => void | Promise<void>
  onPin?: (postId: string, isPinned: boolean) => void | Promise<void>
  onDelete?: (postId: string) => void | Promise<void>
  onLoadComments?: (postId: string) => Promise<ArtistPostComment[]>
  onSubmitComment?: (postId: string, content: string) => Promise<ArtistPostComment | null>
}

function visibilityIcon(visibility: string) {
  if (visibility === 'followers') return <Users className="h-3.5 w-3.5" />
  if (visibility === 'private') return <Lock className="h-3.5 w-3.5" />
  return <Globe className="h-3.5 w-3.5" />
}

export function ArtistPostCard({
  post,
  currentUserId,
  showFollow = false,
  canPin = false,
  interactive = true,
  className,
  onLike,
  onShare,
  onFollow,
  onPin,
  onDelete,
  onLoadComments,
  onSubmitComment,
}: ArtistPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<ArtistPostComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isPinned, setIsPinned] = useState(Boolean(post.is_pinned))
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const mediaItems = normalizeMediaData(post)
  const musicTrack = isMusicFeedPost(post)
    ? buildFeedMusicTrackFromPost({
        ...post,
        profiles: {
          id: post.user.id,
          full_name: post.user.username,
          username: post.user.username,
          avatar_url: post.user.avatar_url,
        },
      })
    : null
  const profileHref = post.user.profile_path || `/artist/${post.user.username}`
  const isOwner = Boolean(
    currentUserId &&
    (currentUserId === post.owner_user_id || currentUserId === post.user.id)
  )

  async function handleLike() {
    if (!interactive || !onLike) return
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikesCount((count) => (wasLiked ? Math.max(0, count - 1) : count + 1))
    try {
      await onLike(post.id)
    } catch {
      setIsLiked(wasLiked)
      setLikesCount((count) => (wasLiked ? count + 1 : Math.max(0, count - 1)))
    }
  }

  async function handleToggleComments() {
    if (!interactive) return
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0 && onLoadComments) {
      setIsLoadingComments(true)
      try {
        const loaded = await onLoadComments(post.id)
        setComments(loaded)
      } finally {
        setIsLoadingComments(false)
      }
    }
  }

  async function handleSubmitComment() {
    if (!interactive || !onSubmitComment || !commentText.trim()) return
    setIsSubmittingComment(true)
    try {
      const created = await onSubmitComment(post.id, commentText.trim())
      if (created) {
        setComments((prev) => [...prev, created])
        setCommentsCount((count) => count + 1)
        setCommentText('')
      }
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handlePin() {
    if (!canPin || !onPin) return
    const next = !isPinned
    setIsPinned(next)
    try {
      await onPin(post.id, next)
    } catch {
      setIsPinned(!next)
    }
  }

  async function handleDelete() {
    if (!interactive || !isOwner || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(post.id)
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(ARTIST_CARD_INTERACTIVE, 'overflow-hidden p-5', className)}
      >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Link href={profileHref} className="shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-purple-500/20 hover:ring-purple-500/40 transition-all">
              <AvatarImage src={post.user.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold">
                {(post.user.username || 'A').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={profileHref} className="font-semibold text-white hover:text-purple-200 transition-colors truncate">
                {post.user.username}
              </Link>
              {Array.isArray(post.collaborators) && post.collaborators.length > 0 && (
                <span className="text-sm text-slate-300 truncate">
                  and{' '}
                  {post.collaborators
                    .map((c) => c.username || 'collaborator')
                    .slice(0, 3)
                    .join(', ')}
                  {post.collaborators.length > 3 ? ` +${post.collaborators.length - 3}` : ''}
                </span>
              )}
              {isPinned && (
                <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {post.type === 'poll' && (
                <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Poll
                </Badge>
              )}
              {Array.isArray(post.collaborators) && post.collaborators.length > 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Collaborative
                </Badge>
              )}
              {showFollow && !isOwner && onFollow && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/15"
                  onClick={() => onFollow(post.user.id)}
                >
                  Follow
                </Button>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              <span className="inline-flex items-center gap-1 capitalize">
                {visibilityIcon(post.visibility)}
                {post.visibility}
              </span>
              {post.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {post.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-white/10 bg-slate-950/95 text-slate-200">
            {canPin && isOwner && (
              <DropdownMenuItem onSelect={() => void handlePin()}>
                <Pin className="h-4 w-4 mr-2" />
                {isPinned ? 'Unpin' : 'Pin post'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onShare?.(post.id)}>
              <Share2 className="h-4 w-4 mr-2" />
              Copy link
            </DropdownMenuItem>
            {isOwner && onDelete && (
              <DropdownMenuItem
                className="text-red-300 focus:text-red-200"
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

      {post.content && post.type !== 'poll' && (
        <p className="mt-4 text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {post.type === 'poll' && post.poll && (
        <PollVoteCard postId={post.id} poll={post.poll} className="mt-4" />
      )}

      {post.type !== 'poll' && post.content && hasUrls(post.content) && (
        <LinkPreview url={extractUrls(post.content)[0]} className="mt-3" />
      )}

      {musicTrack && (
        <div className="mt-4">
          <FeedMusicPlayer
            track={musicTrack}
            compact
            playSource="feed_post"
            onComment={() => void handleToggleComments()}
            onShare={() => onShare?.(post.id)}
          />
        </div>
      )}

      {!musicTrack && mediaItems.length > 0 && (
        <FeedMediaGrid
          mediaItems={mediaItems}
          postId={post.id}
          frameClassName="border border-white/10"
        />
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.hashtags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="border-purple-500/25 bg-purple-500/15 text-purple-200 text-xs"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!interactive}
            onClick={handleLike}
            className={cn(
              'gap-2 rounded-xl px-3',
              isLiked
                ? 'text-rose-400 hover:bg-rose-500/15 hover:text-rose-300'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
            <span className="text-sm font-medium">{likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!interactive}
            onClick={handleToggleComments}
            className="gap-2 rounded-xl px-3 text-slate-400 hover:bg-white/10 hover:text-blue-300"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{commentsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!interactive}
            onClick={() => onShare?.(post.id)}
            className="gap-2 rounded-xl px-3 text-slate-400 hover:bg-white/10 hover:text-emerald-300"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-sm font-medium">{post.shares_count}</span>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && interactive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3 overflow-hidden border-t border-white/10 pt-3"
          >
            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              </div>
            ) : (
              <>
                {comments.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-2">No comments yet. Be the first!</p>
                )}
                <div className="max-h-56 space-y-3 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-800 text-xs">
                          {(comment.profiles?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(ARTIST_INSET, 'flex-1 px-3 py-2')}>
                        <p className="text-xs font-medium text-white">
                          {comment.profiles?.username || 'User'}
                        </p>
                        <p className="text-sm text-slate-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {onSubmitComment && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Write a comment..."
                      className={cn(ARTIST_INPUT, 'flex-1')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          handleSubmitComment()
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className={cn(ARTIST_PRIMARY_BTN, 'h-10 w-10 shrink-0')}
                      onClick={handleSubmitComment}
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </motion.article>
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
