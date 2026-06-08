"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PostItem } from "@/components/social/post-item"
import { RefreshCw, Calendar, ImageIcon, SortAsc } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { useDebounce } from "@/hooks/use-debounce"

interface EnhancedFeedProps {
  userId?: string
  filter?: "all" | "following" | "trending" | "latest" | "music" | "events"
  showPostCreator?: boolean
  limit?: number
  showFilters?: boolean
  showAdvancedFilters?: boolean
  searchQuery?: string
  className?: string
}

export function EnhancedFeed({
  userId,
  filter = "all",
  showPostCreator = true,
  limit,
  showFilters = true,
  showAdvancedFilters = false,
  searchQuery = "",
  className = "",
}: EnhancedFeedProps) {
  const { posts } = useSocial()
  const { user: currentUser } = useAuth()
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [users] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState<string>(filter)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all")
  const [mediaFilter, setMediaFilter] = useState<"all" | "images" | "videos" | "none">("all")
  const [sortOrder, setSortOrder] = useState<"latest" | "popular">("latest")

  // Ref for infinite scrolling
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  const isLoadMoreVisible = useIntersectionObserver(loadMoreRef, {
    threshold: 0.5,
    rootMargin: "100px",
  })

  // Function to load more posts
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      // In a real app, you would fetch more posts from the API
      // For now, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
  }, [isLoadingMore, hasMore, page])

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
        filtered = filtered.sort((a, b) => b.likes.length + b.comments - (a.likes.length + a.comments))
      } else if (activeFilter === "latest") {
        // Sort by timestamp (newest first)
        filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      } else if (activeFilter === "music") {
        // Filter posts with music tag or category
        filtered = filtered.filter(
          (post) =>
            post.tags?.includes("music") ||
            post.content.toLowerCase().includes("music") ||
            post.content.toLowerCase().includes("song") ||
            post.content.toLowerCase().includes("album"),
        )
      } else if (activeFilter === "events") {
        // Filter posts with event metadata or tags
        filtered = filtered.filter(
          (post) =>
            post.eventDetails ||
            post.tags?.includes("event") ||
            post.content.toLowerCase().includes("event") ||
            post.content.toLowerCase().includes("concert") ||
            post.content.toLowerCase().includes("festival"),
        )
      }

      // Apply search query
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase()
        filtered = filtered.filter(
          (post) =>
            post.content.toLowerCase().includes(query) ||
            users
              .find((u) => u.id === post.userId)
              ?.fullName.toLowerCase()
              .includes(query) ||
            users
              .find((u) => u.id === post.userId)
              ?.username.toLowerCase()
              .includes(query) ||
            post.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
        )
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const now = new Date()
        let cutoff: Date

        if (dateFilter === "today") {
          cutoff = new Date(now.setHours(0, 0, 0, 0))
        } else if (dateFilter === "week") {
          cutoff = new Date(now.setDate(now.getDate() - 7))
        } else {
          // month
          cutoff = new Date(now.setMonth(now.getMonth() - 1))
        }

        filtered = filtered.filter((post) => new Date(post.timestamp) >= cutoff)
      }

      // Apply media filter
      if (mediaFilter !== "all") {
        if (mediaFilter === "images") {
          filtered = filtered.filter((post) => post.media?.some((m: any) => m.type === "image"))
        } else if (mediaFilter === "videos") {
          filtered = filtered.filter((post) => post.media?.some((m: any) => m.type === "video"))
        } else if (mediaFilter === "none") {
          filtered = filtered.filter((post) => !post.media || post.media.length === 0)
        }
      }

      // Apply sort order
      if (sortOrder === "latest") {
        filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      } else if (sortOrder === "popular") {
        filtered = filtered.sort((a, b) => b.likes.length + b.comments - (a.likes.length + a.comments))
      }

      // Apply limit if provided
      if (limit) {
        filtered = filtered.slice(0, limit)
      }

      setFilteredPosts(filtered)
      setHasMore(filtered.length < posts.length)
    }
  }, [
    posts,
    loadingPosts,
    userId,
    activeFilter,
    currentUser,
    limit,
    debouncedSearchQuery,
    users,
    dateFilter,
    mediaFilter,
    sortOrder,
  ])

  // Load more posts when the load more element is visible
  useEffect(() => {
    if (isLoadMoreVisible && hasMore && !isLoadingMore && !loadingPosts) {
      loadMorePosts()
    }
  }, [isLoadMoreVisible, hasMore, isLoadingMore, loadingPosts, loadMorePosts])

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

  const resetFilters = () => {
    setDateFilter("all")
    setMediaFilter("all")
    setSortOrder("latest")
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
    <div className={`space-y-4 ${className}`}>
      {showAdvancedFilters && (
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block flex items-center">
                  <Calendar className="h-4 w-4 mr-1" /> Date
                </label>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block flex items-center">
                  <ImageIcon className="h-4 w-4 mr-1" /> Media
                </label>
                <Select value={mediaFilter} onValueChange={(value) => setMediaFilter(value as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by media" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="images">With images</SelectItem>
                    <SelectItem value="videos">With videos</SelectItem>
                    <SelectItem value="none">No media</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block flex items-center">
                  <SortAsc className="h-4 w-4 mr-1" /> Sort by
                </label>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Sort posts" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="latest">Latest first</SelectItem>
                    <SelectItem value="popular">Most popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="border-gray-700 text-gray-300 w-full"
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

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
            {searchQuery && <p>Try adjusting your search or filters</p>}
            {userId && userId === currentUser?.id && <p>Share your first post with the community!</p>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {filteredPosts.map((post, index) => {
              const author = users.find((u) => u.id === post.userId)
              if (!author) return null

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <PostItem 
                    post={post} 
                    user={author || { id: post.userId, fullName: "User", username: "user", avatar: "/placeholder.svg" }}
                    onLike={async () => {}}
                    onUnlike={async () => {}}
                    onComment={async () => {}}
                    onShare={async () => {}}
                    isLiked={false}
                  />
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
    </div>
  )
}
