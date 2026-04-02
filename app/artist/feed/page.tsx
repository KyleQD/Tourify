'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Music, 
  Image, 
  Video, 
  FileText,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  Star,
  Award,
  Target,
  Lightbulb,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { CleanPostCreator } from '@/components/feed/clean-post-creator'
import { MediaDisplay } from '@/components/feed/media-display'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// Database type not used; removed invalid import
import { useAuth } from '@/contexts/auth-context'
import { useArtist } from '@/contexts/artist-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface Post {
  id: string
  content: string
  type: string
  visibility: string
  location?: string
  hashtags: string[]
  media_items?: any[]
  created_at: string
  user: {
    id: string
    username: string
    avatar_url?: string
  }
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked: boolean
}

export default function ArtistFeedPage() {
  const { user } = useAuth()
  const { profile: artistProfile, displayName, avatarInitial } = useArtist()
  const [posts, setPosts] = useState<Post[]>([])
  const [networkPosts, setNetworkPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true)
  const [activeTab, setActiveTab] = useState('live')
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'trending'>('all')
  const supabase = createClientComponentClient()

  // Fetch user's own posts
  const fetchPosts = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Fetch only current user's posts
      const response = await fetch(`/api/feed/posts?type=user&user_id=${user.id}&limit=20`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.log('API Response Error:', response.status, 'using empty posts for now')
        // Don't show error to user, just use empty posts
        setPosts([])
        setIsLoading(false)
        return
      }

      const result = await response.json()
      console.log('API Response:', result)
      const feedPosts = result.data || result.posts || []

      // Transform posts to match our Post interface
      const transformedPosts: Post[] = await transformPosts(feedPosts)

      console.log('Fetched user posts:', transformedPosts)
      setPosts(transformedPosts)
    } catch (error) {
      console.log('Error fetching posts, using empty posts:', error)
      // Don't show error toast, just handle gracefully
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch network posts (following, followers, pages)
  const fetchNetworkPosts = async () => {
    if (!user?.id) return

    setIsLoadingNetwork(true)
    try {
      // Get users that this artist follows
      const { data: following, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (followError) {
        console.log('Follows table not available yet, using empty network posts')
        setNetworkPosts([])
        setIsLoadingNetwork(false)
        return
      }

      const followingIds = following?.map(f => f.following_id) || []

      if (followingIds.length === 0) {
        setNetworkPosts([])
        setIsLoadingNetwork(false)
        return
      }

      // Fetch posts from followed users
      const response = await fetch('/api/feed/posts?type=network&limit=30', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ following_ids: followingIds, limit: 30 })
      })

      if (!response.ok) {
        console.log('Network API Response Error:', response.status, 'using empty network posts')
        setNetworkPosts([])
        setIsLoadingNetwork(false)
        return
      }

      const result = await response.json()
      console.log('Network API Response:', result)
      const feedPosts = result.data || result.posts || []

      const transformedPosts: Post[] = await transformPosts(feedPosts)
      
      console.log('Fetched network posts:', transformedPosts)
      setNetworkPosts(transformedPosts)
    } catch (error) {
      console.log('Error fetching network posts, using empty posts:', error)
      // Don't show error toast, just handle gracefully
      setNetworkPosts([])
    } finally {
      setIsLoadingNetwork(false)
    }
  }

  // Helper function to transform posts
  const transformPosts = async (feedPosts: any[]): Promise<Post[]> => {
    // Fetch liked posts for current user
    const postIds = feedPosts.map((post: any) => post.id)
    let likedPosts: string[] = []
    if (postIds.length > 0 && user?.id) {
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', user.id)
      likedPosts = likesData?.map(like => like.post_id) || []
    }

    return feedPosts.map((post: any) => {
      const userData = post.profiles || post.user || {
        id: post.user_id,
        username: post.account_username || 'Unknown',
        avatar_url: post.account_avatar_url
      }

      return {
        id: post.id,
        content: post.content,
        type: post.type || 'text',
        visibility: post.visibility || 'public',
        location: post.location,
        hashtags: post.hashtags || [],
        media_items: (post.media_urls || []).map((url: string, index: number) => ({
          id: `${post.id}-media-${index}`,
          type: 'image',
          url: url,
          altText: `Media ${index + 1}`,
          title: `Media ${index + 1}`
        })),
        created_at: post.created_at,
        user: {
          id: userData.id,
          username: userData.username || userData.full_name || 'Unknown',
          avatar_url: userData.avatar_url
        },
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: post.shares_count || 0,
        is_liked: likedPosts.includes(post.id)
      }
    })
  }

  useEffect(() => {
    if (user) {
      fetchPosts()
      fetchNetworkPosts()
    }
  }, [user])

  // Get filtered posts based on current filter
  const getFilteredPosts = () => {
    switch (feedFilter) {
      case 'following':
        return networkPosts
      case 'trending':
        // Sort by engagement (likes + comments + shares)
        return [...posts, ...networkPosts].sort((a, b) => {
          const engagementA = a.likes_count + a.comments_count + a.shares_count
          const engagementB = b.likes_count + b.comments_count + b.shares_count
          return engagementB - engagementA
        })
      case 'all':
      default:
        // Combine and sort by date
        return [...posts, ...networkPosts].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }
  }

  const filteredPosts = getFilteredPosts()
  const isLoadingFeed = feedFilter === 'following' ? isLoadingNetwork : (isLoading || isLoadingNetwork)

  const handlePostCreated = (newPost: any) => {
    // Transform the API response to match our Post interface
    const transformedPost: Post = {
      id: newPost.id,
      content: newPost.content,
      type: newPost.type || 'text',
      visibility: newPost.visibility || 'public',
      location: newPost.location,
      hashtags: newPost.hashtags || [],
      media_items: (newPost.media_urls || newPost.media_items || []).map((url: string, index: number) => ({
        id: `${newPost.id}-media-${index}`,
        type: 'image', // Default to image, could be enhanced to detect type from URL
        url: url,
        altText: `Media ${index + 1}`,
        title: `Media ${index + 1}`
      })),
      created_at: newPost.created_at,
      user: {
        id: newPost.user_id,
        username: newPost.account_username || newPost.profiles?.username || 'Unknown',
        avatar_url: newPost.account_avatar_url || newPost.profiles?.avatar_url
      },
      likes_count: newPost.likes_count || 0,
      comments_count: newPost.comments_count || 0,
      shares_count: newPost.shares_count || 0,
      is_liked: false
    }
    
    setPosts(prev => [transformedPost, ...prev])
    toast.success('Post created successfully!')
  }

  const handleLike = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('post_likes')
        .upsert({
          post_id: postId,
          user_id: user?.id
        })

      if (error) throw error

      // Optimistically update the UI
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !post.is_liked,
              likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ))

      toast.success('Post liked!')
    } catch (error) {
      console.error('Error liking post:', error)
      toast.error('Failed to like post')
    }
  }

  const handleComment = async (postId: string) => {
    // TODO: Implement comment functionality
    toast.info('Comment functionality coming soon!')
  }

  const handleShare = async (postId: string) => {
    // TODO: Implement share functionality
    toast.info('Share functionality coming soon!')
  }

  const handleFollow = async (userId: string, action: 'follow' | 'unfollow') => {
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          following_id: userId, 
          action 
        })
      })

      if (!response.ok) {
        toast.info('Follow functionality coming soon!')
        return
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success(result.message)
        // Refresh network posts if we're on the following tab
        if (feedFilter === 'following') {
          fetchNetworkPosts()
        }
      } else {
        toast.info('Follow functionality coming soon!')
      }
    } catch (error) {
      console.log('Follow functionality not ready yet:', error)
      toast.info('Follow functionality coming soon!')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatSafeDate(date.toISOString())
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'audio': return <Music className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      default: return null
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Users className="h-4 w-4" />
      case 'followers': return <Users className="h-4 w-4" />
      case 'private': return <Users className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/3 to-teal-500/3 rounded-full blur-3xl"
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
          >
            Artist Feed
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 text-lg"
          >
            Share your music, connect with fans, and grow your audience
          </motion.p>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <TabsTrigger 
                value="live" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 transition-all duration-300"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Live Feed
                </motion.div>
              </TabsTrigger>
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 transition-all duration-300"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </motion.div>
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 transition-all duration-300"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Insights
                </motion.div>
              </TabsTrigger>
            </TabsList>

            {/* Live Feed Tab */}
            <TabsContent value="live" className="space-y-6">
            {/* Feed Header with Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Your Feed</h2>
              
              <div className="flex items-center gap-3">
                {/* Feed Filter Buttons */}
                <div className="flex items-center gap-1 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1 shadow-xl">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={feedFilter === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFeedFilter('all')}
                      className={cn(
                        "text-xs transition-all duration-300",
                        feedFilter === 'all' 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      All
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={feedFilter === 'following' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFeedFilter('following')}
                      className={cn(
                        "text-xs transition-all duration-300",
                        feedFilter === 'following' 
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Following
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={feedFilter === 'trending' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFeedFilter('trending')}
                      className={cn(
                        "text-xs transition-all duration-300",
                        feedFilter === 'trending' 
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Button>
                  </motion.div>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchPosts()
                      fetchNetworkPosts()
                    }}
                    disabled={isLoadingFeed}
                    className="border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl transition-all duration-300"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2 transition-transform", isLoadingFeed && "animate-spin")} />
                    Refresh
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Network Discovery (show when no following posts) */}
            {feedFilter === 'following' && networkPosts.length === 0 && !isLoadingNetwork && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-pink-900/30 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div 
                        className="h-10 w-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center"
                        animate={{ 
                          boxShadow: [
                            '0 0 20px rgba(168, 85, 247, 0.3)',
                            '0 0 40px rgba(168, 85, 247, 0.6)',
                            '0 0 20px rgba(168, 85, 247, 0.3)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Users className="h-5 w-5 text-purple-400" />
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Discover Artists</h3>
                        <p className="text-purple-200/80 text-sm">Connect with other artists and build your network</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50 transition-all duration-300"
                          onClick={() => setFeedFilter('all')}
                        >
                          <Target className="h-3 w-3 mr-1" />
                          Browse All Posts
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/50 transition-all duration-300"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Find Similar Artists
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-500/30 text-green-300 hover:bg-green-500/20 hover:border-green-400/50 transition-all duration-300"
                        >
                          <Lightbulb className="h-3 w-3 mr-1" />
                          Trending Hashtags
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Post Creator (hide when viewing following feed) */}
            {feedFilter !== 'following' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CleanPostCreator
                  onPostCreated={handlePostCreated}
                  placeholder="Share your latest track, behind-the-scenes moments, or connect with your fans..."
                  maxMediaItems={10}
                  defaultVisibility="public"
                  showAdvancedOptions={true}
                  user={{
                    id: user?.id || '',
                    username: displayName,
                    avatar_url: (artistProfile as any)?.avatar_url || undefined
                  }}
                />
              </motion.div>
            )}

            {/* Posts Feed */}
            <div className="space-y-6">
              {isLoadingFeed ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feedFilter === 'following' ? 'No posts from following' : 'No posts yet'}
                    </h3>
                    <p className="text-white/60 mb-6">
                      {feedFilter === 'following' 
                        ? "Start following artists and pages to see their content here!"
                        : "Be the first to share something amazing with your community!"
                      }
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={() => feedFilter === 'following' ? setFeedFilter('all') : setActiveTab('live')}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 transition-all duration-300"
                      >
                        {feedFilter === 'following' ? 'View All Posts' : 'Create Your First Post'}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              ) : (
                <AnimatePresence>
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 shadow-lg hover:shadow-purple-500/10 transition-all duration-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 ring-2 ring-purple-500/20 hover:ring-purple-500/40 transition-all duration-200">
                                <AvatarImage src={post.user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold">
                                  {post.user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white hover:text-purple-300 transition-colors cursor-pointer">
                                  {post.user.username}
                                  </span>
                                  {post.user.id !== user?.id && (
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => handleFollow(post.user.id, 'follow')}
                                        className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/30 border border-transparent px-2 py-1 h-6 transition-all duration-300"
                                      >
                                        Follow
                                      </Button>
                                    </motion.div>
                                  )}
                                  {post.type !== 'text' && (
                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                        {getPostTypeIcon(post.type)}
                                      <span className="ml-1 capitalize">{post.type}</span>
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    {getVisibilityIcon(post.visibility)}
                                    <span>{formatTimeAgo(post.created_at)}</span>
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
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-full"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 pb-4">
                          {/* Post content */}
                          {post.content && (
                            <div className="text-white leading-relaxed text-base mb-4">
                              {post.content}
                            </div>
                          )}

                          {/* Media display - simplified for social media style */}
                          {post.media_items && post.media_items.length > 0 && (
                            <div className="mt-3">
                              {post.media_items.length === 1 ? (
                                // Single image/video - full width
                                <div className="relative rounded-xl overflow-hidden">
                                  {post.media_items[0].type === 'image' ? (
                                    <img
                                      src={post.media_items[0].url}
                                      alt="Post media"
                                      className="w-full h-auto max-h-96 object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <video
                                      src={post.media_items[0].url}
                                      controls
                                      className="w-full h-auto max-h-96 object-cover"
                                      poster={post.media_items[0].thumbnail_url}
                                    />
                                  )}
                                </div>
                              ) : post.media_items.length === 2 ? (
                                // Two images/videos - side by side
                                <div className="grid grid-cols-2 gap-2">
                                  {post.media_items.slice(0, 2).map((item, index) => (
                                    <div key={index} className="relative rounded-xl overflow-hidden">
                                      {item.type === 'image' ? (
                                        <img
                                          src={item.url}
                                          alt="Post media"
                                          className="w-full h-48 object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <video
                                          src={item.url}
                                          controls
                                          className="w-full h-48 object-cover"
                                          poster={item.thumbnail_url}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : post.media_items.length === 3 ? (
                                // Three images/videos - 2 on top, 1 on bottom
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="row-span-2">
                                    {post.media_items[0].type === 'image' ? (
                                      <img
                                        src={post.media_items[0].url}
                                        alt="Post media"
                                        className="w-full h-full object-cover rounded-xl"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <video
                                        src={post.media_items[0].url}
                                        controls
                                        className="w-full h-full object-cover rounded-xl"
                                        poster={post.media_items[0].thumbnail_url}
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {post.media_items.slice(1, 3).map((item, index) => (
                                      <div key={index} className="relative rounded-xl overflow-hidden">
                                        {item.type === 'image' ? (
                                          <img
                                            src={item.url}
                                            alt="Post media"
                                            className="w-full h-24 object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <video
                                            src={item.url}
                                            controls
                                            className="w-full h-24 object-cover"
                                            poster={item.thumbnail_url}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                // Four or more images/videos - 2x2 grid with overlay
                                <div className="grid grid-cols-2 gap-2">
                                  {post.media_items.slice(0, 4).map((item, index) => (
                                    <div key={index} className="relative rounded-xl overflow-hidden">
                                      {item.type === 'image' ? (
                                        <img
                                          src={item.url}
                                          alt="Post media"
                                          className="w-full h-48 object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <video
                                          src={item.url}
                                          controls
                                          className="w-full h-48 object-cover"
                                          poster={item.thumbnail_url}
                                        />
                                      )}
                                      {index === 3 && (post.media_items?.length || 0) > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                          <span className="text-white text-xl font-bold">
                                            +{(post.media_items?.length || 0) - 4}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hashtags */}
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {post.hashtags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 cursor-pointer transition-all duration-200 border-purple-500/30 text-xs font-medium"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Post actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                            <div className="flex items-center gap-8">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLike(post.id)}
                                  className={cn(
                                    "flex items-center gap-2 transition-all duration-300 rounded-xl px-3 py-2 border border-transparent",
                                    post.is_liked 
                                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/20 hover:border-red-500/30" 
                                      : "text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20"
                                  )}
                                >
                                  <Heart className={cn("h-5 w-5 transition-all duration-300", post.is_liked && "fill-current scale-110")} />
                                  <span className="font-medium">{post.likes_count}</span>
                                </Button>
                              </motion.div>
                              
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleComment(post.id)}
                                  className="flex items-center gap-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all duration-300 rounded-xl px-3 py-2 border border-transparent"
                                >
                                  <MessageCircle className="h-5 w-5" />
                                  <span className="font-medium">{post.comments_count}</span>
                                </Button>
                              </motion.div>
                              
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShare(post.id)}
                                  className="flex items-center gap-2 text-white/60 hover:text-green-400 hover:bg-green-500/20 hover:border-green-500/30 transition-all duration-300 rounded-xl px-3 py-2 border border-transparent"
                                >
                                  <Share2 className="h-5 w-5" />
                                  <span className="font-medium">{post.shares_count}</span>
                                </Button>
                              </motion.div>
                            </div>

                            <div className="flex items-center gap-2 text-white/40 text-sm">
                              {getVisibilityIcon(post.visibility)}
                              <span className="capitalize">{post.visibility}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Posts</p>
                      <p className="text-2xl font-bold text-white">24</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Likes</p>
                      <p className="text-2xl font-bold text-white">1,234</p>
                    </div>
                    <div className="h-12 w-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Heart className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Engagement Rate</p>
                      <p className="text-2xl font-bold text-white">8.5%</p>
                    </div>
                    <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <div className="h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">New like on your latest post</p>
                      <p className="text-gray-400 text-xs">2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <div className="h-8 w-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">New comment from @fan123</p>
                      <p className="text-gray-400 text-xs">15 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">New follower: @musiclover</p>
                      <p className="text-gray-400 text-xs">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Performance Insights</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-3">Top Performing Posts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Image className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm">Behind the scenes studio session</p>
                            <p className="text-gray-400 text-xs">Posted 2 days ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">156 likes</p>
                          <p className="text-green-400 text-xs">+23% engagement</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm">New track preview</p>
                            <p className="text-gray-400 text-xs">Posted 5 days ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">89 likes</p>
                          <p className="text-green-400 text-xs">+15% engagement</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-slate-700" />
                  
                  <div>
                    <h4 className="text-white font-medium mb-3">Audience Growth</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/30 rounded-lg">
                        <p className="text-gray-400 text-sm">This Week</p>
                        <p className="text-2xl font-bold text-white">+12</p>
                        <p className="text-green-400 text-xs">+8% from last week</p>
                      </div>
                      <div className="p-4 bg-slate-800/30 rounded-lg">
                        <p className="text-gray-400 text-sm">This Month</p>
                        <p className="text-2xl font-bold text-white">+47</p>
                        <p className="text-green-400 text-xs">+12% from last month</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </div>
  )
} 