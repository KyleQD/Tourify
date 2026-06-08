"use client"

import { useState, useEffect } from "react"
import { useSocial } from "@/contexts/social-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, UserPlus, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { User } from "@/types/user"

interface SuggestedConnectionsProps {
  limit?: number
  excludeUserIds?: string[]
  onConnect?: (userId: string) => void
}

export function SuggestedConnections({ 
  limit = 5, 
  excludeUserIds = [], 
  onConnect 
}: SuggestedConnectionsProps) {
  const { users, loadingUsers, sendConnectionRequest } = useSocial()
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuggestedUsers()
  }, [users, excludeUserIds])

  const loadSuggestedUsers = () => {
    setLoading(true)
    // Filter out excluded users and get random sample
    const filteredUsers = users.filter(user => 
      !excludeUserIds.includes(user.id) && 
      !user.connections?.includes(user.id)
    )
    
    const shuffled = [...filteredUsers].sort(() => 0.5 - Math.random())
    setSuggestedUsers(shuffled.slice(0, limit))
    setLoading(false)
  }

  const handleConnect = async (userId: string) => {
    try {
      await sendConnectionRequest(userId)
      if (onConnect) {
        onConnect(userId)
      }
      // Remove the connected user from suggestions
      setSuggestedUsers(prev => prev.filter(user => user.id !== userId))
    } catch (error) {
      console.error("Failed to send connection request:", error)
    }
  }

  const renderAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  if (loading || loadingUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (suggestedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No suggestions available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadSuggestedUsers}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestedUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.fullName} />
                <AvatarFallback>{renderAvatarFallback(user.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.fullName}</div>
                <div className="text-sm text-muted-foreground">
                  {user.title || user.location || "@" + user.username}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConnect(user.id)}
              className="h-8"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 