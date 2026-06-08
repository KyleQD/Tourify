"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageSquare, UserPlus, Calendar, Award } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface ActivityItem {
  id: string
  type: "like" | "comment" | "follow" | "event" | "post" | "achievement"
  userId: string
  targetId: string
  timestamp: string
  content?: string
}

export function ActivityFeed() {

  const { user: currentUser } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch activity data
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true)

      try {
        // In a real app, you would fetch activities from an API
        // For now, we'll generate some mock data
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockActivities: ActivityItem[] = [
          {
            id: "1",
            type: "like",
            userId: "2", // Sarah Johnson
            targetId: "post1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          },
          {
            id: "2",
            type: "comment",
            userId: "3", // Mike Williams
            targetId: "post2",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            content: "Great insights! Looking forward to the next tour.",
          },
          {
            id: "3",
            type: "follow",
            userId: "4", // Jennifer Chen
            targetId: currentUser?.id || "1",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          },
          {
            id: "4",
            type: "event",
            userId: "5", // David Rodriguez
            targetId: "event1",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            content: "Electronic Horizons Festival",
          },
          {
            id: "5",
            type: "post",
            userId: "2", // Sarah Johnson
            targetId: "post3",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
            content: "Just finished setting up for tonight's show!",
          },
          {
            id: "6",
            type: "achievement",
            userId: "3", // Mike Williams
            targetId: "achievement1",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            content: "Completed 50 successful events",
          },
        ]

        setActivities(mockActivities)
      } catch (error) {
        console.error("Error fetching activities:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [currentUser])

  // Get user by ID
  const getUserById = (userId: string) => {
    return { 
      id: userId, 
      name: "User", 
      username: `user${userId}`,
      fullName: "User Name",
      avatar: "/placeholder.svg" 
    }
  }

  // Render activity icon
  const renderActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500" />
      case "comment":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "follow":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "event":
        return <Calendar className="h-4 w-4 text-yellow-500" />
      case "post":
        return <MessageSquare className="h-4 w-4 text-purple-500" />
      case "achievement":
        return <Award className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  // Render activity text
  const renderActivityText = (activity: ActivityItem) => {
    const user = getUserById(activity.userId)
    if (!user) return null

    switch (activity.type) {
      case "like":
        return (
          <p className="text-sm">
            <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
              {user.fullName}
            </Link>{" "}
            liked your post
          </p>
        )
      case "comment":
        return (
          <div>
            <p className="text-sm">
              <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
                {user.fullName}
              </Link>{" "}
              commented on your post
            </p>
            {activity.content && <p className="text-xs text-gray-500 mt-1 italic">"{activity.content}"</p>}
          </div>
        )
      case "follow":
        return (
          <p className="text-sm">
            <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
              {user.fullName}
            </Link>{" "}
            started following you
          </p>
        )
      case "event":
        return (
          <div>
            <p className="text-sm">
              <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
                {user.fullName}
              </Link>{" "}
              invited you to an event
            </p>
            {activity.content && <p className="text-xs text-gray-500 mt-1">{activity.content}</p>}
          </div>
        )
      case "post":
        return (
          <div>
            <p className="text-sm">
              <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
                {user.fullName}
              </Link>{" "}
              shared a new post
            </p>
            {activity.content && <p className="text-xs text-gray-500 mt-1 italic">"{activity.content}"</p>}
          </div>
        )
      case "achievement":
        return (
          <div>
            <p className="text-sm">
              <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
                {user.fullName}
              </Link>{" "}
              earned an achievement
            </p>
            {activity.content && <p className="text-xs text-gray-500 mt-1">{activity.content}</p>}
          </div>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-md">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence>
          {activities.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {activities.map((activity, index) => {
                const user = getUserById(activity.userId)
                if (!user) return null

                const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="p-3 hover:bg-gray-800/50"
                  >
                    <div className="flex items-start space-x-3">
                      <Link href={`/profile/${user.username}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.fullName} />
                          <AvatarFallback>
                            {user.fullName
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {renderActivityIcon(activity.type)}
                            <div>{renderActivityText(activity)}</div>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
