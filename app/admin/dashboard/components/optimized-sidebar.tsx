"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useAdminStats } from "../hooks/use-admin-stats"
import {
  Home,
  Globe,
  Calendar,
  Ticket,
  Truck,
  Users,
  DollarSign,
  Package,
  Settings,
  Music,
  Building,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Award,
  Crown,
  Target,
  Clock,
  Radio,
  Plus,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: any
  badge?: string
  badgeColor?: string
  children?: NavItem[]
  isNew?: boolean
  isPro?: boolean
  description?: string
  shortcut?: string
}



export function OptimizedSidebar() {
  const pathname = usePathname()
  const { currentAccount } = useMultiAccount()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // Fetch real admin stats
  const { stats, isLoading } = useAdminStats()

  const profile = currentAccount?.profile_data as
    | { display_name?: string; username?: string; organization_name?: string }
    | undefined
  const sidebarHeaderTitle =
    (currentAccount as { display_name?: string } | null)?.display_name ||
    (currentAccount as { username?: string } | null)?.username ||
    profile?.display_name ||
    profile?.username ||
    profile?.organization_name ||
    "Organizer"

  // Create navigation items with real data
  const navItems: NavItem[] = [
    { 
      label: "Dashboard", 
      href: "/admin/dashboard", 
      icon: Home,
      description: "Main dashboard overview",
      shortcut: "⌘1"
    },
    { 
      label: "Tours", 
      href: "/admin/dashboard/tours", 
      icon: Globe,
      badge: stats?.totalTours?.toString() || "0",
      badgeColor: "bg-purple-500/20 text-purple-400",
      description: "Manage tours and itineraries",
      shortcut: "⌘2",
      children: [
        { label: "Active Tours", href: "/admin/dashboard/tours?status=active", icon: Activity, description: "Currently running tours" },
        { label: "Planning", href: "/admin/dashboard/tours?status=planning", icon: Target, description: "Tours in planning phase" },
        { label: "Archive", href: "/admin/dashboard/tours?status=completed", icon: Package, description: "Completed tours" }
      ]
    },
    { 
      label: "Events", 
      href: "/admin/dashboard/events", 
      icon: Calendar,
      badge: stats?.totalEvents?.toString() || "0",
      badgeColor: "bg-green-500/20 text-green-400",
      description: "Event management and scheduling",
      shortcut: "⌘3",
      children: [
        { label: "Upcoming", href: "/admin/dashboard/events?status=upcoming", icon: Clock, description: "Future events" },
        { label: "Live Events", href: "/admin/dashboard/events?status=live", icon: Radio, description: "Currently happening" },
        { label: "Past Events", href: "/admin/dashboard/events?status=past", icon: Award, description: "Completed events" }
      ]
    },
    { 
      label: "Artists", 
      href: "/admin/dashboard/artists", 
      icon: Music,
      badge: stats?.totalArtists?.toString() || "0",
      badgeColor: "bg-pink-500/20 text-pink-400",
      description: "Artist profiles and bookings",
      shortcut: "⌘4",
    },
    { 
      label: "Venues", 
      href: "/admin/dashboard/venues", 
      icon: Building,
      badge: stats?.totalVenues?.toString() || "0",
      badgeColor: "bg-orange-500/20 text-orange-400",
      description: "Venue partnerships and management",
      shortcut: "⌘5",
    },
    { 
      label: "Ticketing", 
      href: "/admin/dashboard/ticketing", 
      icon: Ticket,
      badge: stats?.ticketsSold ? `${(stats.ticketsSold / 1000).toFixed(1)}K` : "0",
      badgeColor: "bg-blue-500/20 text-blue-400",
      description: "Ticket sales and management",
      shortcut: "⌘6"
    },
    { 
      label: "Staff & Crew", 
      href: "/admin/dashboard/staff", 
      icon: Users,
      badge: stats?.staffMembers?.toString() || "0",
      badgeColor: "bg-cyan-500/20 text-cyan-400",
      description: "Team management and scheduling",
      shortcut: "⌘7"
    },
    { 
      label: "Logistics", 
      href: "/admin/dashboard/logistics", 
      icon: Truck,
      description: "Transportation and equipment",
      shortcut: "⌘8"
    },
    { 
      label: "Finances", 
      href: "/admin/dashboard/finances", 
      icon: DollarSign,
      badge: stats?.monthlyRevenue ? `$${(stats.monthlyRevenue / 1000).toFixed(0)}K` : "$0",
      badgeColor: "bg-green-500/20 text-green-400",
      description: "Financial tracking and reporting",
      shortcut: "⌘9"
    },
    { 
      label: "Analytics", 
      href: "/admin/dashboard/analytics", 
      icon: BarChart3,
      description: "Data insights and reports",
      shortcut: "⌘0"
    },
    { 
      label: "Settings", 
      href: "/admin/dashboard/settings", 
      icon: SettingsIcon,
      description: "System configuration",
      shortcut: "⌘,"
    }
  ]

  // Handle mobile responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key
        const item = navItems.find(item => item.shortcut?.includes(key))
        if (item) {
          e.preventDefault()
          window.location.href = item.href
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }, [])

  const filteredNavItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.children?.some(child => 
      child.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const SidebarContent = () => (
    <div className={`flex flex-col h-screen bg-slate-950/95 backdrop-blur-sm border-r border-slate-800/50 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{sidebarHeaderTitle}</h2>
                <p className="text-xs text-slate-400">Event & Tour Management</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white h-8 w-8 p-0"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = expandedItems.includes(item.href)
            const hasChildren = item.children && item.children.length > 0

            return (
              <div key={item.href}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 group text-sm ${
                            isActive 
                              ? "bg-purple-600/10 text-white border-l-2 border-l-purple-500" 
                              : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-white'}`} />
                            {!isCollapsed && (
                              <span className="font-medium truncate">{item.label}</span>
                            )}
                          </div>
                          
                          {!isCollapsed && (
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              {item.badge && (
                                <Badge className={`text-xs px-1.5 py-0.5 ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                                  {item.badge}
                                </Badge>
                              )}
                              {hasChildren && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.preventDefault()
                                    toggleExpanded(item.href)
                                  }}
                                  className="p-0 h-auto text-slate-400 hover:text-white"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </Link>
                      </div>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                        <div className="space-y-1">
                          <p className="font-medium text-white">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-slate-400">{item.description}</p>
                          )}
                          {item.shortcut && (
                            <p className="text-xs text-purple-400">{item.shortcut}</p>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Submenu */}
                {hasChildren && isExpanded && !isCollapsed && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-3 mt-1 space-y-0.5"
                    >
                      {item.children?.map((child) => {
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-sm ${
                              isChildActive 
                                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                                : 'hover:bg-slate-800/30 text-slate-400 hover:text-white'
                            }`}
                          >
                            <child.icon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )
          })}
        </nav>
      </div>



      {!isCollapsed && (
        <div className="p-3">
          <div className="flex space-x-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 w-full h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48 bg-slate-900 border-slate-700 text-slate-100"
              >
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href="/admin/dashboard/tours/planner">New Tour</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href="/admin/dashboard/events/create">New Event</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href="/admin/job-postings/new">New Job Posting</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/admin/dashboard/settings" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )

  // Mobile menu overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="fixed top-4 left-4 z-[100] ml-2 mt-2 md:hidden bg-slate-800/80 backdrop-blur-sm border border-slate-700"
        >
          <Menu className="h-5 w-5 text-white" />
        </Button>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
            >
              <div 
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowMobileMenu(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="absolute left-0 top-0 h-full w-80 max-w-[80vw]"
              >
                <SidebarContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  return <SidebarContent />
} 