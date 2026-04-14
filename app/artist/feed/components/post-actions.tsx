"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { MessageSquare, Heart, Share2, Bookmark } from "lucide-react"
import type { Database } from "@/types/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Post } from "@/types/post"

interface PostActionsProps {
  post: Post
  onLikeToggle: (postId: string, isLiked: boolean) => void
}

export function PostActions({ post, onLikeToggle }: PostActionsProps) {
  const [isLiking, setIsLiking] = React.useState(false)
  const { toast } = useToast()

  const handleLikeToggle = async () => {
    if (isLiking) return

    setIsLiking(true)
    try {
      if (post.is_liked_by_user) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .match({ post_id: post.id })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: post.id })

        if (error) throw error
      }

      onLikeToggle(post.id, !post.is_liked_by_user)
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  return (
    <div className="flex items-center gap-6 mt-4">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-gray-400 hover:text-purple-500"
        onClick={handleLikeToggle}
        disabled={isLiking}
      >
        <Heart
          className={`h-5 w-5 ${
            post.is_liked_by_user ? "fill-purple-500 text-purple-500" : ""
          }`}
        />
        <span>{post.likes_count}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-gray-400 hover:text-purple-500"
      >
        <MessageSquare className="h-5 w-5" />
        <span>{post.comments_count}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-gray-400 hover:text-purple-500"
      >
        <Share2 className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-gray-400 hover:text-purple-500 ml-auto"
      >
        <Bookmark className="h-5 w-5" />
      </Button>
    </div>
  )
} 