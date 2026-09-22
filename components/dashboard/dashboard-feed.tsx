'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Users,
  Globe,
  RefreshCw,
  Loader2,
  MapPin,
  Check,
  ArrowRight,
  Calendar,
  Copy,
  ImageOff,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { buildFeedPostsUrl, extractFeedErrorMessage } from '@/lib/feed/feed-client'
import { readJsonResponse } from '@/lib/http/read-json-response'
import { ArticleFeedPreview, type ArticlePreviewData } from '@/components/feed/article-feed-preview'
import { EventFeedPreview, type EventPreviewData } from '@/components/feed/event-feed-preview'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import {
  buildFeedMusicTrackFromPost,
  isMusicFeedPost,
  type FeedTrackPreview,
} from '@/lib/feed/music-post-preview'
import { FeedMediaGrid, normalizeMediaData } from '@/utils/media-utils'
import { toast } from 'sonner'
import {
  createPostComment,
  getPostComments,
  setPostLike,
  sharePostExternally,
  type PostComment,
} from '@/lib/feed/post-engagement-client'
import { PostAppearanceBoundary } from '@/components/posts/appearance/post-appearance-boundary'
import type { RawPostAppearanceRow } from '@/lib/feed/resolve-post-appearance-dto'
import { usePostStyleFlags } from '@/hooks/use-post-style-flags'
import type { FeedAuthorDTO } from '@/lib/feed/feed-post-dto'

interface PostData {
  id: string
  user_id: string
  content: string
  type: string
  visibility: string
  location?: string
  hashtags?: string[]
  media_urls?: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
  content_ref_type?: string | null
  content_ref_id?: string | null
  article_preview?: ArticlePreviewData | null
  event_preview?: EventPreviewData | null
  track_preview?: FeedTrackPreview | null
  metadata?: Record<string, unknown> | null
  media_unavailable_count?: number
  viewer_can_manage?: boolean
  author?: FeedAuthorDTO
  appearance?: RawPostAppearanceRow | null
  post_appearances?: RawPostAppearanceRow | RawPostAppearanceRow[] | null
  profiles: {
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
    account_context?: {
      type: string
      profile_id: string
      display_name: string
      profile_path?: string | null
    }
  }
  is_liked: boolean
  like_count: number
}

type Comment = PostComment

function getProfileUrl(profile: PostData['profiles']) {
  if (profile?.account_context?.profile_path) return profile.account_context.profile_path
  if (!profile?.username) return '/profile/user'
  return `/profile/${profile.username}`
}

function dedupePostsById(posts: PostData[]) {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (!post?.id || seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

export function DashboardFeed() {
  const pageSize = 20
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('following')
  const [page, setPage] = useState(0)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({})
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
  const [feedMessage, setFeedMessage] = useState<string | null>(null)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const recentlyCreatedPostsRef = useRef<Map<string, PostData>>(new Map())
  const recentlyCreatedPostTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const { flags: postStyleFlags } = usePostStyleFlags()
  const router = useRouter()

  const isPostVisibleInFeed = (post: PostData, feedType: string) => {
    if (feedType === 'all') return post.visibility === 'public'
    if (feedType === 'following') return post.visibility === 'public' || post.visibility === 'followers'
    if (feedType !== 'personal') return true

    const activeProfileId = currentAccount?.profile_id || null
    const postProfileId = post.posted_as_profile_id || post.profiles?.account_context?.profile_id || null
    if (activeProfileId && postProfileId === activeProfileId) return true
    return Boolean(user?.id && post.user_id === user.id)
  }

  const mergeRecentlyCreatedPosts = (feedType: string, postsData: PostData[]) => {
    const serverPostIds = new Set(postsData.map(post => post.id).filter(Boolean))
    const optimisticPosts: PostData[] = []

    recentlyCreatedPostsRef.current.forEach((post, postId) => {
      if (serverPostIds.has(postId)) {
        recentlyCreatedPostsRef.current.delete(postId)
        const timer = recentlyCreatedPostTimersRef.current.get(postId)
        if (timer) clearTimeout(timer)
        recentlyCreatedPostTimersRef.current.delete(postId)
        return
      }

      if (isPostVisibleInFeed(post, feedType)) {
        optimisticPosts.push(post)
      }
    })

    return dedupePostsById([...optimisticPosts, ...postsData])
  }

  const loadPosts = async ({
    feedType = activeTab,
    pageIndex = 0,
    append = false
  }: {
    feedType?: string
    pageIndex?: number
    append?: boolean
  } = {}) => {
    try {
      const offset = pageIndex * pageSize
      const response = await fetch(buildFeedPostsUrl({
        type: feedType,
        limit: pageSize,
        offset,
        userId: user?.id,
        profileId: currentAccount?.profile_id || null,
      }), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      type FeedResult = {
        success?: boolean
        error?: import('@/lib/feed/feed-client').FeedApiError
        posts?: PostData[]
        data?: PostData[]
        message?: string
      }
      const result = await readJsonResponse<FeedResult>(response)

      if (!response.ok || !result || result.success === false || result.error) {
        const errorMessage = extractFeedErrorMessage(
          result?.error,
          `Failed to load feed (HTTP ${response.status})`
        )
        console.error('Error loading posts:', errorMessage, {
          status: response.status,
          error: result?.error,
        })
        setFeedError(
          extractFeedErrorMessage(result?.error, 'Failed to load your feed. Please try again.')
        )
        return
      }

      // Standardize on { posts } but gracefully support { data }
      const postsData: PostData[] = result.posts || result.data || []

      setPosts((prev) => {
        if (append) return dedupePostsById([...prev, ...postsData])
        if (pageIndex === 0) return mergeRecentlyCreatedPosts(feedType, postsData)
        return dedupePostsById(postsData)
      })
      setPage(pageIndex)
      setHasMore(postsData.length === pageSize)
      setFeedError(null)

      // Handle API messages (like empty feed guidance)
      if (result.message) {
        setFeedMessage(result.message)
      } else {
        setFeedMessage(null)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setFeedError(
        extractFeedErrorMessage(error instanceof Error ? error.message : null, 'Failed to load your feed. Please try again.')
      )
    }
  }

  const handlePostCreated = (newPost: PostData) => {
    recentlyCreatedPostsRef.current.set(newPost.id, newPost)
    const existingTimer = recentlyCreatedPostTimersRef.current.get(newPost.id)
    if (existingTimer) clearTimeout(existingTimer)
    const timer = setTimeout(() => {
      recentlyCreatedPostsRef.current.delete(newPost.id)
      recentlyCreatedPostTimersRef.current.delete(newPost.id)
    }, 15000)
    recentlyCreatedPostTimersRef.current.set(newPost.id, timer)
    setPosts(prev => dedupePostsById([newPost, ...prev]))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPosts({ feedType: activeTab, pageIndex: 0, append: false })
    setRefreshing(false)
  }

  const handleCopyPostLink = async (postId: string) => {
    try {
      const result = await sharePostExternally(postId, { preferNative: false })
      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, shares_count: result.shares_count } : post
      ))
      toast.success('Post link copied and share saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share post')
    }
  }

  const handleDeletePost = async () => {
    if (!deletePostId) return

    const postId = deletePostId
    const previousPosts = posts
    const previousComments = comments
    const previousShowComments = showComments
    const previousLoadingComments = loadingComments
    const previousRecentlyCreatedPosts = new Map(recentlyCreatedPostsRef.current)
    const previousRecentlyCreatedPostTimers = new Map(recentlyCreatedPostTimersRef.current)

    setIsDeletingPost(true)
    setPosts(prev => prev.filter(post => post.id !== postId))
    setComments(prev => {
      const next = { ...prev }
      delete next[postId]
      return next
    })
    setShowComments(prev => {
      const next = { ...prev }
      delete next[postId]
      return next
    })
    setLoadingComments(prev => {
      const next = { ...prev }
      delete next[postId]
      return next
    })
    recentlyCreatedPostsRef.current.delete(postId)

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to delete post')
      }

      const timer = recentlyCreatedPostTimersRef.current.get(postId)
      if (timer) clearTimeout(timer)
      recentlyCreatedPostTimersRef.current.delete(postId)
      setDeletePostId(null)
      toast.success('Post deleted')
    } catch (error) {
      setPosts(previousPosts)
      setComments(previousComments)
      setShowComments(previousShowComments)
      setLoadingComments(previousLoadingComments)
      recentlyCreatedPostsRef.current = previousRecentlyCreatedPosts
      recentlyCreatedPostTimersRef.current = previousRecentlyCreatedPostTimers
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeletingPost(false)
    }
  }

  // Infinite scroll: load next page when sentinel is visible
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (!first.isIntersecting || loading || refreshing || isFetchingMore || !hasMore) return

      setIsFetchingMore(true)
      const nextPage = page + 1
      loadPosts({ feedType: activeTab, pageIndex: nextPage, append: true })
        .finally(() => setIsFetchingMore(false))
    }, { rootMargin: '200px' })

    const current = loadMoreRef.current
    if (current) observer.observe(current)
    return () => { if (current) observer.unobserve(current) }
  }, [activeTab, hasMore, isFetchingMore, loading, page, refreshing])

  const handleLike = async (postId: string) => {
    if (!user) return

    try {
      const currentPost = posts.find(p => p.id === postId)
      if (!currentPost) return

      const isCurrentlyLiked = currentPost.is_liked
      const action = isCurrentlyLiked ? 'unlike' : 'like'

      // Optimistic update
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              is_liked: !post.is_liked,
              like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1
            }
          : post
      ))

      const result = await setPostLike(postId, action)
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, is_liked: result.is_liked, like_count: result.likes_count }
          : post
      ))

    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              is_liked: !post.is_liked,
              like_count: post.is_liked ? post.like_count + 1 : post.like_count - 1
            }
          : post
      ))
      console.error('Error toggling like:', error)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))

      const result = await getPostComments(postId)
      const loadedComments = result.comments || []
      setComments(prev => ({ ...prev, [postId]: loadedComments }))
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, comments_count: loadedComments.length }
          : post
      ))

    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const toggleComments = async (postId: string) => {
    const isCurrentlyShowing = showComments[postId]

    if (!isCurrentlyShowing) {
      // Load comments if we don't have them yet
      if (!comments[postId]) {
        await loadComments(postId)
      }
    }

    setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShowing }))
  }

  const handleComment = async (postId: string, content: string) => {
    if (!user || !content.trim()) return

    try {
      const result = await createPostComment(postId, content.trim())

      // Add the new comment to the local state
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), result.comment]
      }))

      // Update the post comments count
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
              ...post,
              comments_count: result.comments_count
            }
          : post
      ))

      // Ensure comments are shown after adding one
      setShowComments(prev => ({ ...prev, [postId]: true }))

      return result.comment
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  useEffect(() => {
    let isMounted = true

    const loadInitialFeed = async () => {
      if (!user) {
        if (isMounted) setLoading(false)
        return
      }

      if (isMounted) setLoading(true)
      await loadPosts({ feedType: activeTab, pageIndex: 0, append: false })
      if (isMounted) setLoading(false)
    }

    loadInitialFeed()

    return () => {
      isMounted = false
    }
  }, [user, activeTab])

  useEffect(() => {
    if (!user) return

    const handleDashboardPostCreated = (event: Event) => {
      const customEvent = event as CustomEvent<PostData | null>
      if (customEvent.detail?.id) {
        handlePostCreated(customEvent.detail)
      }
      loadPosts({ feedType: activeTab, pageIndex: 0, append: false })
    }

    window.addEventListener('dashboard:post-created', handleDashboardPostCreated)
    return () => window.removeEventListener('dashboard:post-created', handleDashboardPostCreated)
  }, [user, activeTab])

  useEffect(() => {
    return () => {
      recentlyCreatedPostTimersRef.current.forEach(timer => clearTimeout(timer))
      recentlyCreatedPostTimersRef.current.clear()
      recentlyCreatedPostsRef.current.clear()
    }
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        // Refresh on visible social posts to keep the dashboard feed up to date.
        if (payload.new.visibility === 'public' || payload.new.visibility === 'followers') {
          loadPosts({ feedType: activeTab, pageIndex: 0, append: false }) // Reload to get proper joins
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, activeTab])

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading your feed...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Your Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh feed"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/community')}
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 rounded-xl"
            >
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {feedError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-200">{feedError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 h-7 px-2 text-red-200 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
            <TabsTrigger value="following" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
              <Globe className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="personal" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
              Your Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            <AnimatePresence>
              {posts.length > 0 ? (
                posts.map((post, index) => {
                  const musicTrack = isMusicFeedPost(post)
                    ? buildFeedMusicTrackFromPost(post)
                    : null

                  return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PostAppearanceBoundary
                      postId={post.id}
                      appearance={post.appearance ?? post.post_appearances}
                      enabled={postStyleFlags.post_styles_read}
                      surface="compact"
                    >
                    <Card data-slot="card" className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        {/* Post Header */}
                        <div data-post-region="header" className="flex items-start gap-3 mb-3">
                          <Link href={getProfileUrl(post.profiles)} className="flex-shrink-0">
                            <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200 h-10 w-10">
                              <AvatarImage
                                src={post.profiles.avatar_url || ''}
                                alt={`${post.profiles.full_name || post.profiles.username} profile photo`}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm">
                                {post.profiles.full_name?.[0] || post.profiles.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                                <span className="font-semibold text-white text-sm">
                                  {post.profiles.full_name || post.profiles.username}
                                </span>
                              </Link>
                              {post.profiles.is_verified && (
                                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}
                              {post.content_ref_type === 'event_update' && (
                                <Badge
                                  variant="outline"
                                  className="border-purple-500/30 bg-purple-500/10 text-purple-200 text-[10px] px-1.5 py-0"
                                >
                                  <Calendar className="h-2.5 w-2.5 mr-1" />
                                  Event update
                                </Badge>
                              )}
                              <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                                <span className="text-gray-400 text-xs">
                                  @{post.profiles.username}
                                </span>
                              </Link>
                              <span className="text-gray-500 text-xs">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {post.location && (
                              <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{post.location}</span>
                              </div>
                            )}
                          </div>
                          <DropdownMenu
                            open={openMenuPostId === post.id}
                            onOpenChange={(open) => setOpenMenuPostId(open ? post.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label="More post options"
                                className="h-8 w-8 p-0 text-gray-400 hover:bg-white/10 hover:text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={8}
                              className="w-48 rounded-2xl border border-white/20 bg-purple-950/70 p-1.5 text-slate-100 shadow-2xl shadow-purple-950/30 backdrop-blur-2xl"
                            >
                              <DropdownMenuItem
                                className="h-10 rounded-xl px-3 text-sm font-medium text-slate-100 outline-none transition-colors focus:bg-white/10 focus:text-white"
                                onSelect={() => void handleCopyPostLink(post.id)}
                              >
                                <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                                  <Copy className="h-4 w-4" />
                                </span>
                                <span>Copy link</span>
                              </DropdownMenuItem>
                              {post.viewer_can_manage && (
                                <DropdownMenuItem
                                  className="h-10 rounded-xl px-3 text-sm font-medium text-red-100 outline-none transition-colors focus:bg-red-500/20 focus:text-red-50"
                                  onSelect={(event) => {
                                    event.preventDefault()
                                    setOpenMenuPostId(null)
                                    setDeletePostId(post.id)
                                  }}
                                >
                                  <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-200">
                                    <Trash2 className="h-4 w-4" />
                                  </span>
                                  <span>Delete post</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Post Content */}
                        <div data-post-region="body" className="mb-3">
                          {post.content_ref_type === 'article' && post.article_preview ? (
                            <ArticleFeedPreview article={post.article_preview} compact />
                          ) : post.content_ref_type === 'event_update' && post.event_preview ? (
                            <>
                              <p className="mb-2 text-white text-sm leading-relaxed">
                                {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                              </p>
                              <EventFeedPreview event={post.event_preview} compact />
                            </>
                          ) : post.content_ref_type === 'event' && post.event_preview ? (
                            <>
                              <p className="mb-2 text-white text-sm leading-relaxed">
                                {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                              </p>
                              <EventFeedPreview event={post.event_preview} compact />
                            </>
                          ) : (
                            <>
                              <p className="text-white text-sm leading-relaxed">
                                {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                              </p>

                              {/* Link Preview */}
                              {hasUrls(post.content) && (
                                <LinkPreview
                                  url={extractUrls(post.content)[0]}
                                  className="mt-2"
                                />
                              )}

                              {!musicTrack && (
                                <>
                                  <FeedMediaGrid
                                    mediaItems={normalizeMediaData(post)}
                                    postId={post.id}
                                    frameClassName="border border-white/10"
                                  />
                                  {Number(post.media_unavailable_count || 0) > 0 && (
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                                      <ImageOff className="h-4 w-4 shrink-0 text-amber-200" />
                                      <span>
                                        {post.media_unavailable_count === 1
                                          ? '1 photo is unavailable because it was not uploaded.'
                                          : `${post.media_unavailable_count} photos are unavailable because they were not uploaded.`}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {musicTrack && (
                                <div className="mt-3">
                                  <FeedMusicPlayer
                                    track={musicTrack}
                                    compact
                                    playSource="feed_post"
                                    onComment={() => toggleComments(post.id)}
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.hashtags.slice(0, 3).map((hashtag) => (
                                <Badge
                                  key={hashtag}
                                  variant="secondary"
                                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer text-xs"
                                >
                                  #{hashtag}
                                </Badge>
                              ))}
                              {post.hashtags.length > 3 && (
                                <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 text-xs">
                                  +{post.hashtags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <Separator className="bg-white/10 mb-3" />

                        {/* Post Actions */}
                        <div data-post-region="actions" className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {post.content_ref_type === 'event_update' ? (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-purple-300 hover:text-purple-200 h-8 px-2"
                              >
                                <Link href={post.event_preview?.url || `/events/${post.content_ref_id}`}>
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span className="text-xs">View event</span>
                                </Link>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLike(post.id)}
                                  className={`${post.is_liked ? 'text-red-500' : 'text-gray-400'} hover:text-red-400 transition-colors h-8 px-2`}
                                >
                                  <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                                  <span className="text-xs">{post.like_count}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-blue-400 h-8 px-2"
                                  onClick={() => toggleComments(post.id)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  <span className="text-xs">{post.comments_count}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Share post"
                                  title="Copy post link"
                                  className="text-gray-400 hover:text-green-400 h-8 px-2"
                                  onClick={() => void handleCopyPostLink(post.id)}
                                >
                                  <Share className="h-4 w-4 mr-1" />
                                  <span className="text-xs">{post.shares_count}</span>
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            {post.visibility === 'public' ? (
                              <Globe className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            <span>{post.visibility === 'followers' ? 'Friends' : post.visibility}</span>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {post.content_ref_type !== 'event_update' && showComments[post.id] && (
                          <div className="px-3 py-2 border-t border-white/10 space-y-3 mt-3">
                            {/* Existing Comments */}
                            {loadingComments[post.id] ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                <span className="ml-2 text-gray-400 text-xs">Loading comments...</span>
                              </div>
                            ) : comments[post.id] && comments[post.id].length > 0 ? (
                              <div className="space-y-2">
                                {comments[post.id].slice(0, 2).map((comment) => (
                                  <div key={comment.id} className="flex gap-2">
                                    <Avatar className="h-6 w-6 flex-shrink-0">
                                      <AvatarImage
                                        src={comment.user.avatar_url}
                                        alt={`${comment.user.full_name || comment.user.username} profile photo`}
                                      />
                                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                                        {comment.user.full_name?.charAt(0) || comment.user.username?.charAt(0) || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-white/5 rounded-lg px-2 py-1">
                                        <div className="flex items-center gap-1 mb-1">
                                          <span className="font-medium text-white text-xs">
                                            {comment.user.full_name || comment.user.username}
                                          </span>
                                          {comment.user.is_verified && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center">
                                              <Check className="w-1.5 h-1.5 text-white" />
                                            </div>
                                          )}
                                          <span className="text-gray-400 text-xs">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                          </span>
                                        </div>
                                        <p className="text-gray-200 text-xs">{comment.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {comments[post.id].length > 2 && (
                                  <div className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      className="text-gray-400 hover:text-blue-400 text-xs"
                                    >
                                      <Link href={`/posts/${post.id}`}>
                                        View {comments[post.id].length - 2} more comments
                                      </Link>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-gray-400 text-xs">No comments yet. Be the first to comment!</p>
                              </div>
                            )}

                            {/* Comment Input */}
                            <div className="flex gap-2 pt-1">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={user?.user_metadata?.avatar_url} alt="Your profile photo" />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <Input
                                  placeholder="Write a comment..."
                                  className="bg-white/10 border-white/20 text-white text-xs h-8"
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      const content = e.currentTarget.value
                                      if (content.trim()) {
                                        try {
                                          await handleComment(post.id, content)
                                          e.currentTarget.value = ''
                                        } catch (error) {
                                          console.error('Failed to add comment:', error)
                                        }
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    </PostAppearanceBoundary>
                  </motion.div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    {activeTab === 'following' ? (
                      <>
                        <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          {feedMessage || "No posts from friends yet."}
                        </p>
                        <p className="text-xs mt-1">
                          {feedMessage ? "Try switching to the Discover tab to see public posts." : "Follow friends to see their posts here."}
                        </p>
                      </>
                    ) : activeTab === 'personal' ? (
                      <>
                        <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">You haven&apos;t posted anything yet.</p>
                        <p className="text-xs mt-1">Share your first post above!</p>
                      </>
                    ) : (
                      <>
                        <Globe className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No public posts available.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>
            {/* Load more sentinel */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-2 text-center">
                {isFetchingMore && (
                  <span className="text-xs text-gray-400">Loading more posts...</span>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

    </Card>
    <AlertDialog open={Boolean(deletePostId)} onOpenChange={(open) => !open && setDeletePostId(null)}>
      <AlertDialogContent className="max-w-md overflow-hidden rounded-3xl border border-white/20 bg-purple-950/70 p-0 text-white shadow-2xl shadow-purple-950/40 backdrop-blur-2xl">
        <div className="bg-gradient-to-br from-white/20 via-white/5 to-purple-500/10 p-6">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/20 text-red-100 shadow-lg shadow-red-950/20">
                <Trash2 className="h-5 w-5" />
              </span>
              <AlertDialogTitle className="text-2xl font-semibold tracking-normal text-white">
                Delete post?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-6 text-slate-300">
              This removes the post from your feed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:justify-end">
            <AlertDialogCancel className="h-11 rounded-2xl border border-white/20 bg-white/10 px-5 font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-white/20 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingPost}
              onClick={(event) => {
                event.preventDefault()
                void handleDeletePost()
              }}
              className="h-11 rounded-2xl border border-red-300/20 bg-gradient-to-r from-red-500 to-rose-500 px-5 font-semibold text-white shadow-lg shadow-red-950/20 transition-colors hover:from-red-400 hover:to-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeletingPost ? 'Deleting...' : 'Delete post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
