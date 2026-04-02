"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EnhancedAccountCards } from '@/components/dashboard/enhanced-account-cards'
import { DashboardFeed } from '@/components/dashboard/dashboard-feed'
// import { QuickActions } from '@/components/dashboard/quick-actions'
// import { RecentActivity } from '@/components/dashboard/recent-activity'
import { EnhancedAccountStatusBar } from '@/components/dashboard/enhanced-account-status-bar'
import { QuickPostCreator } from '@/components/dashboard/quick-post-creator'
import { UnifiedActivityFeed } from '@/components/dashboard/unified-activity-feed'
import { EnhancedQuickActions } from '@/components/dashboard/enhanced-quick-actions'
import { getProfileUsername } from '@/lib/utils/profile-utils'
import { DashboardService } from '@/lib/services/dashboard.service'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Users,
  Mail,
  Phone,
  Globe,
  Star,
  CheckCircle,
  ExternalLink,
  Share2,
  Share,
  BookOpen,
  GraduationCap,
  Target,
  TrendingUp,
  Camera,
  FileText,
  Code,
  Palette,
  Music,
  Video,
  Building,
  Clock,
  ThumbsUp,
  MessageCircle,
  Network,
  Play,
  Pause,
  Eye,
  Heart,
  Download,
  Disc3,
  Radio,
  Headphones,
  Volume2,
  Plus,
  Edit,
  Settings,
  BarChart3,
  ArrowRight,
  Activity,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardData {
  stats: {
    likes: number
    followers: number
    shares: number
    views: number
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    icon: any
  }>
  quickLinks: Array<{
    title: string
    description: string
    href: string
    icon: any
    color: string
  }>
}

interface UserProfile {
  id: string
  username?: string
  full_name?: string
  bio?: string
  avatar_url?: string
  custom_url?: string
  phone?: string
  location?: string
  website?: string
  instagram?: string
  twitter?: string
  show_email?: boolean
  show_phone?: boolean
  show_location?: boolean
  is_verified?: boolean
  followers_count?: number
  following_count?: number
  posts_count?: number
  metadata?: {
    full_name?: string
    username?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export default function OptimizedDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { accounts } = useMultiAccount()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  const getUserUsername = () => {
    return getProfileUsername(userProfile)
  }

  const getDisplayName = () => {
    return userProfile?.full_name || 
           userProfile?.metadata?.full_name || 
           user?.user_metadata?.full_name || 
           getUserUsername()
  }

  const fetchUserProfile = async () => {
    if (!user?.id) return

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setUserProfile(profile)
      
      // Check if this is a new user (created within last 7 days)
      const createdAt = new Date(profile.created_at)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      setIsNewUser(createdAt > sevenDaysAgo)
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  useEffect(() => {
    const initializeDashboard = async () => {
      setIsLoading(true)
      
      await fetchUserProfile()
      
      // Load dashboard data
      const loadDashboardData = () => {
        const mockData: DashboardData = {
          stats: {
            likes: 177,
            followers: 73,
            shares: 190,
            views: 1430
          },
          recentActivity: [
            {
              id: '1',
              type: 'post',
              description: 'You shared a new track',
              timestamp: '2 hours ago',
              icon: Music
            },
            {
              id: '2',
              type: 'follower',
              description: 'You gained 5 new followers',
              timestamp: '1 day ago',
              icon: Users
            },
            {
              id: '3',
              type: 'event',
              description: 'New event created: Summer Festival',
              timestamp: '2 days ago',
              icon: Calendar
            }
          ],
          quickLinks: [
            {
              title: 'Create Post',
              description: 'Share your latest work',
              href: '/feed',
              icon: Plus,
              color: 'purple'
            },
            {
              title: 'Manage Events',
              description: 'Organize your upcoming shows',
              href: '/events',
              icon: Calendar,
              color: 'blue'
            },
            {
              title: 'View Analytics',
              description: 'Track your performance',
              href: '/analytics',
              icon: BarChart3,
              color: 'green'
            }
          ]
        }
        
        setDashboardData(mockData)
      }

      loadDashboardData()
      setIsLoading(false)
    }

    if (user) {
      initializeDashboard()
    }
  }, [user])

  const handleFocus = () => {
    // Handle focus events if needed
  }

  const handleStorageChange = (e: StorageEvent) => {
    // Handle storage changes if needed
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-r-indigo-500 border-t-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
            <div className="absolute inset-6 border-4 border-b-blue-500 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin-slower"></div>
            <div className="absolute inset-8 border-4 border-l-pink-500 border-t-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-4 text-purple-400 font-mono text-sm tracking-wider">LOADING TOURIFY</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-white/20">
                    <AvatarImage src={userProfile?.avatar_url || (user as any)?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg font-semibold">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                    Welcome back, {getDisplayName()}
                  </h1>
                  <p className="text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatSafeDate(new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* View Profile Button */}
              <Button 
                variant="outline" 
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 rounded-xl"
                onClick={() => router.push(`/profile/${getUserUsername()}`)}
              >
                <User className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Welcome Alert */}
        {isNewUser && (
          <div className="container mx-auto px-6 py-6">
            <Alert className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <AlertDescription className="text-green-200">
                🎉 Welcome to Tourify! Your account has been successfully created. 
                Start by exploring the platform and connecting with other creators.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Enhanced Account Status Bar */}
        <div className="container mx-auto px-6 py-4">
          <EnhancedAccountStatusBar />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Account Cards */}
            <div className="lg:col-span-3 space-y-6">
              <EnhancedAccountCards />
            </div>

            {/* Center Column - Activity Feed */}
            <div className="lg:col-span-6 space-y-6">
              {/* Quick Stats */}
              {dashboardData && (
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        Quick Stats
                      </h3>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 rounded-xl"
                        onClick={() => router.push('/analytics')}
                      >
                        View All
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                          <Heart className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-lg font-bold text-white">{dashboardData.stats.likes.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Likes</div>
                      </div>

                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-lg font-bold text-white">{dashboardData.stats.followers.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Followers</div>
                      </div>

                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                          <Share className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-lg font-bold text-white">{dashboardData.stats.shares.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Shares</div>
                      </div>

                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-lg font-bold text-white">{dashboardData.stats.views.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Views</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Post Creator */}
              <QuickPostCreator />

              {/* Unified Activity Feed */}
              <UnifiedActivityFeed />
            </div>

            {/* Right Column - Quick Actions */}
            <div className="lg:col-span-3 space-y-6">
              <EnhancedQuickActions />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
} 