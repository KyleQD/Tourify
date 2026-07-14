"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/lib/auth/role-based-auth'
import { themeUtils } from '@/lib/design-system/theme'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus,
  Calendar,
  Users,
  MessageSquare,
  MapPin,
  Music,
  Truck,
  Building2,
  Zap,
  Upload,
  Settings,
  Bell
} from 'lucide-react'

// =============================================================================
// QUICK ACTIONS CONFIGURATION BY ROLE
// =============================================================================

interface QuickAction {
  id: string
  label: string
  icon: any
  href: string
  description?: string
  color: string
  shortcut?: string
}

const quickActionsConfig: Record<string, QuickAction[]> = {
  admin: [
    {
      id: 'new-tour',
      label: 'Create Tour',
      icon: Calendar,
      href: '/admin/tours/new',
      description: 'Start a new tour',
      color: 'text-blue-400',
      shortcut: 'Ctrl+T'
    },
    {
      id: 'add-staff',
      label: 'Add Staff',
      icon: Users,
      href: '/admin/staff/new',
      description: 'Invite team member',
      color: 'text-green-400',
      shortcut: 'Ctrl+U'
    },
    {
      id: 'broadcast',
      label: 'Broadcast Message',
      icon: MessageSquare,
      href: '/admin/communications/broadcast',
      description: 'Send platform-wide announcement',
      color: 'text-purple-400',
      shortcut: 'Ctrl+B'
    },
    {
      id: 'new-venue',
      label: 'Add Venue',
      icon: Building2,
      href: '/admin/venues/new',
      description: 'Register new venue',
      color: 'text-cyan-400'
    }
  ],

  manager: [
    {
      id: 'new-tour',
      label: 'Create Tour',
      icon: Calendar,
      href: '/manager/tours/new',
      description: 'Plan new tour',
      color: 'text-blue-400',
      shortcut: 'Ctrl+T'
    },
    {
      id: 'invite-team',
      label: 'Invite Team Member',
      icon: Users,
      href: '/manager/team/invite',
      description: 'Add to your team',
      color: 'text-green-400'
    },
    {
      id: 'quick-message',
      label: 'Team Message',
      icon: MessageSquare,
      href: '/manager/communications',
      description: 'Message your team',
      color: 'text-purple-400'
    }
  ],

  tour_manager: [
    {
      id: 'add-event',
      label: 'Add Event',
      icon: Calendar,
      href: '/tour/events/new',
      description: 'Schedule new show',
      color: 'text-blue-400',
      shortcut: 'Ctrl+E'
    },
    {
      id: 'message-crew',
      label: 'Message Crew',
      icon: MessageSquare,
      href: '/tour/communications',
      description: 'Communicate with crew',
      color: 'text-purple-400',
      shortcut: 'Ctrl+M'
    },
    {
      id: 'logistics-update',
      label: 'Update Logistics',
      icon: Truck,
      href: '/tour/logistics/update',
      description: 'Transportation & equipment',
      color: 'text-orange-400'
    }
  ],

  event_coordinator: [
    {
      id: 'new-event',
      label: 'Create Event',
      icon: Calendar,
      href: '/events/new',
      description: 'Plan new event',
      color: 'text-blue-400',
      shortcut: 'Ctrl+E'
    },
    {
      id: 'assign-staff',
      label: 'Assign Staff',
      icon: Users,
      href: '/events/staff/assign',
      description: 'Staff assignments',
      color: 'text-green-400'
    },
    {
      id: 'venue-contact',
      label: 'Contact Venue',
      icon: Building2,
      href: '/events/venues/contact',
      description: 'Venue coordination',
      color: 'text-cyan-400'
    }
  ],

  artist: [
    {
      id: 'upload-content',
      label: 'Upload Content',
      icon: Upload,
      href: '/artist/music/upload',
      description: 'Add music or media',
      color: 'text-purple-400',
      shortcut: 'Ctrl+U'
    },
    {
      id: 'update-epk',
      label: 'Update EPK',
      icon: Music,
      href: '/artist/epk',
      description: 'Electronic press kit',
      color: 'text-pink-400'
    },
    {
      id: 'message-team',
      label: 'Message Team',
      icon: MessageSquare,
      href: '/artist/messages',
      description: 'Contact your team',
      color: 'text-blue-400'
    }
  ],

  crew_member: [
    {
      id: 'check-in',
      label: 'Check In',
      icon: MapPin,
      href: '/crew/checkin',
      description: 'Location check-in',
      color: 'text-green-400',
      shortcut: 'Ctrl+I'
    },
    {
      id: 'report-issue',
      label: 'Report Issue',
      icon: Bell,
      href: '/crew/report',
      description: 'Report problem',
      color: 'text-red-400'
    }
  ],

  vendor: [
    {
      id: 'new-order',
      label: 'New Order',
      icon: Plus,
      href: '/vendor/orders/new',
      description: 'Create order',
      color: 'text-blue-400',
      shortcut: 'Ctrl+O'
    },
    {
      id: 'update-inventory',
      label: 'Update Inventory',
      icon: Truck,
      href: '/vendor/inventory/update',
      description: 'Stock management',
      color: 'text-orange-400'
    }
  ],

  venue_owner: [
    {
      id: 'new-booking',
      label: 'New Booking',
      icon: Calendar,
      href: '/venue/bookings/new',
      description: 'Schedule event',
      color: 'text-blue-400',
      shortcut: 'Ctrl+B'
    },
    {
      id: 'add-staff',
      label: 'Add Staff',
      icon: Users,
      href: '/venue/staff/new',
      description: 'Hire team member',
      color: 'text-green-400'
    },
    {
      id: 'update-venue',
      label: 'Update Venue Info',
      icon: Building2,
      href: '/venue/settings/profile',
      description: 'Venue details',
      color: 'text-cyan-400'
    }
  ],

  viewer: []
}

// =============================================================================
// QUICK ACTIONS PROPS
// =============================================================================

interface QuickActionsProps {
  user: UserProfile
  variant?: 'floating' | 'inline'
  size?: 'sm' | 'md' | 'lg'
}

// =============================================================================
// QUICK ACTIONS COMPONENT
// =============================================================================

export function QuickActions({ user, variant = 'floating', size = 'md' }: QuickActionsProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Get actions for user role
  const userActions = quickActionsConfig[user.role] || []
  const roleClasses = themeUtils.getRoleClasses(user.role)

  // Handle action click
  const handleActionClick = (action: QuickAction) => {
    router.push(action.href)
    setIsOpen(false)
  }

  // No actions for this role
  if (userActions.length === 0) {
    return null
  }

  // Floating FAB variant
  if (variant === 'floating') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size={size === 'md' ? 'default' : size}
            className={`rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
              size === 'lg' ? 'h-14 w-14' : size === 'md' ? 'h-12 w-12' : 'h-10 w-10'
            } bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0`}
          >
            <Plus className={`${
              size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
            } text-white`} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-slate-800 border-slate-700"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-slate-300 flex items-center">
            <Zap className="h-4 w-4 mr-2 text-purple-400" />
            Quick Actions
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-slate-700" />
          
          {userActions.map((action) => {
            const Icon = action.icon
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer group p-3"
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`p-1.5 rounded-md bg-slate-700 group-hover:bg-slate-600 transition-colors`}>
                    <Icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{action.label}</span>
                      {action.shortcut && (
                        <span className="text-xs text-slate-500 ml-2">{action.shortcut}</span>
                      )}
                    </div>
                    {action.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {action.description}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Inline variant
  return (
    <div className="flex items-center space-x-2">
      {userActions.slice(0, 3).map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => handleActionClick(action)}
            className="flex items-center space-x-2 text-slate-300 hover:text-white border-slate-600 hover:border-slate-500"
            title={action.description}
          >
            <Icon className={`h-4 w-4 ${action.color}`} />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        )
      })}
      
      {userActions.length > 3 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-slate-300 hover:text-white border-slate-600 hover:border-slate-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">More</span>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
            {userActions.slice(3).map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleActionClick(action)}
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
    </div>
  )
}

// =============================================================================
// KEYBOARD SHORTCUTS HOOK
// =============================================================================

export function useQuickActionShortcuts(user: UserProfile) {
  const router = useRouter()
  const userActions = quickActionsConfig[user.role] || []

  useState(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      const action = userActions.find(a => {
        if (!a.shortcut) return false
        
        const keys = a.shortcut.toLowerCase().split('+')
        const ctrlKey = keys.includes('ctrl') && (event.ctrlKey || event.metaKey)
        const altKey = keys.includes('alt') && event.altKey
        const shiftKey = keys.includes('shift') && event.shiftKey
        const key = keys[keys.length - 1]
        
        return ctrlKey === (keys.includes('ctrl')) &&
               altKey === (keys.includes('alt')) &&
               shiftKey === (keys.includes('shift')) &&
               event.key.toLowerCase() === key
      })

      if (action) {
        event.preventDefault()
        router.push(action.href)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })
}

// Export action configurations for other components
export { quickActionsConfig, type QuickAction }