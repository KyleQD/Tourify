"use client"

import { EnhancedFriendSuggestions } from "./enhanced-friend-suggestions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Clock, MapPin } from "lucide-react"

export function FriendSuggestionsDemo() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Friend Suggestions System</h2>
        <p className="text-muted-foreground">
          A scalable and intelligent friend suggestion system with multiple algorithms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Popular Users Algorithm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Popular Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedFriendSuggestions
              limit={3}
              algorithm="popular"
              showAlgorithmSelector={false}
              showMutualFriends={true}
            />
          </CardContent>
        </Card>

        {/* Mutual Friends Algorithm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Mutual Friends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedFriendSuggestions
              limit={3}
              algorithm="mutual"
              showAlgorithmSelector={false}
              showMutualFriends={true}
            />
          </CardContent>
        </Card>

        {/* Recent Users Algorithm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recently Joined</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedFriendSuggestions
              limit={3}
              algorithm="recent"
              showAlgorithmSelector={false}
              showMutualFriends={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Full Featured Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Full Featured Suggestions</span>
            <Badge variant="secondary">Interactive</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedFriendSuggestions
            limit={5}
            algorithm="popular"
            showAlgorithmSelector={true}
            showMutualFriends={true}
            onConnect={(userId) => {
              console.log('Connected to user:', userId)
            }}
          />
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Algorithms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Popular Users (by follower count)</li>
                <li>• Mutual Friends (shared connections)</li>
                <li>• Recent Users (newly joined)</li>
                <li>• Location-based (same area)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time connection requests</li>
                <li>• Mutual friend display</li>
                <li>• Relevance scoring</li>
                <li>• Infinite scroll loading</li>
                <li>• Error handling & retry</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

