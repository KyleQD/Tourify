"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  Globe,
  Calendar,
  Users,
  DollarSign,
  Truck,
  FileText,
  Building,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronLeft,
  Home,
  MapPin,
  Clock,
  CheckSquare,
  BarChart3,
  Music,
  Headphones,
  Coffee,
  Package,
  Phone,
  Mail,
  Camera,
  Star,
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Plus
} from "lucide-react"

interface TourContextData {
  id: string
  name: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  artist: {
    name: string
    avatar?: string
  }
  progress: number
  totalEvents: number
  completedEvents: number
  upcomingEvent?: {
    name: string
    date: string
    venue: string
  }
}

interface EventContextData {
  id: string
  name: string
  tourId?: string
  tourName?: string
  date: string
  venue: string
  status: 'scheduled' | 'confirmed' | 'live' | 'completed' | 'cancelled'
  progress: number
  capacity?: number
  ticketsSold?: number
}

interface ContextualNavItem {
  id: string
  label: string
  href: string
  icon: any
  description?: string
  badge?: string
  badgeColor?: string
  isActive?: boolean
  count?: number
}

interface ContextualNavigationProps {
  tourId?: string
  eventId?: string
  className?: string
}

export function ContextualNavigation({ tourId, eventId, className = "" }: ContextualNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentTour, setCurrentTour] = useState<TourContextData | null>(null)
  const [currentEvent, setCurrentEvent] = useState<EventContextData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("overview")

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchContextData = async () => {
      setIsLoading(true)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      if (tourId) {
        const mockTour: TourContextData = {
          id: tourId,
          name: "West Coast Summer Tour",
          status: "active",
          artist: {
            name: "The Electric Waves",
            avatar: "/placeholder-artist.jpg"
          },
          progress: 42,
          totalEvents: 12,
          completedEvents: 5,
          upcomingEvent: {
            name: "Los Angeles Show",
            date: "Jul 15",
            venue: "The Greek Theatre"
          }
        }
        setCurrentTour(mockTour)
      }

      if (eventId) {
        const mockEvent: EventContextData = {
          id: eventId,
          name: "Summer Music Festival",
          tourId: "tour-1",
          tourName: "West Coast Summer Tour",
          date: "Today",
          venue: "Central Park",
          status: "live",
          progress: 75,
          capacity: 5000,
          ticketsSold: 4200
        }
        setCurrentEvent(mockEvent)
      }

      setIsLoading(false)
    }

    if (tourId || eventId) {
      fetchContextData()
    } else {
      setIsLoading(false)
    }
  }, [tourId, eventId])

  // Auto-detect current section from pathname
  useEffect(() => {
    const pathSegments = pathname.split('/')
    const lastSegment = pathSegments[pathSegments.length - 1]
    if (lastSegment && lastSegment !== tourId && lastSegment !== eventId) {
      setActiveSection(lastSegment)
    }
  }, [pathname, tourId, eventId])

  const getTourNavItems = (tour: TourContextData): ContextualNavItem[] => [
    {
      id: "overview",
      label: "Overview",
      href: `/admin/dashboard/tours/${tour.id}`,
      icon: Eye,
      description: "Tour summary and key metrics"
    },
    {
      id: "itinerary",
      label: "Itinerary",
      href: `/admin/dashboard/tours/${tour.id}/itinerary`,
      icon: Calendar,
      description: "Schedule and event timeline",
      count: tour.totalEvents
    },
    {
      id: "crew",
      label: "Crew & Staff",
      href: `/admin/dashboard/tours/${tour.id}/crew`,
      icon: Users,
      description: "Team members and assignments",
      count: 12
    },
    {
      id: "venues",
      label: "Venues",
      href: `/admin/dashboard/tours/${tour.id}/venues`,
      icon: Building,
      description: "Venue details and contracts",
      count: tour.totalEvents
    },
    {
      id: "budget",
      label: "Budget & Finance",
      href: `/admin/dashboard/tours/${tour.id}/budget`,
      icon: DollarSign,
      description: "Financial planning and tracking"
    },
    {
      id: "logistics",
      label: "Logistics",
      href: `/admin/dashboard/tours/${tour.id}/logistics`,
      icon: Truck,
      description: "Transportation and equipment"
    },
    {
      id: "documents",
      label: "Documents",
      href: `/admin/dashboard/tours/${tour.id}/documents`,
      icon: FileText,
      description: "Contracts and technical docs",
      count: 8
    },
    {
      id: "communications",
      label: "Communications",
      href: `/admin/dashboard/tours/${tour.id}/communications`,
      icon: MessageSquare,
      description: "Team updates and announcements",
      badge: "3",
      badgeColor: "bg-blue-500/20 text-blue-400"
    },
    {
      id: "analytics",
      label: "Analytics",
      href: `/admin/dashboard/tours/${tour.id}/analytics`,
      icon: BarChart3,
      description: "Performance metrics and insights"
    },
    {
      id: "settings",
      label: "Settings",
      href: `/admin/dashboard/tours/${tour.id}/settings`,
      icon: Settings,
      description: "Tour configuration and preferences"
    }
  ]

  const getEventNavItems = (event: EventContextData): ContextualNavItem[] => [
    {
      id: "overview",
      label: "Overview",
      href: `/admin/dashboard/events/${event.id}`,
      icon: Eye,
      description: "Event summary and status"
    },
    {
      id: "details",
      label: "Event Details",
      href: `/admin/dashboard/events/${event.id}/details`,
      icon: Calendar,
      description: "Schedule and venue information"
    },
    {
      id: "crew",
      label: "Crew",
      href: `/admin/dashboard/events/${event.id}/crew`,
      icon: Users,
      description: "Assigned staff and roles",
      count: 8
    },
    {
      id: "technical",
      label: "Technical",
      href: `/admin/dashboard/events/${event.id}/technical`,
      icon: Headphones,
      description: "Sound, lighting, and stage setup"
    },
    {
      id: "logistics",
      label: "Logistics",
      href: `/admin/dashboard/events/${event.id}/logistics`,
      icon: Truck,
      description: "Load-in, catering, and supplies"
    },
    {
      id: "ticketing",
      label: "Ticketing",
      href: `/admin/dashboard/events/${event.id}/ticketing`,
      icon: CheckSquare,
      description: "Sales and capacity management",
      badge: event.ticketsSold ? `${Math.round((event.ticketsSold / (event.capacity || 1)) * 100)}%` : undefined,
      badgeColor: "bg-green-500/20 text-green-400"
    },
    {
      id: "communications",
      label: "Communications",
      href: `/admin/dashboard/events/${event.id}/communications`,
      icon: MessageSquare,
      description: "Updates and coordination",
      badge: "2",
      badgeColor: "bg-purple-500/20 text-purple-400"
    },
    {
      id: "checklist",
      label: "Checklist",
      href: `/admin/dashboard/events/${event.id}/checklist`,
      icon: CheckSquare,
      description: "Tasks and completion status",
      count: 15
    },
    {
      id: "reports",
      label: "Reports",
      href: `/admin/dashboard/events/${event.id}/reports`,
      icon: FileText,
      description: "Event documentation and reports"
    }
  ]

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { label: "Dashboard", href: "/admin/dashboard", icon: Home }
    ]

    if (currentTour) {
      breadcrumbs.push(
        { label: "Tours", href: "/admin/dashboard/tours", icon: Globe },
        { label: currentTour.name, href: `/admin/dashboard/tours/${currentTour.id}`, icon: Globe }
      )
    } else if (currentEvent) {
      breadcrumbs.push(
        { label: "Events", href: "/admin/dashboard/events", icon: Calendar },
        { label: currentEvent.name, href: `/admin/dashboard/events/${currentEvent.id}`, icon: Calendar }
      )
    }

    return breadcrumbs
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'planning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'scheduled': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'completed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const currentNavItems = currentTour 
    ? getTourNavItems(currentTour)
    : currentEvent 
    ? getEventNavItems(currentEvent)
    : []

  if (!tourId && !eventId) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-700 rounded w-48"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm">
          {getBreadcrumbs().map((crumb, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
              <Link
                href={crumb.href}
                className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
              >
                {crumb.icon && <crumb.icon className="h-3 w-3" />}
                <span>{crumb.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <Separator className="bg-slate-700/50" />

        {/* Context Header */}
        {currentTour && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{currentTour.name}</h3>
                <p className="text-sm text-slate-400">{currentTour.artist.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`text-xs ${getStatusColor(currentTour.status)}`}>
                  <Activity className="h-3 w-3 mr-1" />
                  {currentTour.status.charAt(0).toUpperCase() + currentTour.status.slice(1)}
                </Badge>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Tour Progress</span>
                <span className="text-white">{currentTour.progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentTour.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{currentTour.completedEvents}/{currentTour.totalEvents} events completed</span>
                {currentTour.upcomingEvent && (
                  <span>Next: {currentTour.upcomingEvent.name} • {currentTour.upcomingEvent.date}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {currentEvent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{currentEvent.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span>{currentEvent.venue}</span>
                  <span>•</span>
                  <span>{currentEvent.date}</span>
                </div>
                {currentEvent.tourName && (
                  <p className="text-xs text-slate-500">Part of {currentEvent.tourName}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`text-xs ${getStatusColor(currentEvent.status)}`}>
                  <Activity className="h-3 w-3 mr-1" />
                  {currentEvent.status.charAt(0).toUpperCase() + currentEvent.status.slice(1)}
                </Badge>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Event Stats */}
            {currentEvent.capacity && currentEvent.ticketsSold && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Ticket Sales</span>
                  <span className="text-white">
                    {formatSafeNumber(currentEvent.ticketsSold)} / {formatSafeNumber(currentEvent.capacity)}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentEvent.ticketsSold / currentEvent.capacity) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500">
                  {Math.round((currentEvent.ticketsSold / currentEvent.capacity) * 100)}% capacity
                </div>
              </div>
            )}
          </div>
        )}

        <Separator className="bg-slate-700/50" />

        {/* Navigation Items */}
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-300">
              {currentTour ? 'Tour Sections' : 'Event Sections'}
            </h4>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-6 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <ScrollArea className="h-64">
            <AnimatePresence>
              {currentNavItems.map((item, index) => {
                const isActive = pathname === item.href || activeSection === item.id
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 group mb-1 ${
                        isActive
                          ? 'bg-purple-600/20 text-white border border-purple-500/30'
                          : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-white'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-slate-500 truncate">{item.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.count && (
                          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                            {item.count}
                          </span>
                        )}
                        {item.badge && (
                          <Badge className={`text-xs ${item.badgeColor}`}>
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className={`h-3 w-3 transition-transform ${
                          isActive ? 'rotate-90 text-purple-400' : 'text-slate-400 group-hover:text-white'
                        }`} />
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex space-x-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Eye className="h-3 w-3 mr-1" />
              View All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 