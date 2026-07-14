'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
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
  Calendar,
  UserPlus,
  Check
} from 'lucide-react'
import { EnhancedPostCreator } from './enhanced-post-creator'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
import { Database } from '@/lib/database.types'
import { resolvePublicProfilePath } from '@/lib/utils/public-profile-routes'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { buildFeedPostsUrl, extractFeedErrorMessage } from '@/lib/feed/feed-client'
import { ArticleFeedPreview, type ArticlePreviewData } from '@/components/feed/article-feed-preview'
import { ListingFeedPreview, type ListingPreviewData } from '@/components/feed/listing-feed-preview'
import { EventFeedPreview, type EventPreviewData } from '@/components/feed/event-feed-preview'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import {
  buildFeedMusicTrackFromPost,
  isMusicFeedPost,
  type FeedTrackPreview,
} from '@/lib/feed/music-post-preview'

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
  content_ref_type?: string | null
  content_ref_id?: string | null
  article_preview?: ArticlePreviewData | null
  listing_preview?: ListingPreviewData | null
  event_preview?: EventPreviewData | null
  track_preview?: FeedTrackPreview | null
  metadata?: Record<string, unknown> | null
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

interface SuggestedUser {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  is_verified: boolean
  followers_count: number
  following_count: number
}

function shouldShowArticlePostContent(post: Pick<PostData, 'content' | 'article_preview'>) {
  const content = post.content?.trim()
  if (!content) return false
  if (post.article_preview && content === `Shared an article: ${post.article_preview.title}`) return false
  return true
}

function getProfileUrl(
  profile: Pick<PostData['profiles'], 'username' | 'account_context'> | Pick<SuggestedUser, 'username'>
) {
  if ('account_context' in profile && profile.account_context?.profile_path) {
    return profile.account_context.profile_path
  }
  if (!profile.username) return '/profile/user'
  const accountType =
    'account_context' in profile ? profile.account_context?.type : undefined
  return (
    resolvePublicProfilePath({
      id: profile.username,
      username: profile.username,
      account_type: accountType,
    }) || `/profile/${profile.username}`
  )
}

export function SocialFeed() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('following')
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({})
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
  const [followingUsers, setFollowingUsers] = useState(new Set<string>())

  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()


  const loadPosts = async (feedType = activeTab) => {
    try {
      const feedUrl = buildFeedPostsUrl({
        type: feedType,
        limit: 20,
        userId: user?.id,
        profileId: currentAccount?.profile_id || null,
      })

      console.log(`[SocialFeed] Loading ${feedType} feed from ${feedUrl}`)

      const response = await fetch(feedUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()

      if (!response.ok || result.success === false || result.error) {
        console.error('Error loading posts:', result.error)
        setPosts([])
        return
      }

      // Handle both API response formats
      const postsData = result.posts || result.data || []
      setPosts(postsData)

      console.log(`[SocialFeed] Loaded ${postsData.length} posts for ${feedType} feed`)
    } catch (error) {
      console.error(
        'Error loading posts:',
        extractFeedErrorMessage(error instanceof Error ? error.message : null)
      )
      setPosts([])
    }
  }

  const loadSuggestedUsers = async () => {
    if (!user) return

    try {
      console.log('🔍 Loading suggested users via API...')

      // Use the new API endpoint for suggested users
      const response = await fetch('/api/social/suggested?limit=5', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        console.error('❌ API Error:', result.error)
        return
      }

      console.log('✅ Received suggested users:', result.users?.length || 0)
      setSuggestedUsers(result.users || [])

      // Also get following data for the follow button states
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = followingData?.map(f => f.following_id) || []
      setFollowingUsers(new Set(followingIds))

    } catch (error) {
      console.error('Error loading suggested users:', error)
    }
  }

  const handlePostCreated = (newPost: PostData) => {
    setPosts(prev => [newPost, ...prev])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPosts()
    await loadSuggestedUsers()
    setRefreshing(false)
  }

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

      // Call the new API
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

      console.log('✅ Successfully toggled like')
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

      console.log('✅ Successfully loaded comments for post:', postId)
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
      console.log('💬 Adding comment to post:', postId)

      // Call the new API
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

      console.log('✅ Successfully added comment')
      return result.comment
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  const handleFollow = async (userId: string) => {
    if (!user) return

    try {
      const isFollowing = followingUsers.has(userId)

      // Optimistic update
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        if (isFollowing) {
          newSet.delete(userId)
        } else {
          newSet.add(userId)
        }
        return newSet
      })

      const response = await fetch('/api/social/follow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followingId: userId,
          action: isFollowing ? 'unfollow' : 'follow'
        })
      })

      if (!response.ok) {
        throw new Error('Follow action failed')
      }

      // Refresh suggested users if we followed someone
      if (!isFollowing) {
        await loadSuggestedUsers()
      }
    } catch (error) {
      // Revert on error
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        if (followingUsers.has(userId)) {
          newSet.add(userId)
        } else {
          newSet.delete(userId)
        }
        return newSet
      })
      console.error('Error following user:', error)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    loadPosts(value)
  }

  useEffect(() => {
    if (user) {
      loadPosts()
      loadSuggestedUsers()
    }
    setLoading(false)
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
        // Only add if it's a public post or from someone we follow
        if (payload.new.visibility === 'public' ||
           (activeTab === 'following' && followingUsers.has(payload.new.user_id))) {
          loadPosts() // Reload to get proper joins
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, activeTab, followingUsers])

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Join the Conversation</h2>
            <p className="text-slate-400 mb-4">Sign in to see posts from friends and share your own updates</p>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading your feed...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Creator */}
          <EnhancedPostCreator onPostCreated={handlePostCreated} />

          {/* Feed Tabs */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Your Feed</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border-slate-600/50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
                  <TabsTrigger value="following" className="data-[state=active]:bg-purple-600">
                    <Users className="h-4 w-4 mr-2" />
                    Following
                  </TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
                    <Globe className="h-4 w-4 mr-2" />
                    Discover
                  </TabsTrigger>
                  <TabsTrigger value="personal" className="data-[state=active]:bg-purple-600">
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
                          <Card className="bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50 transition-colors">
                            <CardContent className="p-6">
                              {/* Post Header */}
                              <div className="flex items-start gap-3 mb-4">
                                <Link href={getProfileUrl(post.profiles)} className="flex-shrink-0">
                                  <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200">
                                    <AvatarImage src={post.profiles.avatar_url || ''} />
                                    <AvatarFallback>
                                      {post.profiles.full_name?.[0] || post.profiles.username?.[0] || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                                      <span className="font-semibold text-white">
                                        {post.profiles.full_name || post.profiles.username}
                                      </span>
                                    </Link>
                                    {post.profiles.is_verified && (
                                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    )}
                                    <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                                      <span className="text-slate-400 text-sm">
                                        @{post.profiles.username}
                                      </span>
                                    </Link>
                                    <span className="text-slate-500 text-sm">
                                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  {post.location && (
                                    <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                                      <MapPin className="h-3 w-3" />
                                      <span>{post.location}</span>
                                    </div>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Post Content */}
                              <div className="mb-4">
                                {post.content_ref_type === 'article' && post.article_preview ? (
                                  <>
                                    {shouldShowArticlePostContent(post) ? (
                                      <p className="mb-3 whitespace-pre-line text-white leading-relaxed">
                                        {post.content}
                                      </p>
                                    ) : null}
                                    <ArticleFeedPreview article={post.article_preview} />
                                  </>
                                ) : post.content_ref_type === 'marketplace_listing' && post.listing_preview ? (
                                  <>
                                    <p className="mb-3 whitespace-pre-line text-white leading-relaxed">
                                      {post.content}
                                    </p>
                                    <ListingFeedPreview listing={post.listing_preview} />
                                  </>
                                ) : post.content_ref_type === 'event' && post.event_preview ? (
                                  <>
                                    <p className="mb-3 whitespace-pre-line text-white leading-relaxed">
                                      {post.content}
                                    </p>
                                    <EventFeedPreview event={post.event_preview} />
                                  </>
                                ) : (
                                  <>
                                    <p className="text-white leading-relaxed">
                                      {post.content}
                                    </p>

                                    {/* Link Preview for URLs in content */}
                                    {hasUrls(post.content) && (
                                      <LinkPreview
                                        url={extractUrls(post.content)[0]}
                                        className="mt-3"
                                      />
                                    )}
                                  </>
                                )}

                                {post.hashtags && post.hashtags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
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
                                  <div className="mt-4">
                                    <FeedMusicPlayer
                                      track={musicTrack}
                                      compact
                                      playSource="feed_post"
                                      onComment={() => toggleComments(post.id)}
                                    />
                                  </div>
                                )}
                              </div>

                              <Separator className="bg-slate-700/50 mb-4" />

                              {/* Post Actions */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLike(post.id)}
                                    className={`${post.is_liked ? 'text-red-500' : 'text-slate-400'} hover:text-red-400 transition-colors`}
                                  >
                                    <Heart className={`h-4 w-4 mr-2 ${post.is_liked ? 'fill-current' : ''}`} />
                                    {post.like_count}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-blue-400"
                                    onClick={() => toggleComments(post.id)}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {post.comments_count}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-green-400">
                                    <Share className="h-4 w-4 mr-2" />
                                    {post.shares_count}
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
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
                                <div className="px-4 py-3 border-t border-slate-800 space-y-4">
                                  {/* Existing Comments */}
                                  {loadingComments[post.id] ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                      <span className="ml-2 text-slate-400">Loading comments...</span>
                                    </div>
                                  ) : comments[post.id] && comments[post.id].length > 0 ? (
                                    <div className="space-y-3">
                                      {comments[post.id].map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                          <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={comment.user.avatar_url} />
                                            <AvatarFallback>
                                              {comment.user.full_name?.charAt(0) || comment.user.username?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white text-sm">
                                                  {comment.user.full_name || comment.user.username}
                                                </span>
                                                {comment.user.is_verified && (
                                                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-2 h-2 text-white" />
                                                  </div>
                                                )}
                                                <span className="text-slate-400 text-xs">
                                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                              </div>
                                              <p className="text-slate-200 text-sm">{comment.content}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-slate-400 text-sm">No comments yet. Be the first to comment!</p>
                                    </div>
                                  )}

                                  {/* Comment Input */}
                                  <div className="flex gap-2 pt-2">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                                      <AvatarFallback>
                                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <Input
                                        placeholder="Write a comment..."
                                        className="bg-slate-700 border-slate-600 text-sm"
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
                        )
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-slate-400 mb-4">
                          {activeTab === 'following' ? (
                            <>
                              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No posts from people you follow yet.</p>
                              <p className="text-sm mt-2">Follow some users to see their posts here!</p>
                            </>
                          ) : activeTab === 'personal' ? (
                            <>
                              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>You haven't posted anything yet.</p>
                              <p className="text-sm mt-2">Share your first post above!</p>
                            </>
                          ) : (
                            <>
                              <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No public posts available.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Users */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-lg">Suggested for You</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && suggestedUsers.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 bg-slate-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-700 rounded w-1/2" />
                      </div>
                      <div className="h-8 w-16 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : suggestedUsers.length > 0 ? (
                suggestedUsers.map((suggestedUser) => (
                  <div key={suggestedUser.id} className="flex items-center gap-3">
                    <Link href={getProfileUrl(suggestedUser)} className="flex-shrink-0">
                      <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200">
                        <AvatarImage src={suggestedUser.avatar_url || ''} />
                        <AvatarFallback>
                          {suggestedUser.full_name?.[0] || suggestedUser.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={getProfileUrl(suggestedUser)} className="hover:underline">
                          <span className="font-medium text-white text-sm truncate">
                            {suggestedUser.full_name || suggestedUser.username}
                          </span>
                        </Link>
                        {suggestedUser.is_verified && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">
                        {suggestedUser.followers_count} followers
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleFollow(suggestedUser.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Follow
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-sm">No suggestions available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-lg">Your Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Posts</span>
                  <span className="text-white font-medium">{posts.filter(p => p.user_id === user.id).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Following</span>
                  <span className="text-white font-medium">{followingUsers.size}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Likes Given</span>
                  <span className="text-white font-medium">{posts.filter(p => p.is_liked).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
