"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Share2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'

interface Post {
  id: string
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
  updated_at?: string
  user_id: string
  profiles?: {
    id: string
    username: string
    avatar_url?: string
    full_name?: string
    is_verified?: boolean
  }
}

interface UserPostsProps {
  userId: string
  username?: string
}

export function UserPosts({ userId, username }: UserPostsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/posts/user/${userId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        
        const data = await response.json()
        setPosts(data.posts || [])
      } catch (err) {
        console.error('Error fetching user posts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchPosts()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          <span>Loading posts...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Error loading posts: {error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">
          {username ? `${username} hasn't posted anything yet.` : 'No posts yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={post.profiles?.avatar_url || '/placeholder.svg'} 
                  alt={post.profiles?.full_name || post.profiles?.username || 'User'} 
                />
                <AvatarFallback>
                  {(post.profiles?.full_name || post.profiles?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">
                    {post.profiles?.full_name || post.profiles?.username || 'Unknown User'}
                  </h3>
                  {post.profiles?.is_verified && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>@{post.profiles?.username || 'unknown'}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                  {post.location && (
                    <>
                      <span>•</span>
                      <span>{post.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Post Content */}
            {post.content && (
              <div className="mb-4">
                <p className="text-gray-100 whitespace-pre-wrap">{post.content}</p>
              </div>
            )}
              
            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {post.hashtags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 cursor-pointer"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {post.media_urls.slice(0, 4).map((url, index) => (
                    <div key={index} className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
                      <Image
                        src={url}
                        alt={`Post media ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  ))}
                </div>
                {post.media_urls.length > 4 && (
                  <p className="text-sm text-gray-400 mt-2">
                    +{post.media_urls.length - 4} more photos
                  </p>
                )}
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-700/50">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Heart className="h-4 w-4" />
                <span>{post.likes_count}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.comments_count}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10"
              >
                <Share2 className="h-4 w-4" />
                <span>{post.shares_count}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
