"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, Heart, Plus, Star, Calendar, Music, Building, Briefcase, Ticket } from "lucide-react"

interface QuickAccessProps {
  className?: string
}

export function QuickAccess({ className }: QuickAccessProps) {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Array<{ path: string; label: string; icon: string }>>([])
  const [recentPages, setRecentPages] = useState<Array<{ path: string; label: string; timestamp: number }>>([])

  // Mock favorites data
  useEffect(() => {
    // In a real app, this would be fetched from an API or local storage
    setFavorites([
      { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { path: "/venue/dashboard/events", label: "Events", icon: "calendar" },
      { path: "/music", label: "Music", icon: "music" },
      { path: "/venue/analytics", label: "Analytics", icon: "chart" },
    ])
  }, [])

  // Track recently visited pages
  useEffect(() => {
    // In a real app, this would be persisted in local storage
    const mockRecentPages = [
      { path: "/feed", label: "Feed", timestamp: Date.now() - 1000 * 60 * 5 }, // 5 minutes ago
      { path: "/venue/dashboard/events/map", label: "Event Map", timestamp: Date.now() - 1000 * 60 * 30 }, // 30 minutes ago
      { path: "/messages", label: "Messages", timestamp: Date.now() - 1000 * 60 * 60 }, // 1 hour ago
      { path: "/epk", label: "EPK", timestamp: Date.now() - 1000 * 60 * 60 * 3 }, // 3 hours ago
    ]

    setRecentPages(mockRecentPages)
  }, [])

  // Get icon component based on string name
  const getIconForFavorite = (iconName: string) => {
    switch (iconName) {
      case "dashboard":
        return <div className="h-3 w-3 bg-purple-500 rounded-sm" />
      case "calendar":
        return <Calendar className="h-3 w-3 text-blue-500" />
      case "music":
        return <Music className="h-3 w-3 text-green-500" />
      case "chart":
        return <div className="h-3 w-3 bg-amber-500 rounded-sm" />
      default:
        return <div className="h-3 w-3 bg-gray-500 rounded-sm" />
    }
  }

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Quick access items
  const quickAccessItems = [
    { icon: <Calendar className="h-4 w-4" />, label: "Event", path: "/venue/dashboard/calendar" },
    { icon: <Music className="h-4 w-4" />, label: "Upload", path: "/music/upload" },
    { icon: <Building className="h-4 w-4" />, label: "Venue", path: "/venues/create" },
    { icon: <Briefcase className="h-4 w-4" />, label: "Job", path: "/jobs/create" },
    { icon: <Ticket className="h-4 w-4" />, label: "Ticket", path: "/venue/dashboard/tickets" },
  ]

  return (
    <div className={`flex flex-col space-y-6 ${className}`}>
      {/* Quick Access */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h3>
        <div className="grid grid-cols-5 gap-2">
          {quickAccessItems.map((item) => (
            <TooltipProvider key={item.path}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto flex flex-col items-center justify-center py-2 px-1 gap-1"
                    asChild
                  >
                    <Link href={item.path}>
                      {item.icon}
                      <span className="text-xs">{item.label}</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create {item.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Favorites */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Favorites</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          {favorites.map((favorite) => (
            <TooltipProvider key={favorite.path}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={favorite.path}
                    className="flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted"
                  >
                    <div className="flex h-6 w-6 items-center justify-center mr-3">
                      {getIconForFavorite(favorite.icon)}
                    </div>
                    <span>{favorite.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Remove from favorites logic would go here
                      }}
                    >
                      <Heart className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open {favorite.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/favorites")}
          >
            <Star className="h-4 w-4 mr-3 text-muted-foreground" />
            <span>Manage favorites</span>
          </Button>
        </div>
      </div>

      {/* Recent */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent</h3>
        <div className="space-y-1">
          {recentPages.map((page) => (
            <Link
              key={page.path}
              href={page.path}
              className="flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted"
            >
              <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
              <span>{page.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(page.timestamp)}</span>
            </Link>
          ))}

          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/history")}
          >
            <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
            <span>View history</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
