"use client"

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, useAuth } from '@/lib/auth/role-based-auth'
import { usePlatformStatus } from '@/hooks/use-platform-sync'
import { themeUtils } from '@/lib/design-system/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Circle,
  Plus,
  MessageSquare,
  Calendar,
  Users
} from 'lucide-react'

// =============================================================================
// BREADCRUMB TYPES
// =============================================================================

interface Breadcrumb {
  label: string
  href?: string
}

// =============================================================================
// TOP BAR PROPS
// =============================================================================

interface TopBarProps {
  user: UserProfile
  title?: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
  onMenuClick: () => void
  showMenuButton: boolean
  roleTheme: string
}

// =============================================================================
// QUICK ACTION CONFIGURATION BY ROLE
// =============================================================================

const quickActions: Record<string, { label: string; icon: any; href: string; color: string }[]> = {
  admin: [
    { label: 'New Tour', icon: Calendar, href: '/admin/tours/new', color: 'text-blue-400' },
    { label: 'Add Staff', icon: Users, href: '/admin/staff/new', color: 'text-green-400' },
    { label: 'Broadcast', icon: MessageSquare, href: '/admin/communications/broadcast', color: 'text-purple-400' }
  ],
  manager: [
    { label: 'New Tour', icon: Calendar, href: '/manager/tours/new', color: 'text-blue-400' },
    { label: 'Add Team Member', icon: Users, href: '/manager/team/invite', color: 'text-green-400' }
  ],
  tour_manager: [
    { label: 'Add Event', icon: Calendar, href: '/tour/events/new', color: 'text-blue-400' },
    { label: 'Message Crew', icon: MessageSquare, href: '/tour/communications', color: 'text-purple-400' }
  ],
  event_coordinator: [
    { label: 'New Event', icon: Calendar, href: '/events/new', color: 'text-blue-400' },
    { label: 'Assign Staff', icon: Users, href: '/events/staff/assign', color: 'text-green-400' }
  ],
  artist: [
    { label: 'Upload Content', icon: Plus, href: '/artist/music/upload', color: 'text-purple-400' }
  ],
  crew_member: [],
  vendor: [
    { label: 'New Order', icon: Plus, href: '/vendor/orders/new', color: 'text-blue-400' }
  ],
  venue_owner: [
    { label: 'New Booking', icon: Calendar, href: '/venue/bookings/new', color: 'text-blue-400' },
    { label: 'Add Staff', icon: Users, href: '/venue/staff/new', color: 'text-green-400' }
  ],
  viewer: []
}

// =============================================================================
// TOP BAR COMPONENT
// =============================================================================

export function TopBar({
  user,
  title,
  subtitle,
  actions,
  breadcrumbs,
  onMenuClick,
  showMenuButton,
  roleTheme
}: TopBarProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const { isConnected, connectionQuality, activeUsers } = usePlatformStatus()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get role-specific styling
  const roleClasses = themeUtils.getRoleClasses(user.role)
  const userQuickActions = quickActions[user.role] || []

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Menu Button */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="text-slate-400 hover:text-white p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Title and Breadcrumbs */}
          <div className="flex items-center space-x-2">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-slate-500" />}
                    {crumb.href ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(crumb.href!)}
                        className="text-slate-300 hover:text-white p-1 h-auto"
                      >
                        {crumb.label}
                      </Button>
                    ) : (
                      <span className="text-white font-medium">{crumb.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            ) : title ? (
              <div>
                <h1 className="text-lg font-semibold text-white">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-slate-400">{subtitle}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="w-full">
              <Input
                placeholder="Search tours, events, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery.trim()) setSearchOpen(false)
                }}
                autoFocus
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
            </form>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setSearchOpen(true)}
              className="w-full justify-start text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800"
            >
              <Search className="h-4 w-4 mr-2" />
              Search platform...
            </Button>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <Circle className={`h-2 w-2 ${
              isConnected 
                ? connectionQuality === 'excellent' ? 'text-green-400 fill-green-400' :
                  connectionQuality === 'good' ? 'text-yellow-400 fill-yellow-400' :
                  'text-orange-400 fill-orange-400'
                : 'text-red-400 fill-red-400'
            }`} />
            <span className="text-slate-400">
              {activeUsers.length} online
            </span>
          </div>

          {/* Quick Actions */}
          {userQuickActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white p-2"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                <DropdownMenuLabel className="text-slate-300">Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                {userQuickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <DropdownMenuItem
                      key={action.href}
                      onClick={() => router.push(action.href)}
                      className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Icon className={`h-4 w-4 mr-2 ${action.color}`} />
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white p-2 relative"
          >
            <Bell className="h-5 w-5" />
            <Badge 
              variant="outline" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white border-red-400"
            >
              3
            </Badge>
          </Button>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white p-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {user.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white truncate max-w-32">
                      {user.display_name || user.email}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
              <DropdownMenuLabel className="text-slate-300">
                <div>
                  <p className="font-medium">{user.display_name || user.email}</p>
                  <p className="text-xs text-slate-400 capitalize mt-1">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => router.push('/settings')}
                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-slate-700" />
              
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-400 hover:text-red-300 hover:bg-slate-700 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom Actions */}
          {actions}
        </div>
      </div>

      {/* Mobile Search Expanded */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch}>
            <Input
              placeholder="Search platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
          </form>
        </div>
      )}
    </header>
  )
}