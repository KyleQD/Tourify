"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  HelpCircle,
  Home,
  ImageIcon,
  LogOut,
  MessageSquare,
  Music,
  Settings,
  Ticket,
  Users,
  X,
  DollarSign,
  Package,
  Megaphone,
  UserCheck,
  Shield,
  Clipboard,
  MapPin,
  Coffee,
  Wifi,
  Car,
  Camera,
  Star,
  TrendingUp,
  Banknote,
  Receipt,
  CreditCard,
  Building,
  Phone,
  Mail,
  Clock3,
  Utensils,
  Wrench,
  Volume2,
  Lightbulb,
  ThermometerSun,
  Activity,
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface VenueOwnerSidebarProps {
  venue: any
  /** Dashboard stats from `get_venue_dashboard_stats`; avoids placeholder trend copy when present */
  dashboardStats?: {
    totalBookings?: number
    pendingRequests?: number
    thisMonthRevenue?: number
    averageRating?: number
    totalReviews?: number
    teamMembers?: number
    upcomingEvents?: number
  } | null
  isOpen: boolean
  onClose: () => void
  onTabChange: (tab: string) => void
  activeTab: string
  onEditProfile?: () => void
  onViewPublicProfile?: () => void
  onStatsClick?: (statType: 'events' | 'rating' | 'capacity') => void
}

function formatMembershipYear(venueLike: { created_at?: string; createdAt?: string }): string | null {
  const raw = venueLike.created_at ?? venueLike.createdAt
  if (!raw) return null
  const y = new Date(raw).getFullYear()
  if (!Number.isFinite(y)) return null
  return String(y)
}

export function VenueOwnerSidebar({
  venue,
  dashboardStats,
  isOpen,
  onClose,
  onTabChange,
  activeTab,
  onEditProfile,
  onViewPublicProfile,
  onStatsClick,
}: VenueOwnerSidebarProps) {
  const [notifications, setNotifications] = useState(3)
  const [expandedSections, setExpandedSections] = useState<string[]>(["main"])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const mainMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" />, count: null },
    { id: "bookings", label: "Bookings", icon: <Clock className="h-5 w-5" />, count: 8 },
    { id: "events", label: "Events", icon: <Calendar className="h-5 w-5" />, count: null },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" />, count: null },
  ]

  const operationsItems = [
    { id: "team", label: "Staff Management", icon: <Users className="h-5 w-5" />, count: null },
    { id: "finances", label: "Finances", icon: <DollarSign className="h-5 w-5" />, count: null },
    { id: "inventory", label: "Inventory", icon: <Package className="h-5 w-5" />, count: null },
    { id: "maintenance", label: "Maintenance", icon: <Wrench className="h-5 w-5" />, count: 2 },
  ]

  const customerItems = [
    { id: "crm", label: "Customer Relations", icon: <UserCheck className="h-5 w-5" />, count: null },
    { id: "promotion", label: "Marketing", icon: <Megaphone className="h-5 w-5" />, count: null },
    { id: "reviews", label: "Reviews & Feedback", icon: <Star className="h-5 w-5" />, count: 3 },
  ]

  const venueItems = [
    { id: "profile", label: "Venue Profile", icon: <Building className="h-5 w-5" />, count: null },
    { id: "amenities", label: "Amenities", icon: <Coffee className="h-5 w-5" />, count: null },
    { id: "equipment", label: "Equipment", icon: <Volume2 className="h-5 w-5" />, count: null },
    { id: "gallery", label: "Photo Gallery", icon: <Camera className="h-5 w-5" />, count: null },
  ]

  const resourceItems = [
    { id: "documents", label: "Documents", icon: <FileText className="h-5 w-5" />, count: null },
    { id: "messaging", label: "Messages", icon: <MessageSquare className="h-5 w-5" />, count: 5 },
    { id: "reports", label: "Reports", icon: <Clipboard className="h-5 w-5" />, count: null },
    { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" />, count: null },
  ]

  const isItemActive = (itemId: string) => activeTab === itemId

  const membershipYear = formatMembershipYear(venue)
  const eventsCount = dashboardStats?.totalBookings ?? venue.stats?.events ?? 0
  const ratingValue = dashboardStats?.averageRating ?? venue.stats?.rating ?? 0
  const ratingDisplay = typeof ratingValue === "number" && Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "0.0"
  const reviewsCount = dashboardStats?.totalReviews ?? 0
  const upcomingEvents = dashboardStats?.upcomingEvents ?? 0
  const capacityMax = venue.capacity ?? venue.stats?.capacity ?? null

  const renderMenuSection = (
    title: string,
    items: any[],
    sectionId: string,
    collapsible: boolean = true
  ) => {
    const isExpanded = expandedSections.includes(sectionId)
    
    return (
      <div className="mb-4">
        {collapsible ? (
          <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionId)}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors">
              <span>{title}</span>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-2">
              {items.map((item) => (
                <Button
                  key={item.id}
                  variant={isItemActive(item.id) ? "secondary" : "ghost"}
                  className={`w-full justify-start text-sm ${
                    isItemActive(item.id) 
                      ? "bg-purple-900/30 text-purple-300 border-l-2 border-purple-400" 
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    onTabChange(item.id)
                    if (window.innerWidth < 768) {
                      onClose()
                    }
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </div>
                    {item.count && (
                      <Badge 
                        variant="secondary" 
                        className="ml-auto bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full"
                      >
                        {item.count}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <>
            <div className="px-2 mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <Button
                  key={item.id}
                  variant={isItemActive(item.id) ? "secondary" : "ghost"}
                  className={`w-full justify-start text-sm ${
                    isItemActive(item.id) 
                      ? "bg-purple-900/30 text-purple-300 border-l-2 border-purple-400" 
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    onTabChange(item.id)
                    if (window.innerWidth < 768) {
                      onClose()
                    }
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </div>
                    {item.count && (
                      <Badge 
                        variant="secondary" 
                        className="ml-auto bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full"
                      >
                        {item.count}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar — mobile sheet clears global Nav; desktop stays sticky under Nav */}
      <div
        className={`fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-gray-800 bg-gray-900 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } md:sticky md:top-16 md:z-10 md:h-[calc(100vh-4rem)] md:overflow-visible md:self-start`}
      >
        {/* Close button (mobile only) */}
        <button className="absolute top-4 right-4 md:hidden text-gray-400 hover:text-white z-10" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>

        {/* Removed top logo to avoid overlap with the global top navigation */}

        {/* Venue info */}
        <div className="p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-purple-600/20 group-hover:ring-purple-600/40 transition-all">
                <AvatarImage src={venue.avatar || "/placeholder.svg"} alt={venue.name} />
                <AvatarFallback className="bg-purple-600 text-white font-bold">
                  {venue.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Online status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate text-sm group-hover:text-purple-300 transition-colors">
                {venue.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-purple-900/20 text-purple-400 border-purple-800 hover:bg-purple-900/30 transition-colors">
                  {venue.type}
                </Badge>
                <Badge variant="outline" className="text-xs bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/30 transition-colors">
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{venue.location}</span>
              </div>
              {/* Additional venue info */}
              {(venue.username || membershipYear) && (
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 min-w-0">
                  {venue.username ? <span className="truncate">@{venue.username}</span> : null}
                  {venue.username && membershipYear ? <span className="shrink-0">•</span> : null}
                  {membershipYear ? <span className="shrink-0">Since {membershipYear}</span> : null}
                </div>
              )}
            </div>
          </div>
          
                     {/* Enhanced stats grid */}
           <div className="grid grid-cols-3 gap-2 mt-4 text-center">
             <div 
               className="bg-gray-800 rounded-lg p-2 hover:bg-gray-700 transition-colors cursor-pointer group/stat"
               onClick={(e) => {
                 e.stopPropagation()
                 onStatsClick?.('events')
               }}
               title="Click to view detailed event analytics"
             >
               <div className="text-xs font-semibold text-white group-hover/stat:text-purple-300 transition-colors">
                 {eventsCount.toLocaleString()}
               </div>
               <div className="text-xs text-gray-400">Events</div>
               <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                 {upcomingEvents > 0 ? `${upcomingEvents} upcoming` : "No upcoming"}
               </div>
             </div>
             <div 
               className="bg-gray-800 rounded-lg p-2 hover:bg-gray-700 transition-colors cursor-pointer group/stat"
               onClick={(e) => {
                 e.stopPropagation()
                 onStatsClick?.('rating')
               }}
               title="Click to view detailed rating breakdown"
             >
               <div className="flex items-center justify-center gap-1">
                 <span className="text-xs font-semibold text-white group-hover/stat:text-purple-300 transition-colors">
                   {ratingDisplay}
                 </span>
                 <Star className="h-3 w-3 text-yellow-400 fill-current shrink-0" />
               </div>
               <div className="text-xs text-gray-400">Rating</div>
               <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                 {reviewsCount > 0 ? `${reviewsCount} review${reviewsCount === 1 ? "" : "s"}` : "No reviews yet"}
               </div>
             </div>
             <div 
               className="bg-gray-800 rounded-lg p-2 hover:bg-gray-700 transition-colors cursor-pointer group/stat"
               onClick={(e) => {
                 e.stopPropagation()
                 onStatsClick?.('capacity')
               }}
               title="Click to view capacity utilization details"
             >
               <div className="text-xs font-semibold text-white group-hover/stat:text-purple-300 transition-colors">
                 {capacityMax != null ? Number(capacityMax).toLocaleString() : "—"}
               </div>
               <div className="text-xs text-gray-400">Capacity</div>
               <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                 {capacityMax != null ? "Max guests" : "Not set"}
               </div>
             </div>
           </div>

          {/* Quick action buttons — always visible on touch; hover-reveal on desktop only */}
          <div className="flex gap-2 mt-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs py-1 h-6 border-purple-600 text-purple-400 hover:bg-purple-900/20"
              onClick={(e) => {
                e.stopPropagation()
                onEditProfile?.()
              }}
            >
              Edit Profile
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs py-1 h-6 border-blue-600 text-blue-400 hover:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation()
                onViewPublicProfile?.()
              }}
            >
              View Public
            </Button>
          </div>

          {/* Performance indicators — factual only */}
          <div className="mt-3 pt-3 border-t border-gray-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <div className="flex justify-between text-xs gap-2 min-w-0">
              <span className="text-gray-400 shrink-0">Pending requests</span>
              <span className="text-amber-400 font-medium tabular-nums truncate">
                {dashboardStats?.pendingRequests ?? "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1 gap-2 min-w-0">
              <span className="text-gray-400 shrink-0">Revenue (month)</span>
              <span className="text-green-400 font-medium tabular-nums truncate">
                {dashboardStats?.thisMonthRevenue != null
                  ? `$${Number(dashboardStats.thisMonthRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          {/* Main Menu */}
          {renderMenuSection("Main", mainMenuItems, "main", false)}
          
          <Separator className="my-4" />
          
          {/* Operations */}
          {renderMenuSection("Operations", operationsItems, "operations")}
          
          {/* Customer Management */}
          {renderMenuSection("Customer Management", customerItems, "customer")}
          
          {/* Venue Management */}
          {renderMenuSection("Venue Management", venueItems, "venue")}
          
          {/* Resources */}
          {renderMenuSection("Resources", resourceItems, "resources")}

          <Separator className="my-4" />

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="px-2 mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h4>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-start text-purple-400 border-purple-600 hover:bg-purple-900/20">
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-green-400 border-green-600 hover:bg-green-900/20">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-blue-400 border-blue-600 hover:bg-blue-900/20">
              <Bell className="h-4 w-4 mr-2" />
              Check Notifications
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Tourify Platform Links */}
          <div className="space-y-1">
            <div className="px-2 mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tourify Platform</h4>
            </div>
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white text-sm">
              <Music className="h-4 w-4 mr-2" />
              <span>Discover Artists</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white text-sm">
              <Ticket className="h-4 w-4 mr-2" />
              <span>Ticket Marketplace</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white text-sm">
              <Users className="h-4 w-4 mr-2" />
              <span>Industry Network</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white text-sm">
              <HelpCircle className="h-4 w-4 mr-2" />
              <span>Help & Support</span>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-gray-800">
          <div className="flex items-center justify-center mb-3">
            <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5 opacity-60" />
          </div>
          <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-red-900/20 text-sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  )
}
