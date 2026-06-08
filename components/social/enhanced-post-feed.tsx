"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PostItem } from "./post-item"
import { PostCreator } from "./post-creator"
import { RefreshCw, ArrowUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { PostFeedProps } from "./types"

export function EnhancedPostFeed({ userId, filter = "all", showPostCreator = true, limit }: PostFeedProps) {
  const { posts, loadingPosts, users, loadMorePosts } = useSocial()
  const { user: currentUser } = useAuth()
  const [filteredPosts, setFilteredPosts] = useState<typeof posts>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<typeof filter>(filter)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Ref for infinite scrolling
  const [loadMoreRef, isLoadMoreVisible] = useInView({
    threshold: 0.5,
    rootMargin: "100px",
  })

  // Filter and sort posts
  useEffect(() => {
    if (!loadingPosts) {
      let filtered = [...posts]

      // Filter by user if userId is provided
      if (userId) filtered = filtered.filter((post) => post.userId === userId)

      // Apply feed filter
      switch (activeFilter) {
        case "following":
          if ((currentUser as any)?.connections) {
            filtered = filtered.filter((post) => 
              (currentUser as any).connections?.includes(post.userId)
            )
          }
          break
        case "trending":
          filtered = filtered.sort((a, b) => 
            (b.likes.length + b.comments) - (a.likes.length + a.comments)
          )
          break
        case "latest":
          filtered = filtered.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          break
      }

      // Apply limit if provided
      if (limit) filtered = filtered.slice(0, limit)

      setFilteredPosts(filtered)
      setHasMore(filtered.length < posts.length)
    }
  }, [posts, loadingPosts, userId, activeFilter, currentUser, limit])

  // Handle scroll events to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500)
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
      setHasMore(page < 3) // For demo purposes, limit to 3 pages
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
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
    handleRefresh()
  }

  // Render post skeletons while loading
  const renderSkeletons = () => (
    <>
      {Array(3).fill(0).map((_, index) => (
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
      ))}
    </>
  )

  return (
    <div className="space-y-4">
      {showPostCreator && currentUser && (
        <PostCreator onPostCreated={handlePostCreated} />
      )}

      {!userId && !limit && (
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className={cn(
                    activeFilter === "all" ? "bg-purple-600" : "border-gray-700"
                  )}
                >
                  All Posts
                </Button>
                <Button
                  variant={activeFilter === "following" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("following")}
                  className={cn(
                    activeFilter === "following" ? "bg-purple-600" : "border-gray-700"
                  )}
                >
                  Following
                </Button>
                <Button
                  variant={activeFilter === "trending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("trending")}
                  className={cn(
                    activeFilter === "trending" ? "bg-purple-600" : "border-gray-700"
                  )}
                >
                  Trending
                </Button>
                <Button
                  variant={activeFilter === "latest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("latest")}
                  className={cn(
                    activeFilter === "latest" ? "bg-purple-600" : "border-gray-700"
                  )}
                >
                  Latest
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    isRefreshing && "animate-spin"
                  )}
                />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {loadingPosts ? (
            renderSkeletons()
          ) : (
            filteredPosts.map((post) => {
              const user = users.find((u) => u.id === post.userId)
              if (!user) return null

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <PostItem
                    post={post}
                    user={user}
                    onLike={async () => {}}
                    onUnlike={async () => {}}
                    onComment={async () => {}}
                    onShare={async () => {}}
                    isLiked={currentUser ? post.likes.includes(currentUser.id) : false}
                  />
                </motion.div>
              )
            })
          )}
        </AnimatePresence>

        {!loadingPosts && hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isLoadingMore ? (
              <LoadingSpinner />
            ) : (
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="text-gray-400 hover:text-white"
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleScrollToTop}
            className="fixed bottom-4 right-4 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
} 