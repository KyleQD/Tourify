'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Users,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
  Heart,
  MessageCircle,
  BarChart3,
  Check,
  X,
} from 'lucide-react'
import { CleanPostCreator } from '@/components/feed/clean-post-creator'
import {
  ArtistPostCard,
  type ArtistFeedPost,
} from '@/components/artist/artist-post-card'
import { useAuth } from '@/contexts/auth-context'
import { useArtist } from '@/contexts/artist-context'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ARTIST_CARD,
  ARTIST_MUTED,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
  ARTIST_SECTION_LABEL,
  ARTIST_STAT_GRID,
  ARTIST_TITLE,
} from '@/components/dashboard/artist-tokens'
import type { PollPayload } from '@/lib/polls/hydrate-polls'

type FeedFilter = 'home' | 'following' | 'tagged' | 'approvals'

interface ArtistFeedStats {
  followers: number
  postCount: number
  engagementTotal: number
  engagementRate: number
}

interface PendingCollabInvite {
  id: string
  post_id: string
  created_at: string
  inviter?: { id: string; username: string; avatar_url?: string | null } | null
  post?: {
    id: string
    content?: string
    account_display_name?: string | null
    created_at?: string
  } | null
}

const EMPTY_FEED_STATS: ArtistFeedStats = {
  followers: 0,
  postCount: 0,
  engagementTotal: 0,
  engagementRate: 0,
}

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
      id: userData.id || post.user_id || post.posted_as_profile_id || '',
      username:
        post.account_display_name
        || userData.full_name
        || userData.username
        || post.account_username
        || 'Artist',
      avatar_url: post.account_avatar_url || userData.avatar_url || null,
      profile_path: userData.account_context?.profile_path || null,
    },
    owner_user_id: post.user_id || null,
    likes_count: post.likes_count || 0,
    comments_count: post.comments_count || 0,
    shares_count: post.shares_count || 0,
    is_liked: likedPostIds.has(post.id) || Boolean(post.is_liked),
    is_pinned: Boolean(post.is_pinned),
    poll: (post.poll as PollPayload | null | undefined) || null,
  }
}

export function ArtistHomeFeed() {
  const { user } = useAuth()
  const { profile: artistProfile, displayName } = useArtist()
  const [posts, setPosts] = useState<ArtistFeedPost[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingCollabInvite[]>([])
  const [feedStats, setFeedStats] = useState<ArtistFeedStats>(EMPTY_FEED_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('home')
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

  const fetchFeedStats = useCallback(async () => {
    if (!artistProfile?.id) {
      setFeedStats(EMPTY_FEED_STATS)
      return
    }

    try {
      const params = new URLSearchParams({ profile_id: artistProfile.id })
      const response = await fetch(`/api/artist/feed-stats?${params}`, buildNoStoreInit())
      if (!response.ok) {
        setFeedStats(EMPTY_FEED_STATS)
        return
      }
      const result = await response.json()
      const data = result.data || {}
      setFeedStats({
        followers: Number(data.followers) || 0,
        postCount: Number(data.postCount) || 0,
        engagementTotal: Number(data.engagementTotal) || 0,
        engagementRate: Number(data.engagementRate) || 0,
      })
    } catch {
      setFeedStats(EMPTY_FEED_STATS)
    }
  }, [artistProfile?.id])

  const fetchPosts = useCallback(async (filter: FeedFilter) => {
    if (!user?.id || filter === 'approvals') {
      if (filter === 'approvals') setPosts([])
      return
    }

    setIsLoading(true)
    try {
      const type = filter === 'home' ? 'home' : filter === 'following' ? 'following' : 'tagged'
      const params = new URLSearchParams({ type, limit: '40' })
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
  }, [user?.id, artistProfile?.id, transformPosts])

  const fetchPendingInvites = useCallback(async () => {
    if (!user?.id) {
      setPendingInvites([])
      return
    }

    try {
      const response = await fetch('/api/feed/collaborations/pending', buildNoStoreInit())
      if (!response.ok) {
        setPendingInvites([])
        return
      }
      const result = await response.json()
      setPendingInvites(result.data || [])
    } catch {
      setPendingInvites([])
    }
  }, [user?.id])

  const refreshAll = useCallback(() => {
    fetchFeedStats()
    fetchPendingInvites()
    if (feedFilter === 'approvals') {
      setIsLoading(false)
      return
    }
    fetchPosts(feedFilter)
  }, [fetchFeedStats, fetchPendingInvites, fetchPosts, feedFilter])

  useEffect(() => {
    if (!user) return
    fetchFeedStats()
    fetchPendingInvites()
  }, [user, fetchFeedStats, fetchPendingInvites])

  useEffect(() => {
    if (!user) return
    if (feedFilter === 'approvals') {
      setIsLoading(true)
      fetchPendingInvites().finally(() => setIsLoading(false))
      return
    }
    fetchPosts(feedFilter)
  }, [user, feedFilter, fetchPosts, fetchPendingInvites])

  function handlePostCreated(newPost: any) {
    const transformed = toArtistFeedPost(newPost, new Set())
    setPosts((prev) => [transformed, ...prev.filter((post) => post.id !== transformed.id)])
    setFeedFilter('home')
    void fetchFeedStats()
    requestAnimationFrame(() => {
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleLike(postId: string) {
    if (!user?.id) return
    const post = posts.find((item) => item.id === postId)
    const action = post?.is_liked ? 'unlike' : 'like'
    const response = await fetch(`/api/posts/${postId}/likes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (!response.ok) throw new Error('Failed to toggle like')

    setPosts((list) => list.map((item) => {
      if (item.id !== postId) return item
      const nextLiked = !item.is_liked
      return {
        ...item,
        is_liked: nextLiked,
        likes_count: Math.max(0, item.likes_count + (nextLiked ? 1 : -1)),
      }
    }))
    void fetchFeedStats()
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/posts/${postId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Post link copied')
    } catch {
      toast.error('Failed to copy link')
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
    fetchPosts(feedFilter === 'approvals' ? 'home' : feedFilter)
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
      void fetchFeedStats()
    } catch (error) {
      setPosts(previous)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
      throw error
    }
  }

  async function loadComments(postId: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, content, created_at, profiles:user_id(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(40)
    if (error) {
      toast.error('Failed to load comments')
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
    }))
  }

  async function submitComment(postId: string, content: string) {
    if (!user?.id) return null
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content })
      .select('id, content, created_at, profiles:user_id(username, avatar_url)')
      .single()
    if (error) {
      toast.error('Failed to post comment')
      return null
    }
    setPosts((list) => list.map((post) => (
      post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
    )))
    void fetchFeedStats()
    return {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      profiles: Array.isArray((data as any).profiles)
        ? (data as any).profiles[0]
        : (data as any).profiles,
    }
  }

  async function respondToCollab(postId: string, action: 'accept' | 'decline') {
    const response = await fetch(`/api/feed/posts/${postId}/collaborators`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        collaborator_profile_id: artistProfile?.id || null,
      }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      toast.error(result.error || `Failed to ${action}`)
      return
    }

    toast.success(action === 'accept' ? 'Now sharing through your network' : 'Invite declined')
    setPendingInvites((prev) => prev.filter((invite) => invite.post_id !== postId))
    if (action === 'accept') void fetchPosts('home')
  }

  const showComposer = feedFilter !== 'following' && feedFilter !== 'approvals' && feedFilter !== 'tagged'
  const emptyTitle =
    feedFilter === 'following'
      ? 'No posts from following yet'
      : feedFilter === 'tagged'
        ? 'No tagged posts yet'
        : feedFilter === 'approvals'
          ? 'No pending approvals'
          : 'Your home feed is quiet'

  const emptyBody =
    feedFilter === 'following'
      ? 'Follow artists and pages to fill this feed with their latest updates.'
      : feedFilter === 'tagged'
        ? 'When someone tags you in a post or blog share, it will show up here.'
        : feedFilter === 'approvals'
          ? 'Collaborative post invites to share through your network will appear here.'
          : 'Follow pages, join bands, or share your first update to get started.'

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-purple-600/[0.07] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-blue-600/[0.06] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-6">
        <div>
          <p className={ARTIST_SECTION_LABEL}>Home</p>
          <h1 className={cn(ARTIST_TITLE, 'mt-1 text-3xl md:text-4xl bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent')}>
            Your feed
          </h1>
          <p className={cn(ARTIST_MUTED, 'mt-2')}>
            Updates from pages you follow, bands you are in, tags, and collaborative posts.
          </p>
        </div>

        <div className={cn(ARTIST_STAT_GRID)}>
          <div className={cn(ARTIST_CARD, 'p-4')}>
            <p className={ARTIST_SECTION_LABEL}>Followers</p>
            <p className="mt-2 text-2xl font-bold text-white">{feedStats.followers.toLocaleString()}</p>
            <Users className="mt-2 h-4 w-4 text-purple-300" />
          </div>
          <div className={cn(ARTIST_CARD, 'p-4')}>
            <p className={ARTIST_SECTION_LABEL}>Your posts</p>
            <p className="mt-2 text-2xl font-bold text-white">{feedStats.postCount.toLocaleString()}</p>
            <Activity className="mt-2 h-4 w-4 text-blue-300" />
          </div>
          <div className={cn(ARTIST_CARD, 'p-4')}>
            <p className={ARTIST_SECTION_LABEL}>Engagement</p>
            <p className="mt-2 text-2xl font-bold text-white">{feedStats.engagementTotal.toLocaleString()}</p>
            <Heart className="mt-2 h-4 w-4 text-rose-300" />
          </div>
          <div className={cn(ARTIST_CARD, 'p-4')}>
            <p className={ARTIST_SECTION_LABEL}>Rate</p>
            <p className="mt-2 text-2xl font-bold text-white">{feedStats.engagementRate.toFixed(1)}%</p>
            <TrendingUp className="mt-2 h-4 w-4 text-emerald-300" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={cn(ARTIST_CARD, 'inline-flex flex-wrap items-center gap-1 p-1')}>
            {([
              { id: 'home', label: 'For you' },
              { id: 'following', label: 'Following' },
              { id: 'tagged', label: 'Tagged' },
              { id: 'approvals', label: pendingInvites.length > 0 ? `Approvals (${pendingInvites.length})` : 'Approvals' },
            ] as const).map((filter) => (
              <Button
                key={filter.id}
                size="sm"
                variant="ghost"
                onClick={() => setFeedFilter(filter.id)}
                className={cn(
                  'rounded-xl px-3 text-xs',
                  feedFilter === filter.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
              <Link href="/discover">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Discover
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={ARTIST_OUTLINE_BTN}
              onClick={refreshAll}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {showComposer && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <CleanPostCreator
              onPostCreated={handlePostCreated}
              placeholder="Share a moment, tag collaborators, or invite your bandmates to co-post..."
              maxMediaItems={10}
              defaultVisibility="public"
              showAdvancedOptions
              enableTagging
              enableCollaborators
              className="!bg-white/[0.04] !border-white/10"
              user={{
                id: user?.id || '',
                username: displayName,
                avatar_url: (artistProfile as any)?.avatar_url || undefined,
              }}
            />
          </motion.div>
        )}

        <div ref={feedTopRef} className="space-y-4">
          {isLoading ? (
            <div className={cn(ARTIST_CARD, 'flex items-center justify-center py-16')}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            </div>
          ) : feedFilter === 'approvals' ? (
            pendingInvites.length === 0 ? (
              <EmptyFeedState title={emptyTitle} body={emptyBody} />
            ) : (
              pendingInvites.map((invite) => (
                <div key={invite.id} className={cn(ARTIST_CARD, 'space-y-4 p-5')}>
                  <div>
                    <p className="text-sm text-slate-400">
                      {invite.inviter?.username || 'Someone'} invited you to share this post through your network
                    </p>
                    <p className="mt-2 text-white">
                      {invite.post?.content || 'Collaborative post'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {invite.post?.account_display_name || 'Author'}
                      {invite.created_at
                        ? ` · ${new Date(invite.created_at).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={ARTIST_PRIMARY_BTN}
                      onClick={() => respondToCollab(invite.post_id, 'accept')}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Accept & share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={ARTIST_OUTLINE_BTN}
                      onClick={() => respondToCollab(invite.post_id, 'decline')}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )
          ) : posts.length === 0 ? (
            <EmptyFeedState
              title={emptyTitle}
              body={emptyBody}
              actions={
                feedFilter === 'following' ? (
                  <>
                    <Button className={ARTIST_PRIMARY_BTN} onClick={() => setFeedFilter('home')}>
                      View For you
                    </Button>
                    <Button variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
                      <Link href="/discover">Find artists</Link>
                    </Button>
                  </>
                ) : (
                  <Button className={ARTIST_PRIMARY_BTN} asChild>
                    <Link href="/artist/content">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Open Content Hub
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            posts.map((post) => (
              <ArtistPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                showFollow={feedFilter === 'following'}
                canPin
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
