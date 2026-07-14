'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  DollarSign,
  Headphones,
  Heart,
  Loader2,
  Music,
  Plus,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useArtist } from '@/contexts/artist-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { getArtistPublicProfilePath } from '@/lib/utils/public-profile-routes'
import { artistContentService } from '@/lib/services/artist-content.service'
import { buildAnalyticsDataFromArtistStats } from '@/lib/artist/build-analytics-from-stats'
import { buildDashboardActionItems } from '@/lib/artist/build-action-items'
import { selectArtistDashboardEvents } from '@/lib/artist/dashboard-upcoming-events'
import { formatSafeCurrency, formatSafeNumber } from '@/lib/format/number-format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils'

import { ArtistDashboardHeader } from '@/components/dashboard/artist-dashboard-header'
import { ArtistAttentionStrip, type AttentionChip } from '@/components/dashboard/artist-attention-strip'
import { ArtistWorkflowLaunchpad } from '@/components/dashboard/artist-workflow-launchpad'
import { ArtistEventsOverview } from '@/components/dashboard/artist-events-overview'
import { ArtistContentOverview } from '@/components/dashboard/artist-content-overview'
import { ArtistActionItems } from '@/components/dashboard/artist-action-items'
import { ArtistSmartRecommendations } from '@/components/dashboard/artist-smart-recommendations'
import { ArtistNotifications } from '@/components/dashboard/artist-notifications'
import { ArtistAnalyticsOverview } from '@/components/dashboard/artist-analytics-overview'
import { ArtistDashboardBottomSections } from '@/components/dashboard/artist-dashboard-bottom-sections'
import { DashboardContractsCard } from '@/components/dashboard/dashboard-contracts-card'
import {
  ARTIST_CARD,
  ARTIST_CARD_INTERACTIVE,
  ARTIST_ICON_WELL,
  ARTIST_INSET,
  ARTIST_MUTED,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
  ARTIST_PROGRESS_FILL,
  ARTIST_PROGRESS_TRACK,
  ARTIST_SECTION_SPACING,
  ARTIST_STAT_GRID,
} from '@/components/dashboard/artist-tokens'

const STATS_REFRESH_MS = 15 * 60 * 1000

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
  ticketUrl?: string
  slug?: string
  startTime?: string
  bucket?: 'upcoming' | 'needs_date' | 'recent'
}

interface ContentItem {
  id: string
  title: string
  type: 'track' | 'video' | 'photo' | 'blog'
  plays?: number
  views?: number
  likes?: number
  uploadDate?: Date
}

interface DynamicStat {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
  progress: number
  href: string
}

function mapEventStatus(status?: string): 'confirmed' | 'pending' | 'draft' | 'cancelled' {
  if (status === 'published' || status === 'upcoming' || status === 'in_progress' || status === 'confirmed') return 'confirmed'
  if (status === 'postponed' || status === 'pending') return 'pending'
  if (status === 'cancelled') return 'cancelled'
  return 'draft'
}

function mapEventType(type?: string): 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other' {
  if (type === 'concert' || type === 'festival' || type === 'tour' || type === 'recording' || type === 'interview')
    return type
  return 'other'
}

function computeProfileCompletion(profile: {
  artist_name?: string | null
  bio?: string | null
  genres?: string[] | null
  url_slug?: string | null
} | null): number {
  if (!profile) return 0
  const checks = [
    Boolean(profile.artist_name),
    Boolean(profile.bio),
    Boolean(profile.genres?.length),
    Boolean(profile.url_slug),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function ArtistPageClient() {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const { currentAccount, userAccounts, switchAccount } = useMultiAccount()
  const { user, profile, publicProfile, stats, isLoading, displayName, avatarInitial, syncArtistName, refreshStats } = useArtist()

  const artistPublicPath = useMemo(
    () => getArtistPublicProfilePath(profile?.url_slug || profile?.artist_name),
    [profile?.url_slug, profile?.artist_name]
  )

  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date | null>(null)
  const [hasEpk, setHasEpk] = useState<boolean | undefined>(undefined)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [commerceHealth, setCommerceHealth] = useState({
    totalListings: 0,
    publishedListings: 0,
    draftListings: 0,
    missingImages: 0,
    lowInventory: 0,
    stripeConnected: false,
    agreementAccepted: false,
    grossRevenue30d: 0,
    paidOrders30d: 0,
    isLoading: true,
  })

  const artistAccount = userAccounts.find(
    (acc) => acc.account_type === 'artist' || acc.account_type === 'service'
  )
  const isInArtistMode =
    currentAccount?.account_type === 'artist' || currentAccount?.account_type === 'service'

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

  const dynamicStats = useMemo<DynamicStat[]>(
    () => [
      {
        title: 'Total Revenue',
        value: formatMetricValue(stats.totalRevenue, 'currency'),
        icon: DollarSign,
        progress: Math.min((stats.totalRevenue / 100000) * 100, 100),
        href: '/artist/business',
      },
      {
        title: 'Total Fans',
        value: formatMetricValue(stats.totalFans, 'compact'),
        icon: Users,
        progress: Math.min((stats.totalFans / 200000) * 100, 100),
        href: '/artist/community',
      },
      {
        title: 'Streams',
        value: formatMetricValue(stats.totalStreams, 'compact'),
        icon: Headphones,
        progress: Math.min((stats.totalStreams / 2000000) * 100, 100),
        href: '/artist/music',
      },
      {
        title: 'Engagement',
        value: formatMetricValue(stats.engagementRate, 'percent'),
        icon: Heart,
        progress: Math.min(stats.engagementRate, 100),
        href: '/artist/business/analytics',
      },
    ],
    [stats]
  )

  const profileCompletion = useMemo(() => computeProfileCompletion(profile), [profile])

  const topTrackTitle = useMemo(() => {
    const tracks = recentContent.filter((c) => c.type === 'track')
    const top = tracks.sort((a, b) => (b.plays || 0) - (a.plays || 0))[0]
    return top?.title
  }, [recentContent])

  const topVideoTitle = useMemo(() => {
    const videos = recentContent.filter((c) => c.type === 'video')
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
        hasEpk,
        stripeConnected: commerceHealth.isLoading ? undefined : commerceHealth.stripeConnected,
        agreementAccepted: commerceHealth.isLoading ? undefined : commerceHealth.agreementAccepted,
      }),
    [
      profile,
      stats.musicCount,
      stats.eventCount,
      hasEpk,
      commerceHealth.isLoading,
      commerceHealth.stripeConnected,
      commerceHealth.agreementAccepted,
    ]
  )

  const actionItemsForWidget = useMemo(
    () =>
      dashboardActionItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        type: item.type,
        status: 'pending' as const,
        actionUrl: item.href,
      })),
    [dashboardActionItems]
  )

  const eventsForWidget = useMemo(
    () =>
      upcomingEvents.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        venue: event.venue || 'TBA',
        city: event.city || '',
        status: mapEventStatus(event.status),
        ticketSales: event.ticketSales || 0,
        capacity: event.capacity || 0,
        revenue: event.revenue || 0,
        type: mapEventType(event.type),
        ticketUrl: event.ticketUrl,
        slug: event.slug,
        startTime: event.startTime,
        bucket: event.bucket || 'upcoming',
      })),
    [upcomingEvents]
  )

  const contentForWidget = useMemo(
    () =>
      recentContent.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        plays: item.plays,
        views: item.views,
        likes: item.likes || 0,
        shares: 0,
        uploadDate: item.uploadDate || new Date(),
        trend: 'stable' as const,
        status: 'published' as const,
      })),
    [recentContent]
  )

  const contentSummary = useMemo(
    () => ({
      totalTracks: stats.musicCount,
      totalVideos: stats.videoCount,
      totalPhotos: stats.photoCount,
      totalBlogs: 0,
      totalViews: recentContent.reduce((sum, c) => sum + (c.views || c.plays || 0), 0),
      totalLikes: recentContent.reduce((sum, c) => sum + (c.likes || 0), 0),
      totalShares: 0,
      engagementRate: stats.engagementRate,
    }),
    [stats, recentContent]
  )

  const commerceBlockers = useMemo(() => {
    let count = 0
    if (!commerceHealth.stripeConnected) count += 1
    if (!commerceHealth.agreementAccepted) count += 1
    if (commerceHealth.missingImages > 0) count += 1
    if (commerceHealth.lowInventory > 0) count += 1
    return count
  }, [commerceHealth])

  const attentionChips = useMemo<AttentionChip[]>(() => {
    const chips: AttentionChip[] = []
    if (dashboardActionItems.length > 0) {
      chips.push({
        id: 'actions',
        label: 'Action items',
        count: dashboardActionItems.length,
        tone: dashboardActionItems.some((i) => i.priority === 'high') ? 'critical' : 'warning',
        targetId: 'needs-attention',
      })
    }
    if (unreadNotifications > 0) {
      chips.push({
        id: 'notifications',
        label: 'Unread',
        count: unreadNotifications,
        tone: 'warning',
        targetId: 'bottom-insights',
      })
    }
    if (!commerceHealth.isLoading && commerceBlockers > 0) {
      chips.push({
        id: 'commerce',
        label: 'Store blockers',
        count: commerceBlockers,
        tone: 'critical',
        targetId: 'needs-attention',
      })
    }
    if (chips.length === 0) {
      chips.push({
        id: 'actions',
        label: 'All clear',
        count: 0,
        tone: 'ok',
        targetId: 'workflows',
      })
    }
    return chips
  }, [dashboardActionItems, unreadNotifications, commerceHealth.isLoading, commerceBlockers])

  function handleViewPublicProfile() {
    if (!artistPublicPath) return
    router.push(artistPublicPath)
  }

  function handleChipClick(targetId: string) {
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSwitchToArtist() {
    if (!artistAccount) {
      toast.error('No artist account found. Please create one first.')
      return
    }
    try {
      setIsRetrying(true)
      await switchAccount(artistAccount.profile_id, artistAccount.account_type)
      toast.success('Switched to artist mode')
    } catch (error) {
      console.error('Error switching to artist account:', error)
      toast.error('Failed to switch to artist mode')
    } finally {
      setIsRetrying(false)
    }
  }

  const loadDashboardLists = useCallback(async () => {
    // Events API is cookie-auth — do not block on client artist-context user hydration.
    if (!isInArtistMode) {
      setEventsLoading(false)
      return
    }
    setEventsLoading(true)
    try {
      const contentUserId = user?.id
      const [eventsResult, music, videos, photos] = await Promise.all([
        fetch('/api/artist/events', { credentials: 'include', cache: 'no-store' })
          .then(async (response) => {
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(payload?.error || 'Failed to load events')
            return Array.isArray(payload.events) ? payload.events : []
          })
          .catch((error) => {
            console.error('Failed to load dashboard events:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to load events')
            return null
          }),
        contentUserId
          ? artistContentService.getMusic(contentUserId, { limit: 5, ownerScope: true }).catch(() => [])
          : Promise.resolve([]),
        contentUserId
          ? artistContentService.getVideos(contentUserId, { limit: 5, ownerScope: true }).catch(() => [])
          : Promise.resolve([]),
        contentUserId
          ? artistContentService.getPhotos(contentUserId, { limit: 5, ownerScope: true }).catch(() => [])
          : Promise.resolve([]),
      ])

      if (eventsResult) {
        setUpcomingEvents(selectArtistDashboardEvents(eventsResult, { limit: 8 }))
      }

      const mappedContent: ContentItem[] = [
        ...(music || []).map((m: Record<string, unknown>) => ({
          id: String(m.id),
          title: String(m.title),
          type: 'track' as const,
          plays: (m.metadata as Record<string, number> | undefined)?.plays ?? 0,
          likes: (m.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: m.created_at ? new Date(String(m.created_at)) : undefined,
        })),
        ...(videos || []).map((v: Record<string, unknown>) => ({
          id: String(v.id),
          title: String(v.title),
          type: 'video' as const,
          views: (v.metadata as Record<string, number> | undefined)?.views ?? 0,
          likes: (v.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: v.created_at ? new Date(String(v.created_at)) : undefined,
        })),
        ...(photos || []).map((p: Record<string, unknown>) => ({
          id: String(p.id),
          title: p.title ? String(p.title) : 'Photo',
          type: 'photo' as const,
          views: (p.metadata as Record<string, number> | undefined)?.views ?? 0,
          likes: (p.metadata as Record<string, number> | undefined)?.likes ?? 0,
          uploadDate: p.created_at ? new Date(String(p.created_at)) : undefined,
        })),
      ]
      setRecentContent(mappedContent.slice(0, 6))
      setLastDashboardRefresh(new Date())
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setEventsLoading(false)
    }
  }, [user?.id, isInArtistMode])

  const loadCommerceHealth = useCallback(async () => {
    if (!user?.id || !isInArtistMode) return
    try {
      const [listingsRes, connectRes, storefrontRes, analyticsRes] = await Promise.all([
        fetch('/api/marketplace/listings?includeDrafts=true', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/stripe/connect', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/marketplace/storefront', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/marketplace/analytics?range=30d', { credentials: 'include', cache: 'no-store' }),
      ])
      const [listingsJson, connectJson, storefrontJson, analyticsJson] = await Promise.all([
        listingsRes.json().catch(() => ({ data: [] })),
        connectRes.json().catch(() => ({})),
        storefrontRes.json().catch(() => ({ data: null })),
        analyticsRes.json().catch(() => ({ data: null })),
      ])
      const listings = Array.isArray(listingsJson.data) ? listingsJson.data : []
      setCommerceHealth({
        totalListings: listings.length,
        publishedListings: listings.filter((listing: { status?: string }) => listing.status === 'published').length,
        draftListings: listings.filter((listing: { status?: string }) => listing.status === 'draft').length,
        missingImages: listings.filter((listing: { cover_image_url?: string }) => !listing.cover_image_url).length,
        lowInventory: listings.filter(
          (listing: { has_unlimited_inventory?: boolean; inventory_count?: number | null }) =>
            !listing.has_unlimited_inventory &&
            listing.inventory_count !== null &&
            Number(listing.inventory_count) <= 3
        ).length,
        stripeConnected: Boolean(connectJson.chargesEnabled),
        agreementAccepted: Boolean(storefrontJson.data?.accepted_seller_agreement_at),
        grossRevenue30d: Number(analyticsJson.data?.grossRevenue || 0),
        paidOrders30d: Number(analyticsJson.data?.paidOrders || 0),
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading commerce health:', error)
      setCommerceHealth((prev) => ({ ...prev, isLoading: false }))
    }
  }, [user?.id, isInArtistMode])

  const loadAccountSignals = useCallback(async () => {
    if (!user?.id || !isInArtistMode) return
    try {
      const [epkRes, notifRes] = await Promise.all([
        supabase.from('artist_epk_settings').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ])
      setHasEpk(Boolean(epkRes.data?.id))
      setUnreadNotifications(notifRes.count || 0)
    } catch (error) {
      console.error('Error loading account signals:', error)
      setHasEpk(false)
    }
  }, [user?.id, isInArtistMode])

  useEffect(() => {
    if (profile && !profile.artist_name && user && isInArtistMode) syncArtistName()
  }, [profile, user, syncArtistName, isInArtistMode])

  useEffect(() => {
    loadDashboardLists()
    loadCommerceHealth()
    loadAccountSignals()
  }, [loadDashboardLists, loadCommerceHealth, loadAccountSignals])

  useEffect(() => {
    if (!user?.id || !isInArtistMode) return
    const id = window.setInterval(() => {
      refreshStats()
      loadDashboardLists()
      loadCommerceHealth()
      loadAccountSignals()
    }, STATS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [user?.id, isInArtistMode, refreshStats, loadDashboardLists, loadCommerceHealth, loadAccountSignals])

  if (!isInArtistMode && artistAccount) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <Card className={cn(ARTIST_CARD, 'max-w-md')}>
          <CardContent className="p-8 text-center">
            <div className={cn(ARTIST_ICON_WELL, 'mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center')}>
              <Music className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">Switch to Artist Mode</h2>
            <p className={cn(ARTIST_MUTED, 'mb-6')}>
              You&apos;re currently in {currentAccount?.account_type || 'general'} mode. Switch to your
              artist account to access the dashboard.
            </p>
            <Button
              onClick={handleSwitchToArtist}
              disabled={isRetrying}
              className={cn(ARTIST_PRIMARY_BTN, 'w-full')}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Switch to Artist Mode
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-purple-400" />
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">Loading Artist Dashboard</h2>
          <p className={ARTIST_MUTED}>Setting up your account command center...</p>
        </div>
      </div>
    )
  }

  if (!artistAccount) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <Card className={cn(ARTIST_CARD, 'max-w-md')}>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">No Artist Account</h2>
            <p className={cn(ARTIST_MUTED, 'mb-6')}>
              You don&apos;t have an artist account set up yet. Create one to access the artist dashboard.
            </p>
            <div className="space-y-3">
              <Button asChild className={cn(ARTIST_PRIMARY_BTN, 'w-full')}>
                <Link href="/create?type=artist">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Artist Account
                </Link>
              </Button>
              <Button variant="outline" asChild className={cn(ARTIST_OUTLINE_BTN, 'w-full')}>
                <Link href="/">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const commerceHealthItems = [
    {
      id: 'stripe',
      label: commerceHealth.stripeConnected ? 'Stripe payouts connected' : 'Connect Stripe payouts',
      ok: commerceHealth.stripeConnected,
      href: '/artist/store?tab=payments',
    },
    {
      id: 'agreement',
      label: commerceHealth.agreementAccepted ? 'Seller agreement accepted' : 'Accept seller agreement',
      ok: commerceHealth.agreementAccepted,
      href: '/artist/store',
    },
    {
      id: 'published',
      label:
        commerceHealth.publishedListings > 0
          ? `${commerceHealth.publishedListings} published listing${commerceHealth.publishedListings === 1 ? '' : 's'}`
          : 'Publish your first listing',
      ok: commerceHealth.publishedListings > 0,
      href: '/artist/store?tab=listings',
    },
    {
      id: 'images',
      label:
        commerceHealth.missingImages === 0
          ? 'All listings have images'
          : `${commerceHealth.missingImages} listing${commerceHealth.missingImages === 1 ? '' : 's'} need images`,
      ok: commerceHealth.missingImages === 0,
      href: '/artist/store?tab=listings',
    },
  ]

  return (
    <div className="relative mx-auto max-w-7xl text-white">
      <div className={ARTIST_SECTION_SPACING}>
        <ArtistDashboardHeader
          displayName={displayName}
          avatarInitial={avatarInitial}
          avatarUrl={publicProfile?.avatar_url || profile?.social_links?.avatar}
          profileCompletion={profileCompletion}
          artistPublicPath={artistPublicPath}
          lastRefreshLabel={lastDashboardRefresh ? format(lastDashboardRefresh, 'HH:mm') : null}
          onViewPublicProfile={handleViewPublicProfile}
          onRefresh={() => {
            void refreshStats()
            void loadDashboardLists()
            void loadCommerceHealth()
            void loadAccountSignals()
          }}
        />

        <ArtistAttentionStrip chips={attentionChips} onChipClick={handleChipClick} />

        <section className={cn(ARTIST_STAT_GRID, 'mb-2')}>
          {dynamicStats.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <div className={cn(ARTIST_CARD_INTERACTIVE, 'p-5')}>
                <div className="mb-3 flex items-center justify-between">
                  <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-10 w-10 items-center justify-center')}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
                <h3 className="mb-0.5 text-2xl font-bold tracking-tight text-white">{stat.value}</h3>
                <p className="mb-3 text-sm text-slate-400">{stat.title}</p>
                <div className={ARTIST_PROGRESS_TRACK}>
                  <div
                    className={ARTIST_PROGRESS_FILL}
                    style={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2" id="next-up">
            <ArtistEventsOverview
              events={eventsForWidget}
              isLoading={eventsLoading}
              onCreateEvent={() => router.push('/artist/events/create')}
              onViewAll={() => router.push('/artist/events')}
            />
            <ArtistContentOverview
              content={contentForWidget}
              summary={contentSummary}
              onUploadContent={() => router.push('/artist/music/upload')}
              onViewAll={() => router.push('/artist/content')}
            />
          </div>

          <div className="space-y-6" id="needs-attention">
            <ArtistActionItems items={actionItemsForWidget} />

            <Card className={ARTIST_CARD}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 tracking-tight text-white">
                  <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  Commerce Health
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Store readiness and payout status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {commerceHealth.isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  </div>
                ) : (
                  commerceHealthItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        ARTIST_INSET,
                        'flex items-center justify-between px-3 py-2.5 transition-colors hover:border-purple-500/30'
                      )}
                    >
                      <span className="text-sm text-slate-200">{item.label}</span>
                      {item.ok ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Badge className="border-0 bg-amber-500/20 text-amber-300">Fix</Badge>
                      )}
                    </Link>
                  ))
                )}
                <Button asChild variant="outline" size="sm" className={cn(ARTIST_OUTLINE_BTN, 'mt-2 w-full')}>
                  <Link href="/artist/store">Open Store</Link>
                </Button>
              </CardContent>
            </Card>

            {user?.id && <DashboardContractsCard userId={user.id} />}
          </div>
        </div>

        <div id="workflows">
          <ArtistWorkflowLaunchpad />
        </div>

        <div id="bottom-insights">
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
    </div>
  )
}
