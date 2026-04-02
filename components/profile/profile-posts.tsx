"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Send,
  Calendar,
  Eye,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useAuth } from "@/contexts/auth-context"

interface Post {
  id: string
  content: string
  type: string
  visibility: string
  media_url?: string
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  user_id: string
  is_liked?: boolean
  user?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  post_id: string
  user?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

interface ProfilePostsProps {
  profileId: string
  profileUsername: string
  isOwnProfile?: boolean
  compact?: boolean
  className?: string
}

export function ProfilePosts({ 
  profileId, 
  profileUsername, 
  isOwnProfile = false, 
  compact = false,
  className 
}: ProfilePostsProps) {
  const { user: currentUser } = useAuth()
  const supabase = createClientComponentClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [showComments, setShowComments] = useState<string | null>(null)
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [profileId])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      
      // Try to fetch posts with basic query first
      let posts = null
      let error = null
      
      try {
        const result = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            content,
            type,
            visibility,
            likes_count,
            comments_count,
            shares_count,
            created_at,
            updated_at,
            media_urls
          `)
          .eq('user_id', profileId)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(compact ? 5 : 20)
        
        posts = result.data
        error = result.error
      } catch (initialError) {
        console.log('Initial posts query failed, trying fallback:', initialError)
        
        // Fallback to even simpler query
        try {
          const result = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(compact ? 5 : 20)
          
          posts = result.data
          error = result.error
        } catch (fallbackError) {
          console.error('Both posts queries failed:', fallbackError)
          posts = []
          error = fallbackError
        }
      }

      if (error) {
        console.error('Error fetching posts:', error)
        setPosts([])
      } else {
        console.log(`✅ Loaded ${posts?.length || 0} posts for profile ${profileUsername}`)
        
        // Transform posts to match expected format
        const transformedPosts = posts?.map((post: any) => {
          // Safely extract media URL
          let media_url = null
          if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
            media_url = post.media_urls[0]
          } else if (post.media_url) {
            media_url = post.media_url
          }

          return {
            id: post.id,
            content: post.content || '',
            type: post.type || post.post_type || 'text',
            visibility: post.visibility || 'public',
            media_url,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            created_at: post.created_at,
            user_id: post.user_id,
            is_liked: false, // We'll check this separately if needed
            user: {
              id: profileId,
              username: profileUsername,
              full_name: profileUsername,
              avatar_url: '',
              is_verified: false
            }
          }
        }) || []
        
        setPosts(transformedPosts)
      }
    } catch (error) {
      console.error('Error in fetchPosts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to like posts')
      return
    }

    try {
      const isLiked = likedPosts.has(postId)
      const action = isLiked ? 'unlike' : 'like'

      const response = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        // Update like state
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          if (isLiked) {
            newSet.delete(postId)
          } else {
            newSet.add(postId)
          }
          return newSet
        })

        // Update like count in posts
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes_count: post.likes_count + (isLiked ? -1 : 1),
                is_liked: !isLiked
              }
            : post
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Failed to update like')
    }
  }

  const loadComments = async (postId: string) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setComments(prev => ({ ...prev, [postId]: result.comments || [] }))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const toggleComments = async (postId: string) => {
    const isCurrentlyShowing = showComments === postId
    
    if (!isCurrentlyShowing) {
      if (!comments[postId]) {
        await loadComments(postId)
      }
    }
    
    setShowComments(isCurrentlyShowing ? null : postId)
  }

  const handleComment = async (postId: string) => {
    if (!currentUser || !newComment.trim()) return

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Add the new comment to local state
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), result.comment]
        }))
        
        // Update comments count
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        ))

        setNewComment('')
        setShowComments(postId)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'audio': return <Music className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatSafeDate(date.toISOString())
  }

  if (loading) {
    return (
      <Card className={cn("bg-white/10 backdrop-blur border border-white/20 rounded-3xl", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/20 rounded w-1/4"></div>
            {[...Array(compact ? 2 : 3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-white/20 rounded w-1/3"></div>
                    <div className="h-3 bg-white/20 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="h-20 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className={cn("bg-white/10 backdrop-blur border border-white/20 rounded-3xl", className)}>
        <CardHeader>
          <CardTitle className="text-white">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-white/60">
            <MessageCircle className="h-16 w-16 mx-auto mb-6 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">No Posts Yet</h3>
            <p className="text-gray-400">
              {isOwnProfile ? "You haven't shared any posts yet." : `${profileUsername} hasn't shared any posts yet.`}
            </p>
            {isOwnProfile && (
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                Create Your First Post
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-white/10 backdrop-blur border border-white/20 rounded-3xl", className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Recent Posts
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
            {posts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="space-y-4">
            {/* Post Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.user?.avatar_url} alt={post.user?.full_name} />
                  <AvatarFallback>
                    {post.user?.full_name?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{post.user?.full_name || post.user?.username}</p>
                    {post.user?.is_verified && (
                      <Badge className="bg-blue-500 text-white text-xs">Verified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    {getPostTypeIcon(post.type)}
                    <span>{formatTimeAgo(post.created_at)}</span>
                    {post.visibility !== 'public' && (
                      <Badge variant="secondary" className="text-xs">
                        {post.visibility}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-white/60 hover:bg-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="space-y-3">
              {post.content && (
                <p className="text-white/90 leading-relaxed">{post.content}</p>
              )}
              
              {post.media_url && (
                <div className="rounded-xl overflow-hidden bg-white/5">
                  {post.type === 'image' && (
                    <img 
                      src={post.media_url} 
                      alt="Post media"
                      className="w-full h-auto max-h-96 object-cover"
                    />
                  )}
                  {post.type === 'video' && (
                    <video 
                      src={post.media_url} 
                      controls
                      className="w-full h-auto max-h-96"
                    />
                  )}
                  {post.type === 'audio' && (
                    <audio 
                      src={post.media_url} 
                      controls
                      className="w-full"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id)}
                  className={cn(
                    "text-white/80 hover:bg-white/10 gap-2",
                    post.is_liked && "text-red-400"
                  )}
                >
                  <Heart className={cn("h-4 w-4", post.is_liked && "fill-current")} />
                  {post.likes_count}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className="text-white/80 hover:bg-white/10 gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:bg-white/10 gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {post.shares_count}
                </Button>
              </div>

              <span className="text-xs text-white/40">
                <Eye className="h-3 w-3 inline mr-1" />
                {Math.floor(Math.random() * 1000)} views
              </span>
            </div>

            {/* Comments Section */}
            {showComments === post.id && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                {loadingComments[post.id] ? (
                  <div className="text-center py-4">
                    <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <>
                    {comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user?.avatar_url} alt={comment.user?.full_name} />
                          <AvatarFallback className="text-xs">
                            {comment.user?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="font-medium text-white text-sm">{comment.user?.full_name}</p>
                            <p className="text-white/80">{comment.content}</p>
                          </div>
                          <p className="text-xs text-white/40">{formatTimeAgo(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}

                    {currentUser && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.user_metadata?.avatar_url} alt="You" />
                          <AvatarFallback className="text-xs">You</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px] bg-white/10 border-white/20 text-white placeholder-white/60 resize-none"
                          />
                          <Button
                            onClick={() => handleComment(post.id)}
                            disabled={!newComment.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {!compact && posts.length >= 5 && (
          <div className="text-center pt-4">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Load More Posts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}