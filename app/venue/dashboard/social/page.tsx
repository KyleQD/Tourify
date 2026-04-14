"use client"

// Prevent pre-rendering since this page requires social context
export const dynamic = 'force-dynamic'

import { useAuth } from "../../context/auth-context"
import { useSocial } from "../../context/social-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { EnhancedPostFeed } from "@/app/venue/components/social/enhanced-post-feed"
// import { ActivityFeed } from "@/app/venue/components/social/activity-feed"
// import { SuggestedConnections } from "@/app/venue/components/social/suggested-connections"
// import { TrendingTopics } from "@/app/venue/components/social/trending-topics"
// import { UpcomingEvents } from "@/app/venue/components/social/upcoming-events"
// import { MusicReleases } from "@/app/venue/components/social/music-releases"
// import { EventUpdates } from "@/app/venue/components/social/event-updates"

export default function SocialPage() {
  // Temporarily disable hooks to avoid provider issues
  // const { user } = useAuth()
  // const { posts, users } = useSocial()

  return (
    <div className="container mx-auto min-w-0 px-3 py-8 sm:px-4">
      <div className="grid min-w-0 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Enhanced Post Feed Component</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Activity Feed Component</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Suggested Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Suggested Connections Component</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Trending Topics Component</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Upcoming Events Component</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Music Releases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Music Releases Component</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">Event Updates Component</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
