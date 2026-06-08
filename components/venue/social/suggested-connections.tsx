"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth-context"
import { Users, UserPlus, RefreshCw, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useInView } from "react-intersection-observer"
import { ErrorBoundary } from "../error-boundary"

// Memoized connection item component for better performance
const ConnectionItem = memo(
  ({
    user,
    index,
    isPending,
    onConnect,
  }: {
    user: any
    index: number
    isPending: boolean
    onConnect: (id: string) => void
  }) => {
    const { ref, inView } = useInView({
      triggerOnce: true,
      threshold: 0.1,
    })

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="p-3 hover:bg-gray-800/50 transition-colors rounded-md"
      >
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${user.username}`}>
            <Avatar className="h-10 w-10 border border-gray-800">
              <AvatarImage src={user.avatar} alt={user.fullName} />
              <AvatarFallback className="bg-gray-800 text-gray-400">
                {user.fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/profile/${user.username}`} className="hover:underline">
              <h3 className="font-medium text-sm group-hover:text-purple-400 transition-colors">{user.fullName}</h3>
            </Link>
            <p className="text-xs text-gray-500 truncate">{user.title}</p>
            <p className="text-xs text-gray-500">{user.location}</p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isPending ? "secondary" : "outline"}
                  className={`h-8 text-xs ${isPending ? "bg-gray-700" : "border-gray-700"}`}
                  onClick={() => onConnect(user.id)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Sent
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Connect
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPending ? "Request sent" : "Send connection request"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    )
  },
)

ConnectionItem.displayName = "ConnectionItem"

export function SuggestedConnections() {
  const { } = useSocial()
  const [users] = useState<any[]>([])
  const { user: currentUser } = useAuth()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch connection suggestions
  const fetchSuggestions = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        // In a real app, you would fetch suggestions from an API
        // For now, we'll filter the mock users
        await new Promise((resolve) => setTimeout(resolve, 800))

        if (users.length > 0 && currentUser) {
          // Filter out current user and already connected users
          const filtered = users.filter((user) => user.id !== currentUser.id)

          if (refresh) {
            // For refresh, randomize the order
            setSuggestions([...filtered].sort(() => Math.random() - 0.5).slice(0, 5))
          } else {
            setSuggestions(filtered.slice(0, 5)) // Limit to 5 suggestions
          }
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setError("Failed to load connection suggestions. Please try again.")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [users, currentUser],
  )

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Handle refresh
  const handleRefresh = () => {
    fetchSuggestions(true)
  }

  // Handle connection request
  const handleConnect = useCallback(
    async (userId: string) => {
      try {
        setPendingRequests((prev) => [...prev, userId])
        // Mock sendConnectionRequest for now
        console.log("Sending connection request to:", userId)
      } catch (error) {
        console.error("Error sending connection request:", error)
        // Remove from pending if there was an error
        setPendingRequests((prev) => prev.filter((id) => id !== userId))
      }
    },
    [],
  )

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Users className="h-4 w-4 mr-2 text-purple-400" />
            Suggested Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-1/2 bg-gray-800" />
                  <Skeleton className="h-3 w-1/3 bg-gray-800" />
                </div>
                <Skeleton className="h-8 w-20 bg-gray-800" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Users className="h-4 w-4 mr-2 text-purple-400" />
            Suggested Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-4 text-gray-400">
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={() => fetchSuggestions()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong with the suggested connections component.</div>}>
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Users className="h-4 w-4 mr-2 text-purple-400" />
            Suggested Connections
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh suggestions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="p-0">
          <AnimatePresence>
            {suggestions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No suggestions available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {suggestions.map((user, index) => (
                  <ConnectionItem
                    key={user.id}
                    user={user}
                    index={index}
                    isPending={pendingRequests.includes(user.id)}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
