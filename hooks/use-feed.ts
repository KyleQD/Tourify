'use client'

import { useState, useEffect, useCallback } from 'react'
import { FeedService, type ExtendedPost, type ExtendedComment } from '@/lib/services/feed.service'
import { useAuth } from '@/hooks/use-auth'

export function useFeed() {
  const [posts, setPosts] = useState<ExtendedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  
  const feedService = new FeedService()

  const loadFeed = useCallback(async (reset = false, feedType: 'all' | 'following' = 'all') => {
    try {
      setLoading(true)
      setError(null)
      
      const currentPage = reset ? 0 : page
      const { data, error } = await feedService.getFeed(currentPage, 20, feedType)
      
      if (error) throw error
      
      if (reset) {
        setPosts(data)
        setPage(1)
      } else {
        setPosts(prev => [...prev, ...data])
        setPage(prev => prev + 1)
      }
      
      setHasMore(data.length === 20)
    } catch (err) {
      console.error('Error loading feed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [page])

  const createPost = useCallback(async (data: {
    content: string
    type?: string
    visibility?: string
    location?: string
    media?: any[]
    hashtags?: string[]
  }) => {
    try {
      const { data: newPost, error } = await feedService.createPost(data)
      if (error) throw error
      
      // Add the new post to the beginning of the feed with extended properties
      const extendedPost: ExtendedPost = {
        ...newPost,
        profiles: null, // Will be populated by a separate query if needed
        post_media: [],
        is_liked: false,
        is_following: false,
        hashtags_data: []
      }
      setPosts(prev => [extendedPost, ...prev])
      return { success: true, data: newPost }
    } catch (err) {
      console.error('Error creating post:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create post' }
    }
  }, [])

  const likePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
          : post
      ))

      const { error } = await feedService.likePost(postId)
      if (error) throw error
    } catch (err) {
      // Revert optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: false, likes_count: post.likes_count - 1 }
          : post
      ))
      console.error('Error liking post:', err)
    }
  }, [])

  const unlikePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: false, likes_count: post.likes_count - 1 }
          : post
      ))

      const { error } = await feedService.unlikePost(postId)
      if (error) throw error
    } catch (err) {
      // Revert optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
          : post
      ))
      console.error('Error unliking post:', err)
    }
  }, [])

  const deletePost = useCallback(async (postId: string) => {
    const previousPosts = posts
    setPosts(prev => prev.filter(post => post.id !== postId))

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to delete post')
      }
    } catch (err) {
      setPosts(previousPosts)
      console.error('Error deleting post:', err)
      throw err
    }
  }, [posts])

  const refreshFeed = useCallback(() => {
    loadFeed(true)
  }, [loadFeed])

  const loadMorePosts = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed(false)
    }
  }, [loading, hasMore, loadFeed])

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = feedService.subscribeToFeed((payload) => {
      if (payload.eventType === 'INSERT') {
        // Don't add if it's the current user's post (already added optimistically)
        setPosts(prev => {
          const exists = prev.find(post => post.id === payload.new.id)
          if (!exists) {
            return [payload.new as ExtendedPost, ...prev]
          }
          return prev
        })
      } else if (payload.eventType === 'UPDATE') {
        setPosts(prev => prev.map(post => 
          post.id === payload.new.id ? { ...post, ...payload.new } : post
        ))
      } else if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(post => post.id !== payload.old.id))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    posts,
    loading,
    error,
    hasMore,
    loadFeed,
    createPost,
    likePost,
    unlikePost,
    deletePost,
    refreshFeed,
    loadMorePosts
  }
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<ExtendedComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const feedService = new FeedService()

  const loadComments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await feedService.getComments(postId)
      if (error) throw error
      
      setComments(data)
    } catch (err) {
      console.error('Error loading comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [postId])

  const createComment = useCallback(async (content: string, parentCommentId?: string) => {
    try {
      const { data: newComment, error } = await feedService.createComment({
        postId,
        content,
        parentCommentId
      })
      
      if (error) throw error
      
      setComments(prev => [newComment as ExtendedComment, ...prev])
      return { success: true, data: newComment }
    } catch (err) {
      console.error('Error creating comment:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create comment' }
    }
  }, [postId])

  const likeComment = useCallback(async (commentId: string) => {
    try {
      // Optimistic update
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, is_liked: true, likes_count: comment.likes_count + 1 }
          : comment
      ))

      const { error } = await feedService.likeComment(commentId)
      if (error) throw error
    } catch (err) {
      // Revert optimistic update
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, is_liked: false, likes_count: comment.likes_count - 1 }
          : comment
      ))
      console.error('Error liking comment:', err)
    }
  }, [])

  const unlikeComment = useCallback(async (commentId: string) => {
    try {
      // Optimistic update
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, is_liked: false, likes_count: comment.likes_count - 1 }
          : comment
      ))

      const { error } = await feedService.unlikeComment(commentId)
      if (error) throw error
    } catch (err) {
      // Revert optimistic update
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, is_liked: true, likes_count: comment.likes_count + 1 }
          : comment
      ))
      console.error('Error unliking comment:', err)
    }
  }, [])

  // Subscribe to real-time comment updates
  useEffect(() => {
    const subscription = feedService.subscribeToPostComments(postId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setComments(prev => [payload.new as ExtendedComment, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setComments(prev => prev.map(comment => 
          comment.id === payload.new.id ? { ...comment, ...payload.new } : comment
        ))
      } else if (payload.eventType === 'DELETE') {
        setComments(prev => prev.filter(comment => comment.id !== payload.old.id))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [postId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  return {
    comments,
    loading,
    error,
    createComment,
    likeComment,
    unlikeComment,
    refreshComments: loadComments
  }
}

export function useTrendingHashtags() {
  const [hashtags, setHashtags] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const feedService = new FeedService()

  useEffect(() => {
    async function loadTrendingHashtags() {
      setLoading(true)
      try {
        const { data } = await feedService.getTrendingHashtags()
        setHashtags(data)
      } catch (error) {
        console.error('Error loading trending hashtags:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTrendingHashtags()
  }, [])

  return { hashtags, loading }
}
