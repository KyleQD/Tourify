"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Trash2,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface Comment {
  id: string
  music_id: string
  user_id: string
  content: string
  parent_comment_id?: string
  likes_count: number
  created_at: string
  updated_at: string
  user: {
    id: string
    email: string
    user_metadata: {
      full_name?: string
      avatar_url?: string
    }
  }
}

interface MusicCommentProps {
  musicId: string
  parentCommentId?: string
  showReplies?: boolean
}

export function MusicComment({ musicId, parentCommentId, showReplies = true }: MusicCommentProps) {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
  }, [musicId, parentCommentId])

  const loadComments = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('music_comments')
        .select(`
          *,
          user:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('music_id', musicId)
        .order('created_at', { ascending: false })

      if (parentCommentId) {
        query = query.eq('parent_comment_id', parentCommentId)
      } else {
        query = query.is('parent_comment_id', null)
      }

      const { data, error } = await query

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (commentId: string) => {
    if (!user) {
      toast.error('Please log in to reply')
      return
    }

    if (!replyText.trim()) {
      toast.error('Please enter a reply')
      return
    }

    try {
      await supabase
        .from('music_comments')
        .insert({
          music_id: musicId,
          user_id: user.id,
          content: replyText.trim(),
          parent_comment_id: commentId
        })
      
      setReplyText('')
      setReplyingTo(null)
      await loadComments()
      toast.success('Reply added')
    } catch (error) {
      console.error('Error adding reply:', error)
      toast.error('Failed to add reply')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    try {
      await supabase
        .from('music_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)
      
      await loadComments()
      toast.success('Comment deleted')
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Failed to delete comment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return formatSafeDate(date.toISOString())
  }

  const getUserDisplayName = (comment: Comment) => {
    return comment.user?.user_metadata?.full_name || 
           comment.user?.email?.split('@')[0] || 
           'User'
  }

  const getUserAvatar = (comment: Comment) => {
    return comment.user?.user_metadata?.avatar_url || ''
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/4"></div>
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b border-slate-800 pb-4 last:border-b-0">
          {/* Main comment */}
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={getUserAvatar(comment)} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-white">
                  {getUserDisplayName(comment)}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDate(comment.created_at)}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <Badge variant="outline" className="text-xs">
                    edited
                  </Badge>
                )}
              </div>
              
              <p className="text-slate-300 mb-2">{comment.content}</p>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <Heart className="w-3 h-3 mr-1" />
                  {comment.likes_count}
                </Button>
                
                {showReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-slate-400 hover:text-white"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}
                
                {user?.id === comment.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-400 resize-none"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyText('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Replies */}
          {showReplies && (
            <div className="ml-11 mt-3">
              <MusicComment 
                musicId={musicId} 
                parentCommentId={comment.id}
                showReplies={false}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
