'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ArtistPostCard, type ArtistFeedPost } from '@/components/artist/artist-post-card'
import { Button } from '@/components/ui/button'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import type { PublicArtistPostDTO, PublicArtistViewerDTO } from '@/lib/public-artist/public-artist-types'
import {
  createPostComment,
  getPostComments,
  setPostLike,
  sharePostExternally,
} from '@/lib/feed/post-engagement-client'
import { PublicArtistMediaLightbox } from '@/components/public-artist/media/public-artist-media-lightbox'
import type { MediaItem } from '@/utils/media-utils'

function normalizeMedia(post: PublicArtistPostDTO | Record<string, any>) {
  const id = String(post.id)
  const urls = 'mediaUrls' in post ? post.mediaUrls : post.media_urls
  return (Array.isArray(urls) ? urls : [])
    .map((entry: string | { url?: string; type?: string; thumbnail_url?: string; altText?: string }, index: number) => {
      const url = typeof entry === 'string' ? entry : entry?.url || ''
      return {
        id: `${id}-media-${index}`,
        url,
        type: typeof entry === 'string'
          ? (/\.(mp4|webm|mov)(?:\?|$)/i.test(entry) ? 'video' : 'image')
          : entry.type || 'image',
        thumbnail_url: typeof entry === 'string' ? undefined : entry.thumbnail_url,
        altText: typeof entry === 'string' ? undefined : entry.altText,
      }
    })
    .filter((item) => Boolean(item.url))
}

function toArtistFeedPost(post: PublicArtistPostDTO | Record<string, any>): ArtistFeedPost {
  if ('authorName' in post) {
    return {
      id: post.id,
      content: post.content || '',
      type: post.type || 'text',
      content_ref_type: post.contentRefType,
      content_ref_id: post.contentRefId,
      visibility: post.visibility || 'public',
      location: post.location,
      hashtags: post.hashtags,
      tagged_users: post.taggedUsers,
      collaborators: post.collaborators.map((collaborator: PublicArtistPostDTO['collaborators'][number]) => ({
        user_id: collaborator.userId || undefined,
        profile_id: collaborator.profileId,
        username: collaborator.username,
        avatar_url: collaborator.avatarUrl,
        status: 'accepted',
      })),
      media_items: normalizeMedia(post),
      media_urls: post.mediaUrls,
      metadata: post.metadata,
      track_preview: (post.trackPreview || null) as ArtistFeedPost['track_preview'],
      article_preview: post.articlePreview as ArtistFeedPost['article_preview'],
      listing_preview: post.listingPreview as ArtistFeedPost['listing_preview'],
      event_preview: post.eventPreview as ArtistFeedPost['event_preview'],
      created_at: post.createdAt,
      user: {
        id: post.authorUserId,
        username: post.authorName,
        avatar_url: post.authorAvatarUrl,
        profile_path: post.authorProfilePath,
        is_verified: post.authorVerified,
      },
      owner_user_id: post.authorUserId,
      likes_count: post.likesCount,
      comments_count: post.commentsCount,
      shares_count: post.sharesCount,
      is_liked: post.isLiked,
      is_pinned: post.isPinned,
      poll: (post.poll || null) as PollPayload | null,
      appearance: post.appearance as ArtistFeedPost['appearance'],
    }
  }

  const author = post.author || {}
  const profile = post.profiles || post.user || {}
  return {
    id: post.id,
    content: post.content || '',
    type: post.type || 'text',
    content_ref_type: post.content_ref_type || null,
    content_ref_id: post.content_ref_id || null,
    visibility: post.visibility || 'public',
    location: post.location || null,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    tagged_users: Array.isArray(post.tagged_users) ? post.tagged_users : [],
    collaborators: Array.isArray(post.collaborators) ? post.collaborators : [],
    media_items: normalizeMedia(post),
    media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
    metadata: post.metadata || null,
    track_preview: post.track_preview || null,
    article_preview: post.article_preview || null,
    listing_preview: post.listing_preview || null,
    event_preview: post.event_preview || null,
    created_at: post.created_at,
    user: {
      id: author.id || post.posted_as_profile_id || post.user_id || '',
      username: author.displayName || post.account_display_name || profile.full_name || profile.username || 'Artist',
      avatar_url: author.avatarUrl || post.account_avatar_url || profile.avatar_url || null,
      profile_path: author.profilePath || profile.account_context?.profile_path || null,
      is_verified: Boolean(author.isVerified || profile.is_verified),
    },
    owner_user_id: post.user_id || null,
    likes_count: Number(post.likes_count || 0),
    comments_count: Number(post.comments_count || 0),
    shares_count: Number(post.shares_count || 0),
    is_liked: Boolean(post.is_liked),
    is_pinned: Boolean(post.is_pinned),
    poll: post.poll || null,
    appearance: post.appearance || post.post_appearances || null,
  }
}

export function PublicArtistPostsSection({
  viewer,
  artistProfileId,
  artistUserId,
  artistName,
  pinnedPosts: initialPinnedPosts,
  posts: initialPosts,
  nextCursor: initialNextCursor,
  enablePostStyles,
  className,
}: {
  viewer: PublicArtistViewerDTO
  artistProfileId: string
  artistUserId: string
  artistName: string
  pinnedPosts: PublicArtistPostDTO[]
  posts: PublicArtistPostDTO[]
  nextCursor: string | null
  enablePostStyles: boolean
  cardStyle?: React.CSSProperties
  className?: string
}) {
  const [pinnedPosts, setPinnedPosts] = useState(() => initialPinnedPosts.map(toArtistFeedPost))
  const [posts, setPosts] = useState(() => initialPosts.map(toArtistFeedPost))
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [announcement, setAnnouncement] = useState('')
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null)
  const loadMoreRef = useRef<HTMLButtonElement>(null)
  const feedPosts = useMemo(() => [...pinnedPosts, ...posts], [pinnedPosts, posts])

  const sendToSignIn = useCallback(() => {
    const returnUrl = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/login?tab=signin&redirect=${encodeURIComponent(returnUrl)}`)
  }, [])

  const requireViewer = useCallback(() => {
    if (viewer.isAuthenticated) return true
    sendToSignIn()
    return false
  }, [sendToSignIn, viewer.isAuthenticated])

  const handleLike = useCallback(async (postId: string) => {
    if (!requireViewer()) throw new Error('Sign in required')
    const post = feedPosts.find((item) => item.id === postId)
    await setPostLike(postId, post?.is_liked ? 'unlike' : 'like')
    const update = (item: ArtistFeedPost) => item.id === postId
      ? { ...item, is_liked: !item.is_liked }
      : item
    setPinnedPosts((items) => items.map(update))
    setPosts((items) => items.map(update))
  }, [feedPosts, requireViewer])

  const handleShare = useCallback(async (postId: string) => {
    try {
      if (viewer.isAuthenticated) {
        await sharePostExternally(postId, { title: 'Tourify post' })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/posts/${encodeURIComponent(postId)}`)
      }
      const update = (item: ArtistFeedPost) => item.id === postId
        ? { ...item, shares_count: item.shares_count + 1 }
        : item
      if (viewer.isAuthenticated) {
        setPinnedPosts((items) => items.map(update))
        setPosts((items) => items.map(update))
      }
      toast.success('Post link copied')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to share this post')
      throw error
    }
  }, [viewer.isAuthenticated])

  const handlePin = useCallback(async (postId: string, isPinned: boolean) => {
    const response = await fetch('/api/posts/pin', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, isPinned }),
    })
    if (!response.ok) throw new Error('Unable to update the pinned post')

    if (isPinned) {
      const match = posts.find((post) => post.id === postId)
      if (match) {
        setPosts((items) => items.filter((post) => post.id !== postId))
        setPinnedPosts((items) => [{ ...match, is_pinned: true }, ...items])
      }
    } else {
      const match = pinnedPosts.find((post) => post.id === postId)
      if (match) {
        setPinnedPosts((items) => items.filter((post) => post.id !== postId))
        setPosts((items) => [{ ...match, is_pinned: false }, ...items])
      }
    }
  }, [pinnedPosts, posts])

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadState === 'loading') return
    setLoadState('loading')
    setAnnouncement('Loading more posts')

    try {
      const params = new URLSearchParams({
        type: 'user',
        profile_id: artistProfileId,
        user_id: artistUserId,
        attribution: 'strict',
        exclude_pinned: 'true',
        limit: '10',
        cursor: nextCursor,
      })
      const response = await fetch(`/api/feed/posts?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load more posts')

      const appended = (payload.data || []).map(toArtistFeedPost)
      setPosts((current) => {
        const existing = new Set(current.map((post) => post.id))
        return [...current, ...appended.filter((post: ArtistFeedPost) => !existing.has(post.id))]
      })
      setNextCursor(payload.next_cursor || null)
      setLoadState('idle')
      setAnnouncement(
        appended.length > 0
          ? `${appended.length} more posts loaded`
          : 'You have reached the end of the feed',
      )
      requestAnimationFrame(() => {
        document.getElementById(`post-${appended[0]?.id}`)?.focus({ preventScroll: true })
      })
    } catch (error) {
      setLoadState('error')
      setAnnouncement(error instanceof Error ? error.message : 'Unable to load more posts')
    }
  }, [artistProfileId, artistUserId, loadState, nextCursor])

  if (feedPosts.length === 0) return null

  return (
    <section id="posts" className={className} aria-labelledby="artist-posts-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--artist-theme-muted, rgba(255,255,255,.58))]">Latest from</p>
          <h2 id="artist-posts-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[var(--artist-theme-text, white)]">
            Artist feed
          </h2>
        </div>
        <span className="text-sm text-[var(--artist-theme-muted, rgba(255,255,255,.58))]">{feedPosts.length} shown</span>
      </div>

      <div role="feed" aria-busy={loadState === 'loading'} aria-labelledby="artist-posts-heading" className="space-y-4">
        {feedPosts.map((post, index) => (
          <ArtistPostCard
            key={post.id}
            post={post}
            currentUserId={viewer.userId}
            canPin={viewer.isOwner}
            enablePostStyles={enablePostStyles}
            className="public-artist-feed-card"
            feedPosition={index + 1}
            feedSize={nextCursor ? -1 : feedPosts.length}
            onAuthRequired={sendToSignIn}
            onOpenMedia={(mediaIndex, items) => setLightbox({ items, index: mediaIndex })}
            onLike={handleLike}
            onShare={handleShare}
            onPin={handlePin}
            onLoadComments={async (postId) => {
              if (!requireViewer()) return []
              const result = await getPostComments(postId)
              return result.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                profiles: {
                  username: comment.user.full_name || comment.user.username,
                  avatar_url: comment.user.avatar_url || null,
                },
              }))
            }}
            onSubmitComment={async (postId, content) => {
              if (!requireViewer()) return null
              const result = await createPostComment(postId, content)
              return {
                id: result.comment.id,
                content: result.comment.content,
                created_at: result.comment.created_at,
                profiles: {
                  username: result.comment.user.full_name || result.comment.user.username,
                  avatar_url: result.comment.user.avatar_url || null,
                },
              }
            }}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      {nextCursor || loadState === 'error' ? (
        <div className="mt-5 flex justify-center">
          <Button
            ref={loadMoreRef}
            type="button"
            variant="outline"
            onClick={() => void handleLoadMore()}
            disabled={loadState === 'loading'}
            className="min-w-40 rounded-full border-[var(--artist-theme-text, rgba(255,255,255,.18))] bg-[var(--artist-theme-surface, rgba(255,255,255,.05))] text-[var(--artist-theme-text, white)] hover:bg-[var(--artist-theme-surface, rgba(255,255,255,.10))]"
          >
            {loadState === 'loading' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading</>
            ) : loadState === 'error' ? (
              <><RefreshCw className="mr-2 h-4 w-4" />Try again</>
            ) : 'Load more posts'}
          </Button>
        </div>
      ) : (
        <p className="mt-5 text-center text-sm text-[var(--artist-theme-muted, rgba(255,255,255,.58))]">You’re all caught up.</p>
      )}
      {lightbox ? (
        <PublicArtistMediaLightbox
          artistName={artistName}
          items={lightbox.items.map((item) => ({
            url: item.url,
            type: item.type,
            caption: item.alt_text || item.altText || item.alt || null,
            thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || null,
          }))}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((current) => current ? { ...current, index } : null)}
          onOpenChange={(open) => { if (!open) setLightbox(null) }}
        />
      ) : null}
    </section>
  )
}
