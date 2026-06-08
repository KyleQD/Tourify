"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/context/auth"
import { formatDistanceToNow } from "date-fns"
import { Music, Play, Headphones, Share2, Plus, ExternalLink, RefreshCw, Heart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { ErrorBoundary } from "@/app/venue/components/error-boundary"

interface User {
  id: string
  fullName: string
  username: string
  avatar?: string
  title?: string
  location?: string
  status?: "online" | "offline" | "away"
  email?: string
  connections?: string[]
}

interface MusicRelease {
  id: string
  userId: string
  title: string
  type: "album" | "single" | "ep" | "remix"
  artwork: string
  releaseDate: string
  streamingLinks: {
    spotify?: string
    appleMusic?: string
    soundcloud?: string
    bandcamp?: string
  }
  tracks: number
  featured?: string[]
  liked?: boolean
}

// Memoized release item component for better performance
const ReleaseItem = memo(({ release, user, index }: { release: MusicRelease; user: User; index: number }) => {
  const [isLiked, setIsLiked] = useState(release.liked || false)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const releaseDate = formatDistanceToNow(new Date(release.releaseDate), { addSuffix: true })

  // Render release type badge
  const renderReleaseBadge = (type: MusicRelease["type"]) => {
    switch (type) {
      case "album":
        return <Badge className="bg-gradient-to-r from-purple-600 to-purple-800">Album</Badge>
      case "single":
        return <Badge className="bg-gradient-to-r from-blue-600 to-blue-800">Single</Badge>
      case "ep":
        return <Badge className="bg-gradient-to-r from-green-600 to-green-800">EP</Badge>
      case "remix":
        return <Badge className="bg-gradient-to-r from-amber-600 to-amber-800">Remix</Badge>
      default:
        return null
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="p-3 hover:bg-gray-800/50 transition-colors rounded-md"
    >
      <div className="flex space-x-3">
        <div className="relative group">
          <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-800">
            <Image
              src={release.artwork || "/placeholder.svg"}
              alt={release.title}
              width={64}
              height={64}
              className="object-cover h-full w-full"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md backdrop-blur-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white">
                    <Play className="h-4 w-4 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play preview</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-sm group-hover:text-purple-400 transition-colors">{release.title}</h3>
              <Link href={`/profile/${user.username}`} className="text-xs text-gray-400 hover:underline">
                {user.fullName}
              </Link>
              <div className="flex items-center space-x-2 mt-1">
                {renderReleaseBadge(release.type)}
                <span className="text-xs text-gray-500">{releaseDate}</span>
              </div>
            </div>

            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray-400 hover:text-white"
                      onClick={handleLike}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isLiked ? "Unlike" : "Like"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white">
                      <Headphones className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Listen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to playlist</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex mt-1 space-x-2">
            {release.streamingLinks.spotify && (
              <Link
                href={release.streamingLinks.spotify}
                target="_blank"
                className="text-xs text-green-400 hover:underline flex items-center"
              >
                Spotify <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            )}
            {release.streamingLinks.appleMusic && (
              <Link
                href={release.streamingLinks.appleMusic}
                target="_blank"
                className="text-xs text-pink-400 hover:underline flex items-center"
              >
                Apple Music <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            )}
            {release.streamingLinks.soundcloud && (
              <Link
                href={release.streamingLinks.soundcloud}
                target="_blank"
                className="text-xs text-orange-400 hover:underline flex items-center"
              >
                SoundCloud <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            )}
            {release.streamingLinks.bandcamp && (
              <Link
                href={release.streamingLinks.bandcamp}
                target="_blank"
                className="text-xs text-blue-400 hover:underline flex items-center"
              >
                Bandcamp <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ReleaseItem.displayName = "ReleaseItem"

export function MusicReleases() {
  const { users } = useSocial()
  const { user: currentUser } = useAuth()
  const [releases, setReleases] = useState<MusicRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch releases
  const fetchReleases = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // In a real app, you would fetch releases from an API
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Mock data
      const mockReleases = [
        {
          id: "1",
          userId: "1",
          title: "Summer Nights EP",
          type: "ep" as const,
          artwork: "/placeholder.svg",
          releaseDate: new Date().toISOString(),
          streamingLinks: {
            spotify: "https://spotify.com",
            appleMusic: "https://music.apple.com",
            soundcloud: "https://soundcloud.com",
          },
          tracks: 4,
          liked: false,
        },
        {
          id: "2",
          userId: "2",
          title: "Midnight Drive",
          type: "single" as const,
          artwork: "/placeholder.svg",
          releaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
          streamingLinks: {
            spotify: "https://spotify.com",
            appleMusic: "https://music.apple.com",
          },
          tracks: 1,
          liked: true,
        },
      ]

      setReleases(mockReleases)
    } catch (error) {
      console.error("Error fetching releases:", error)
      setError("Failed to load music releases. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchReleases()
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Music className="h-4 w-4 mr-2 text-purple-400" />
            Music Releases
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-16 w-16 rounded-md bg-gray-800" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-2/3 bg-gray-800" />
                  <Skeleton className="h-3 w-1/2 bg-gray-800" />
                  <Skeleton className="h-3 w-1/3 bg-gray-800" />
                </div>
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
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Music className="h-4 w-4 mr-2 text-purple-400" />
            Music Releases
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-gray-400">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-md flex items-center">
          <Music className="h-4 w-4 mr-2 text-purple-400" />
          Music Releases
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <ErrorBoundary>
          <AnimatePresence>
            {releases.length > 0 ? (
              <div className="space-y-1">
                {releases.map((release, index) => {
                  const user = users.find((u) => u.id === release.userId)
                  if (!user) return null

                  return (
                    <ReleaseItem
                      key={release.id}
                      release={release}
                      user={user}
                      index={index}
                    />
                  )
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-gray-400 py-4"
              >
                <p>No music releases available</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </CardContent>
    </Card>
  )
}
