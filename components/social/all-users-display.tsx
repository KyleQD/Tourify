"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, UserPlus, AlertCircle, Users } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface User {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  bio?: string
  location?: string
  is_verified?: boolean
  followers_count?: number
  following_count?: number
  created_at: string
}

interface AllUsersDisplayProps {
  limit?: number
  className?: string
}

export function AllUsersDisplay({
  limit = 20,
  className
}: AllUsersDisplayProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchUsers = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true)
        setOffset(0)
      }
      setError(null)

      const currentOffset = loadMore ? offset : 0
      const response = await fetch(`/api/social/all-users?limit=${limit}&offset=${currentOffset}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (loadMore) {
        setUsers(prev => [...prev, ...(data.users || [])])
      } else {
        setUsers(data.users || [])
      }
      
      setHasMore(data.has_more || false)
      setOffset(currentOffset + (data.users?.length || 0))
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
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
        
        // Remove the user from the list
        setUsers(prev => prev.filter(u => u.id !== userId))
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
    await fetchUsers(false)
    toast({
      title: "Users Refreshed",
      description: "User list has been updated.",
    })
  }

  const handleLoadMore = async () => {
    await fetchUsers(true)
  }

  const renderAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  useEffect(() => {
    fetchUsers(false)
  }, [limit])

  if (loading && users.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
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
          <CardTitle className="text-lg font-semibold">All Users</CardTitle>
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

  if (users.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found.</p>
            <p className="text-sm">Try refreshing or check back later.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">All Users</CardTitle>
          <p className="text-sm text-muted-foreground">
            {users.length} users found
          </p>
        </div>
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
        {users.map((user) => {
          const isConnecting = connectingUsers.has(user.id)
          
          return (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12">
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
                    
                    <span className="text-xs text-muted-foreground">
                      Joined {formatDate(user.created_at)}
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
        
        {hasMore && (
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Load More Users
          </Button>
        )}
      </CardContent>
    </Card>
  )
}




