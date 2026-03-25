"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, UserPlus, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SimpleUser {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  bio?: string
  location?: string
  is_verified?: boolean
  followers_count?: number
}

interface SimpleFriendSuggestionsProps {
  limit?: number
  className?: string
}

export function SimpleFriendSuggestions({
  limit = 5,
  className
}: SimpleFriendSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set())

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/social/simple-suggestions?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (userId: string) => {
    if (connectingUsers.has(userId)) return

    setConnectingUsers(prev => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/social/simple-connection-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_user_id: userId }),
      })

      if (response.ok) {
        toast({
          title: "Connection Request Sent",
          description: "Your request has been sent successfully!",
        })
        
        // Remove the suggestion from the list
        setSuggestions(prev => prev.filter(s => s.id !== userId))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send request')
      }
    } catch (err) {
      console.error('Error sending connection request:', err)
      toast({
        title: "Request Failed",
        description: err instanceof Error ? err.message : "Failed to send connection request",
        variant: "destructive"
      })
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleRefresh = async () => {
    await fetchSuggestions()
    toast({
      title: "Suggestions Refreshed",
      description: "New suggestions have been loaded.",
    })
  }

  const renderAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  useEffect(() => {
    fetchSuggestions()
  }, [limit])

  if (loading) {
    return (
      <Card className={className}>
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

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No suggestions available right now.
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="w-full mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-8 w-8"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((user) => {
          const isConnecting = connectingUsers.has(user.id)
          
          return (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                  <AvatarFallback>{renderAvatarFallback(user.full_name)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium truncate">{user.full_name}</h4>
                    {user.is_verified && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        ✓
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </p>
                  
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-1">
                    {user.location && (
                      <span className="text-xs text-muted-foreground">
                        📍 {user.location}
                      </span>
                    )}
                    
                    <span className="text-xs text-muted-foreground">
                      {user.followers_count || 0} followers
                    </span>
                  </div>
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => handleConnect(user.id)}
                disabled={isConnecting}
                className="h-8"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Connect
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
