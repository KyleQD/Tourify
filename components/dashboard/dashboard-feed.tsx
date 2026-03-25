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
  ArrowRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePhotoViewer } from '@/hooks/use-photo-viewer'

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
  profiles: {
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
  is_liked: boolean
  like_count: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

// Helper function to generate profile URL based on username
function getProfileUrl(username: string) {
  if (!username) return '/profile/user'
  return `/profile/${username}`
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
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const photoViewer = usePhotoViewer()

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
      const response = await fetch(`/api/feed/posts?type=${feedType}&limit=${pageSize}&offset=${offset}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()
      
      if (result.error) {
        console.error('Error loading posts:', result.error)
        setFeedError(result.error)
        return
      }
      
      // Standardize on { posts } but gracefully support { data }
      const postsData = result.posts || result.data || []
      
      setPosts((prev) => append ? dedupePostsById([...prev, ...postsData]) : dedupePostsById(postsData))
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
      setFeedError('Failed to load your feed. Please try again.')
    }
  }

  const handlePostCreated = (newPost: PostData) => {
    setPosts(prev => dedupePostsById([newPost, ...prev]))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPosts({ feedType: activeTab, pageIndex: 0, append: false })
    setRefreshing(false)
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

      // Call the API
      const response = await fetch(`/api/posts/${postId}/likes`, {
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
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const result = await response.json()
      setComments(prev => ({ ...prev, [postId]: result.comments || [] }))
      
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
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const result = await response.json()
      
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
              comments_count: post.comments_count + 1
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
        // Refresh on public posts to keep feed up to date.
        if (payload.new.visibility === 'public') {
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
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-400" />
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
              onClick={() => router.push('/feed')}
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
              Following
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
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        {/* Post Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <Link href={getProfileUrl(post.profiles.username)} className="flex-shrink-0">
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
                              <Link href={getProfileUrl(post.profiles.username)} className="hover:underline">
                                <span className="font-semibold text-white text-sm">
                                  {post.profiles.full_name || post.profiles.username}
                                </span>
                              </Link>
                              {post.profiles.is_verified && (
                                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}
                              <Link href={getProfileUrl(post.profiles.username)} className="hover:underline">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="More post options (coming soon)"
                            disabled
                            title="More options coming soon"
                            className="h-8 w-8 p-0 opacity-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Post Content */}
                        <div className="mb-3">
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
                          
                          {/* Media Display */}
                          {post.media_urls && post.media_urls.length > 0 && post.media_urls[0] && (
                            <div className="mt-3">
                              {post.media_urls.length === 1 ? (
                                // Single image - full width with natural aspect ratio
                                <div 
                                  className="relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    if (post.media_urls && post.media_urls.length > 0) {
                                      photoViewer.openPhotoViewer(post.media_urls, 0, post)
                                    } else {
                                      console.error('❌ No media URLs available for this post')
                                    }
                                  }}
                                >
                                  <img
                                    src={post.media_urls?.[0] || ''}
                                    alt={`${post.profiles.full_name || post.profiles.username} post image`}
                                    className="w-full h-auto max-h-96 object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      console.error('❌ Failed to load image:', post.media_urls?.[0])
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                // Multiple images - grid layout
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {post.media_urls.slice(0, 4).map((url, index) => (
                                    url && (
                                      <div 
                                        key={`${post.id}-${url}-${index}`}
                                        className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => {
                                          if (post.media_urls && post.media_urls.length > 0) {
                                            photoViewer.openPhotoViewer(post.media_urls, index, post)
                                          } else {
                                            console.error('❌ No media URLs available for this post')
                                          }
                                        }}
                                      >
                                        <img
                                          src={url}
                                          alt={`${post.profiles.full_name || post.profiles.username} post image ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            console.error('❌ Failed to load image:', url)
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                              {post.media_urls.length > 4 && (
                                <p className="text-gray-400 text-xs mt-2">
                                  +{post.media_urls.length - 4} more photos
                                </p>
                              )}
                            </div>
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
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
                              aria-label="Share post (coming soon)"
                              disabled
                              title="Share is coming soon"
                              className="text-gray-400 h-8 px-2 opacity-50"
                            >
                              <Share className="h-4 w-4 mr-1" />
                              <span className="text-xs">{post.shares_count}</span>
                            </Button>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            {post.visibility === 'public' ? (
                              <Globe className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            <span className="capitalize">{post.visibility}</span>
                          </div>
                        </div>
                        
                        {/* Comments Section */}
                        {showComments[post.id] && (
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
                                      disabled
                                      title="Expanded comment thread is coming soon"
                                      className="text-gray-400 text-xs opacity-50"
                                    >
                                      View {comments[post.id].length - 2} more comments
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
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    {activeTab === 'following' ? (
                      <>
                        <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          {feedMessage || "No posts from people you follow yet."}
                        </p>
                        <p className="text-xs mt-1">
                          {feedMessage ? "Try switching to the Discover tab to see all posts!" : "Follow some users to see their posts here!"}
                        </p>
                      </>
                    ) : activeTab === 'personal' ? (
                      <>
                        <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">You haven't posted anything yet.</p>
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
  )
} 