'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  MessageCircle,
  BarChart3,
} from 'lucide-react'
import { CleanPostCreator } from '@/components/feed/clean-post-creator'
import { getAccountAuthorPath } from '@/lib/accounts/account-author'
import {
  ArtistPostCard,
  type ArtistFeedPost,
} from '@/components/artist/artist-post-card'
import { useAuth } from '@/contexts/auth-context'
import { useArtist } from '@/contexts/artist-context'
import { usePostStyleFlags } from '@/hooks/use-post-style-flags'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ARTIST_CARD,
  ARTIST_MUTED,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
} from '@/components/dashboard/artist-tokens'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import {
  createPostComment,
  getPostComments,
  setPostLike,
  sharePostExternally,
} from '@/lib/feed/post-engagement-client'

function buildNoStoreInit(input?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(input?.headers || {}),
    },
  }
}

interface ArtistFeedStats {
  followers: number
  postCount: number
  engagementTotal: number
  engagementRate: number
  profileId?: string
}

/** Loads the artist home feed analytics from the scoped feed-stats route. */
async function fetchFeedStats(profileId: string): Promise<ArtistFeedStats | null> {
  try {
    const response = await fetch(
      `/api/artist/feed-stats?profile_id=${encodeURIComponent(profileId)}`,
      buildNoStoreInit()
    )
    if (!response.ok) return null
    const result = await response.json()
    return result?.success && result?.data ? (result.data as ArtistFeedStats) : null
  } catch {
    return null
  }
}

async function fetchPendingCollaborationCount(): Promise<number> {
  try {
    const response = await fetch('/api/feed/collaborations/pending', buildNoStoreInit())
    if (!response.ok) return 0
    const result = await response.json()
    return Array.isArray(result?.data) ? result.data.length : 0
  } catch {
    return 0
  }
}

type RawMediaItem = string | {
  url?: string
  type?: string
  thumbnail_url?: string
  altText?: string
}

function normalizeMediaItems(post: any): ArtistFeedPost['media_items'] {
  if (Array.isArray(post.media_items) && post.media_items.length > 0) return post.media_items
  const urls: RawMediaItem[] = Array.isArray(post.media_urls) ? post.media_urls : []
  return urls.map((url, index: number) => ({
    id: `${post.id}-media-${index}`,
    type: typeof url === 'string' && url.includes('.mp4') ? 'video' : 'image',
    url: typeof url === 'string' ? url : url?.url || '',
    thumbnail_url: typeof url === 'string' ? undefined : url.thumbnail_url,
    altText: typeof url === 'string' ? undefined : url.altText,
  })).filter((item: { url: string }) => Boolean(item.url))
}

function toArtistFeedPost(post: any, likedPostIds: Set<string>): ArtistFeedPost {
  const userData = post.profiles || post.user || {}
  return {
    id: post.id,
    content: post.content || '',
    type: post.type || 'text',
    visibility: post.visibility || 'public',
    location: post.location || null,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    tagged_users: Array.isArray(post.tagged_users) ? post.tagged_users : [],
    collaborators: Array.isArray(post.collaborators) ? post.collaborators : [],
    media_items: normalizeMediaItems(post),
    media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
    metadata: post.metadata || null,
    track_preview: post.track_preview || null,
    created_at: post.created_at,
    user: {
      // posted_as_profile_id is the entity (artist/venue/org) UUID; fall back to general user id
      id: post.posted_as_profile_id || userData.id || post.user_id || '',
      // account_display_name and account_username are stored from the API's acting context —
      // always prefer them over the general user's profile.full_name which may belong to "Kyle"
      username:
        post.account_display_name
        || post.account_username
        || userData.full_name
        || userData.username
        || 'Artist',
      avatar_url: post.account_avatar_url || userData.avatar_url || null,
      // Derive the correct profile link from the stored posting account type + username
      profile_path:
        userData.account_context?.profile_path ||
        getAccountAuthorPath({
          id: post.posted_as_profile_id || post.user_id || '',
          type: post.posted_as_type || 'general',
          username: post.account_username || null,
          subtype: null,
        }),
    },
    owner_user_id: post.user_id || null,
    likes_count: post.likes_count || 0,
    comments_count: post.comments_count || 0,
    shares_count: post.shares_count || 0,
    is_liked: likedPostIds.has(post.id) || Boolean(post.is_liked),
    is_pinned: Boolean(post.is_pinned),
    poll: (post.poll as PollPayload | null | undefined) || null,
    // Pass through post_appearances snapshot when present in the feed query result
    appearance: post.post_appearances ?? post.appearance ?? null,
  }
}

type ArtistHomeFeedFilter = 'home' | 'tagged'

function ArtistHomeFeedStream({ filter = 'home' }: { filter?: ArtistHomeFeedFilter }) {
  const { user } = useAuth()
  const { profile: artistProfile, displayName } = useArtist()
  const { flags } = usePostStyleFlags()
  const [posts, setPosts] = useState<ArtistFeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedStats, setFeedStats] = useState<ArtistFeedStats | null>(null)
  const [pendingCollaborations, setPendingCollaborations] = useState(0)
  const feedTopRef = useRef<HTMLDivElement>(null)

  const transformPosts = useCallback(async (feedPosts: any[]): Promise<ArtistFeedPost[]> => {
    const postIds = feedPosts.map((post) => post.id).filter(Boolean)
    const liked = new Set<string>()
    if (postIds.length > 0 && user?.id) {
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', user.id)
      for (const like of likesData || []) liked.add(like.post_id)
    }
    return feedPosts.map((post) => toArtistFeedPost(post, liked))
  }, [user?.id])

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const feedType = filter === 'home' ? 'home' : 'tagged'
      const params = new URLSearchParams({ type: feedType, limit: '40' })
      if (artistProfile?.id) params.set('profile_id', artistProfile.id)

      const response = await fetch(`/api/feed/posts?${params}`, buildNoStoreInit())
      if (!response.ok) {
        setPosts([])
        return
      }
      const result = await response.json()
      setPosts(await transformPosts(result.data || result.posts || []))
    } catch {
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, artistProfile?.id, transformPosts, filter])

  useEffect(() => {
    if (!user) return
    fetchPosts()
    if (artistProfile?.id) {
      void fetchFeedStats(artistProfile.id).then((stats) => setFeedStats(stats))
    }
    void fetchPendingCollaborationCount().then(setPendingCollaborations)
  }, [user, fetchPosts, artistProfile?.id])

  function handlePostCreated(newPost: any) {
    const transformed = toArtistFeedPost(newPost, new Set())
    setPosts((prev) => [transformed, ...prev.filter((post) => post.id !== transformed.id)])
    requestAnimationFrame(() => {
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleLike(postId: string) {
    if (!user?.id) return
    const post = posts.find((item) => item.id === postId)
    const action = post?.is_liked ? 'unlike' : 'like'
    const result = await setPostLike(postId, action)

    setPosts((list) => list.map((item) => {
      if (item.id !== postId) return item
      return {
        ...item,
        is_liked: result.is_liked,
        likes_count: result.likes_count,
      }
    }))
  }

  async function handleShare(postId: string) {
    try {
      const result = await sharePostExternally(postId, { preferNative: false })
      setPosts((list) => list.map((post) => (
        post.id === postId ? { ...post, shares_count: result.shares_count } : post
      )))
      toast.success('Post link copied and share saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share post')
      throw error
    }
  }

  async function handleFollow(targetUserId: string) {
    if (!user?.id) return
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId })
    if (error) {
      toast.error('Failed to follow')
      return
    }
    toast.success('Followed')
    fetchPosts()
  }

  async function handlePin(postId: string, isPinned: boolean) {
    const response = await fetch('/api/posts/pin', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, isPinned }),
    })
    if (!response.ok) throw new Error('Failed to pin')
    setPosts((prev) => prev.map((post) => (
      post.id === postId ? { ...post, is_pinned: isPinned } : post
    )))
  }

  async function handleDelete(postId: string) {
    const previous = posts
    setPosts((list) => list.filter((post) => post.id !== postId))

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to delete post')
      }

      toast.success('Post deleted')
    } catch (error) {
      setPosts(previous)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
      throw error
    }
  }

  async function loadComments(postId: string) {
    try {
      const result = await getPostComments(postId, 40)
      return result.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        profiles: {
          username: comment.user.username,
          avatar_url: comment.user.avatar_url,
        },
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load comments')
      return []
    }
  }

  async function submitComment(postId: string, content: string) {
    if (!user?.id) return null
    try {
      const result = await createPostComment(postId, content)
      setPosts((list) => list.map((post) => (
        post.id === postId ? { ...post, comments_count: result.comments_count } : post
      )))
      return {
        id: result.comment.id,
        content: result.comment.content,
        created_at: result.comment.created_at,
        profiles: {
          username: result.comment.user.username,
          avatar_url: result.comment.user.avatar_url,
        },
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
      return null
    }
  }

  return (
    <div data-artist-home-feed="stream" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-purple-600/[0.07] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-blue-600/[0.06] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <CleanPostCreator
            onPostCreated={handlePostCreated}
            placeholder="What's going on in your world?"
            maxMediaItems={10}
            defaultVisibility="public"
            showAdvancedOptions
            className="!bg-white/[0.04] !border-white/10"
            user={{
              id: user?.id || '',
              username: displayName,
              avatar_url: (artistProfile as any)?.avatar_url || undefined,
            }}
          />
        </motion.div>

        {pendingCollaborations > 0 ? (
          <div className={cn(ARTIST_CARD, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MessageCircle className="h-4 w-4 text-purple-300" />
              <span>
                {pendingCollaborations} pending collaboration invite
                {pendingCollaborations === 1 ? '' : 's'}
              </span>
            </div>
            <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
              <Link href="/artist/content">Review in Content Hub</Link>
            </Button>
          </div>
        ) : null}

        {feedStats ? (
          <div className={cn(ARTIST_CARD, 'grid grid-cols-3 gap-3 p-4')}>
            <div>
              <p className={cn(ARTIST_MUTED, 'text-xs')}>Posts</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{feedStats.postCount}</p>
            </div>
            <div>
              <p className={cn(ARTIST_MUTED, 'text-xs')}>Followers</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{feedStats.followers}</p>
            </div>
            <div>
              <p className={cn(ARTIST_MUTED, 'text-xs')}>Engagement rate</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{feedStats.engagementRate}%</p>
            </div>
          </div>
        ) : null}

        <div ref={feedTopRef} className="space-y-4">
          {isLoading ? (
            <div className={cn(ARTIST_CARD, 'flex items-center justify-center py-16')}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <EmptyFeedState
              title="Your home feed is quiet"
              body="Follow pages, join bands, or share your first update to get started."
              actions={(
                <Button className={ARTIST_PRIMARY_BTN} asChild>
                  <Link href="/artist/content">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Open Content Hub
                  </Link>
                </Button>
              )}
            />
          ) : (
            posts.map((post) => (
              <ArtistPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                showFollow={false}
                canPin
                enablePostStyles={flags.post_styles_read}
                onLike={handleLike}
                onShare={handleShare}
                onFollow={handleFollow}
                onPin={handlePin}
                onDelete={handleDelete}
                onLoadComments={loadComments}
                onSubmitComment={submitComment}
              />
            ))
          )}
        </div>

        <div className={cn(ARTIST_CARD, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MessageCircle className="h-4 w-4" />
            Career overview and bookings live under Overview.
          </div>
          <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
            <Link href="/artist/overview">Go to Overview</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export { ArtistHomeFeedStream as ArtistHomeFeed }

function EmptyFeedState({
  title,
  body,
  actions,
}: {
  title: string
  body: string
  actions?: ReactNode
}) {
  return (
    <div className={cn(ARTIST_CARD, 'px-6 py-14 text-center')}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
        <Sparkles className="h-6 w-6 text-purple-300" />
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className={cn(ARTIST_MUTED, 'mx-auto mt-2 max-w-md')}>{body}</p>
      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  )
}
