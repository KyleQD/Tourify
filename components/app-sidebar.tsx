"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  BarChart3, 
  Briefcase,
  BookOpen,
  Calendar, 
  FileText, 
  Home, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Users, 
  CalendarCheck,
  Music2,
  Video,
  ShoppingBag,
  Zap,
  Sparkles,
  Bell,
  User,
  Heart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { ARTIST_OUTLINE_BTN } from "@/components/dashboard/artist-tokens"
import { getAccountAvatarUrl } from "@/lib/accounts/account-presentation"

// View Profile Button Component
function ViewProfileButton() {
  const { currentAccount } = useMultiAccount()

  const publicPath = (() => {
    if (currentAccount?.account_type !== 'artist' && currentAccount?.account_type !== 'service')
      return null
    const data = currentAccount.profile_data || {}
    return getArtistPublicProfilePath(
      data.url_slug || data.artist_name || data.stage_name || data.username
    )
  })()

  if (!publicPath) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn(ARTIST_OUTLINE_BTN, "w-full")}
      >
        <Link href="/artist/profile">
          <User className="mr-2 h-4 w-4" />
          Set up public profile
        </Link>
      </Button>
    )
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(ARTIST_OUTLINE_BTN, "w-full")}
    >
      <Link href={publicPath}>
        <User className="mr-2 h-4 w-4" />
        View Profile
      </Link>
    </Button>
  )
}

// Profile Card Component
function ProfileCard() {
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const [notifications, setNotifications] = useState(0)
  const [followers, setFollowers] = useState(0)
  

  useEffect(() => {
    async function loadProfileData() {
      if (!user?.id || !currentAccount) return
      
      try {
        // For artist accounts, get artist profile data
        if (currentAccount.account_type === 'artist') {
          const { data: artistProfile, error: artistError } = await supabase
            .from('artist_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (!artistError && artistProfile) {
            setFollowers(artistProfile.followers_count || 0)
          }
        } else {
          // For other account types, get general profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_verified, followers_count')
            .eq('id', user.id)
            .single()
          
          if (!profileError && profileData) {
            setFollowers(profileData.followers_count || 0)
          }
        }

        const { fetchUnreadNotificationCount } = await import(
          '@/lib/notifications/fetch-user-notifications'
        )
        const notificationsCount = await fetchUnreadNotificationCount({
          supabase,
          userId: user.id,
          targetProfileId: currentAccount.profile_id,
          accountType: currentAccount.account_type,
        })

        setNotifications(notificationsCount || 0)
      } catch (error) {
        console.error('Error loading profile data:', error)
      }
    }
    
    loadProfileData()
  }, [user?.id, currentAccount])

  if (!currentAccount) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get display name based on account type
  const getDisplayName = () => {
    if (currentAccount.account_type === 'artist') {
      return currentAccount.profile_data?.artist_name || currentAccount.profile_data?.display_name || 'Artist'
    }
    return currentAccount.profile_data?.full_name || currentAccount.profile_data?.display_name || 'User'
  }

  // Get username based on account type
  const getUsername = () => {
    if (currentAccount.account_type === 'artist') {
      return currentAccount.profile_data?.artist_name?.toLowerCase().replace(/\s+/g, '') || 'artist'
    }
    return currentAccount.profile_data?.username || 'user'
  }

  const displayName = getDisplayName()
  const username = getUsername()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4"
    >
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-sm">
        {/* Profile Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-purple-500/30">
              <AvatarImage src={getAccountAvatarUrl(currentAccount) || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {currentAccount.profile_data?.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">
              {displayName}
            </h3>
            <p className="text-slate-400 text-xs truncate">
              @{username}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between space-x-2">
          {/* Followers */}
          <div className="flex items-center space-x-1">
            <Heart className="h-3 w-3 text-red-400" />
            <span className="text-xs text-slate-300 font-medium">
              {followers.toLocaleString()}
            </span>
          </div>

          {/* Notifications */}
          <div className="flex items-center space-x-1">
            <div className="relative">
              <Bell className="h-3 w-3 text-purple-400" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500 border-0"
                >
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {notifications}
            </span>
          </div>

          {/* Artist Badge */}
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
            <Music2 className="h-3 w-3 mr-1" />
            Artist
          </Badge>
        </div>
      </div>
    </motion.div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  
  // Determine if we're on artist pages
  const isArtistPage = pathname.startsWith('/artist')

  return (
    <Sidebar collapsible="none" className="border-r border-slate-800/50 bg-gradient-to-b from-black via-slate-950 to-black relative overflow-hidden w-64 min-w-64 flex-shrink-0">
      {/* Sidebar Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-blue-500/5" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      
      <SidebarHeader className="border-b border-slate-800/50 py-6 relative z-10">
        {/* Artist Mode Indicator */}
        {isArtistPage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl flex items-center space-x-2 mb-4"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
            </motion.div>
            <span className="text-xs font-medium text-purple-300">Artist Mode</span>
          </motion.div>
        )}

        {/* View Profile Button */}
        {isArtistPage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <ViewProfileButton />
          </motion.div>
        )}

        {/* Profile Card */}
        {isArtistPage && <ProfileCard />}
      </SidebarHeader>
      
      <SidebarContent className="bg-transparent relative z-10">
        {isArtistPage ? (
          <div className="space-y-4 p-2">
            {artistNavigationGroups.map((group) => (
              <div key={group.label || 'home'}>
                {group.label && (
                  <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </div>
                )}
                <SidebarMenu className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/artist' && pathname.startsWith(item.href))
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link
                            href={item.href}
                            className={cn(
                              "group relative mx-1 flex items-center rounded-xl border border-transparent px-3 py-2.5",
                              "transition-all duration-200 ease-out",
                              "hover:border-white/10 hover:bg-white/[0.04]",
                              isActive && [
                                "border-purple-500/20 bg-purple-600/10",
                                "shadow-[0_0_20px_-10px_rgba(139,92,246,0.45)]",
                              ]
                            )}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-purple-500" />
                            )}
                            <div className="relative z-10 flex items-center space-x-3">
                              <div
                                className={cn(
                                  "rounded-lg border p-1.5 transition-all duration-200",
                                  isActive
                                    ? "border-purple-500/30 bg-purple-500/15"
                                    : "border-white/10 bg-white/[0.03] group-hover:border-white/15"
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    "h-4 w-4 transition-all duration-200",
                                    isActive
                                      ? "text-purple-300"
                                      : "text-slate-400 group-hover:text-slate-200"
                                  )}
                                />
                              </div>
                              <span
                                className={cn(
                                  "text-sm font-medium transition-all duration-200",
                                  isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                                )}
                              >
                                {item.name}
                              </span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </div>
            ))}
          </div>
        ) : (
          <SidebarMenu className="space-y-2 p-2">
            {generalNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center px-4 py-3 mx-1 rounded-2xl",
                        "transition-all duration-500 ease-out",
                        "hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-700/30",
                        "border border-transparent hover:border-slate-700/30",
                        isActive && [
                          "bg-gradient-to-r from-slate-800/80 to-slate-700/50",
                          "border-slate-600/50 shadow-xl shadow-slate-900/50",
                        ]
                      )}
                    >
                      <div className="relative z-10 flex items-center space-x-3">
                        <div
                          className={cn(
                            "rounded-xl border p-2",
                            isActive
                              ? "border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                              : "border-slate-700/30 bg-slate-800/30"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5",
                              isActive ? "text-purple-400" : "text-slate-400"
                            )}
                          />
                        </div>
                        <span className={cn("font-medium", isActive ? "text-white" : "text-slate-300")}>
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-slate-800/50 p-4 bg-gradient-to-t from-black/50 to-transparent relative z-10">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            asChild
            className={cn(
              ARTIST_OUTLINE_BTN,
              "h-12 w-full justify-between rounded-xl"
            )}
          >
            <Link href={isArtistPage ? "/artist/settings" : "/settings"}>
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Settings</span>
              </div>
              <Zap className="h-4 w-4 text-slate-500" />
            </Link>
          </Button>
        </motion.div>
      </SidebarFooter>
    </Sidebar>
  )
}

// General navigation for non-artist pages
const generalNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

interface ArtistNavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
}

interface ArtistNavGroup {
  label?: string
  items: ArtistNavItem[]
}

const artistNavigationGroups: ArtistNavGroup[] = [
  {
    items: [{ name: 'Home', href: '/artist', icon: Home }],
  },
  {
    label: 'Create & Publish',
    items: [
      { name: 'Content', href: '/artist/content', icon: Video },
      { name: 'Press', href: '/artist/press', icon: BookOpen },
      { name: 'Music', href: '/artist/music', icon: Music2 },
      { name: 'EPK', href: '/artist/epk', icon: FileText },
    ],
  },
  {
    label: 'Live & Sell',
    items: [
      { name: 'Events', href: '/artist/events', icon: Calendar },
      { name: 'Bookings', href: '/artist/bookings', icon: CalendarCheck },
      { name: 'Store', href: '/artist/store', icon: ShoppingBag },
    ],
  },
  {
    label: 'Audience',
    items: [
      { name: 'Community', href: '/artist/community', icon: Users },
      { name: 'Messages', href: '/artist/messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Career',
    items: [
      { name: 'Overview', href: '/artist/overview', icon: LayoutDashboard },
      { name: 'Business', href: '/artist/business', icon: Briefcase },
      { name: 'Profile', href: '/artist/profile', icon: User },
    ],
  },
]
