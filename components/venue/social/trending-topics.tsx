"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatSafeNumber } from "@/lib/format/number-format"

interface TrendingTopicsProps {
  limit?: number
  showRefresh?: boolean
  className?: string
}

export function TrendingTopics({ limit = 5, showRefresh = true, className = "" }: TrendingTopicsProps) {
  const router = useRouter()
  const [topics, setTopics] = useState<{ tag: string; posts: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    const isInitialLoad = loading
    if (!isInitialLoad) {
      setRefreshing(true)
    }

    try {
      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock data
      const mockTopics = [
        { tag: "SummerTour2023", posts: 1243 },
        { tag: "LiveSoundTips", posts: 856 },
        { tag: "FestivalSeason", posts: 721 },
        { tag: "TourLife", posts: 532 },
        { tag: "StageDesign", posts: 489 },
        { tag: "BackstageMoments", posts: 423 },
        { tag: "VenueTech", posts: 387 },
        { tag: "RoadCrew", posts: 356 },
        { tag: "SoundCheck", posts: 312 },
        { tag: "TourBus", posts: 298 },
      ]

      setTopics(mockTopics.slice(0, limit))
    } catch (error) {
      console.error("Error fetching trending topics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleTopicClick = (tag: string) => {
    router.push(`/social/hashtag/${tag}`)
  }

  return (
    <Card className={`bg-gray-900 text-white border-gray-800 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-purple-400" />
            Trending Topics
          </CardTitle>
          {showRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={fetchTopics}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array(limit)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32 bg-gray-800" />
                  <Skeleton className="h-4 w-16 bg-gray-800" />
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <div key={topic.tag} className="flex justify-between items-center">
                <Badge
                  variant="outline"
                  className="bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border-purple-500/20 cursor-pointer px-2 py-1"
                  onClick={() => handleTopicClick(topic.tag)}
                >
                  #{topic.tag}
                </Badge>
                <span className="text-xs text-gray-400">{formatSafeNumber(topic.posts)} posts</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
