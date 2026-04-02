"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  MessageCircle,
  Heart,
  Share2,
  Music,
  Image,
  Video,
  Calendar,
  ExternalLink,
  Play,
  Pause,
  MoreHorizontal,
  Plus
} from "lucide-react"

interface ArtistPostsFeedProps {
  artistId: string
  artistName: string
  artistAvatar?: string
  isOwnProfile?: boolean
}

interface Post {
  id: string
  type: 'text' | 'music' | 'image' | 'video' | 'event'
  content: string
  media_url?: string
  thumbnail_url?: string
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked?: boolean
}

export function ArtistPostsFeed({ 
  artistId, 
  artistName, 
  artistAvatar, 
  isOwnProfile = false 
}: ArtistPostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [artistId])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      
      // For now, show sample posts if it's the owner's profile
      if (isOwnProfile) {
        setPosts([
          {
            id: '1',
            type: 'text',
            content: 'Excited to share my latest track with you all! Working on some new material in the studio 🎵',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            likes_count: 23,
            comments_count: 5,
            shares_count: 2
          },
          {
            id: '2',
            type: 'music',
            content: 'New single "Midnight Vibes" is now live! Check it out and let me know what you think.',
            media_url: '/music/midnight-vibes.mp3',
            thumbnail_url: '/images/midnight-vibes-cover.jpg',
            created_at: new Date(Date.now() - 259200000).toISOString(),
            likes_count: 45,
            comments_count: 12,
            shares_count: 8
          }
        ])
      } else {
        setPosts([])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    console.log('Like post:', postId)
  }

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId)
  }

  const handleShare = (postId: string) => {
    console.log('Share post:', postId)
  }

  const handlePlayPause = (postId: string) => {
    if (playingTrack === postId) {
      setPlayingTrack(null)
    } else {
      setPlayingTrack(postId)
    }
  }

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'music': return Music
      case 'image': return Image
      case 'video': return Video
      case 'event': return Calendar
      default: return MessageCircle
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatSafeDate(date.toISOString())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-purple-500/20 shadow-xl">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gradient-to-r from-white/10 to-white/20 rounded w-24 mb-2" />
                    <div className="h-3 bg-gradient-to-r from-white/10 to-white/20 rounded w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gradient-to-r from-white/10 to-white/20 rounded w-full" />
                  <div className="h-4 bg-gradient-to-r from-white/10 to-white/20 rounded w-3/4" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-white/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white/70 mb-2">No Posts Yet</h3>
        <p className="text-white/50 text-sm mb-6">
          {isOwnProfile 
            ? "Share your latest updates, behind-the-scenes content, and connect with your fans!"
            : `${artistName} hasn't shared any posts yet. Check back soon for updates!`
          }
        </p>
        {isOwnProfile && (
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create First Post
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Post (if own profile) */}
      {isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-purple-500/20 shadow-xl shadow-purple-500/5 hover:shadow-purple-500/15 transition-all duration-500">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-purple-500/30">
                  <AvatarImage src={artistAvatar} alt={artistName} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 font-bold">
                    {artistName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <motion.div className="flex-1">
                                    <motion.div
                    whileHover={{ scale: 1.01 }}
                  >
                    <Button
                      variant="ghost" 
                      className="w-full text-left text-white/60 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 justify-start border border-white/10 hover:border-purple-500/30 transition-all duration-300"
                    >
                                          What's on your mind, {artistName}?
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:bg-purple-500/20 hover:text-purple-300 border border-transparent hover:border-purple-500/30">
                    <Music className="h-4 w-4 mr-2" />
                    Music
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:bg-blue-500/20 hover:text-blue-300 border border-transparent hover:border-blue-500/30">
                    <Image className="h-4 w-4 mr-2" />
                    Photo
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:bg-green-500/20 hover:text-green-300 border border-transparent hover:border-green-500/30">
                    <Calendar className="h-4 w-4 mr-2" />
                    Event
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Posts */}
      {posts.map((post, index) => {
        const PostIcon = getPostIcon(post.type)
        const isPlaying = playingTrack === post.id
        
        return (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 shadow-lg hover:shadow-purple-500/10 transition-all duration-500">
              <div className="p-6">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={artistAvatar} alt={artistName} />
                      <AvatarFallback className="bg-purple-600">
                        {artistName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{artistName}</span>
                        <PostIcon className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-xs text-white/50">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-white/40 hover:bg-white/10">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* Post Content */}
                <p className="text-white/80 mb-4 leading-relaxed">
                  {post.content}
                </p>

                {/* Media Content */}
                {post.type === 'music' && post.media_url && (
                  <div className="mb-4 p-4 rounded-lg bg-white/5 border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => handlePlayPause(post.id)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">New Track</div>
                        <div className="text-white/60 text-xs">Click to play</div>
                      </div>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                        New
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="text-white/60 hover:text-red-400 hover:bg-white/10"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {post.likes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleComment(post.id)}
                      className="text-white/60 hover:text-blue-400 hover:bg-white/10"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {post.comments_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(post.id)}
                      className="text-white/60 hover:text-green-400 hover:bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {post.shares_count}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}