"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Globe,
  Calendar,
  Ticket,
  Truck,
  Users,
  DollarSign,
  Package,
  MessageSquare,
  Settings as SettingsIcon,
  Music,
  Building,
  BarChart3,
  Shield,
  FileText,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Award,
  Crown,
  Target,
  Clock,
  Sparkles,
  Radio,
  Mic,
  Plus,
  Menu,
  X,
  Settings
} from "lucide-react"
import { Button } from "../../../../components/ui/button"
import { Card, CardContent } from "../../../../components/ui/card"
import { Badge } from "../../../../components/ui/badge"
import { Input } from "../../../../components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { Suspense } from "react"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"

interface NavItem {
  label: string
  href: string
  icon: any
  badge?: string
  badgeColor?: string
  children?: NavItem[]
  isNew?: boolean
  isPro?: boolean
}

interface ActiveEvent {
  id: string
  title: string
  date: string
  status: 'live' | 'preparing' | 'upcoming'
  venue: string
  artist: string
  progress: number
}

function mapSidebarStatus(status: string): ActiveEvent["status"] {
  if (status === "in_progress") return "live"
  if (status === "confirmed") return "preparing"
  return "upcoming"
}

const navItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/admin/dashboard", 
    icon: Home,
    badge: "Overview"
  },
  { 
    label: "Tours", 
    href: "/admin/dashboard/tours", 
    icon: Globe,
    children: [
      { label: "Active Tours", href: "/admin/dashboard/tours/active", icon: Activity },
      { label: "Planning", href: "/admin/dashboard/tours/planning", icon: Target },
      { label: "Archive", href: "/admin/dashboard/tours/archive", icon: Package }
    ]
  },
  { 
    label: "Events", 
    href: "/admin/dashboard/events", 
    icon: Calendar,
    children: [
      { label: "Upcoming", href: "/admin/dashboard/events/upcoming", icon: Clock },
      { label: "Live Events", href: "/admin/dashboard/events/live", icon: Radio },
      { label: "Past Events", href: "/admin/dashboard/events/past", icon: Award }
    ]
  },
  { 
    label: "Artists", 
    href: "/admin/dashboard/artists", 
    icon: Music,
    children: [
      { label: "Active Artists", href: "/admin/dashboard/artists/active", icon: Mic },
      { label: "Bookings", href: "/admin/dashboard/artists/bookings", icon: Calendar },
      { label: "Contracts", href: "/admin/dashboard/artists/contracts", icon: FileText }
    ]
  },
  { 
    label: "Venues", 
    href: "/admin/dashboard/venues", 
    icon: Building,
    children: [
      { label: "Partner Venues", href: "/admin/dashboard/venues/partners", icon: Sparkles },
      { label: "Requests", href: "/admin/dashboard/venues/requests", icon: Bell },
      { label: "Contracts", href: "/admin/dashboard/venues/contracts", icon: FileText }
    ]
  },
  { 
    label: "Ticketing", 
    href: "/admin/dashboard/ticketing", 
    icon: Ticket,
  },
  { 
    label: "Staff & Crew", 
    href: "/admin/dashboard/staff", 
    icon: Users,
  },
  { 
    label: "Logistics", 
    href: "/admin/dashboard/logistics", 
    icon: Truck,
  },
  { 
    label: "Finances", 
    href: "/admin/dashboard/finances", 
    icon: DollarSign,
  },
  { 
    label: "Analytics", 
    href: "/admin/dashboard/analytics", 
    icon: BarChart3,
  },
  { 
    label: "Communications", 
    href: "/admin/dashboard/communications", 
    icon: MessageSquare,
  },
  { 
    label: "Roles & Permissions", 
    href: "/admin/dashboard/rbac", 
    icon: Shield,
  },
  { 
    label: "Settings", 
    href: "/admin/dashboard/settings", 
    icon: SettingsIcon
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([])

  useEffect(() => {
    fetch('/api/admin/events?status=active', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { events: [] })
      .then(data => {
        const mapped = (data.events || []).slice(0, 3).map((e: any) => {
          const event = normalizeAdminEvent(e)
          return {
          id: e.id,
          title: event.name || e.title || "Event",
          date: formatSafeDate(event.event_date),
          status: mapSidebarStatus(event.status),
          venue: event.venue_name || '',
          artist: '',
          progress: event.capacity && event.capacity > 0 ? Math.round(((event.tickets_sold || 0) / event.capacity) * 100) : 0,
        }
      })
        setActiveEvents(mapped)
      })
      .catch(() => {})
  }, [])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const filteredNavItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.children?.some(child => 
      child.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'preparing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Radio className="h-3 w-3" />
      case 'preparing': return <Clock className="h-3 w-3" />
      case 'upcoming': return <Calendar className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-slate-950/90 backdrop-blur-xl border-r border-slate-700/30 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-sm shadow-lg shadow-purple-500/20">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Admin Panel</h2>
                <p className="text-xs text-slate-400">Event Management</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
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
              className="pl-10 h-9 bg-slate-900/80 border-slate-700/40 backdrop-blur-sm text-white placeholder:text-slate-400 text-sm"
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
                <div className="relative">
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between p-2.5 rounded-sm transition-all duration-200 group text-sm ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30 backdrop-blur-sm shadow-sm shadow-purple-500/10' 
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
                            className={`flex items-center space-x-2 p-2 rounded-sm transition-all duration-200 text-sm ${
                              isChildActive 
                                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm shadow-sm shadow-purple-500/10' 
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

      {/* Live Events - Compact */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/50">
          <Suspense fallback={<div className="h-20 bg-slate-800/30 rounded-lg animate-pulse" />}>
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/40 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center">
                    <Radio className="h-3 w-3 mr-1.5 text-red-400" />
                    Live Events
                  </h3>
                  <Badge className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5">
                    {activeEvents.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {activeEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No upcoming events</p>
                  ) : (
                    activeEvents.slice(0, 1).map((event) => (
                      <div key={event.id} className="bg-slate-800/50 rounded-sm p-2">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-medium text-white truncate">{event.title}</h4>
                          <Badge className={`text-xs px-1.5 py-0.5 ${getStatusColor(event.status)}`}>
                            {getStatusIcon(event.status)}
                            <span className="ml-1 capitalize">{event.status}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{event.venue}</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-700/60 rounded-full h-1">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full transition-all duration-500"
                              style={{ width: `${event.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {event.progress}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </Suspense>
        </div>
      )}

      {/* Quick Actions - Compact */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="flex space-x-1.5">
            <Button
              size="sm"
              className="flex-1 h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 text-white border-0 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
