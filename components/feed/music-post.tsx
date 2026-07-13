"use client"

import { useState } from 'react'
import { useActingContext } from '@/hooks/use-acting-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  Clock,
  Users
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { MusicPlayer } from '@/components/music/music-player'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MusicPostProps {
  post: {
    id: string
    content: string
    created_at: string
    user: {
      id: string
      username: string
      full_name: string
      avatar_url?: string
    }
    metadata: {
      music_track_id: string
      track_title: string
      artist_name: string
      genre: string
      type: string
    }
  }
  track: {
    id: string
    title: string
    artist: string
    genre?: string
    duration?: number
    file_url: string
    cover_art_url?: string
    description?: string
    play_count?: number
    likes_count?: number
    comments_count?: number
    shares_count?: number
    tags?: string[]
    is_liked?: boolean
  }
  onLike?: (postId: string, liked: boolean) => void
  onComment?: (postId: string) => void
  onShare?: (postId: string) => void
  className?: string
}

export function MusicPost({
  post,
  track,
  onLike,
  onComment,
  onShare,
  className = ''
}: MusicPostProps) {
  const { actingHeaders } = useActingContext()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [commentsCount, setCommentsCount] = useState(0)
  const [sharesCount, setSharesCount] = useState(0)

  const handleLike = async () => {
    try {
      const response = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id })
      })

      if (response.ok) {
        const { liked } = await response.json()
        setIsLiked(liked)
        setLikesCount(prev => liked ? prev + 1 : prev - 1)
        onLike?.(post.id, liked)
        toast.success(liked ? 'Post liked' : 'Post unliked')
      }
    } catch (error) {
      console.error('Error liking post:', error)
      toast.error('Failed to like post')
    }
  }

  const handleComment = () => {
    onComment?.(post.id)
  }

  const handleShare = async () => {
    try {
      const response = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        credentials: 'include',
        body: JSON.stringify({ shared_content_type: 'post', shared_content_id: post.id })
      })

      if (response.ok) {
        setSharesCount(prev => prev + 1)
        onShare?.(post.id)
        toast.success('Post shared')
      }
    } catch (error) {
      console.error('Error sharing post:', error)
      toast.error('Failed to share post')
    }
  }



  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50 transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.user.avatar_url} alt={post.user.full_name} />
            <AvatarFallback className="bg-purple-600 text-white">
              {post.user.full_name?.charAt(0) || post.user.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">
                {post.user.full_name || post.user.username}
              </h3>
              <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                Music
              </Badge>
            </div>
            <p className="text-sm text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem className="text-gray-300 hover:text-white">
                <Clock className="h-4 w-4 mr-2" />
                Save Post
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 hover:text-white">
                <Users className="h-4 w-4 mr-2" />
                View Artist Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-gray-300 hover:text-white">
                Report Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Post Content */}
        {post.content && (
          <p className="text-white leading-relaxed">
            {post.content}
          </p>
        )}

        {/* Music Player */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <MusicPlayer
            track={{
              id: track.id,
              title: track.title,
              description: track.description,
              type: post.metadata.type as 'single' | 'album' | 'ep' | 'mixtape',
              genre: track.genre,
              file_url: track.file_url,
              cover_art_url: track.cover_art_url,
              artist_name: track.artist || post.metadata.artist_name,
              artist_id: post.user.id,
              duration: track.duration,
              tags: track.tags || [],
              is_featured: false,
              is_public: true,
              stats: {
                plays: track.play_count || 0,
                likes: track.likes_count || 0,
                comments: track.comments_count || 0,
                shares: track.shares_count || 0
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }}
            showStats={true}
            showSocial={false}
            className="border-0 bg-transparent"
          />
        </div>

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-4">
            {likesCount > 0 && (
              <span>{likesCount.toLocaleString()} likes</span>
            )}
            {commentsCount > 0 && (
              <span>{commentsCount.toLocaleString()} comments</span>
            )}
            {sharesCount > 0 && (
              <span>{sharesCount.toLocaleString()} shares</span>
            )}
          </div>
          
          {track.play_count !== undefined && track.play_count > 0 && (
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {track.play_count.toLocaleString()} plays
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-2 text-gray-400 hover:text-red-500 ${isLiked ? 'text-red-500' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            Like
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 