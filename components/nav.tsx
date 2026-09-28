"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  PROFILE_IMAGES_UPDATED_EVENT,
  PROFILE_UPDATED_STORAGE_KEY,
  type ProfileImagesUpdatedDetail,
} from "@/lib/profile/profile-image-events"
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
  const { user, loading: authLoading } = useAuth()
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

    function handleProfileImagesUpdated(event: Event) {
      const detail = (event as CustomEvent<ProfileImagesUpdatedDetail>).detail
      if (detail && 'avatarUrl' in detail) {
        setPrimaryProfile((prev) =>
          prev
            ? { ...prev, avatar_url: detail.avatarUrl ?? null }
            : prev
        )
      }
      void loadPrimaryProfile()
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === PROFILE_UPDATED_STORAGE_KEY) void loadPrimaryProfile()
    }

    window.addEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleProfileImagesUpdated)
    window.addEventListener('storage', handleStorage)

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleProfileImagesUpdated)
      window.removeEventListener('storage', handleStorage)
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

  // Don't render authenticated app chrome on public/auth routes while auth is unresolved.
  const hideNav = pathname.startsWith('/auth') || 
                  pathname.startsWith('/login') ||
                  authLoading ||
                  (!user && !primaryProfile?.id)

  if (hideNav) {
    return null
  }

  const handleSignOut = () => {
    // Clear legacy client storage before the server clears SSR cookies.
    try {
      const keys = Object.keys(localStorage).filter(
        (key) =>
          key.includes('sb-cloudify-auth') ||
          key.includes('supabase.auth') ||
          key === 'sb-cloudify-auth-token' ||
          key === 'cloudify_remember_session' ||
          key === 'onboardingData'
      )
      for (const key of keys) localStorage.removeItem(key)
    } catch {
      /* noop */
    }

    // Server route clears SSR cookies on the redirect response.
    window.location.assign('/auth/signout')
  }

  const mobileItemClass = (isActive: boolean) =>
    `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
      isActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`

  const isHomeActive = pathname === getHomeRoute()

  return (
    <>
    <nav className="sticky top-0 z-40 w-full border-b border-purple-400/20 bg-slate-900/90 shadow-lg shadow-purple-500/10 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5"></div>
      <div className="relative container mx-auto grid h-14 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-3 sm:px-4 md:h-16 md:gap-3 lg:gap-4">
        {/* Logo - Home Button */}
        <button
          type="button"
          className="group flex min-h-11 shrink-0 items-center transition-all duration-300 ease-in-out hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          onClick={handleHomeClick}
          aria-label="Go to home"
        >
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <TourifyLogo
              variant="white"
              size="xl"
              className="relative z-10 h-8 w-auto object-contain transition-all duration-300 group-hover:brightness-110 sm:h-9 md:h-12"
            />
          </div>
        </button>

        {/* Center: nav pills + search (shrink-safe) */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <div className="hidden min-w-0 shrink md:flex items-center space-x-1 xl:space-x-2 bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-purple-400/20">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-300 ${
                pathname === '/dashboard' || pathname === '/artist' || pathname === '/venue' || pathname === '/admin/dashboard'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              onClick={handleHomeClick}
              aria-label="Home"
            >
              <Home className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Home</span>
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
              aria-label="News"
            >
              <Sparkles className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">News</span>
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
              aria-label="Discover"
            >
              <Search className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Discover</span>
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
              aria-label="Jobs"
            >
              <Briefcase className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Jobs</span>
            </Button>
          </div>

          <div className="hidden min-w-0 flex-1 lg:flex">
            <EnhancedAccountSearch
              placeholder="Search Tourify…"
              className="w-full min-w-0 max-w-lg"
              showRecentSearches={true}
            />
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2 md:gap-3">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileSearch(true)}
            className="lg:hidden relative p-2 hover:bg-slate-800/50 rounded-full"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-slate-300" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/messages')}
            className="relative hidden min-h-11 min-w-11 rounded-full p-2 hover:bg-slate-800/50 md:inline-flex"
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
            className="relative hidden min-h-11 min-w-11 rounded-full p-2 transition-all duration-200 hover:bg-slate-800/50 lg:inline-flex"
            aria-label="Find friends"
          >
            <Users className="h-5 w-5 text-slate-300" />
          </Button>

          {/* Create Button — icon-only below xl */}
          <Button
            className="hidden min-h-11 min-w-11 rounded-full border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-300 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/25 md:inline-flex"
            size="sm"
            onClick={() => router.push('/create')}
            aria-label="Create"
          >
            <Plus className="h-4 w-4 xl:mr-2" />
            <span className="hidden xl:inline">Create</span>
          </Button>

          {/* Compact Account Switcher */}
          <div className="hidden xl:block">
            <CompactAccountSwitcher />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-11 w-11 shrink-0 rounded-full ring-2 ring-purple-400/30 transition-all duration-300 hover:ring-purple-400/50 md:h-10 md:w-10">
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
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

    {!pathname.startsWith('/admin') && !pathname.startsWith('/artist') ? (
      <nav
        aria-label="Mobile app navigation"
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-2 backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center gap-1">
          <button
            type="button"
            onClick={handleHomeClick}
            className={mobileItemClass(isHomeActive)}
            aria-current={isHomeActive ? 'page' : undefined}
          >
            <Home className="h-5 w-5" aria-hidden />
            <span>Home</span>
          </button>
          <Link
            href="/discover"
            className={mobileItemClass(pathname === '/discover' || pathname.startsWith('/discover/'))}
            aria-current={pathname.startsWith('/discover') ? 'page' : undefined}
          >
            <Search className="h-5 w-5" aria-hidden />
            <span>Discover</span>
          </Link>
          <Link
            href="/create"
            className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
            aria-current={pathname === '/create' ? 'page' : undefined}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
              <Plus className="h-5 w-5" aria-hidden />
            </span>
            <span>Create</span>
          </Link>
          <Link
            href="/messages"
            className={mobileItemClass(pathname === '/messages' || pathname.startsWith('/messages/'))}
            aria-current={pathname.startsWith('/messages') ? 'page' : undefined}
          >
            <span className="relative">
              <MessageSquare className="h-5 w-5" aria-hidden />
              {messagesUnread > 0 ? (
                <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white">
                  {messagesUnread > 9 ? '9+' : messagesUnread}
                </span>
              ) : null}
            </span>
            <span>Messages</span>
          </Link>
          <Link
            href="/profile"
            className={mobileItemClass(pathname === '/profile' || pathname.startsWith('/profile/'))}
            aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
          >
            <User className="h-5 w-5" aria-hidden />
            <span>Profile</span>
          </Link>
        </div>
      </nav>
    ) : null}
    </>
  )
} 
