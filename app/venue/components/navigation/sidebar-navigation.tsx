"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Calendar,
  Music,
  Settings,
  BarChart3,
  MessageSquare,
  Briefcase,
  Menu,
  Building,
  Ticket,
  FileText,
  UserCircle,
  Clock,
  ImageIcon,
  HelpCircle,
  Video,
  ShoppingBag,
  Zap,
  Grid3X3,
  PenTool,
  DollarSign,
  Mic,
  Map,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  isNew?: boolean
  badge?: string | number
  tooltip?: string
}

export function SidebarNavigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const mainNavItems: NavItem[] = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
      tooltip: "Return to home page",
    },
    {
      title: "Dashboard",
      href: "/(main)/dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      tooltip: "View your analytics dashboard",
    },
    {
      title: "Network",
      href: "/(main)/network",
      icon: <Users className="h-5 w-5" />,
      tooltip: "Connect with other professionals",
    },
    {
      title: "Events",
      href: "/venue/dashboard/events",
      icon: <Calendar className="h-5 w-5" />,
      badge: 3,
      tooltip: "Manage and discover events",
    },
    {
      title: "Teams",
      href: "/venue/staff",
      icon: <Users className="h-5 w-5" />,
      isNew: true,
      tooltip: "Manage your team members and roles",
    },
    {
      title: "Bookings",
      href: "/venue/bookings",
      icon: <Clock className="h-5 w-5" />,
      badge: 5,
      tooltip: "Manage venue bookings and requests",
    },
    {
      title: "Music",
      href: "/(main)/music",
      icon: <Music className="h-5 w-5" />,
      tooltip: "Upload and manage your music",
    },
    {
      title: "Messages",
      href: "/(main)/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: 2,
      tooltip: "View your messages and conversations",
    },
  ]

  const contentNavItems: NavItem[] = [
    {
      title: "Posts",
      href: "/content/posts",
      icon: <PenTool className="h-5 w-5" />,
      tooltip: "Create and manage your posts",
    },
    {
      title: "Videos",
      href: "/content/videos",
      icon: <Video className="h-5 w-5" />,
      tooltip: "Upload and manage your videos",
    },
    {
      title: "Photos",
      href: "/content/photos",
      icon: <ImageIcon className="h-5 w-5" />,
      tooltip: "Upload and manage your photos",
    },
    {
      title: "EPK",
      href: "/epk",
      icon: <FileText className="h-5 w-5" />,
      badge: "Pro",
      tooltip: "Create your electronic press kit",
    },
  ]

  const venueNavItems: NavItem[] = [
    {
      title: "Venues",
      href: "/venues",
      icon: <Building className="h-5 w-5" />,
      tooltip: "Browse and manage venues",
    },
    {
      title: "Equipment",
      href: "/equipment",
      icon: <Mic className="h-5 w-5" />,
      isNew: true,
      tooltip: "Manage venue equipment",
    },
    {
      title: "Event Map",
      href: "/venue/dashboard/events/map",
      icon: <Map className="h-5 w-5" />,
      tooltip: "View events on a map",
    },
    {
      title: "Tickets",
      href: "/venue/dashboard/tickets",
      icon: <Ticket className="h-5 w-5" />,
      tooltip: "Manage event tickets",
    },
  ]

  const businessNavItems: NavItem[] = [
    {
      title: "Jobs",
      href: "/jobs",
      icon: <Briefcase className="h-5 w-5" />,
      badge: 3,
      tooltip: "Browse and post job opportunities",
    },
    {
      title: "Merch",
      href: "/merch",
      icon: <ShoppingBag className="h-5 w-5" />,
      tooltip: "Manage your merchandise",
    },
    {
      title: "Promotions",
      href: "/promotions",
      icon: <Zap className="h-5 w-5" />,
      tooltip: "Create and manage promotions",
    },
    {
      title: "Analytics",
      href: "/venue/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      tooltip: "View detailed analytics",
    },
    {
      title: "Finances",
      href: "/venue/finances",
      icon: <DollarSign className="h-5 w-5" />,
      isNew: true,
      tooltip: "Manage your financial information",
    },
  ]

  const resourceItems: NavItem[] = [
    {
      title: "Documents",
      href: "/(main)/documents",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Gallery",
      href: "/(main)/gallery",
      icon: <ImageIcon className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/(main)/messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ]

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    // Handle route groups by removing the group prefix for comparison
    const normalizedPathname = pathname.replace(/^\/(main)\//, "/")
    const normalizedHref = href.replace(/^\/(main)\//, "/")

    return (
      normalizedPathname === normalizedHref ||
      normalizedPathname.startsWith(`${normalizedHref}/`) ||
      normalizedPathname.startsWith(`${normalizedHref}?`)
    )
  }

  const renderNavItem = (item: NavItem) => (
    <TooltipProvider key={item.href} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
              isActive(item.href)
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
            onClick={() => setIsOpen(false)}
          >
            {item.icon}
            <span>{item.title}</span>
            {item.isNew && (
              <Badge variant="outline" className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300">
                New
              </Badge>
            )}
            {typeof item.badge === "number" && (
              <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
                {item.badge}
              </Badge>
            )}
            {typeof item.badge === "string" && (
              <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                {item.badge}
              </Badge>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  return (
    <>
      <div className="hidden lg:flex h-screen border-r flex-col fixed top-0 left-0 w-64 z-40">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/images/tourify-logo.png" alt="Tourify" className="h-8 w-auto" />
            <span className="text-xl font-bold">Tourify</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 py-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Main</h2>
              <div className="space-y-1">{mainNavItems.map(renderNavItem)}</div>
            </div>

            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Content</h2>
              <div className="space-y-1">{contentNavItems.map(renderNavItem)}</div>
            </div>

            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Venues & Events</h2>
              <div className="space-y-1">{venueNavItems.map(renderNavItem)}</div>
            </div>

            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Business</h2>
              <div className="space-y-1">{businessNavItems.map(renderNavItem)}</div>
            </div>

            {/* All Features Button */}
            <div className="px-3 py-2">
              <Link
                href="/features"
                className="flex items-center justify-center w-full gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
              >
                <Grid3X3 className="h-5 w-5" />
                <span>All Features</span>
              </Link>
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto p-4 border-t">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
              pathname === "/settings" && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 mt-1 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
              pathname === "/help" && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
            )}
          >
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </Link>
          <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2">
            <UserCircle className="h-9 w-9" />
            <div>
              <div className="font-medium">Alex Johnson</div>
              <div className="text-xs text-gray-500">alex@example.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:max-w-xs">
            <div className="flex items-center gap-2 font-semibold">
              <img src="/images/tourify-logo.png" alt="Tourify" className="h-8 w-auto" />
              <span className="text-xl font-bold">Tourify</span>
            </div>
            <ScrollArea className="my-4 h-[calc(100vh-8rem)]">
              <div className="space-y-6 py-4">
                <div className="px-3 py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Main</h2>
                  <div className="space-y-1">
                    {mainNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                          isActive(item.href)
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                        {item.isNew && (
                          <Badge
                            variant="outline"
                            className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300"
                          >
                            New
                          </Badge>
                        )}
                        {typeof item.badge === "number" && (
                          <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
                            {item.badge}
                          </Badge>
                        )}
                        {typeof item.badge === "string" && (
                          <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Content</h2>
                  <div className="space-y-1">
                    {contentNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                          isActive(item.href)
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                        {item.isNew && (
                          <Badge
                            variant="outline"
                            className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300"
                          >
                            New
                          </Badge>
                        )}
                        {typeof item.badge === "number" && (
                          <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
                            {item.badge}
                          </Badge>
                        )}
                        {typeof item.badge === "string" && (
                          <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Venues & Events</h2>
                  <div className="space-y-1">
                    {venueNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                          isActive(item.href)
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                        {item.isNew && (
                          <Badge
                            variant="outline"
                            className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300"
                          >
                            New
                          </Badge>
                        )}
                        {typeof item.badge === "number" && (
                          <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
                            {item.badge}
                          </Badge>
                        )}
                        {typeof item.badge === "string" && (
                          <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Business</h2>
                  <div className="space-y-1">
                    {businessNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                          isActive(item.href)
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                        {item.isNew && (
                          <Badge
                            variant="outline"
                            className="ml-auto h-5 text-xs bg-purple-100 text-purple-800 border-purple-300"
                          >
                            New
                          </Badge>
                        )}
                        {typeof item.badge === "number" && (
                          <Badge className="ml-auto bg-purple-600 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1">
                            {item.badge}
                          </Badge>
                        )}
                        {typeof item.badge === "string" && (
                          <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs px-2">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="border-t pt-4">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                  pathname === "/settings" && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
                )}
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <Link
                href="/help"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 mt-1 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                  pathname === "/help" && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
                )}
                onClick={() => setIsOpen(false)}
              >
                <HelpCircle className="h-5 w-5" />
                <span>Help & Support</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/images/tourify-logo.png" alt="Tourify" className="h-8 w-auto" />
          <span className="text-xl font-bold">Tourify</span>
        </Link>
      </div>
    </>
  )
}
