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
  Briefcase,
  HelpCircle,
  MessageSquare,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/hooks/use-profile"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { AccountSwitcher } from "@/components/account-switcher"
import { TourifyLogo } from "@/components/tourify-logo"
import { supabase } from "@/lib/supabase"
import { EnhancedNotificationCenter } from "@/components/notifications/enhanced-notification-center"
import { CompactAccountSwitcher } from "@/components/compact-account-switcher"
import { EnhancedAccountSearch } from "@/components/search/enhanced-account-search"
import { MobileSearchModal } from "@/components/search/mobile-search-modal"
import { useProductEducation } from "@/components/product-education/product-education-context"
import { getDashboardPathForAccountType } from "@/lib/navigation/account-dashboard-routes"

interface NavProfileSnapshot {
  id?: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

function resolveNavAvatarUrl(
  primaryProfile: NavProfileSnapshot | null,
  profileData: { profile?: { avatar_url?: string | null } | null },
  user: { user_metadata?: Record<string, unknown> } | null,
  currentAccount: { profile_data?: Record<string, unknown> } | null | undefined
): string | undefined {
  const metadata = user?.user_metadata as { avatar_url?: string } | undefined
  const accountData = currentAccount?.profile_data as { avatar_url?: string } | undefined

  return (
    primaryProfile?.avatar_url ||
    profileData.profile?.avatar_url ||
    metadata?.avatar_url ||
    accountData?.avatar_url ||
    undefined
  )
}

function resolveNavDisplayName(
  primaryProfile: NavProfileSnapshot | null,
  profileData: { profile?: { full_name?: string | null; profile_data?: { name?: string } | null } | null },
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
  currentAccount: { profile_data?: Record<string, unknown> } | null | undefined
): string {
  const metadata = user?.user_metadata as { full_name?: string; name?: string } | undefined
  const accountData = currentAccount?.profile_data as { full_name?: string; display_name?: string } | undefined

  return (
    primaryProfile?.full_name ||
    profileData.profile?.full_name ||
    profileData.profile?.profile_data?.name ||
    accountData?.full_name ||
    accountData?.display_name ||
    metadata?.full_name ||
    metadata?.name ||
    primaryProfile?.username ||
    user?.email?.split("@")[0] ||
    "User"
  )
}

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { profileData } = useProfile()
  const { currentAccount } = useMultiAccount()
  const [notifications, setNotifications] = useState(0)
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [primaryProfile, setPrimaryProfile] = useState<NavProfileSnapshot | null>(null)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const { openHelp } = useProductEducation()

  // Load signed-in identity via cookie-authenticated API (does not wait on useAuth).
  useEffect(() => {
    let cancelled = false

    async function loadPrimaryProfile() {
      try {
        const response = await fetch('/api/profile/current', {
          credentials: 'same-origin',
        })

        if (response.status === 401) {
          if (!cancelled) setPrimaryProfile(null)
          return
        }

        if (!response.ok) return

        const data = await response.json()
        const profile = data?.profile
        if (!profile || cancelled) return

        setPrimaryProfile({
          id: profile.id,
          full_name: profile.profile_data?.name || profile.full_name || null,
          username: profile.username || null,
          avatar_url: profile.avatar_url || null,
        })
      } catch (error) {
        console.error('Nav: Error loading primary profile:', error)
      }
    }

    void loadPrimaryProfile()

    return () => {
      cancelled = true
    }
  }, [])

  // Once useAuth hydrates, refresh from profiles as a secondary source.
  useEffect(() => {
    async function loadAuthProfile() {
      if (!user?.id) return

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', user.id)
          .single()

        if (!error && profile) {
          setPrimaryProfile((prev) => ({
            id: profile.id,
            full_name: profile.full_name || prev?.full_name || null,
            username: profile.username || prev?.username || null,
            avatar_url: profile.avatar_url || prev?.avatar_url || null,
          }))
        }
      } catch (error) {
        console.error('Nav: Error loading auth profile:', error)
      }
    }

    void loadAuthProfile()
  }, [user?.id])

  // Poll the lightweight unread-messages count for the top-nav badge.
  useEffect(() => {
    const canPoll = Boolean(user?.id || primaryProfile?.id)
    if (!canPoll) return

    let cancelled = false
    async function loadUnread() {
      try {
        const response = await fetch('/api/messages/unread-count', { credentials: 'include' })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setMessagesUnread(Number(data.count) || 0)
      } catch {
        // Non-blocking: the badge simply stays hidden on failure.
      }
    }

    loadUnread()
    const onFocus = () => loadUnread()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.id, primaryProfile?.id])

  const navAvatarUrl = resolveNavAvatarUrl(primaryProfile, profileData, user, currentAccount)
  const navDisplayName = resolveNavDisplayName(primaryProfile, profileData, user, currentAccount)
  const navInitial = navDisplayName.charAt(0).toUpperCase()

  // Smart home navigation based on current account
  const getHomeRoute = () => getDashboardPathForAccountType(currentAccount?.account_type)

  // Smart home button click handler
  const handleHomeClick = () => {
    const homeRoute = getHomeRoute()
    try {
      const navResult = router.push(homeRoute)
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw error
    }
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
          className="flex shrink-0 items-center space-x-3 group hover:scale-105 transition-all duration-300 ease-in-out cursor-pointer"
          onClick={handleHomeClick}
        >
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <TourifyLogo
              variant="white"
              size="xl"
              className="h-12 w-auto object-contain relative z-10 group-hover:brightness-110 transition-all duration-300"
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
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={handleHomeClick}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full transition-all duration-300 ${
              pathname === '/news'
                ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={() => router.push('/news')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            News
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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/messages')}
            className="relative p-2 hover:bg-slate-800/50 rounded-full"
            aria-label="Open messages"
          >
            <MessageSquare className="h-5 w-5 text-slate-300" />
            {messagesUnread > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-purple-500 to-pink-500 border-0">
                {messagesUnread > 99 ? '99+' : messagesUnread}
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <EnhancedNotificationCenter />

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
                  <AvatarImage src={navAvatarUrl} alt={navDisplayName} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    {navInitial}
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
                    <AvatarImage src={navAvatarUrl} alt={navDisplayName} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                      {navInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {navDisplayName}
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
                onClick={() => openHelp()}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help and guides
              </DropdownMenuItem>
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
