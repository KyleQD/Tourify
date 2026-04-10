"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  BarChart3, 
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
  TrendingUp,
  Tag,
  Globe,
  Mic,
  Radio,
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// View Profile Button Component
function ViewProfileButton() {
  const { currentAccount } = useMultiAccount()
  
  const getUsername = () => {
    if (currentAccount?.account_type === 'artist') {
      return currentAccount.profile_data?.artist_name?.toLowerCase().replace(/\s+/g, '') || 
             currentAccount.profile_data?.stage_name?.toLowerCase().replace(/\s+/g, '') || 
                           currentAccount.profile_data?.username ||  
             'neon_pulse_official' // Fallback to demo artist for testing
    }
    return currentAccount?.profile_data?.username || 'neon_pulse_official' // Fallback to demo artist for testing
  }

  const username = getUsername()

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="w-full border-purple-500/30 text-purple-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300"
    >
      <Link href={`/artist/${username}`}>
        <User className="h-4 w-4 mr-2" />
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
  const supabase = createClientComponentClient()

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

        // Load unread notifications count
        const { count: notificationsCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        
        setNotifications(notificationsCount || 0)
      } catch (error) {
        console.error('Error loading profile data:', error)
      }
    }
    
    loadProfileData()
  }, [user?.id, currentAccount, supabase])

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
              <AvatarImage src={currentAccount.profile_data?.avatar_url} alt={displayName} />
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
  
  // Use artist navigation when on artist pages, otherwise use general navigation
  const currentNavigation = isArtistPage ? artistNavigation : generalNavigation

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
        <SidebarMenu className="space-y-2 p-2">
          {currentNavigation.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <SidebarMenuItem key={item.href}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                >
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center px-4 py-3 mx-1 rounded-2xl",
                        "transition-all duration-500 ease-out",
                        "hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-700/30",
                        "hover:shadow-lg hover:shadow-slate-900/50",
                        "border border-transparent hover:border-slate-700/30",
                        isActive && [
                          "bg-gradient-to-r from-slate-800/80 to-slate-700/50",
                          "border-slate-600/50 shadow-xl shadow-slate-900/50",
                          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/10 before:to-blue-500/10 before:rounded-2xl"
                        ]
                      )}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-400 to-blue-600 rounded-r-full"
                          layoutId="activeIndicator"
                        />
                      )}
                      
                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                      
                      <div className="flex items-center space-x-3 relative z-10">
                        <motion.div
                          className={cn(
                            "p-2 rounded-xl transition-all duration-300",
                            isActive 
                              ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30" 
                              : "bg-slate-800/30 border border-slate-700/30 group-hover:bg-slate-700/50 group-hover:border-slate-600/50"
                          )}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 transition-all duration-300",
                              isActive 
                                ? "text-purple-400 drop-shadow-sm" 
                                : "text-slate-400 group-hover:text-slate-200"
                            )}
                          />
                        </motion.div>
                        <span className={cn(
                          "font-medium transition-all duration-300",
                          isActive 
                            ? "text-white bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent" 
                            : "text-slate-300 group-hover:text-white"
                        )}>
                          {item.name}
                        </span>
                      </div>
                      
                      {/* Active Shine Effect */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                        />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-slate-800/50 p-4 bg-gradient-to-t from-black/50 to-transparent relative z-10">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            asChild
            className="w-full justify-between bg-gradient-to-r from-slate-800/50 to-slate-700/30 border-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-slate-700/70 hover:to-slate-600/50 hover:text-white hover:border-slate-600/50 transition-all duration-300 rounded-xl h-12"
          >
            <Link href="/settings">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Settings</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-4 w-4 text-slate-500" />
              </motion.div>
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

// Artist-specific navigation
const artistNavigation = [
  { name: 'Dashboard', href: '/artist', icon: LayoutDashboard },
  { name: 'Feed', href: '/artist/feed', icon: Home },
  { name: 'Content', href: '/artist/content', icon: Video },
  { name: 'Music', href: '/artist/music', icon: Music2 },
  { name: 'Store', href: '/artist/store', icon: ShoppingBag },
  { name: 'Community', href: '/artist/community', icon: Users },
  { name: 'Business', href: '/artist/business', icon: ShoppingBag },
  { name: 'Events', href: '/artist/events', icon: Calendar },
  { name: 'Features', href: '/artist/features', icon: TrendingUp },
  { name: 'EPK', href: '/artist/epk', icon: Tag },
  { name: 'Profile', href: '/artist/profile', icon: Settings },
]
