"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { ComponentType } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Music, 
  Users, 
  DollarSign, 
  BarChart2, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Heart,
  Headphones,
  Upload,
  MessageSquare,
  Activity,
  AlertCircle,
  Sparkles,
  Video,
  Briefcase,
  Disc,
  Award,
  Radio,
  Clock,
  Menu,
  Loader2,
  RefreshCw,
  User,
  Settings,
  MapPin,
  Eye,
  Play,
  Image as ImageIcon,
  FileText,
  Target,
  Zap,
  Bell,
  CheckCircle,
  CalendarDays,
  TrendingDown,
  ExternalLink
} from "lucide-react"
import { cn } from "@/utils"
import { useArtist } from "@/contexts/artist-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format, isToday, isTomorrow, differenceInDays } from "date-fns"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { artistContentService } from '@/lib/services/artist-content.service'
import { buildAnalyticsDataFromArtistStats } from '@/lib/artist/build-analytics-from-stats'
import { buildDashboardActionItems } from '@/lib/artist/build-action-items'
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"

// Import Phase 2 components
import { ArtistEventsOverview } from '@/components/dashboard/artist-events-overview'
import { ArtistContentOverview } from '@/components/dashboard/artist-content-overview'
import { ArtistActionItems } from '@/components/dashboard/artist-action-items'
import { ArtistBusinessInsights } from '@/components/dashboard/artist-business-insights'
import { ArtistSmartRecommendations } from '@/components/dashboard/artist-smart-recommendations'
import { ArtistNotifications } from '@/components/dashboard/artist-notifications'
import { ArtistAnalyticsOverview } from '@/components/dashboard/artist-analytics-overview'
import { ArtistDashboardBottomSections } from '@/components/dashboard/artist-dashboard-bottom-sections'
import { DashboardContractsCard } from '@/components/dashboard/dashboard-contracts-card'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const floatingAnimation = {
  y: [0, -10, 0]
}

// Enhanced quick actions with better categorization
const quickActions = [
  { 
    title: "Upload Track", 
    icon: Upload, 
    color: "from-purple-500 via-fuchsia-500 to-pink-600", 
    href: "/artist/music",
    description: "Share your latest creation",
    category: "content"
  },
  { 
    title: "Create Event", 
    icon: CalendarIcon, 
    color: "from-blue-500 via-cyan-500 to-teal-600", 
    href: "/artist/events",
    description: "Plan your next show",
    category: "events"
  },
  { 
    title: "Messages", 
    icon: MessageSquare, 
    color: "from-green-500 via-emerald-500 to-teal-600", 
    href: "/artist/messages",
    description: "Connect with fans",
    category: "social"
  },
  { 
    title: "Analytics", 
    icon: BarChart2, 
    color: "from-pink-500 via-rose-500 to-red-600", 
    href: "/artist/business",
    description: "Track your performance",
    category: "business"
  }
]

const STATS_REFRESH_MS = 15 * 60 * 1000

export default function ArtistDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isRetrying, setIsRetrying] = useState(false)
  const { user: authUser } = useAuth()
  const { currentAccount, userAccounts, switchAccount } = useMultiAccount()
  const { user, profile, stats, isLoading, features, displayName, avatarInitial, syncArtistName, refreshStats } = useArtist()

  const artistPublicPath = useMemo(
    () => getArtistPublicProfilePath(profile?.artist_name),
    [profile?.artist_name]
  )

  function handleViewPublicProfile() {
    if (!artistPublicPath) {
      console.warn("[Artist Dashboard] View Public Profile: artist_name missing")
      return
    }
    console.log("[Artist Dashboard] Routing to public artist profile:", artistPublicPath)
    router.push(artistPublicPath)
  }
  
  // Real data state
  interface UpcomingEventItem {
    id: string
    title: string
    date: Date
    venue?: string
    city?: string
    status?: string
    ticketSales?: number
    capacity?: number
    revenue?: number
    type?: string
  }
  interface ContentItem {
    id: string
    title: string
    type: 'track' | 'video' | 'photo' | 'blog'
    plays?: number
    views?: number
    likes?: number
    uploadDate?: Date
    trend?: 'up' | 'down'
  }

  interface DynamicStat {
    title: string
    value: string
    change: string | null
    trend: 'up' | 'down' | 'neutral'
    icon: ComponentType<{ className?: string }>
    progress: number
    color: string
    glowColor: string
    dataSource: string
  }
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventItem[]>([])
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date | null>(null)

  // Check if we need to switch to artist account
  const artistAccount = userAccounts.find(acc => acc.account_type === 'artist')
  const isInArtistMode = currentAccount?.account_type === 'artist'

  function formatMetricValue(n: number, mode: 'currency' | 'compact' | 'percent'): string {
    if (mode === 'currency') {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
      return formatSafeCurrency(Math.round(n))
    }
    if (mode === 'percent') return `${Math.round(n * 10) / 10}%`
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return formatSafeNumber(Math.round(n))
  }

  // Metrics from `get_enhanced_artist_stats` / fallback counts only — no fabricated period-over-period deltas
  const dynamicStats = useMemo<DynamicStat[]>(
    () => [
      {
        title: "Total Revenue",
        value: formatMetricValue(stats.totalRevenue, "currency"),
        change: null,
        trend: "neutral",
        icon: DollarSign,
        progress: Math.min((stats.totalRevenue / 100000) * 100, 100),
        color: "from-emerald-400 via-teal-500 to-cyan-600",
        glowColor: "shadow-emerald-500/25",
        dataSource: "Aggregated from your connected data",
      },
      {
        title: "Total Fans",
        value: formatMetricValue(stats.totalFans, "compact"),
        change: null,
        trend: "neutral",
        icon: Users,
        progress: Math.min((stats.totalFans / 200000) * 100, 100),
        color: "from-blue-400 via-indigo-500 to-purple-600",
        glowColor: "shadow-blue-500/25",
        dataSource: "Social integrations & profile",
      },
      {
        title: "Streams",
        value: formatMetricValue(stats.totalStreams, "compact"),
        change: null,
        trend: "neutral",
        icon: Headphones,
        progress: Math.min((stats.totalStreams / 2000000) * 100, 100),
        color: "from-purple-400 via-fuchsia-500 to-pink-600",
        glowColor: "shadow-purple-500/25",
        dataSource: "Streaming integrations",
      },
      {
        title: "Engagement",
        value: formatMetricValue(stats.engagementRate, "percent"),
        change: null,
        trend: "neutral",
        icon: Heart,
        progress: Math.min(stats.engagementRate, 100),
        color: "from-pink-400 via-rose-500 to-red-600",
        glowColor: "shadow-pink-500/25",
        dataSource: "Social analytics",
      },
    ],
    [stats]
  )

  const isActiveEventStatus = (s?: string) =>
    s === "upcoming" || s === "in_progress"

  const eventsSource = upcomingEvents
  const upcomingEventsSummary = {
    total: eventsSource.length,
    confirmed: eventsSource.filter((e) => isActiveEventStatus(e.status)).length,
    pending: eventsSource.filter((e) => e.status === "postponed").length,
    totalRevenue: eventsSource.reduce((sum, e) => sum + (e.revenue || 0), 0),
    nextEvent: eventsSource[0],
  }

  const contentItems = recentContent
  const contentSummary = {
    totalTracks: stats.musicCount,
    totalVideos: stats.videoCount,
    totalPhotos: stats.photoCount,
    totalViews: contentItems.reduce((sum, c) => sum + (c.views || c.plays || 0), 0),
    totalLikes: contentItems.reduce((sum, c) => sum + (c.likes || 0), 0),
  }

  const topTrackTitle = useMemo(() => {
    const tracks = recentContent.filter((c) => c.type === "track")
    const top = tracks.sort((a, b) => (b.plays || 0) - (a.plays || 0))[0]
    return top?.title
  }, [recentContent])

  const topVideoTitle = useMemo(() => {
    const videos = recentContent.filter((c) => c.type === "video")
    const top = videos.sort((a, b) => (b.views || 0) - (a.views || 0))[0]
    return top?.title
  }, [recentContent])

  const analyticsData = useMemo(
    () => buildAnalyticsDataFromArtistStats(stats, { topTrackTitle, topVideoTitle }),
    [stats, topTrackTitle, topVideoTitle]
  )

  const dashboardActionItems = useMemo(
    () =>
      buildDashboardActionItems({
        profile,
        musicCount: stats.musicCount,
        eventCount: stats.eventCount,
      }),
    [profile, stats.musicCount, stats.eventCount]
  )

  // Handle account switching
  const handleSwitchToArtist = async () => {
    if (!artistAccount) {
      toast.error("No artist account found. Please create one first.")
      return
    }

    try {
      setIsRetrying(true)
      await switchAccount(artistAccount.profile_id, 'artist')
      toast.success("Switched to artist mode")
    } catch (error) {
      console.error("Error switching to artist account:", error)
      toast.error("Failed to switch to artist mode")
    } finally {
      setIsRetrying(false)
    }
  }

  // Auto-sync artist name if it's missing
  useEffect(() => {
    if (profile && !profile.artist_name && user && isInArtistMode) {
      console.log('Artist name is missing, attempting to sync...')
      syncArtistName()
    }
  }, [profile, user, syncArtistName, isInArtistMode])

  const loadDashboardLists = useCallback(async () => {
    if (!user?.id || !isInArtistMode) return
    try {
      const [events, music, videos, photos] = await Promise.all([
        artistContentService.getEvents(user.id, { upcoming: true, limit: 8, ownerScope: true }).catch(() => []),
        artistContentService.getMusic(user.id, { limit: 5, ownerScope: true }).catch(() => []),
        artistContentService.getVideos(user.id, { limit: 5, ownerScope: true }).catch(() => []),
        artistContentService.getPhotos(user.id, { limit: 5, ownerScope: true }).catch(() => []),
      ])

      const mappedEvents: UpcomingEventItem[] = (events || []).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        title: String(e.title),
        date: new Date(String(e.event_date)),
        venue: e.venue_name ? String(e.venue_name) : undefined,
        city: e.venue_city ? String(e.venue_city) : undefined,
        status: e.status ? String(e.status) : undefined,
        capacity: typeof e.capacity === "number" ? e.capacity : undefined,
        revenue: undefined,
        type: e.type ? String(e.type) : undefined,
      }))
      setUpcomingEvents(mappedEvents.slice(0, 8))

      const mappedContent: ContentItem[] = [
        ...(music || []).map((m: Record<string, unknown>) => ({
          id: String(m.id),
          title: String(m.title),
          type: "track" as const,
          plays: (m.metadata as Record<string, number> | undefined)?.plays ?? 0,
          likes: (m.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: m.created_at ? new Date(String(m.created_at)) : undefined,
          trend: "up" as const,
        })),
        ...(videos || []).map((v: Record<string, unknown>) => ({
          id: String(v.id),
          title: String(v.title),
          type: "video" as const,
          views: (v.metadata as Record<string, number> | undefined)?.views ?? 0,
          likes: (v.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: v.created_at ? new Date(String(v.created_at)) : undefined,
          trend: "up" as const,
        })),
        ...(photos || []).map((p: Record<string, unknown>) => ({
          id: String(p.id),
          title: p.title ? String(p.title) : "Photo",
          type: "photo" as const,
          views: (p.metadata as Record<string, number> | undefined)?.views ?? 0,
          likes: (p.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: p.created_at ? new Date(String(p.created_at)) : undefined,
          trend: "down" as const,
        })),
      ]

      setRecentContent(mappedContent.slice(0, 6))
      setLastDashboardRefresh(new Date())
    } catch (err) {
      console.error("Error loading dashboard data:", err)
    }
  }, [user?.id, isInArtistMode])

  useEffect(() => {
    loadDashboardLists()
  }, [loadDashboardLists])

  useEffect(() => {
    if (!user?.id || !isInArtistMode) return
    const id = window.setInterval(() => {
      refreshStats()
      loadDashboardLists()
    }, STATS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [user?.id, isInArtistMode, refreshStats, loadDashboardLists])

  // Show account switching prompt if not in artist mode
  if (!isInArtistMode && artistAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm max-w-md rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Music className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Switch to Artist Mode</h2>
              <p className="text-gray-400">
                You're currently in {currentAccount?.account_type || 'general'} mode. 
                Switch to your artist account to access the full dashboard.
              </p>
            </div>
            
            <Button 
              onClick={handleSwitchToArtist}
              disabled={isRetrying}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Switch to Artist Mode
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Artist Dashboard</h2>
          <p className="text-gray-400">Setting up your music career hub...</p>
        </div>
      </div>
    )
  }

  // Show error state if no artist account exists
  if (!artistAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm max-w-md rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Artist Account</h2>
              <p className="text-gray-400">
                You don't have an artist account set up yet. Create one to access the artist dashboard.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Link href="/create?type=artist">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Artist Account
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"
          animate={floatingAnimation}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"
          animate={{
            y: [0, -10, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="relative z-10 p-6 lg:p-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-purple-500/20">
                <AvatarImage src={profile?.social_links?.avatar} />
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Welcome back, {displayName}!
                </h1>
                <p className="text-gray-400">
                  Ready to make some music magic today?
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewPublicProfile}
                disabled={!artistPublicPath}
                className="border-slate-700 text-gray-300 hover:text-white disabled:opacity-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Public Profile
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refreshStats()
                  void loadDashboardLists()
                }}
                className="border-slate-700 text-gray-300 hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {lastDashboardRefresh && (
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Lists updated {format(lastDashboardRefresh, "HH:mm")}
                </span>
              )}
              <Button asChild variant="outline" size="sm" className="border-slate-700 text-gray-300 hover:text-white">
                <Link href="/artist/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search your content, events, or analytics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
            />
          </div>
        </motion.div>

        {/* Profile Completion Alert */}
        {profile && (!profile.bio || !profile.genres || !profile.artist_name) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <span>Complete your artist profile to get discovered by more fans and industry professionals.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 self-start lg:self-center"
                  asChild
                >
                  <Link href="/artist/profile">Complete Profile</Link>
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {dynamicStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300 group rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-r ${stat.color} ${stat.glowColor}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      {stat.change ? (
                        <>
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                      ) : stat.trend === "down" ? (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-400" />
                      )}
                          <span
                            className={`text-sm font-medium ${
                          stat.trend === "up"
                            ? "text-green-400"
                            : stat.trend === "down"
                              ? "text-red-400"
                              : "text-gray-400"
                            }`}
                          >
                            {stat.change}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Live aggregate</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                    <p className="text-gray-400 text-sm">{stat.title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">{Math.round(stat.progress)}%</span>
                    </div>
                    <Progress value={stat.progress} className="h-2" />
                    <p className="text-xs text-gray-500">{stat.dataSource}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Scheduled Events & Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Scheduled Events Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-blue-400" />
                        Scheduled Events
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Your upcoming performances and events
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="border-slate-700 text-gray-300 hover:text-white">
                      <Link href="/artist/events">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        View All
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {upcomingEventsSummary.total > 0 ? (
                    <div className="space-y-4">
                      {/* Next Event Highlight */}
                      {upcomingEventsSummary.nextEvent && (
                        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500/20 rounded-2xl">
                                <CalendarIcon className="h-5 w-5 text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">Next Event</h3>
                                <p className="text-sm text-gray-400">
                                  {isToday(upcomingEventsSummary.nextEvent.date) ? 'Today' : 
                                   isTomorrow(upcomingEventsSummary.nextEvent.date) ? 'Tomorrow' :
                                   `in ${differenceInDays(upcomingEventsSummary.nextEvent.date, new Date())} days`}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {upcomingEventsSummary.nextEvent.status}
                            </Badge>
                          </div>
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {upcomingEventsSummary.nextEvent.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {[upcomingEventsSummary.nextEvent.venue, upcomingEventsSummary.nextEvent.city]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {upcomingEventsSummary.nextEvent.ticketSales != null &&
                              upcomingEventsSummary.nextEvent.capacity != null
                                ? `${upcomingEventsSummary.nextEvent.ticketSales}/${upcomingEventsSummary.nextEvent.capacity}`
                                : "Tickets: —"}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {upcomingEventsSummary.nextEvent.revenue != null &&
                              upcomingEventsSummary.nextEvent.revenue > 0
                                ? formatSafeCurrency(upcomingEventsSummary.nextEvent.revenue)
                                : "Revenue: —"}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Events Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-slate-800/50 rounded-2xl">
                          <div className="text-2xl font-bold text-blue-400">{upcomingEventsSummary.total}</div>
                          <div className="text-sm text-gray-400">Total Events</div>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <div className="text-2xl font-bold text-green-400">{upcomingEventsSummary.confirmed}</div>
                          <div className="text-sm text-gray-400">Active</div>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-400">{upcomingEventsSummary.pending}</div>
                          <div className="text-sm text-gray-400">Postponed</div>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-400">
                            {upcomingEventsSummary.totalRevenue > 0
                              ? `$${(upcomingEventsSummary.totalRevenue / 1000).toFixed(1)}K`
                              : "—"}
                          </div>
                          <div className="text-sm text-gray-400">Projected Revenue</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">No upcoming events scheduled</p>
                      <Button asChild className="bg-purple-600 hover:bg-purple-700">
                        <Link href="/artist/events">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Event
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Content Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        Content Performance
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        How your content is performing
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="border-slate-700 text-gray-300 hover:text-white">
                      <Link href="/artist/content">
                        <Eye className="h-4 w-4 mr-2" />
                        View All
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">{contentSummary.totalTracks}</div>
                      <div className="text-sm text-gray-400">Tracks</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{contentSummary.totalVideos}</div>
                      <div className="text-sm text-gray-400">Videos</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{contentSummary.totalPhotos}</div>
                      <div className="text-sm text-gray-400">Photos</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-pink-400">
                        {contentSummary.totalViews >= 1000
                          ? `${(contentSummary.totalViews / 1000).toFixed(1)}K`
                          : formatSafeNumber(contentSummary.totalViews)}
                      </div>
                      <div className="text-sm text-gray-400">Total Views</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {contentItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">
                        No recent content rows yet. Upload tracks or media to see performance here.
                      </p>
                    ) : (
                      contentItems.map((content) => (
                      <div key={content.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-700/50 rounded-lg">
                            {content.type === 'track' && <Music className="h-4 w-4 text-purple-400" />}
                            {content.type === 'video' && <Video className="h-4 w-4 text-blue-400" />}
                            {content.type === 'photo' && <ImageIcon className="h-4 w-4 text-green-400" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{content.title}</h4>
                            <p className="text-sm text-gray-400">
                              {content.type === "track"
                                ? `${formatSafeNumber(content.plays ?? 0)} plays`
                                : `${formatSafeNumber(content.views ?? 0)} views`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 text-red-400" />
                            {content.likes ?? 0}
                          </div>
                          {content.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Quick Actions & Action Items */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Fast access to your most used features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.title}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link href={action.href}>
                          <Card className="bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 cursor-pointer group rounded-2xl">
                            <CardContent className="p-4 text-center">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${action.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                <action.icon className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="font-semibold text-white text-sm mb-1">{action.title}</h3>
                              <p className="text-gray-400 text-xs">{action.description}</p>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Action Items */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-400" />
                    Action Items
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Tasks that need your attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardActionItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">You&apos;re caught up.</p>
                    ) : (
                      dashboardActionItems.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href ?? "/artist/profile"}
                        className="block"
                      >
                      <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className={`p-2 rounded-lg ${
                          item.priority === 'high' ? 'bg-red-500/20' :
                          item.priority === 'medium' ? 'bg-yellow-500/20' :
                          'bg-blue-500/20'
                        }`}>
                          <Bell className={`h-4 w-4 ${
                            item.priority === 'high' ? 'text-red-400' :
                            item.priority === 'medium' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white text-sm">{item.title}</h4>
                          <p className="text-gray-400 text-xs mb-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={`text-xs ${
                              item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {item.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Due {format(item.dueDate, 'MMM d')}
                            </span>
                          </div>
                        </div>
                      </div>
                      </Link>
                    ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {user?.id && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <DashboardContractsCard userId={user.id} />
              </motion.div>
            )}

            {/* Business Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Business Insights
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Key metrics and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Revenue</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {stats.totalRevenue > 0
                          ? `Reported revenue: ${formatMetricValue(stats.totalRevenue, "currency")} (from your connected data).`
                          : "No revenue recorded yet. Connect business integrations or add ticket links to events."}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Audience</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {stats.totalFans > 0
                          ? `You have ${formatSafeNumber(stats.totalFans)} fans across connected platforms.`
                          : "Grow your audience by connecting social accounts in settings."}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-400">Events</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {upcomingEvents.length > 0
                          ? `You have ${upcomingEvents.length} upcoming event(s) on your calendar.`
                          : "No upcoming events. Create one to promote releases and shows."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {user?.id && (
          <ArtistDashboardBottomSections
            userId={user.id}
            sections={{
              recommendations: (
                <ArtistSmartRecommendations
                  artistStats={stats}
                  profileFlags={{
                    hasBio: Boolean(profile?.bio),
                    hasGenres: Boolean(profile?.genres?.length),
                    hasArtistName: Boolean(profile?.artist_name),
                  }}
                  recentContent={recentContent.map((c) => ({
                    id: c.id,
                    title: c.title,
                    type: c.type,
                    views: c.views ?? c.plays ?? 0,
                    likes: c.likes ?? 0,
                    shares: 0,
                    createdAt: (c.uploadDate ?? new Date()).toISOString(),
                  }))}
                  upcomingEvents={upcomingEvents.map((e) => ({
                    id: e.id,
                    title: e.title,
                    date: e.date.toISOString(),
                    venue: e.venue,
                    ticketSales: e.ticketSales,
                    capacity: e.capacity,
                  }))}
                />
              ),
              analytics: <ArtistAnalyticsOverview data={analyticsData} timeRange="30d" />,
              notifications: <ArtistNotifications userId={user.id} />,
            }}
          />
        )}
      </div>
    </div>
  )
}