"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Users,
  Music, 
  Building2, 
  Crown,
  Settings, 
  LogOut, 
  Home,
  Bell,
  Search,
  Plus,
  Grid3x3,
  ChevronDown,
  Zap,
  Activity,
  Loader2,
  Sparkles,
  Briefcase
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useRoutePreloader } from "@/hooks/use-route-preloader"
import { AccountSwitcher } from "@/components/account-switcher"
import { TourifyLogo } from "@/components/tourify-logo"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { WorkingNotificationBell } from "@/components/working-notification-bell"
import { CompactAccountSwitcher } from "@/components/compact-account-switcher"
import { EnhancedAccountSearch } from "@/components/search/enhanced-account-search"
import { getDashboardPathForAccountType } from "@/lib/navigation/account-dashboard-routes"

interface UnifiedNavigationProps {
  variant?: 'header' | 'sidebar' | 'mobile'
  className?: string
}

export function UnifiedNavigation({ variant = 'header', className = '' }: UnifiedNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { currentAccount, userAccounts, switchAccount } = useMultiAccount()
  const { navigateWithPreload, preloadRoutes, getAccountRoutes, isPreloading } = useRoutePreloader()
  const [notifications, setNotifications] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [primaryProfile, setPrimaryProfile] = useState<any>(null)

  // Load primary profile data
  useEffect(() => {
    async function loadPrimaryProfile() {
      if (!user?.id) return
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', user.id)
          .single()
        
        if (!error && profile) {
          setPrimaryProfile(profile)
        }
      } catch (error) {
        console.error('Error loading primary profile:', error)
      }
    }
    
    loadPrimaryProfile()
  }, [user?.id])

  // Preload routes when current account changes
  useEffect(() => {
    if (currentAccount) {
      const routesToPreload = getAccountRoutes(currentAccount.account_type)
      preloadRoutes(routesToPreload)
    }
  }, [currentAccount, getAccountRoutes, preloadRoutes])

  // Smart home navigation based on current account
  const getHomeRoute = () => {
    if (!currentAccount) return '/dashboard'
    return getDashboardPathForAccountType(currentAccount.account_type)
  }

  // Enhanced navigation with preloading
  const handleNavigation = async (route: string) => {
    setIsNavigating(true)
    
    try {
      const success = await navigateWithPreload(route)
      if (!success) {
        console.warn('Navigation failed, using fallback')
      }
    } catch (error) {
      console.error('Navigation error:', error)
    } finally {
      setIsNavigating(false)
    }
  }

  // Smart home button click handler
  const handleHomeClick = async () => {
    const homeRoute = getHomeRoute()
    await handleNavigation(homeRoute)
  }

  // Enhanced account switching with navigation
  const handleAccountSwitchAndNavigate = async (profileId: string, accountType: any) => {
    setIsNavigating(true)
    
    try {
      // Switch account first
      await switchAccount(profileId, accountType)

      const targetRoute = getDashboardPathForAccountType(accountType)

      await handleNavigation(targetRoute)
    } catch (error) {
      console.error('Account switch navigation error:', error)
    } finally {
      setIsNavigating(false)
    }
  }

  // Navigation items based on current account
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Home', href: getHomeRoute(), icon: Home, onClick: handleHomeClick },
      { name: 'Pulse', href: '/feed', icon: Sparkles },
      { name: 'Discover', href: '/discover', icon: Search },
      { name: 'Jobs', href: '/jobs', icon: Briefcase },
    ]

    // Add account-specific items
    if (currentAccount?.account_type === 'artist') {
      baseItems.push(
        { name: 'Events', href: '/artist/events', icon: Activity },
        { name: 'Business', href: '/artist/business', icon: Building2 }
      )
    } else if (currentAccount?.account_type === 'venue') {
      baseItems.push(
        { name: 'Events', href: '/venue/events', icon: Activity },
        { name: 'Analytics', href: '/venue/analytics', icon: Zap }
      )
    } else if (currentAccount?.account_type === 'admin') {
      baseItems.push(
        { name: 'Tours', href: '/admin/dashboard/tours', icon: Activity },
        { name: 'Events', href: '/admin/dashboard/events', icon: Building2 }
      )
    }

    return baseItems
  }

  // Don't show nav on auth pages or artist pages (they have their own sidebar)
  const hideNav = pathname.startsWith('/auth') || 
                  pathname.startsWith('/login') || 
                  pathname.startsWith('/artist') ||
                  pathname === '/' && !user

  if (hideNav) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Header variant (default)
  if (variant === 'header') {
    return (
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`sticky top-0 z-50 w-full backdrop-blur-xl bg-gradient-to-r from-black/95 via-slate-900/95 to-black/95 border-b border-slate-800/50 ${className}`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex items-center cursor-pointer"
              onClick={handleHomeClick}
            >
              <TourifyLogo className="h-8 filter drop-shadow-lg" />
            </motion.div>

            {/* Center Navigation */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-purple-400/20">
              {getNavigationItems().map((item) => (
                <Button 
                  key={item.name}
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full transition-all duration-300 ${
                    pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  onClick={item.onClick || (() => handleNavigation(item.href))}
                  disabled={isNavigating || isPreloading}
                >
                  {(isNavigating || isPreloading) && (pathname === item.href || item.onClick) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <item.icon className="h-4 w-4 mr-2" />
                  )}
                  {item.name}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="hidden lg:flex flex-1 max-w-lg mx-8">
              <EnhancedAccountSearch
                placeholder="Search artists, venues, and users..."
                className="w-full max-w-xs"
                showRecentSearches={true}
              />
            </div>

            {/* Right Navigation */}
            <div className="flex items-center space-x-4">
              {/* Mobile Search Button */}
              <div className="lg:hidden">
                <EnhancedAccountSearch 
                  placeholder="Search..." 
                  className="w-full max-w-xs"
                  showRecentSearches={true}
                />
              </div>

              {/* Notifications */}
              <WorkingNotificationBell />

              {/* Friend Search */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation('/friends/search')}
                className="relative p-2 hover:bg-slate-800/50 rounded-full transition-all duration-200"
                disabled={isNavigating || isPreloading}
              >
                <Users className="h-5 w-5 text-slate-300" />
              </Button>

              {/* Create Button */}
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                size="sm" 
                onClick={() => handleNavigation('/create')}
                disabled={isNavigating || isPreloading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>

              {/* Compact Account Switcher */}
              <CompactAccountSwitcher onAccountSwitch={handleAccountSwitchAndNavigate} />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-10 rounded-full border-2 border-slate-600 hover:border-purple-400 transition-all duration-300"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={primaryProfile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        {primaryProfile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700" align="end">
                  <DropdownMenuLabel className="text-slate-200">
                    {primaryProfile?.full_name || user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem 
                    className="text-slate-200 hover:bg-slate-800 cursor-pointer"
                    onClick={() => handleNavigation('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-slate-200 hover:bg-slate-800 cursor-pointer"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem 
                    className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {(isNavigating || isPreloading) && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-800/90 rounded-lg p-3 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span className="text-sm text-slate-300">
                {isPreloading ? 'Preloading...' : 'Navigating...'}
              </span>
            </div>
          </div>
        )}
      </motion.header>
    )
  }

  // Additional variants can be added here (sidebar, mobile, etc.)
  return null
} 