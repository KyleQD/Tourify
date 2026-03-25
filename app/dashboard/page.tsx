"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'
import { EnhancedAccountCards } from '@/components/dashboard/enhanced-account-cards'
import { DashboardFeed } from '@/components/dashboard/dashboard-feed'
import { QuickPostCreator } from '@/components/dashboard/quick-post-creator'
import { UnifiedActivityFeed } from '@/components/dashboard/unified-activity-feed'
import { EnhancedQuickActions } from '@/components/dashboard/enhanced-quick-actions'
import { getProfileUsername } from '@/lib/utils/profile-utils'
import { DashboardService } from '@/lib/services/dashboard.service'
import {
  User,
  Calendar,
  Award,
  Users,
  Star,
  CheckCircle,
  ExternalLink,
  Share,
  Target,
  TrendingUp,
  Clock,
  Eye,
  Heart,
  BarChart3,
  ArrowRight,
  Activity,
  ChevronRight
} from 'lucide-react'

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

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const { currentAccount } = useMultiAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewUser = searchParams.get('welcome') === 'true'
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Force load state for handling redirect scenarios
  const [forceLoad, setForceLoad] = useState(false)

  // Keep a stable fallback user object to avoid effect churn.
  const dashboardUser = useMemo(() => {
    if (user) return user
    if (!forceLoad) return null
    return {
      id: 'temp-user',
      email: 'user@example.com',
      user_metadata: { full_name: 'User' }
    } as any
  }, [user, forceLoad])

  // Get the username for profile viewing
  const getUserUsername = () => {
    return getProfileUsername(userProfile)
  }

  // Get the display name from profile or fallback to user metadata
  const getDisplayName = () => {
    // First check direct column values (updated structure)
    if (userProfile?.full_name) {
      return userProfile.full_name
    }
    // Then check metadata for backwards compatibility
    if (userProfile?.metadata?.full_name) {
      return userProfile.metadata.full_name
    }
    // Then try username
    if (userProfile?.username) {
      return userProfile.username
    }
    if (userProfile?.metadata?.username) {
      return userProfile.metadata.username
    }
    // Fallback to user metadata or email
    return dashboardUser?.user_metadata?.name || dashboardUser?.email?.split('@')[0] || "Creator"
  }

  // Fetch user profile function using optimized API
  const fetchUserProfile = async () => {
    if (!dashboardUser || dashboardUser.id === 'temp-user') {
      // Set a basic fallback profile for temp users
      setUserProfile({
        id: 'temp-user',
        username: 'user',
        full_name: 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserProfile)
      return
    }

    try {
      const response = await fetch('/api/profile/current')
      
      if (response.ok) {
        const { profile } = await response.json()
        if (profile) {
          // Transform API response to match dashboard interface
          const transformedProfile: UserProfile = {
            id: profile.id,
            username: profile.username,
            full_name: profile.profile_data?.name || profile.full_name,
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            custom_url: profile.custom_url,
            phone: profile.profile_data?.phone,
            location: profile.profile_data?.location || profile.location,
            website: profile.social_links?.website || profile.profile_data?.website,
            instagram: profile.social_links?.instagram,
            twitter: profile.social_links?.twitter,
            show_email: profile.metadata?.show_email,
            show_phone: profile.metadata?.show_phone,
            show_location: profile.metadata?.show_location,
            is_verified: profile.verified,
            followers_count: profile.stats?.followers,
            following_count: profile.stats?.following,
            posts_count: profile.stats?.posts,
            metadata: profile.metadata || {},
            created_at: profile.created_at,
            updated_at: profile.updated_at || profile.created_at
          }
          
          setUserProfile(transformedProfile)
        } else {
          // Set fallback profile to prevent hanging
          setUserProfile({
            id: dashboardUser.id,
            username: dashboardUser.email?.split('@')[0] || 'user',
            full_name: dashboardUser.user_metadata?.full_name || dashboardUser.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as UserProfile)
        }
      } else {
        // Set fallback profile to prevent hanging
        setUserProfile({
          id: dashboardUser.id,
          username: dashboardUser.email?.split('@')[0] || 'user',
          full_name: dashboardUser.user_metadata?.full_name || dashboardUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as UserProfile)
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      
      // Log more detailed error information
      if (err.message) {
        console.error('Profile fetch error message:', err.message)
      }
      if (err.status) {
        console.error('Profile fetch error status:', err.status)
      }
      
      // Set fallback profile to prevent hanging
      setUserProfile({
        id: dashboardUser.id,
        username: dashboardUser.email?.split('@')[0] || 'user',
        full_name: dashboardUser.user_metadata?.full_name || dashboardUser.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserProfile)
    }
  }

  const dashboardUserId = dashboardUser?.id

  useEffect(() => {
    if (!loading && !user && !forceLoad) {
      router.push('/login')
      return
    }

    if (!dashboardUserId) {
      return
    }

    // Load real dashboard data
    const loadDashboardData = async () => {
      try {
        setIsLoadingData(true)
        setError(null)
        
        if (!dashboardUserId) return
        
        // Add timeout to prevent hanging
        const statsPromise = DashboardService.getDashboardStats(dashboardUserId)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dashboard stats timeout')), 5000)
        )
        
        const stats = await Promise.race([statsPromise, timeoutPromise]) as any
        setDashboardData({
          stats: {
            likes: stats.likes || 0,
            followers: stats.followers || 0,
            shares: stats.shares || 0,
            views: stats.views || 0
          },
        recentActivity: [
          {
            id: '1',
            type: 'like',
            description: 'Your latest track received 15 new likes',
            timestamp: '2 hours ago',
            icon: Heart
          },
          {
            id: '2',
            type: 'booking',
            description: 'New booking request from Blue Moon Venue',
            timestamp: '4 hours ago',
            icon: Calendar
          },
          {
            id: '3',
            type: 'follow',
            description: '3 new followers joined your community',
            timestamp: '6 hours ago',
            icon: Users
          },
          {
            id: '4',
            type: 'achievement',
            description: 'You reached 1K profile views milestone!',
            timestamp: '1 day ago',
            icon: Award
          }
        ],
        quickLinks: [
          {
            title: 'Analytics',
            description: 'Track your performance',
            href: '/analytics',
            icon: BarChart3,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Events',
            description: 'Manage your shows',
            href: '/events',
            icon: Calendar,
            color: 'from-purple-500 to-pink-500'
          },
          {
            title: 'Network',
            description: 'Connect with others',
            href: '/network',
            icon: Users,
            color: 'from-green-500 to-emerald-500'
          },
          {
            title: 'Profile',
            description: 'Update your profile',
            href: '/profile',
            icon: User,
            color: 'from-orange-500 to-red-500'
          }
        ]
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
      // Set fallback dashboard data to prevent hanging
      setDashboardData({
        stats: {
          likes: 42,
          followers: 128,
          shares: 18,
          views: 1247
        },
        recentActivity: [
          {
            id: '1',
            type: 'like',
            description: 'Your content is gaining traction!',
            timestamp: '2 hours ago',
            icon: Heart
          },
          {
            id: '2',
            type: 'follow',
            description: 'New followers joined your community',
            timestamp: '4 hours ago',
            icon: Users
          }
        ],
        quickLinks: [
          {
            title: 'Analytics',
            description: 'Track your performance',
            href: '/analytics',
            icon: BarChart3,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Events',
            description: 'Manage your shows',
            href: '/events',
            icon: Calendar,
            color: 'from-purple-500 to-pink-500'
          },
          {
            title: 'Network',
            description: 'Connect with others',
            href: '/network',
            icon: Users,
            color: 'from-green-500 to-emerald-500'
          },
          {
            title: 'Profile',
            description: 'Update your profile',
            href: '/profile',
            icon: User,
            color: 'from-orange-500 to-red-500'
          }
        ]
      })
    } finally {
      setIsLoadingData(false)
    }
  }

    // Load data when user is available
    fetchUserProfile()
    loadDashboardData()

    // Add focus event listener to refresh profile when user returns to dashboard
    const handleFocus = () => {
      if (dashboardUser) {
        fetchUserProfile()
      }
    }

    // Add storage event listener to refresh when profile is updated in settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile-updated' && dashboardUser) {
        fetchUserProfile()
        // Clear the storage item after handling
        localStorage.removeItem('profile-updated')
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [user, loading, router, dashboardUserId, forceLoad])

  useEffect(() => {
    const forceLoadTimer = setTimeout(() => {
      setForceLoad(true)
    }, 3000)
    
    return () => clearTimeout(forceLoadTimer)
  }, [])

  if (loading && !forceLoad) {
    return (
      <BrandLoadingScreen
        message="Loading..."
        logoSrc="/tourify-logo-white.svg"
        fullScreen={true}
      />
    )
  }

  if (!dashboardUser) {
    return null
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
          <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-white/20">
                    <AvatarImage
                      src={userProfile?.avatar_url || dashboardUser.user_metadata?.avatar_url}
                      alt={`${getDisplayName()} profile photo`}
                    />
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
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* View Profile Button */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => router.push(`/profile/${getUserUsername()}`)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105"
                >
                  <User className="h-4 w-4" />
                  View Public Profile
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Alert */}
        {isNewUser && (
          <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            <Alert className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <AlertDescription className="text-green-200">
                🎉 Welcome to Tourify! Your account has been successfully created. 
                Start by exploring the platform and connecting with other creators.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            <Alert className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50 backdrop-blur-sm">
              <AlertDescription className="text-red-200">
                ⚠️ {error} - Showing fallback data. Some features may be limited.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Left Column - Account Cards */}
            <div className="lg:col-span-3 space-y-6">
              <EnhancedAccountCards />
            </div>

            {/* Center Column - Activity Feed */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Consolidated Analytics Overview */}
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
                        onClick={() => {
                          const accountId = currentAccount?.profile_id || user?.id
                          router.push(`/analytics?scope=dashboard&accountId=${accountId}`)
                        }}
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

              {/* Dashboard Feed */}
              <DashboardFeed />

              {/* Content Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl">
                    Insights
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6">
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white">Platform Overview</CardTitle>
                      <CardDescription className="text-gray-400">
                        Your creative journey at a glance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-400" />
                            Your Goals
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Complete Profile</span>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                Complete
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">First Post</span>
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                In Progress
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">100 Followers</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-400" />
                            Recent Achievements
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                <Award className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">Profile Complete</div>
                                <div className="text-xs text-gray-400">2 days ago</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="activity" className="mt-6">
                  <UnifiedActivityFeed />
                </TabsContent>
                
                <TabsContent value="insights" className="mt-6">
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white">Performance Insights</CardTitle>
                      <CardDescription className="text-gray-400">
                        Data-driven insights to grow your presence
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium text-white">Growing Reach</span>
                            </div>
                            <p className="text-sm text-green-300">Your content is reaching 23% more people this week</p>
                          </div>
                          
                          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Users className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium text-white">Engagement Up</span>
                            </div>
                            <p className="text-sm text-blue-300">People are interacting more with your posts</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="lg:col-span-3 space-y-6">
              <div className="w-full">
                <EnhancedQuickActions />
              </div>
            </div>
          </div>
        </main>
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