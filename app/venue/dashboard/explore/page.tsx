"use client"

// Prevent pre-rendering since this page requires client-side features
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { FeedLayout } from "../../components/social/feed-layout"
import { PostCreatorLayout } from "../../components/social/post-creator-layout"
import { UserRecommendation } from "../../components/user-discovery/user-recommendation"
import { LoadingSpinner } from "../../components/loading-spinner"
import { useRouter } from "next/navigation"
import { Compass, Users, TrendingUp, Music, Calendar } from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

export default function ExplorePage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("discover")

  if (!isAuthenticated) {
    router.push("/login")
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Compass className="h-6 w-6 text-purple-500" />
          Explore
        </h1>
        <p className="text-gray-400">Discover new content and connect with professionals</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="discover" className="flex items-center gap-1">
            <Compass className="h-4 w-4" /> Discover
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Trending
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> People
          </TabsTrigger>
          <TabsTrigger value="music" className="flex items-center gap-1">
            <Music className="h-4 w-4" /> Music
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4">
          <FeedLayout defaultTab="all" showPostCreator={false} />
        </TabsContent>

        <TabsContent value="trending" className="mt-4">
          <FeedLayout defaultTab="trending" showPostCreator={false} />
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UserRecommendation
                title="Discover People"
                description="Connect with professionals in the music industry"
                limit={20}
                showFilters={true}
                layout="grid"
              />
            </div>
            <div className="space-y-6">
              <PostCreatorLayout showSidebar={false} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="music" className="mt-4">
          <FeedLayout defaultTab="music" showPostCreator={false} />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <FeedLayout defaultTab="events" showPostCreator={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
