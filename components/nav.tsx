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
  Sparkles,
  Briefcase
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/hooks/use-profile"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { AccountSwitcher } from "@/components/account-switcher"
import { TourifyLogo } from "@/components/tourify-logo"
import { supabase } from "@/lib/supabase"
import { WorkingNotificationBell } from "@/components/working-notification-bell"
import { CompactAccountSwitcher } from "@/components/compact-account-switcher"
import { EnhancedAccountSearch } from "@/components/search/enhanced-account-search"
import { MobileSearchModal } from "@/components/search/mobile-search-modal"

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { profileData } = useProfile()
  const { currentAccount } = useMultiAccount()
  const [notifications, setNotifications] = useState(0)
  const [primaryProfile, setPrimaryProfile] = useState<any>(null)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Load primary profile data directly for nav display
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
          console.log('✅ Nav: Loaded primary profile:', profile.full_name)
          setPrimaryProfile(profile)
        } else {
          console.log('❌ Nav: Failed to load primary profile:', error)
        }
      } catch (error) {
        console.error('Nav: Error loading primary profile:', error)
      }
    }
    
    loadPrimaryProfile()
  }, [user?.id])

  // Smart home navigation based on current account
  const getHomeRoute = () => {
    return '/'
  }

  // Smart home button click handler
  const handleHomeClick = () => {
    const homeRoute = getHomeRoute()
    router.push(homeRoute)
  }

  // Don't show nav on auth pages or onboarding
  const hideNav = pathname.startsWith('/auth') || 
                  pathname.startsWith('/login') ||
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

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-purple-400/20 shadow-lg shadow-purple-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5"></div>
      <div className="relative container flex h-16 items-center justify-between">
        {/* Logo - Home Button */}
        <div 
          className="flex items-center space-x-3 group hover:scale-105 transition-all duration-300 ease-in-out cursor-pointer"
          onClick={handleHomeClick}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <TourifyLogo
              variant="white"
              size="xl"
              className="h-12 w-auto relative z-10 group-hover:brightness-110 transition-all duration-300"
            />
          </div>
        </div>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-purple-400/20">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full transition-all duration-300 ${
              pathname === '/dashboard' || pathname === '/artist' || pathname === '/venue' || pathname === '/admin/dashboard'
              || pathname === '/'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={handleHomeClick}
          >
            <Home className="h-4 w-4 mr-2" />
            Hub
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full transition-all duration-300 ${
              pathname === '/feed' 
                ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={() => router.push('/feed')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Pulse
          </Button>
          <Button
            variant="ghost"
            size="sm" 
            className={`rounded-full transition-all duration-300 ${
              pathname === '/discover' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={() => router.push('/discover')}
          >
            <Search className="h-4 w-4 mr-2" />
            Discover
          </Button>
          <Button
            variant="ghost"
            size="sm" 
            className={`rounded-full transition-all duration-300 ${
              pathname === '/jobs' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={() => router.push('/jobs')}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Jobs
          </Button>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-lg mx-8">
          <EnhancedAccountSearch 
            placeholder="Search artists, venues, and users..." 
            className="w-full"
            showRecentSearches={true}
          />
        </div>

        {/* Right Navigation */}
        <div className="flex items-center space-x-4">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileSearch(true)}
            className="lg:hidden relative p-2 hover:bg-slate-800/50 rounded-full"
          >
            <Search className="h-5 w-5 text-slate-300" />
          </Button>

          {/* Notifications */}
          <WorkingNotificationBell />

          {/* Friend Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/friends/search')}
            className="relative p-2 hover:bg-slate-800/50 rounded-full transition-all duration-200"
          >
            <Users className="h-5 w-5 text-slate-300" />
          </Button>

          {/* Create Button */}
          <Button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
            size="sm" 
            onClick={() => router.push('/create')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>

          {/* Compact Account Switcher */}
          <CompactAccountSwitcher />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-purple-400/30 hover:ring-purple-400/50 transition-all duration-300">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={primaryProfile?.avatar_url || ""} alt="Profile" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    {primaryProfile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full border-2 border-slate-900"></div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 bg-slate-800/95 backdrop-blur-xl border border-purple-400/20 shadow-xl shadow-purple-500/10"
            >
              <DropdownMenuLabel className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={primaryProfile?.avatar_url || ""} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                      {primaryProfile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {primaryProfile?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem 
                className="text-slate-200 hover:bg-slate-700/50 cursor-pointer"
                onClick={() => router.push('/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-slate-200 hover:bg-slate-700/50 cursor-pointer"
                onClick={() => router.push('/settings')}
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

      {/* Mobile Search Modal */}
      <MobileSearchModal 
        isOpen={showMobileSearch} 
        onClose={() => setShowMobileSearch(false)} 
      />
    </nav>
  )
} 