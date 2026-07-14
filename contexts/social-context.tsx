"use client"

import * as React from "react"
import { User } from "@/types/user"
import { Post } from "@/components/social/types"
import { useToast } from "@/components/ui/use-toast"
import { FeedService, type ExtendedPost } from "@/lib/services/feed.service"
import { supabase } from "@/lib/supabase"

interface SocialContextType {
  users: User[]
  posts: Post[]
  loadingUsers: boolean
  loadingPosts: boolean
  error: Error | null
  createPost: (post: Omit<Post, "id" | "timestamp" | "likes" | "comments" | "shares">) => Promise<void>
  likePost: (postId: string) => Promise<void>
  unlikePost: (postId: string) => Promise<void>
  addComment: (postId: string, content: string) => Promise<void>
  loadMorePosts: () => Promise<Post[]>
  sendConnectionRequest: (userId: string) => Promise<void>
  updateUserStatus: (userId: string, status: User["status"]) => Promise<void>
  fetchUserById: (userId: string) => Promise<User | undefined>
  removeConnection: (userId: string) => Promise<void>
  clearError: () => void
}

const SocialContext = React.createContext<SocialContextType | undefined>(undefined)

function mapExtendedPostToPost(post: ExtendedPost): Post {
  return {
    id: post.id,
    userId: post.user_id,
    content: post.content,
    timestamp: post.created_at,
    likes: post.is_liked ? [post.user_id] : [],
    comments: post.comments_count || 0,
    shares: post.shares_count || 0,
    media: post.post_media?.map(item => ({
      type: item.type === "video" ? "video" : "image",
      url: item.url,
      alt: item.alt_text || undefined,
    })),
    visibility: (post.visibility as Post["visibility"]) || "public",
    location: post.location || undefined,
  }
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const feedService = React.useMemo(() => new FeedService(), [])
  const [users, setUsers] = React.useState<User[]>([])
  const [posts, setPosts] = React.useState<Post[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(false)
  const [loadingPosts, setLoadingPosts] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [page, setPage] = React.useState(0)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null)
    })
  }, [])

  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingPosts(true)
        const { data, error: feedError } = await feedService.getFeed(0, 20, "all")
        if (feedError) throw feedError
        setPosts((data || []).map(mapExtendedPostToPost))
        setPage(0)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load feed"))
        toast({
          title: "Error",
          description: "Failed to load feed. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoadingPosts(false)
      }
    }

    loadInitialData()
  }, [feedService, toast])

  const createPost = async (post: Omit<Post, "id" | "timestamp" | "likes" | "comments" | "shares">) => {
    try {
      const { data, error: createError } = await feedService.createPost({
        content: post.content,
        visibility: post.visibility,
        location: post.location,
        media: post.media?.map(item => ({
          type: item.type,
          url: item.url,
          alt_text: item.alt,
        })),
      })

      if (createError || !data) throw createError || new Error("Failed to create post")

      setPosts(prev => [mapExtendedPostToPost(data as ExtendedPost), ...prev])
      toast({ title: "Success", description: "Post created successfully!" })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create post"))
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const likePost = async (postId: string) => {
    try {
      const { error: likeError } = await feedService.likePost(postId)
      if (likeError) throw likeError

      setPosts(prev => prev.map(post => {
        if (post.id !== postId) return post
        const likes = currentUserId && !post.likes.includes(currentUserId)
          ? [...post.likes, currentUserId]
          : post.likes
        return { ...post, likes }
      }))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to like post"))
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const unlikePost = async (postId: string) => {
    try {
      const { error: unlikeError } = await feedService.unlikePost(postId)
      if (unlikeError) throw unlikeError

      setPosts(prev => prev.map(post => {
        if (post.id !== postId || !currentUserId) return post
        return { ...post, likes: post.likes.filter(id => id !== currentUserId) }
      }))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to unlike post"))
      toast({
        title: "Error",
        description: "Failed to unlike post. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const addComment = async (postId: string, content: string) => {
    try {
      const { error: commentError } = await feedService.createComment({ postId, content })
      if (commentError) throw commentError

      setPosts(prev => prev.map(post => {
        if (post.id !== postId) return post
        return { ...post, comments: post.comments + 1 }
      }))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to add comment"))
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const loadMorePosts = async () => {
    try {
      setLoadingPosts(true)
      const nextPage = page + 1
      const { data, error: feedError } = await feedService.getFeed(nextPage, 20, "all")
      if (feedError) throw feedError
      const mapped = (data || []).map(mapExtendedPostToPost)
      setPosts(prev => [...prev, ...mapped])
      setPage(nextPage)
      return mapped
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more posts"))
      toast({
        title: "Error",
        description: "Failed to load more posts. Please try again.",
        variant: "destructive",
      })
      throw err
    } finally {
      setLoadingPosts(false)
    }
  }

  const sendConnectionRequest = async (userId: string) => {
    try {
      const response = await fetch("/api/social/follow-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, action: "send" }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send connection request")
      }
      toast({ title: "Success", description: "Connection request sent!" })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to send connection request"))
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const updateUserStatus = async (userId: string, status: User["status"]) => {
    setUsers(prev => prev.map(user => (user.id === userId ? { ...user, status } : user)))
  }

  const fetchUserById = async (userId: string) => {
    try {
      setLoadingUsers(true)
      const existing = users.find(user => user.id === userId)
      if (existing) return existing

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .eq("id", userId)
        .maybeSingle()

      if (profileError || !data) return undefined

      const mapped: User = {
        id: data.id,
        fullName: data.full_name || data.username || "User",
        username: data.username || data.id,
        avatar: data.avatar_url || undefined,
        email: "",
        status: "offline",
        connections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setUsers(prev => [...prev, mapped])
      return mapped
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user"))
      toast({
        title: "Error",
        description: "Failed to fetch user. Please try again.",
        variant: "destructive",
      })
      throw err
    } finally {
      setLoadingUsers(false)
    }
  }

  const removeConnection = async (userId: string) => {
    try {
      const response = await fetch("/api/social/follow-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, action: "remove" }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to remove connection")
      }

      setUsers(prev => prev.map(user => {
        if (!user.connections?.includes(userId)) return user
        return {
          ...user,
          connections: user.connections.filter(id => id !== userId),
        }
      }))
      toast({ title: "Success", description: "Connection removed successfully!" })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to remove connection"))
      toast({
        title: "Error",
        description: "Failed to remove connection. Please try again.",
        variant: "destructive",
      })
      throw err
    }
  }

  const clearError = () => setError(null)

  const value = {
    users,
    posts,
    loadingUsers,
    loadingPosts,
    error,
    createPost,
    likePost,
    unlikePost,
    addComment,
    loadMorePosts,
    sendConnectionRequest,
    updateUserStatus,
    fetchUserById,
    removeConnection,
    clearError,
  }

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocial() {
  const context = React.useContext(SocialContext)
  if (context === undefined) {
    throw new Error("useSocial must be used within a SocialProvider")
  }
  return context
}
