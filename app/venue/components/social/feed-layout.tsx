"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"
import { LoadingSpinner } from "../loading-spinner"

interface FeedLayoutProps {
  defaultTab?: string
  showPostCreator?: boolean
}

export function FeedLayout({ defaultTab = "all", showPostCreator = true }: FeedLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-w-0 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <TabsContent value={activeTab} className="mt-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <p className="text-gray-400">No content available yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
