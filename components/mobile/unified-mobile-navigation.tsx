"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile, useHapticFeedback, useTouchDevice } from "@/hooks/use-mobile"
import {
  Home,
  Calendar,
  Music,
  Users,
  MessageSquare,
  Settings,
  Building,
  Search,
  Bell,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  Award,
  Globe,
  FileText,
  Video,
  Headphones,
  Mic,
  Guitar,
  Drum,
  Piano,
  Speaker,
  MapPin,
  Clock,
  Star,
  Heart,
  Share2,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  Shield,
} from "lucide-react"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { isOrganizationType } from "@/lib/accounts/account-types"

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  role?: string[]
  section?: 'primary' | 'secondary' | 'tertiary'
}

interface UnifiedMobileNavigationProps {
  user: any
  variant?: 'bottom-nav' | 'sidebar' | 'floating'
  className?: string
}

export function UnifiedMobileNavigation({
  user,
  variant = 'bottom-nav',
  className = ""
}: UnifiedMobileNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useIsMobile()
  const { triggerHaptic } = useHapticFeedback()
  const isTouchDevice = useTouchDevice()
  const { currentAccount } = useMultiAccount()
  
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'primary' | 'secondary' | 'tertiary'>('primary')

  // Get navigation items based on user role / active account
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { href: "/dashboard", label: "Home", icon: Home, section: 'primary' },
      { href: "/events", label: "Events", icon: Calendar, section: 'primary' },
      { href: "/search", label: "Search", icon: Search, section: 'primary' },
      { href: "/messages", label: "Messages", icon: MessageSquare, badge: 3, section: 'primary' },
      { href: "/notifications", label: "Notifications", icon: Bell, badge: 5, section: 'primary' }
    ]

    // Role-specific items
    if (user?.role === 'artist') {
      baseItems.push(
        { href: "/artist/profile", label: "Profile", icon: User, section: 'secondary' },
        { href: "/artist/gigs", label: "Gigs", icon: Calendar, section: 'secondary' },
        { href: "/artist/music", label: "Music", icon: Music, section: 'secondary' },
        { href: "/artist/content", label: "Content", icon: Video, section: 'secondary' },
        { href: "/artist/community", label: "Community", icon: Users, section: 'secondary' },
        { href: "/artist/business", label: "Business", icon: Briefcase, section: 'secondary' },
        { href: "/artist/features", label: "Features", icon: Award, section: 'tertiary' },
        { href: "/artist/epk", label: "EPK", icon: FileText, section: 'tertiary' }
      )
    } else if (user?.role === 'venue_owner') {
      baseItems.push(
        { href: "/venue/dashboard", label: "Venue", icon: Building, section: 'secondary' },
        { href: "/venue/bookings", label: "Bookings", icon: Calendar, section: 'secondary' },
        { href: "/venue/events", label: "Events", icon: Calendar, section: 'secondary' },
        { href: "/venue/artists", label: "Artists", icon: Users, section: 'secondary' },
        { href: "/venue/analytics", label: "Analytics", icon: Settings, section: 'tertiary' },
        { href: "/venue/settings", label: "Settings", icon: Settings, section: 'tertiary' }
      )
    } else if (
      isOrganizationType(currentAccount?.account_type) ||
      user?.role === 'admin'
    ) {
      baseItems.push(
        { href: "/admin/dashboard", label: "Admin", icon: Shield, section: 'secondary' },
        { href: "/admin/dashboard/events", label: "Events", icon: Calendar, section: 'secondary' },
        { href: "/admin/dashboard/settings", label: "Settings", icon: Settings, section: 'tertiary' }
      )
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()
  const primaryItems = navigationItems.filter(item => item.section === 'primary')
  const secondaryItems = navigationItems.filter(item => item.section === 'secondary')
  const tertiaryItems = navigationItems.filter(item => item.section === 'tertiary')

  // Handle navigation with haptic feedback
  const handleNavigation = (href: string) => {
    triggerHaptic('light')
    router.push(href)
    setIsOpen(false)
  }

  // Bottom Navigation Variant
  if (variant === 'bottom-nav' && isMobile) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 safe-area-bottom ${className}`}
      >
        <div className="flex items-center justify-around px-2 py-3">
          {primaryItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            
            return (
              <motion.div
                key={item.href}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigation(item.href)}
                  className={`flex-col h-auto p-3 space-y-1 w-full min-h-[60px] ${
                    isActive 
                      ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </Button>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // Sidebar Navigation Variant
  if (variant === 'sidebar') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => triggerHaptic('light')}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">T</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Tourify</h2>
                  <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ') || 'User'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  setIsOpen(false)
                }}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Section Tabs */}
              <div className="px-4 mb-4">
                <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                  {[
                    { key: 'primary', label: 'Main', count: primaryItems.length },
                    { key: 'secondary', label: 'Tools', count: secondaryItems.length },
                    { key: 'tertiary', label: 'More', count: tertiaryItems.length }
                  ].map((section) => (
                    <Button
                      key={section.key}
                      variant={activeSection === section.key ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        triggerHaptic('light')
                        setActiveSection(section.key as any)
                      }}
                      className={`flex-1 text-xs ${
                        activeSection === section.key 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {section.label}
                      {section.count > 0 && (
                        <Badge variant="outline" className="ml-1 h-4 w-4 p-0 text-xs">
                          {section.count}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Navigation Items */}
              <div className="space-y-2 px-4">
                {navigationItems
                  .filter(item => item.section === activeSection)
                  .map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    
                    return (
                      <motion.div
                        key={item.href}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleNavigation(item.href)}
                          className={`w-full justify-start h-12 px-4 ${
                            isActive 
                              ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30" 
                              : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="relative mr-3">
                            <Icon className="h-5 w-5" />
                            {item.badge && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </Button>
                      </motion.div>
                    )
                  })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 px-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigation("/create")}
                    className="h-12 border-slate-700 text-slate-300 hover:bg-white/5"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigation("/settings")}
                    className="h-12 border-slate-700 text-slate-300 hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Floating Navigation Variant
  if (variant === 'floating' && isMobile) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={() => {
              triggerHaptic('medium')
              setIsOpen(!isOpen)
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 shadow-xl"
            >
              <div className="space-y-2">
                {primaryItems.slice(0, 6).map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  
                  return (
                    <motion.div
                      key={item.href}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigation(item.href)}
                        className={`w-full justify-start ${
                          isActive 
                            ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white" 
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        <span className="text-sm">{item.label}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="ml-auto h-4 w-4 p-0 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}


