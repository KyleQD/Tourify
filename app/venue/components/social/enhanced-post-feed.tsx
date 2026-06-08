"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/context/auth"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { PostItem } from "@/app/venue/components/social/post-item"
import { PostCreator } from "@/app/venue/components/social/post-creator"
import { RefreshCw, ArrowUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useIntersectionObserver } from "@/hooks/venue/use-intersection-observer"

interface EnhancedPostFeedProps {
  userId?: string // If provided, only show posts from this user
  filter?: "all" | "following" | "trending" | "latest"
  showPostCreator?: boolean
  limit?: number
}

export function EnhancedPostFeed({ userId, filter = "all", showPostCreator = true, limit }: EnhancedPostFeedProps) {
  const { posts, loadingPosts, users, loadMorePosts } = useSocial()
  const { user: currentUser } = useAuth()
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>(filter)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Ref for infinite scrolling
  const [loadMoreRef, isLoadMoreVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.5,
    rootMargin: "100px",
  })

  // Filter and sort posts
  useEffect(() => {
    if (!loadingPosts) {
      let filtered = [...posts]

      // Filter by user if userId is provided
      if (userId) {
        filtered = filtered.filter((post) => post.userId === userId)
      }

      // Apply feed filter
      if (activeFilter === "following" && currentUser) {
        // In a real app, you would have a list of users the current user follows
        // For now, we'll just show a subset of posts
        filtered = filtered.filter((post) => post.userId !== currentUser.id)
      } else if (activeFilter === "trending") {
        // Sort by engagement (likes + comments)
        filtered = filtered.sort((a, b) => (b.likes.length + b.comments) - (a.likes.length + a.comments))
      } else if (activeFilter === "latest") {
        // Sort by timestamp (newest first)
        filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }

      // Apply limit if provided
      if (limit) {
        filtered = filtered.slice(0, limit)
      }

      setFilteredPosts(filtered)
      setHasMore(filtered.length < posts.length)
    }
  }, [posts, loadingPosts, userId, activeFilter, currentUser, limit])

  // Handle scroll events to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Load more posts when the load more element is visible
  useEffect(() => {
    if (isLoadMoreVisible && hasMore && !isLoadingMore && !loadingPosts) {
      handleLoadMore()
    }
  }, [isLoadMoreVisible, hasMore, isLoadingMore, loadingPosts])

  // Function to load more posts
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      await loadMorePosts()

      setPage((prev) => prev + 1)

      // Check if we've reached the end
      if (page >= 3) {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      // In a real app, you would fetch fresh posts from the API
      // For now, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Reset pagination
      setPage(1)
      setHasMore(true)
    } catch (error) {
      console.error("Error refreshing posts:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePostCreated = () => {
    // The post will be added to the feed automatically via the context
    // But we can add any additional logic here if needed
    handleRefresh()
  }

  // Render post skeletons while loading
  const renderSkeletons = () => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <Card key={`skeleton-${index}`} className="bg-gray-900 text-white border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4 bg-gray-800" />
                <Skeleton className="h-3 w-1/3 bg-gray-800" />
                <Skeleton className="h-20 w-full bg-gray-800" />
                <div className="flex space-x-4 pt-2">
                  <Skeleton className="h-4 w-12 bg-gray-800" />
                  <Skeleton className="h-4 w-12 bg-gray-800" />
                  <Skeleton className="h-4 w-12 bg-gray-800" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))
  }

  return (
    <div className="space-y-4">
      {showPostCreator && currentUser && <PostCreator onPostCreated={handlePostCreated} />}

      {!userId && !limit && (
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className={activeFilter === "all" ? "bg-purple-600" : "border-gray-700"}
                >
                  All Posts
                </Button>
                <Button
                  variant={activeFilter === "following" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("following")}
                  className={activeFilter === "following" ? "bg-purple-600" : "border-gray-700"}
                >
                  Following
                </Button>
                <Button
                  variant={activeFilter === "trending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("trending")}
                  className={activeFilter === "trending" ? "bg-purple-600" : "border-gray-700"}
                >
                  Trending
                </Button>
                <Button
                  variant={activeFilter === "latest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("latest")}
                  className={activeFilter === "latest" ? "bg-purple-600" : "border-gray-700"}
                >
                  Latest
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {loadingPosts && page === 1 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {renderSkeletons()}
          </motion.div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-gray-500"
          >
            <p className="mb-2">No posts found</p>
            {userId && userId === currentUser?.id && <p>Share your first post with the community!</p>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {filteredPosts.map((post, index) => {
              const author = users.find((u) => u.id === post.userId)
              // Create a mock author if not found to match User interface
              const mockAuthor = author || {
                id: post.userId,
                fullName: "Unknown User",
                username: "unknown",
                avatar: "/placeholder.svg",
                email: "",
                connections: [],
                bio: "",
                website: "",
                socialLinks: {},
                preferences: {
                  emailNotifications: false,
                  pushNotifications: false,
                  theme: "dark" as const,
                  language: "en"
                },
                stats: {
                  followers: 0,
                  following: 0,
                  posts: 0,
                  likes: 0
                },
                role: "user" as const,
                lastActive: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                                     <div className="p-4 bg-gray-800 rounded-lg">
                     <p className="text-white">Post: {post.content}</p>
                     <p className="text-gray-400 text-sm">By: {mockAuthor.fullName}</p>
                   </div>
                </motion.div>
              )
            })}

            {/* Load more indicator */}
            {hasMore && !limit && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoadingMore ? <LoadingSpinner /> : <p className="text-gray-500">Scroll for more posts</p>}
              </div>
            )}

            {/* "No more posts" indicator */}
            {!hasMore && filteredPosts.length > 0 && !limit && (
              <div className="py-4 text-center text-gray-500">
                <p>No more posts to show</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
              onClick={handleScrollToTop}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
