"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from "date-fns"
import { Music, Play, Headphones, Share2, Plus, ExternalLink, RefreshCw, Heart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { ErrorBoundary } from "../error-boundary"

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
const ReleaseItem = memo(({ release, user, index }: { release: MusicRelease; user: any; index: number }) => {
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
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ReleaseItem.displayName = "ReleaseItem"

export function MusicReleases() {
  const { } = useSocial()
  const [users] = useState<any[]>([])
  const { user: currentUser } = useAuth()
  const [releases, setReleases] = useState<MusicRelease[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch music releases
  const fetchReleases = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      // In a real app, you would fetch releases from an API
      // For now, we'll generate some mock data
      await new Promise((resolve) => setTimeout(resolve, 800))

      const mockReleases: MusicRelease[] = [
        {
          id: "1",
          userId: "2", // Sarah Johnson
          title: "Midnight Sessions",
          type: "album",
          artwork: "/placeholder.svg?height=300&width=300&text=Midnight+Sessions",
          releaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          streamingLinks: {
            spotify: "https://spotify.com",
            appleMusic: "https://music.apple.com",
            soundcloud: "https://soundcloud.com",
          },
          tracks: 12,
          liked: Math.random() > 0.5,
        },
        {
          id: "2",
          userId: "3", // Mike Williams
          title: "Neon Dreams (Remix)",
          type: "remix",
          artwork: "/placeholder.svg?height=300&width=300&text=Neon+Dreams",
          releaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
          streamingLinks: {
            spotify: "https://spotify.com",
            soundcloud: "https://soundcloud.com",
          },
          tracks: 1,
          featured: ["Alex Martinez"],
          liked: Math.random() > 0.5,
        },
        {
          id: "3",
          userId: "5", // David Rodriguez
          title: "Summer Vibes EP",
          type: "ep",
          artwork: "/placeholder.svg?height=300&width=300&text=Summer+Vibes",
          releaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
          streamingLinks: {
            spotify: "https://spotify.com",
            appleMusic: "https://music.apple.com",
            bandcamp: "https://bandcamp.com",
          },
          tracks: 5,
          liked: Math.random() > 0.5,
        },
        {
          id: "4",
          userId: "4", // Jennifer Chen
          title: "Acoustic Memories",
          type: "single",
          artwork: "/placeholder.svg?height=300&width=300&text=Acoustic+Memories",
          releaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
          streamingLinks: {
            spotify: "https://spotify.com",
            appleMusic: "https://music.apple.com",
          },
          tracks: 1,
          liked: Math.random() > 0.5,
        },
      ]

      if (refresh) {
        // For refresh, randomize the order
        setReleases([...mockReleases].sort(() => Math.random() - 0.5))
      } else {
        setReleases(mockReleases)
      }
    } catch (error) {
      console.error("Error fetching music releases:", error)
      setError("Failed to load music releases. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  // Get user by ID
  const getUserById = useCallback(
    (userId: string) => {
      return users.find((u) => u.id === userId)
    },
    [users],
  )

  // Handle refresh
  const handleRefresh = () => {
    fetchReleases(true)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Music className="h-4 w-4 mr-2 text-purple-400" />
            New Music Releases
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-16 w-16 rounded-md bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-gray-800" />
                  <Skeleton className="h-3 w-1/4 bg-gray-800" />
                  <Skeleton className="h-3 w-1/2 bg-gray-800" />
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
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Music className="h-4 w-4 mr-2 text-purple-400" />
            New Music Releases
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-4 text-gray-400">
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={() => fetchReleases()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong with the music releases component.</div>}>
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Music className="h-4 w-4 mr-2 text-purple-400" />
            New Music Releases
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
                <p>Refresh releases</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="p-0">
          <AnimatePresence>
            {releases.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No recent music releases</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {releases.map((release, index) => {
                  const user = getUserById(release.userId)
                  if (!user) return null

                  return <ReleaseItem key={release.id} release={release} user={user} index={index} />
                })}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
