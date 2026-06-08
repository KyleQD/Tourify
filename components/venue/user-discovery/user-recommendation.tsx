"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCard } from "../user-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { useSocial } from "@/contexts/social-context"
import { Sparkles, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface UserRecommendationProps {
  limit?: number
  title?: string
  description?: string
  showRefresh?: boolean
  filter?: "all" | "sameRole" | "complementaryRole" | "sameLocation"
}

export function UserRecommendation({
  limit = 3,
  title = "Recommended Connections",
  description = "People you might want to connect with",
  showRefresh = true,
  filter = "all",
}: UserRecommendationProps) {
  const { user: currentUser } = useAuth()
  const { } = useSocial()
  const [users] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Generate recommendations based on user profile and behavior
  useEffect(() => {
    if (!loadingUsers && users.length > 0 && currentUser) {
      generateRecommendations()
    }
  }, [loadingUsers, users, currentUser, filter])

  const generateRecommendations = async () => {
    if (isRefreshing) {
      setIsLoading(true)
    }

    try {
      // Filter out current user
      let filteredUsers = users.filter((u) => u.id !== currentUser?.id)

      // Apply specific filters
      if (filter === "sameRole" && (currentUser as any)?.title) {
        filteredUsers = filteredUsers.filter((u) => u.title === (currentUser as any).title)
      } else if (filter === "complementaryRole" && (currentUser as any)?.title) {
        // Define complementary roles
        const roleMap: Record<string, string[]> = {
          "Tour Manager": ["Sound Engineer", "Lighting Designer", "Stage Manager"],
          "Sound Engineer": ["Tour Manager", "Lighting Designer", "Artist Manager"],
          "Lighting Designer": ["Tour Manager", "Sound Engineer", "Stage Manager"],
          "Event Producer": ["Tour Manager", "Booking Agent", "Venue Manager"],
          "Artist Manager": ["Booking Agent", "Sound Engineer", "Tour Manager"],
          "Booking Agent": ["Artist Manager", "Event Producer", "Venue Manager"],
          "Venue Manager": ["Booking Agent", "Event Producer", "Stage Manager"],
        }

        const complementaryRoles = roleMap[(currentUser as any)?.title] || []
        filteredUsers = filteredUsers.filter((u) => complementaryRoles.includes(u.title))
      } else if (filter === "sameLocation" && (currentUser as any)?.location) {
        filteredUsers = filteredUsers.filter((u) => u.location === (currentUser as any).location)
      }

      // Calculate similarity scores
      const scoredUsers = filteredUsers.map((user) => {
        let score = 0

        // Same location
        if (user.location === (currentUser as any)?.location) {
          score += 10
        }

        // Similar title
        if (user.title === (currentUser as any)?.title) {
          score += 5
        }

        // Online status
        if (user.isOnline) {
          score += 3
        }

        // Recent activity
        const lastActiveDate = new Date(user.lastActive).getTime()
        const now = new Date().getTime()
        const daysDifference = Math.floor((now - lastActiveDate) / (1000 * 60 * 60 * 24))

        if (daysDifference < 1) {
          score += 5
        } else if (daysDifference < 7) {
          score += 3
        } else if (daysDifference < 30) {
          score += 1
        }

        // Add some randomness to avoid same recommendations every time
        score += Math.random() * 2

        return { user, score }
      })

      // Sort by score and take the top 'limit'
      const topUsers = scoredUsers
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.user)

      setRecommendations(topUsers)
    } catch (error) {
      console.error("Error generating recommendations:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    generateRecommendations()
  }

  if (isLoading || loadingUsers) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <p className="mb-4">No recommendations available at this time.</p>
            {showRefresh && (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
            {title}
          </CardTitle>
          {showRefresh && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          <div className="space-y-3">
            {recommendations.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <UserCard user={user} isConnected={false} isPending={false} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
