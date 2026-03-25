"use client"

import { useState } from "react"
import { useFriendSuggestions } from "@/hooks/use-friend-suggestions"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  RefreshCw, 
  UserPlus, 
  UserCheck, 
  MapPin, 
  Users, 
  TrendingUp,
  Clock,
  MapPin as LocationIcon,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { FriendSuggestion } from "@/lib/types/social"

interface EnhancedFriendSuggestionsProps {
  limit?: number
  algorithm?: 'popular' | 'mutual' | 'recent' | 'location'
  showAlgorithmSelector?: boolean
  showMutualFriends?: boolean
  className?: string
  onConnect?: (userId: string) => void
}

export function EnhancedFriendSuggestions({
  limit = 5,
  algorithm = 'popular',
  showAlgorithmSelector = true,
  showMutualFriends = true,
  className,
  onConnect
}: EnhancedFriendSuggestionsProps) {
  const { user } = useAuth()
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithm)
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set())

  const {
    suggestions,
    loading,
    error,
    hasMore,
    totalCount,
    algorithmUsed,
    refetch,
    loadMore,
    sendConnectionRequest,
    removeSuggestion
  } = useFriendSuggestions(user?.id || null, {
    limit,
    algorithm: selectedAlgorithm,
    include_mutual_friends: showMutualFriends,
    enabled: !!user?.id
  })

  const handleConnect = async (suggestion: FriendSuggestion) => {
    if (connectingUsers.has(suggestion.id)) return

    setConnectingUsers(prev => new Set(prev).add(suggestion.id))

    try {
      const success = await sendConnectionRequest(suggestion.id)
      
      if (success) {
        toast({
          title: "Connection Request Sent",
          description: `Your request has been sent to ${suggestion.full_name}`,
        })
        
        if (onConnect) {
          onConnect(suggestion.id)
        }
      } else {
        toast({
          title: "Request Failed",
          description: "Unable to send connection request. You may already be connected.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(suggestion.id)
        return newSet
      })
    }
  }

  const handleRefresh = async () => {
    await refetch()
    toast({
      title: "Suggestions Refreshed",
      description: "New suggestions have been loaded.",
    })
  }

  const getAlgorithmIcon = (alg: string) => {
    switch (alg) {
      case 'mutual': return <Users className="h-4 w-4" />
      case 'recent': return <Clock className="h-4 w-4" />
      case 'location': return <LocationIcon className="h-4 w-4" />
      case 'popular': 
      default: return <TrendingUp className="h-4 w-4" />
    }
  }

  const getAlgorithmLabel = (alg: string) => {
    switch (alg) {
      case 'mutual': return 'Mutual Friends'
      case 'recent': return 'Recently Joined'
      case 'location': return 'Near You'
      case 'popular': 
      default: return 'Popular Users'
    }
  }

  const renderAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const renderMutualFriends = (suggestion: FriendSuggestion) => {
    if (!showMutualFriends || !suggestion.mutual_friends?.length) return null

    return (
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>
          {suggestion.mutual_count} mutual friend{suggestion.mutual_count !== 1 ? 's' : ''}
        </span>
        {suggestion.mutual_friends.slice(0, 2).map((friend, index) => (
          <Avatar key={friend.id} className="h-4 w-4">
            <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
            <AvatarFallback className="text-xs">
              {friend.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        ))}
        {(suggestion.mutual_count || 0) > 2 && (
          <span className="text-xs">+{(suggestion.mutual_count || 0) - 2}</span>
        )}
      </div>
    )
  }

  const renderSuggestionItem = (suggestion: FriendSuggestion) => {
    const isConnecting = connectingUsers.has(suggestion.id)
    const canConnect = suggestion.can_send_request !== false

    return (
      <div key={suggestion.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={suggestion.avatar_url} alt={suggestion.full_name} />
            <AvatarFallback>{renderAvatarFallback(suggestion.full_name)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium truncate">{suggestion.full_name}</h4>
              {suggestion.is_verified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              @{suggestion.username}
            </p>
            
            {suggestion.bio && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {suggestion.bio}
              </p>
            )}
            
            <div className="flex items-center space-x-4 mt-2">
              {suggestion.location && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{suggestion.location}</span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                {suggestion.followers_count || 0} followers
              </div>
            </div>
            
            {renderMutualFriends(suggestion)}
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          {canConnect ? (
            <Button
              size="sm"
              onClick={() => handleConnect(suggestion)}
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
          ) : (
            <div className="text-xs text-muted-foreground">
              {suggestion.outgoing_request ? 'Request Sent' : 'Already Connected'}
            </div>
          )}
          
          {suggestion.relevance_score && (
            <Badge variant="outline" className="text-xs">
              Score: {Math.round(suggestion.relevance_score)}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  if (loading && suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
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
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suggestions available right now.</p>
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
          <CardTitle className="text-lg font-semibold">Suggested Connections</CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {getAlgorithmIcon(algorithmUsed)}
            <span>{getAlgorithmLabel(algorithmUsed)}</span>
            <span>•</span>
            <span>{totalCount} suggestions</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showAlgorithmSelector && (
            <div className="flex items-center space-x-1">
              {['popular', 'mutual', 'recent', 'location'].map((alg) => (
                <Button
                  key={alg}
                  variant={selectedAlgorithm === alg ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedAlgorithm(alg as any)}
                  className="h-8 w-8 p-0"
                  title={getAlgorithmLabel(alg)}
                >
                  {getAlgorithmIcon(alg)}
                </Button>
              ))}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {suggestions.map(renderSuggestionItem)}
        
        {hasMore && (
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Load More Suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
