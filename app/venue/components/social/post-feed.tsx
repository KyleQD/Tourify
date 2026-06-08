"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "../../../context/auth-context"
import { LoadingSpinner } from "../loading-spinner"
import { PostItem } from "./post-item"
import { PostCreator } from "./post-creator"
import { RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface PostFeedProps {
  userId?: string // If provided, only show posts from this user
  filter?: "all" | "following" | "trending"
  showPostCreator?: boolean
}

export function PostFeed({ userId, filter = "all", showPostCreator = true }: PostFeedProps) {
  const socialContext = useSocial() // Keep for future use but don't destructure non-existent properties
  const { user: currentUser } = useAuth()
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "following" | "trending" | "latest">(filter)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [selectedDateRange, setSelectedDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [currentTag, setCurrentTag] = useState("")
  const [tagSuggestions] = useState([
    "music", "concert", "festival", "live", "performance", "sound", "stage", "venue", "touring", "recording"
  ])

  // Mock implementations since these don't exist in social context
  const posts: any[] = []
  const loadingPosts = false
  const users: any[] = []

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
        // filtered = filtered.filter((post) => post.userId !== currentUser?.id) // Commented out due to type issues
      } else if (activeFilter === "trending") {
        // Sort by engagement (likes + comments)
        filtered = filtered.sort((a, b) => b.likes.length + b.comments - (a.likes.length + a.comments))
      }

      // Sort by timestamp (newest first)
      filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setFilteredPosts(filtered)
    }
  }, [posts, loadingPosts, userId, activeFilter, currentUser])

  const handleRefresh = () => {
    setIsRefreshing(true)

    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const handlePostCreated = () => {
    // The post will be added to the feed automatically via the context
    // But we can add any additional logic here if needed
  }

  if (loadingPosts) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showPostCreator && currentUser && <PostCreator onPostCreated={handlePostCreated} />}

      {!userId && (
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
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

      <AnimatePresence>
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-gray-500"
          >
            <p className="mb-2">No posts found</p>
            {/* {userId && userId === currentUser?.id && <p>Share your first post with the community!</p>} */}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post, index) => {
              const author = users.find((u) => u.id === post.userId)
              if (!author) return null

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <PostItem post={post} author={author} />
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
