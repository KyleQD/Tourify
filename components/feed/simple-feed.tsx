'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedPostCreator } from './enhanced-post-creator'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Heart, MessageCircle, Share2, Clock, MapPin, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import Link from 'next/link'

interface Post {
  id: string
  user_id: string
  content: string
  type: string
  visibility: string
  location: string | null
  hashtags: string[] | null
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  profiles?: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean
  } | null
  is_liked: boolean
}

// Helper function to generate profile URL based on username
function getProfileUrl(username: string | null) {
  if (!username) return '/profile/user'
  return `/profile/${username}`
}

export function SimpleFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handlePostCreated = (newPost: Post) => {
    // Add the new post to the beginning of the feed
    setPosts(prev => [newPost, ...prev])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPosts()
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
              likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ))

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
              likes_count: post.is_liked ? post.likes_count + 1 : post.likes_count - 1
            }
          : post
      ))
      console.error('Error toggling like:', error)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
    loadPosts()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        // Only add if it's not already in the list (avoids duplicates from optimistic updates)
        setPosts(prev => {
          const exists = prev.find(post => post.id === payload.new.id)
          if (!exists && payload.new.visibility === 'public') {
            return [payload.new as Post, ...prev]
          }
          return prev
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        setPosts(prev => prev.map(post => 
          post.id === payload.new.id ? { ...post, ...payload.new } : post
        ))
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading feed...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Creator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EnhancedPostCreator onPostCreated={handlePostCreated} />
      </motion.div>

      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Latest Posts</h2>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Posts */}
      <AnimatePresence mode="popLayout">
        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-slate-400">
              <p className="text-lg mb-2">No posts yet</p>
              <p className="text-sm">Be the first to share something with the community!</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Link href={getProfileUrl(post.profiles?.username || null)} className="flex-shrink-0">
                        <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200">
                          <AvatarImage src={post.profiles?.avatar_url || ''} />
                          <AvatarFallback>
                            {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={getProfileUrl(post.profiles?.username || null)} className="hover:underline">
                            <h4 className="font-semibold text-white">
                              {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                            </h4>
                          </Link>
                          {post.profiles?.username && (
                            <Link href={getProfileUrl(post.profiles?.username || null)} className="hover:underline">
                              <span className="text-slate-400">@{post.profiles.username}</span>
                            </Link>
                          )}
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
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Content */}
                    <div className="mb-4">
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
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

                    <Separator className="my-4 bg-slate-700/50" />

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                      {post.likes_count > 0 && (
                        <span>{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</span>
                      )}
                      {post.comments_count > 0 && (
                        <span>{post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}</span>
                      )}
                      {post.shares_count > 0 && (
                        <span>{post.shares_count} {post.shares_count === 1 ? 'share' : 'shares'}</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart className="h-5 w-5 mr-2" />
                        Like
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-blue-400"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Comment
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-green-400"
                      >
                        <Share2 className="h-5 w-5 mr-2" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
} 