"use client"

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { UserProfile } from '@/lib/auth/role-based-auth'
import { themeUtils } from '@/lib/design-system/theme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar,
  Users,
  MapPin,
  MessageSquare,
  BarChart3,
  Settings,
  Home,
  Music,
  Truck,
  Building2,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  Zap,
  Bell,
  Search,
  Plus,
  Clock,
  Trophy
} from 'lucide-react'

// =============================================================================
// NAVIGATION CONFIGURATION BY ROLE
// =============================================================================

interface NavItem {
  label: string
  href: string
  icon: any
  badge?: string | number
  description?: string
  children?: NavItem[]
}

interface RoleNavConfig {
  primary: NavItem[]
  secondary: NavItem[]
  tools: NavItem[]
}

const navigationConfig: Record<string, RoleNavConfig> = {
  admin: {
    primary: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: Home, description: 'Platform overview' },
      { label: 'Tours', href: '/admin/dashboard/tours', icon: Calendar, description: 'Manage all tours' },
      { label: 'Events', href: '/admin/dashboard/events', icon: MapPin, description: 'Event management' },
      { label: 'Communications', href: '/admin/dashboard/communications', icon: MessageSquare, badge: 'Live', description: 'Real-time messaging' },
      { label: 'Analytics', href: '/admin/dashboard/analytics', icon: BarChart3, description: 'Platform insights' }
    ],
    secondary: [
      { label: 'Staff Management', href: '/admin/dashboard/staff', icon: Users, description: 'Team coordination' },
      { label: 'Venues', href: '/admin/dashboard/venues', icon: Building2, description: 'Venue directory' },
      { label: 'Vendors', href: '/admin/dashboard/logistics', icon: Truck, description: 'Vendor management' }
    ],
    tools: [
      { label: 'Settings', href: '/admin/dashboard/settings', icon: Settings, description: 'Platform configuration' },
      { label: 'User Management', href: '/admin/dashboard/rbac', icon: Shield, description: 'Access control' }
    ]
  },

  manager: {
    primary: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: Home, description: 'Management overview' },
      { label: 'Tours', href: '/admin/dashboard/tours', icon: Calendar, description: 'Tour operations' },
      { label: 'Team', href: '/admin/dashboard/staff', icon: Users, description: 'Team management' },
      { label: 'Communications', href: '/admin/dashboard/communications', icon: MessageSquare, badge: 'Live', description: 'Team coordination' },
      { label: 'Reports', href: '/admin/dashboard/analytics', icon: BarChart3, description: 'Performance reports' }
    ],
    secondary: [
      { label: 'Events', href: '/admin/dashboard/events', icon: MapPin, description: 'Event oversight' },
      { label: 'Venues', href: '/admin/dashboard/venues', icon: Building2, description: 'Venue coordination' }
    ],
    tools: [
      { label: 'Settings', href: '/admin/dashboard/settings', icon: Settings, description: 'Preferences' }
    ]
  },

  tour_manager: {
    primary: [
      { label: 'Tour Dashboard', href: '/admin/dashboard/tours', icon: Home, description: 'Current tour status' },
      { label: 'Schedule', href: '/admin/dashboard/events/planner', icon: Calendar, description: 'Tour timeline' },
      { label: 'Crew', href: '/admin/dashboard/staff', icon: Users, description: 'Crew coordination' },
      { label: 'Communications', href: '/admin/dashboard/communications', icon: MessageSquare, badge: 'Live', description: 'Team chat' },
      { label: 'Logistics', href: '/admin/dashboard/logistics', icon: Truck, description: 'Transportation & equipment' }
    ],
    secondary: [
      { label: 'Venues', href: '/admin/dashboard/venues', icon: Building2, description: 'Venue coordination' },
      { label: 'Budget', href: '/admin/dashboard/finances', icon: BarChart3, description: 'Financial tracking' }
    ],
    tools: [
      { label: 'Settings', href: '/admin/dashboard/settings', icon: Settings, description: 'Tour preferences' }
    ]
  },

  event_coordinator: {
    primary: [
      { label: 'Events', href: '/admin/dashboard/events', icon: Home, description: 'Event management' },
      { label: 'Schedule', href: '/admin/dashboard/events/planner', icon: Calendar, description: 'Event timeline' },
      { label: 'Staff', href: '/admin/dashboard/staff', icon: Users, description: 'Event staffing' },
      { label: 'Communications', href: '/admin/dashboard/communications', icon: MessageSquare, description: 'Event coordination' }
    ],
    secondary: [
      { label: 'Venues', href: '/admin/dashboard/venues', icon: Building2, description: 'Venue management' },
      { label: 'Reports', href: '/admin/dashboard/analytics', icon: BarChart3, description: 'Event reports' }
    ],
    tools: [
      { label: 'Settings', href: '/admin/dashboard/settings', icon: Settings, description: 'Preferences' }
    ]
  },

  artist: {
    primary: [
      { label: 'My Dashboard', href: '/artist', icon: Home, description: 'Performance overview' },
      { label: 'Schedule', href: '/artist/events', icon: Calendar, description: 'Upcoming performances' },
      { label: 'Music & Media', href: '/artist/music', icon: Music, description: 'Content management' },
      { label: 'Messages', href: '/artist/messages', icon: MessageSquare, description: 'Communications' }
    ],
    secondary: [
      { label: 'EPK', href: '/artist/epk', icon: Eye, description: 'Electronic press kit' },
      { label: 'Analytics', href: '/artist/dashboard/analytics', icon: BarChart3, description: 'Performance metrics' }
    ],
    tools: [
      { label: 'Settings', href: '/artist/settings', icon: Settings, description: 'Profile settings' }
    ]
  },

  crew_member: {
    primary: [
      { label: 'My Tasks', href: '/venue/staff', icon: Home, description: 'Daily assignments' },
      { label: 'Schedule', href: '/venue/staff/scheduling', icon: Calendar, description: 'Work schedule' },
      { label: 'Team Chat', href: '/messages', icon: MessageSquare, badge: 'Live', description: 'Crew coordination' }
    ],
    secondary: [
      { label: 'Equipment', href: '/venue/dashboard/equipment', icon: Truck, description: 'Equipment tracking' },
      { label: 'Training', href: '/venue/staff/roles-permissions', icon: Shield, description: 'Safety & training' }
    ],
    tools: [
      { label: 'Settings', href: '/settings', icon: Settings, description: 'Personal settings' }
    ]
  },

  vendor: {
    primary: [
      { label: 'Deliveries', href: '/venue/dashboard/equipment', icon: Home, description: 'Delivery schedule' },
      { label: 'Orders', href: '/venue/dashboard/tickets', icon: Calendar, description: 'Order management' },
      { label: 'Messages', href: '/messages', icon: MessageSquare, description: 'Client communication' }
    ],
    secondary: [
      { label: 'Inventory', href: '/venue/dashboard/equipment', icon: Truck, description: 'Stock management' },
      { label: 'Reports', href: '/venue/dashboard/analytics', icon: BarChart3, description: 'Business reports' }
    ],
    tools: [
      { label: 'Settings', href: '/venue/dashboard/settings', icon: Settings, description: 'Business settings' }
    ]
  },

  venue_owner: {
    primary: [
      { label: 'Venue Dashboard', href: '/venue/dashboard', icon: Home, description: 'Venue operations' },
      { label: 'Bookings', href: '/venue/dashboard/events', icon: Calendar, description: 'Event bookings' },
      { label: 'Staff', href: '/venue/staff', icon: Users, description: 'Venue staff' },
      { label: 'Communications', href: '/messages', icon: MessageSquare, description: 'Guest & staff messaging' }
    ],
    secondary: [
      { label: 'Analytics', href: '/venue/dashboard/analytics', icon: BarChart3, description: 'Venue performance' },
      { label: 'Equipment', href: '/venue/dashboard/equipment', icon: Truck, description: 'Venue equipment' }
    ],
    tools: [
      { label: 'Settings', href: '/venue/dashboard/settings', icon: Settings, description: 'Venue management' }
    ]
  },

  viewer: {
    primary: [
      { label: 'Browse', href: '/browse', icon: Eye, description: 'Explore content' },
      { label: 'Events', href: '/events', icon: Calendar, description: 'Upcoming events' },
      { label: 'Artists', href: '/artists', icon: Music, description: 'Artist profiles' }
    ],
    secondary: [
      { label: 'Venues', href: '/venues', icon: Building2, description: 'Venue directory' }
    ],
    tools: [
      { label: 'Settings', href: '/settings', icon: Settings, description: 'Account settings' }
    ]
  }
}

// =============================================================================
// SIDEBAR PROPS
// =============================================================================

interface NavigationSidebarProps {
  user: UserProfile
  isOpen: boolean
  onToggle: () => void
  roleTheme: string
}

// =============================================================================
// NAVIGATION SIDEBAR COMPONENT
// =============================================================================

export function NavigationSidebar({ user, isOpen, onToggle, roleTheme }: NavigationSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Get navigation config for user role
  const navConfig = navigationConfig[user.role] || navigationConfig.viewer
  const roleClasses = themeUtils.getRoleClasses(user.role)

  // =============================================================================
  // NAVIGATION ITEM COMPONENT
  // =============================================================================

  const NavGroup = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    
    return (
      <div>
        {!collapsed && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
          >
            <span>{title}</span>
            <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        )}
        <div className={`space-y-1 ${isOpen ? 'block' : 'hidden'}`}>
          {children}
        </div>
      </div>
    )
  }

  const NavItem = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    
    return (
      <Button
        variant="ghost"
        size={collapsed ? "sm" : "default"}
        className={`w-full justify-start text-left h-auto p-3 mb-1 transition-all duration-200 ${
          isActive 
            ? `${roleClasses} shadow-sm` 
            : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
        } ${level > 0 ? 'ml-4 pl-8' : ''}`}
        onClick={() => router.push(item.href)}
      >
        <Icon className={`${collapsed ? 'h-5 w-5' : 'h-4 w-4'} ${collapsed ? '' : 'mr-3'} flex-shrink-0`} />
        
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${
                    typeof item.badge === 'string' && item.badge === 'Live'
                      ? 'text-green-400 border-green-500/30 animate-pulse'
                      : 'text-slate-400 border-slate-500/30'
                  }`}
                >
                  {item.badge}
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-slate-400 mt-1 truncate">{item.description}</p>
            )}
          </div>
        )}
      </Button>
    )
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 z-30 transition-all duration-300 ${
      isOpen ? (collapsed ? 'w-16' : 'w-72') : 'w-0 -translate-x-full'
    }`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${roleClasses.split(' ')[1]} flex items-center justify-center`}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Tourify</h2>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1.5"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Content */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          {/* Main Navigation */}
          <NavGroup title="Main" defaultOpen={true}>
            <NavItem item={{ href: "/", icon: Home, label: "Home" }} />
            <NavItem item={{ href: "/dashboard", icon: BarChart3, label: "Dashboard" }} />
            <NavItem item={{ href: "/events", icon: Calendar, label: "Events", badge: 3 }} />
            <NavItem item={{ href: "/music", icon: Music, label: "Music" }} />
            <NavItem item={{ href: "/network", icon: Users, label: "Network" }} />
            <NavItem item={{ href: "/messages", icon: MessageSquare, label: "Messages", badge: 2 }} />
            <NavItem item={{ href: "/bookings", icon: Clock, label: "Bookings", badge: 5 }} />
            <NavItem item={{ href: "/teams", icon: Users, label: "Team" }} />
            <NavItem item={{ href: "/achievements", icon: Trophy, label: "Achievements" }} />
          </NavGroup>

          {/* Primary Navigation */}
          <div>
            {!collapsed && (
              <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Primary
              </h3>
            )}
            <div className="space-y-1">
              {navConfig.primary.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Secondary Navigation */}
          {navConfig.secondary.length > 0 && (
            <>
              <Separator className="bg-slate-700/50" />
              <div>
                {!collapsed && (
                  <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Secondary
                  </h3>
                )}
                <div className="space-y-1">
                  {navConfig.secondary.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tools */}
          {navConfig.tools.length > 0 && (
            <>
              <Separator className="bg-slate-700/50" />
              <div>
                {!collapsed && (
                  <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tools
                  </h3>
                )}
                <div className="space-y-1">
                  {navConfig.tools.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-700/50">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.display_name || user.email}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export navigation configuration for other components
export { navigationConfig, type NavItem, type RoleNavConfig }