"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Calendar,
  Settings,
  Music,
  Mic2,
  Radio,
  Headphones,
  Star,
  TrendingUp,
  MessageSquare,
  Bell,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

interface SidebarItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: number
  items?: {
    label: string
    href: string
    badge?: number
  }[]
}

interface EnhancedSidebarProps {
  className?: string
  defaultCollapsed?: boolean
}

export function EnhancedSidebar({ className = "", defaultCollapsed = false }: EnhancedSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  // Navigation items
  const navigationItems: SidebarItem[] = [
    {
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      href: "/",
    },
    {
      label: "Community",
      icon: <TrendingUp className="h-4 w-4" />,
      href: "/community",
      badge: 3,
    },
    {
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      href: "/messages",
      badge: 5,
    },
    {
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      href: "/notifications",
      badge: 2,
    },
    {
      label: "Network",
      icon: <Users className="h-4 w-4" />,
      href: "/network",
      items: [
        { label: "Artists", href: "/network/artists" },
        { label: "Venues", href: "/network/venues" },
        { label: "Promoters", href: "/network/promoters" },
      ],
    },
    {
      label: "Events",
      icon: <Calendar className="h-4 w-4" />,
      href: "/events",
      items: [
        { label: "Upcoming", href: "/events/upcoming", badge: 2 },
        { label: "Past", href: "/events/past" },
        { label: "Calendar", href: "/events/calendar" },
      ],
    },
    {
      label: "Music",
      icon: <Music className="h-4 w-4" />,
      href: "/music",
      items: [
        { label: "Tracks", href: "/music/tracks" },
        { label: "Albums", href: "/music/albums" },
        { label: "Playlists", href: "/music/playlists" },
      ],
    },
    {
      label: "Equipment",
      icon: <Headphones className="h-4 w-4" />,
      href: "/equipment",
      items: [
        { label: "Sound", href: "/equipment/sound" },
        { label: "Lighting", href: "/equipment/lighting" },
        { label: "DJ Gear", href: "/equipment/dj-gear" },
      ],
    },
    {
      label: "Radio",
      icon: <Radio className="h-4 w-4" />,
      href: "/radio",
      items: [
        { label: "Live", href: "/radio/live", badge: 1 },
        { label: "Shows", href: "/radio/shows" },
        { label: "Archive", href: "/radio/archive" },
      ],
    },
    {
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      href: "/settings",
    },
  ]

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Check if a link is active
  const isLinkActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div
      className={cn(
        "flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
        {!isCollapsed && <span className="text-lg font-semibold text-white">Tourify</span>}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {navigationItems.map((item, index) => (
            <div key={item.href}>
              {index > 0 && item.items && <Separator className="my-2 bg-gray-800" />}
              <div>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
                    isLinkActive(item.href) && "bg-gray-800 text-white",
                  )}
                  onClick={() => {
                    if (item.items) {
                      setActiveGroup(activeGroup === item.label ? null : item.label)
                    }
                  }}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs font-medium">
                          {item.badge}
                        </span>
                      )}
                      {item.items && (
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            activeGroup === item.label && "rotate-90",
                          )}
                        />
                      )}
                    </>
                  )}
                </Link>

                {!isCollapsed && item.items && activeGroup === item.label && (
                  <div className="mt-1 ml-4 grid gap-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
                          isLinkActive(subItem.href) && "bg-gray-800 text-white",
                        )}
                      >
                        <span className="flex-1">{subItem.label}</span>
                        {subItem.badge && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs font-medium">
                            {subItem.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {!isCollapsed && user && (
        <div className="mt-auto border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-800">
              {/* User avatar would go here */}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{(user as any).name || (user as any).user_metadata?.full_name || (user as any).user_metadata?.name || (user as any).email}</span>
              <span className="text-xs text-gray-400">{(user as any).email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
