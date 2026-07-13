'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type FeedFilter = 'all' | 'following' | 'trending'

interface ArtistFeedStats {
  followers: number
  postCount: number
  engagementTotal: number
  engagementRate: number
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
    likes_count: post.likes_count || 0,
    comments_count: post.comments_count || 0,
    shares_count: post.shares_count || 0,
    is_liked: likedPostIds.has(post.id) || Boolean(post.is_liked),
    is_pinned: Boolean(post.is_pinned),
    poll: (post.poll as PollPayload | null | undefined) || null,
  }
}

function dedupePosts(posts: ArtistFeedPost[]): ArtistFeedPost[] {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

function engagementScore(post: ArtistFeedPost) {
  return post.likes_count + post.comments_count + post.shares_count + (post.poll?.totalVotes || 0)
}

export default function ArtistFeedPage() {
  const { user } = useAuth()
  const { profile: artistProfile, displayName } = useArtist()
  const [artistPosts, setArtistPosts] = useState<ArtistFeedPost[]>([])
  const [ownedPosts, setOwnedPosts] = useState<ArtistFeedPost[]>([])
  const [networkPosts, setNetworkPosts] = useState<ArtistFeedPost[]>([])
  const [feedStats, setFeedStats] = useState<ArtistFeedStats>(EMPTY_FEED_STATS)
  const [isLoadingArtist, setIsLoadingArtist] = useState(true)
  const [isLoadingOwned, setIsLoadingOwned] = useState(true)
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true)
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
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

  const fetchArtistPosts = useCallback(async () => {
    if (!user?.id) return
    setIsLoadingArtist(true)
    try {
      if (!artistProfile?.id) {
        setArtistPosts([])
        return
      }

      const params = new URLSearchParams({
        type: 'user',
        limit: '30',
        profile_id: artistProfile.id,
        attribution: 'strict',
      })
      const response = await fetch(`/api/feed/posts?${params}`, buildNoStoreInit())
      if (!response.ok) {
        setArtistPosts([])
        return
      }
      const result = await response.json()
      setArtistPosts(await transformPosts(result.data || result.posts || []))
    } catch {
      setArtistPosts([])
    } finally {
      setIsLoadingArtist(false)
    }
  }, [user?.id, artistProfile?.id, transformPosts])

  const fetchOwnedPosts = useCallback(async () => {
    if (!user?.id) return
    setIsLoadingOwned(true)
    try {
      const params = new URLSearchParams({
        type: 'user',
        limit: '30',
        user_id: user.id,
      })
      const response = await fetch(`/api/feed/posts?${params}`, buildNoStoreInit())
      if (!response.ok) {
        setOwnedPosts([])
        return
      }
      const result = await response.json()
      // Legacy user scope includes all owned-account posts; merge dedupes with artistPosts.
      setOwnedPosts(await transformPosts(result.data || result.posts || []))
    } catch {
      setOwnedPosts([])
    } finally {
      setIsLoadingOwned(false)
    }
  }, [user?.id, transformPosts])

  const fetchNetworkPosts = useCallback(async () => {
    if (!user?.id) return
    setIsLoadingNetwork(true)
    try {
      const { data: following, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (error) {
        setNetworkPosts([])
        return
      }

      const followingIds = (following || []).map((row) => row.following_id).filter(Boolean)
      if (followingIds.length === 0) {
        setNetworkPosts([])
        return
      }

      const response = await fetch('/api/feed/posts?type=network&limit=30', buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({ following_ids: followingIds, limit: 30 }),
      }))
      if (!response.ok) {
        setNetworkPosts([])
        return
      }
      const result = await response.json()
      setNetworkPosts(await transformPosts(result.data || result.posts || []))
    } catch {
      setNetworkPosts([])
    } finally {
      setIsLoadingNetwork(false)
    }
  }, [user?.id, transformPosts])

  const refreshAll = useCallback(() => {
    fetchFeedStats()
    fetchArtistPosts()
    fetchOwnedPosts()
    fetchNetworkPosts()
  }, [fetchFeedStats, fetchArtistPosts, fetchOwnedPosts, fetchNetworkPosts])

  useEffect(() => {
    if (!user) return
    refreshAll()
  }, [user, refreshAll])

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'following') return networkPosts

    const merged = dedupePosts([...artistPosts, ...ownedPosts, ...networkPosts])
    if (feedFilter === 'trending')
      return merged.sort((a, b) => engagementScore(b) - engagementScore(a))

    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [feedFilter, artistPosts, ownedPosts, networkPosts])

  const isLoadingFeed = feedFilter === 'following'
    ? isLoadingNetwork
    : (isLoadingArtist || isLoadingOwned || isLoadingNetwork)

  const showFeedEmpty = feedFilter === 'following'
    ? networkPosts.length === 0
    : filteredPosts.length === 0

  function updateAllLists(updater: (list: ArtistFeedPost[]) => ArtistFeedPost[]) {
    setArtistPosts(updater)
    setOwnedPosts(updater)
    setNetworkPosts(updater)
  }

  function handlePostCreated(newPost: any) {
    const transformed = toArtistFeedPost(newPost, new Set())
    const postedAsProfileId = newPost?.posted_as_profile_id || null
    const isArtistPost = Boolean(artistProfile?.id && postedAsProfileId === artistProfile.id)

    if (isArtistPost) {
      setArtistPosts((prev) => [transformed, ...prev.filter((post) => post.id !== transformed.id)])
      void fetchFeedStats()
    } else {
      setOwnedPosts((prev) => [transformed, ...prev.filter((post) => post.id !== transformed.id)])
    }

    setFeedFilter('all')
    requestAnimationFrame(() => {
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleLike(postId: string) {
    if (!user?.id) return
    const post = filteredPosts.find((item) => item.id === postId)
    const action = post?.is_liked ? 'unlike' : 'like'
    const response = await fetch(`/api/posts/${postId}/likes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (!response.ok) throw new Error('Failed to toggle like')

    updateAllLists((list) => list.map((item) => {
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
    fetchNetworkPosts()
  }

  async function handlePin(postId: string, isPinned: boolean) {
    const response = await fetch('/api/posts/pin', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, isPinned }),
    })
    if (!response.ok) throw new Error('Failed to pin')
    setArtistPosts((prev) => prev.map((post) => (
      post.id === postId ? { ...post, is_pinned: isPinned } : post
    )))
    setOwnedPosts((prev) => prev.map((post) => (
      post.id === postId ? { ...post, is_pinned: isPinned } : post
    )))
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
    updateAllLists((list) => list.map((post) => (
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

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-purple-600/[0.07] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-blue-600/[0.06] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-6">
        <div>
          <p className={ARTIST_SECTION_LABEL}>Create & Publish</p>
          <h1 className={cn(ARTIST_TITLE, 'mt-1 text-3xl md:text-4xl bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent')}>
            Artist Feed
          </h1>
          <p className={cn(ARTIST_MUTED, 'mt-2')}>
            Share updates, poll your followers, and keep your community close.
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
          <div className={cn(ARTIST_CARD, 'inline-flex items-center gap-1 p-1')}>
            {([
              { id: 'all', label: 'All' },
              { id: 'following', label: 'Following' },
              { id: 'trending', label: 'Trending' },
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

        {feedFilter !== 'following' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <CleanPostCreator
              onPostCreated={handlePostCreated}
              placeholder="Share a moment, drop a track teaser, or poll your followers..."
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
        )}

        <div ref={feedTopRef} className="space-y-4">
          {isLoadingFeed ? (
            <div className={cn(ARTIST_CARD, 'flex items-center justify-center py-16')}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            </div>
          ) : showFeedEmpty ? (
            <div className={cn(ARTIST_CARD, 'px-6 py-14 text-center')}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Sparkles className="h-6 w-6 text-purple-300" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                {feedFilter === 'following' ? 'No posts from following yet' : 'No posts yet'}
              </h3>
              <p className={cn(ARTIST_MUTED, 'mx-auto mt-2 max-w-md')}>
                {feedFilter === 'following'
                  ? 'Follow artists and accounts to fill this feed with their latest updates.'
                  : 'Share your first update or ask your followers a question with a poll.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {feedFilter === 'following' ? (
                  <>
                    <Button className={ARTIST_PRIMARY_BTN} onClick={() => setFeedFilter('all')}>
                      View your posts
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
                )}
              </div>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <ArtistPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                showFollow={feedFilter !== 'all'}
                canPin
                onLike={handleLike}
                onShare={handleShare}
                onFollow={handleFollow}
                onPin={handlePin}
                onLoadComments={loadComments}
                onSubmitComment={submitComment}
              />
            ))
          )}
        </div>

        <div className={cn(ARTIST_CARD, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MessageCircle className="h-4 w-4" />
            Need cross-platform scheduling?
          </div>
          <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
            <Link href="/artist/content">Go to Content Hub</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
