"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "../../context/auth-context"
import { Users, UserPlus, UserCheck } from "lucide-react"
import { LoadingSpinner } from "../../components/loading-spinner"
import { useRouter } from "next/navigation"
import { UserCard } from "../../components/user-card"
import { AdvancedSearch } from "../../components/advanced-search"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

// Prevent pre-rendering since this page requires authentication
export const dynamic = 'force-dynamic'

interface SimpleUser { 
  id: string; 
  username?: string; 
  full_name?: string 
}

export default function NetworkPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SimpleUser[]>([])

  if (!user) {
    router.push("/login")
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Network</h1>

      <Tabs defaultValue="discover">
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="discover" className="flex items-center">
            <Users className="h-4 w-4 mr-2" /> Discover
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center">
            <UserCheck className="h-4 w-4 mr-2" /> Connections
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center">
            <UserPlus className="h-4 w-4 mr-2" /> Pending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4">
          <Card className="bg-gray-900 text-white border-gray-800">
            <CardHeader>
              <CardTitle>Discover People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <AdvancedSearch onResultsChange={setSearchResults} />

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found matching your search criteria.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((user) => (
                    <UserCard
                      key={user.id}
                      user={{
                        id: user.id,
                        fullName: user.full_name || user.username || 'Unknown User',
                        username: user.username || 'unknown',
                        avatar: '',
                        title: '',
                        location: '',
                        email: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      }}
                      // In a real app, you would check if the user is connected or has a pending request
                      isConnected={false}
                      isPending={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="mt-4">
          <Card className="bg-gray-900 text-white border-gray-800">
            <CardHeader>
              <CardTitle>Your Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                You don't have any connections yet. Discover people to connect with.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card className="bg-gray-900 text-white border-gray-800">
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">You don't have any pending connection requests.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
