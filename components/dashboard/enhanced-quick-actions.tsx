"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { JukeboxPlayer } from "@/components/dashboard/jukebox-player"
import { 
  Music, 
  Building, 
  User, 
  Settings, 
  Calendar,
  Users,
  DollarSign,
  MessageSquare,
  Plus,
  ArrowRight,
  Zap,
  Star,
  TrendingUp,
  Bell,
  FileText,
  Globe,
  Package,
  Ticket,
  BarChart3,
  Clock,
  CheckCircle,
  Upload,
  PenTool,
  Briefcase,
  Headphones,
  ImageIcon,
  Video,
  Mic,
  MapPin,
  CreditCard,
  Wrench
} from "lucide-react"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  href: string
  priority: 'high' | 'medium' | 'low'
  accountType?: string
  isRecent?: boolean
  badge?: string
  isExternal?: boolean
}

export function EnhancedQuickActions() {
  const { accounts, currentAccount } = useMultiAccount()
  const router = useRouter()
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [showMore, setShowMore] = useState(false)
  const [recentActions, setRecentActions] = useState<QuickAction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadQuickActions = () => {
      const baseActions: QuickAction[] = [
        {
          id: 'view-analytics',
          title: 'Dashboard Analytics',
          description: 'Check your dashboard performance metrics',
          icon: BarChart3,
          href: `/analytics?scope=dashboard&accountId=${currentAccount?.profile_id || ''}`,
          priority: 'medium'
        },
        {
          id: 'manage-events',
          title: 'Manage Events',
          description: 'Create and organize events',
          icon: Calendar,
          href: '/events',
          priority: 'medium'
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Check your inbox',
          icon: MessageSquare,
          href: '/messages',
          priority: 'low',
          badge: '3 new'
        }
      ]

      // Account-specific actions
      const accountSpecificActions: QuickAction[] = []
      
      accounts.forEach((account, accountIndex) => {
        if (account.account_type === 'artist') {
          accountSpecificActions.push(
            {
              id: `upload-music-${account.profile_id}`,
              title: 'Upload Music',
              description: 'Add new tracks to your library',
              icon: Upload,
              href: '/artist/content',
              priority: 'high',
              accountType: 'artist'
            },
            {
              id: `manage-bookings-${account.profile_id}`,
              title: 'Manage Bookings',
              description: 'View and respond to booking requests',
              icon: Calendar,
              href: '/bookings',
              priority: 'high',
              accountType: 'artist',
              badge: '2 pending'
            },
            {
              id: `artist-analytics-${account.profile_id}`,
              title: 'Artist Analytics',
              description: 'Track your performance metrics',
              icon: BarChart3,
              href: '/artist/business',
              priority: 'medium',
              accountType: 'artist'
            }
          )
        }
        
        if (account.account_type === 'venue') {
          accountSpecificActions.push(
            {
              id: `create-event-${account.profile_id}`,
              title: 'Create Event',
              description: 'Set up a new event at your venue',
              icon: Plus,
              href: '/events/create',
              priority: 'high',
              accountType: 'venue'
            },
            {
              id: `venue-analytics-${account.profile_id}`,
              title: 'Venue Analytics',
              description: 'Track venue performance and revenue',
              icon: DollarSign,
              href: '/venue/analytics',
              priority: 'medium',
              accountType: 'venue'
            },
            {
              id: `venue-bookings-${account.profile_id}`,
              title: 'Manage Bookings',
              description: 'Handle booking requests and schedules',
              icon: Calendar,
              href: '/venue/bookings',
              priority: 'high',
              accountType: 'venue'
            },
            {
              id: `venue-equipment-${account.profile_id}`,
              title: 'Equipment',
              description: 'Manage venue equipment and setup',
              icon: Mic,
              href: '/venue/equipment',
              priority: 'medium',
              accountType: 'venue'
            }
          )
        }
        
        if (account.account_type === 'admin') {
          accountSpecificActions.push(
            {
              id: `admin-dashboard-${account.profile_id}`,
              title: 'Admin Dashboard',
              description: 'Manage platform operations',
              icon: Settings,
              href: '/admin/dashboard',
              priority: 'high',
              accountType: 'admin'
            },
            {
              id: 'user-management',
              title: 'User Management',
              description: 'Manage user accounts and permissions',
              icon: Users,
              href: '/admin/dashboard/users',
              priority: 'medium',
              accountType: 'admin'
            },
            {
              id: 'admin-analytics',
              title: 'Platform Analytics',
              description: 'View platform-wide metrics',
              icon: BarChart3,
              href: '/admin/dashboard/analytics',
              priority: 'medium',
              accountType: 'admin'
            }
          )
        }
      })

      // Recent actions (mock data)
      const recent: QuickAction[] = [
        {
          id: 'recent-post',
          title: 'Continue Draft',
          description: 'Finish your post about the new album',
          icon: FileText,
          href: '/feed',
          priority: 'medium',
          isRecent: true
        },
        {
          id: 'recent-booking',
          title: 'Respond to Booking',
          description: 'The Blue Note wants to confirm details',
          icon: Calendar,
          href: '/bookings',
          priority: 'high',
          isRecent: true,
          badge: 'Urgent'
        }
      ]

      // Merge and sort by priority; keep deterministic order
      const merged = [...baseActions, ...accountSpecificActions]
      const priorityRank = { high: 3, medium: 2, low: 1 } as const
      merged.sort((a, b) => (priorityRank[b.priority] - priorityRank[a.priority]))
      setQuickActions(merged)
      setRecentActions(recent)
      setIsLoading(false)
    }

    loadQuickActions()
  }, [accounts, currentAccount])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'from-red-500 to-pink-500'
      case 'medium':
        return 'from-yellow-500 to-orange-500'
      case 'low':
        return 'from-green-500 to-emerald-500'
      default:
        return 'from-gray-500 to-slate-500'
    }
  }

  const getAccountColor = (accountType?: string) => {
    switch (accountType) {
      case 'artist':
        return 'from-purple-500 to-pink-500'
      case 'venue':
        return 'from-blue-500 to-cyan-500'
      case 'admin':
        return 'from-orange-500 to-red-500'
      default:
        return 'from-gray-500 to-slate-500'
    }
  }

  const handleActionClick = (action: QuickAction) => {
    try {
      if (action.isExternal) {
        window.open(action.href, '_blank')
      } else {
        router.push(action.href)
      }
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to window.location for critical navigation
      if (!action.isExternal) {
        window.location.href = action.href
      }
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-white/10 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Jukebox Player - Replaces Recent Actions */}
      <JukeboxPlayer />

      {/* Quick Actions */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-purple-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {(showMore ? quickActions : quickActions.slice(0, 6)).map((action) => {
            const priorityColor = getPriorityColor(action.priority)
            const accountColor = getAccountColor(action.accountType)
            const iconColor = action.accountType ? accountColor : priorityColor
            
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full justify-start p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group h-auto"
                onClick={() => handleActionClick(action)}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${iconColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                
                                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white truncate text-sm sm:text-base">{action.title}</span>
                      {action.badge && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs flex-shrink-0">
                          {action.badge}
                        </Badge>
                      )}
                      {action.accountType && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs capitalize flex-shrink-0">
                          {action.accountType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{action.description}</p>
                  </div>
                
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 ml-2" />
              </Button>
            )
          })}
          {quickActions.length > 6 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/20 rounded-xl"
                onClick={() => setShowMore(!showMore)}
              >
                {showMore ? 'Show Less' : 'More Actions'}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Features Summary */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-2">Platform Features</h3>
            <p className="text-sm text-gray-300 mb-4">
              Explore all the tools available to you
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mb-4">
              <span>4/13 Features Used</span>
              <div className="w-16 h-1 bg-white/20 rounded-full">
                <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
              </div>
              <span>31%</span>
            </div>
            <Button 
              size="sm"
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              onClick={() => router.push('/faq')}
            >
              Explore Features
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 