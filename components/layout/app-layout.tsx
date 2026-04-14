"use client"

import { ReactNode, useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/role-based-auth'
import { usePlatformStatus } from '@/hooks/use-platform-sync'
import { tourifyTheme, themeUtils } from '@/lib/design-system/theme'
import { NavigationSidebar } from './navigation-sidebar'
import { TopBar } from './top-bar'


import { ConnectionStatusIndicator } from './connection-status-indicator'
import { NotificationCenter } from './notification-center'
import { EnhancedNotificationCenter } from '@/components/notifications/enhanced-notification-center'
import { QuickActions } from './quick-actions'
import { LoadingScreen } from '../ui/loading-screen'
import { ErrorBoundary } from '../ui/error-boundary'

// =============================================================================
// LAYOUT CONFIGURATION BY ROLE
// =============================================================================

const roleLayouts: Record<string, { sidebar: boolean; topbar: boolean; quickActions: boolean; notifications: boolean; connectionStatus: boolean; theme: string }> = {
  super_admin: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: true,
    theme: 'admin'
  },
  admin: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: true,
    theme: 'admin'
  },
  manager: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: true,
    theme: 'manager'
  },
  tour_manager: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: true,
    theme: 'tour_manager'
  },
  event_coordinator: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: false,
    theme: 'event_coordinator'
  },
  artist: {
    sidebar: false,
    topbar: true,
    quickActions: false,
    notifications: true,
    connectionStatus: false,
    theme: 'artist'
  },
  crew_member: {
    sidebar: false,
    topbar: true,
    quickActions: false,
    notifications: true,
    connectionStatus: false,
    theme: 'crew_member'
  },
  vendor: {
    sidebar: false,
    topbar: true,
    quickActions: false,
    notifications: true,
    connectionStatus: false,
    theme: 'vendor'
  },
  venue_owner: {
    sidebar: true,
    topbar: true,
    quickActions: true,
    notifications: true,
    connectionStatus: true,
    theme: 'venue_owner'
  },
  viewer: {
    sidebar: false,
    topbar: true,
    quickActions: false,
    notifications: false,
    connectionStatus: false,
    theme: 'viewer'
  }
}

// =============================================================================
// LAYOUT PROPS
// =============================================================================

interface AppLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
  fullWidth?: boolean
  noHeader?: boolean
  noPadding?: boolean
}

// =============================================================================
// MAIN LAYOUT COMPONENT
// =============================================================================

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = "",
  fullWidth = false,
  noHeader = false,
  noPadding = false
}: AppLayoutProps) {
  // Auth and platform status
  const { user, isLoading: authLoading } = useAuth()
  const { isConnected, connectionQuality } = usePlatformStatus()
  
  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Get layout configuration for user role
  const layoutConfig = user?.role ? roleLayouts[user.role] || roleLayouts.viewer : roleLayouts.viewer

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setSidebarOpen(layoutConfig.sidebar)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [layoutConfig.sidebar])

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  if (authLoading) {
    return <LoadingScreen message="Loading your dashboard..." />
  }

  if (!user) {
    return <LoadingScreen message="Please sign in to continue..." />
  }

  // =============================================================================
  // LAYOUT STRUCTURE
  // =============================================================================

  const roleColorClasses = themeUtils.getRoleClasses(user.role)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950">
        {/* Background Pattern */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-slate-950" />
        </div>

        {/* Main Layout Container */}
        <div className="relative flex h-screen overflow-hidden">
          {/* Sidebar Navigation - Desktop */}
          {layoutConfig.sidebar && !isMobile && (
            <NavigationSidebar
              user={user}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              roleTheme={layoutConfig.theme}
            />
          )}

          {/* Mobile Navigation Overlay */}
          {isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />

            </div>
          )}

          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col overflow-hidden ${
            layoutConfig.sidebar && !isMobile ? 'ml-0' : ''
          }`}>
            {/* Top Bar */}
            {layoutConfig.topbar && (
              <TopBar
                user={user}
                title={title}
                subtitle={subtitle}
                actions={actions}
                breadcrumbs={breadcrumbs}
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                showMenuButton={layoutConfig.sidebar || isMobile}
                roleTheme={layoutConfig.theme}
              />
            )}

            {/* Page Content */}
            <main className={`flex-1 overflow-auto ${
              noPadding ? '' : 'p-4 lg:p-6'
            } ${className}`}>
              <div className={`mx-auto ${
                fullWidth ? 'w-full' : 'max-w-7xl'
              }`}>
                {children}
              </div>
            </main>
          </div>

          {/* Floating Elements */}
          <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {/* Connection Status Indicator */}
            {layoutConfig.connectionStatus && (
              <ConnectionStatusIndicator
                isConnected={isConnected}
                quality={connectionQuality}
              />
            )}

            {/* Quick Actions */}
            {layoutConfig.quickActions && (
              <QuickActions user={user} />
            )}
          </div>

          {/* Notification Center */}
          {layoutConfig.notifications && (
            <div className="fixed top-4 right-4 z-50">
              <EnhancedNotificationCenter />
            </div>
          )}
        </div>



        {/* Role Theme Accent */}
        <div className={`fixed top-0 left-0 right-0 h-1 ${roleColorClasses.split(' ')[1]} opacity-60 z-50`} />
      </div>
    </ErrorBoundary>
  )
}

// =============================================================================
// SPECIALIZED LAYOUT COMPONENTS
// =============================================================================

// Simple layout for auth pages
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />
      </div>
      <div className="relative z-10 w-full max-w-md p-6">
        {children}
      </div>
    </div>
  )
}

// Fullscreen layout for presentations
export function FullscreenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-slate-950 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />
      </div>
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
}

// Clean layout for public pages
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Export layout variants
export {
  roleLayouts,
  type AppLayoutProps
}