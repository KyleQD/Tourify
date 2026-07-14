"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useArtist } from "@/contexts/artist-context"
import {
  Music2,
  Video,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Clock,
  Eye,
  Upload,
  Zap,
  BarChart3,
  Share2,
  Download,
  Link2,
} from "lucide-react"
import { CrossPlatformComposer } from '@/components/cross-platform/cross-platform-composer'
import { SocialIntegrationsManager } from '@/components/social/social-integrations-manager'
import { ArtistAnalyticsOverview } from '@/components/dashboard/artist-analytics-overview'
import { ScheduledPostsPanel } from '@/components/cross-platform/scheduled-posts-panel'
import { HashtagGroupsPanel } from '@/components/cross-platform/hashtag-groups-panel'
import { CrossPlatformAnalyticsOverview } from '@/components/cross-platform/analytics-overview'
import { ContentSocialLinksPanel } from '@/components/artist/content-social-links-panel'
import { ContentAttentionInbox } from '@/components/artist/content-attention-inbox'
import { buildAnalyticsDataFromArtistStats } from '@/lib/artist/build-analytics-from-stats'
import { downloadContentHubAnalyticsCsv } from '@/lib/artist/download-content-hub-analytics-csv'
import { useSocialIntegrations } from '@/hooks/use-social-integrations'
import { useCrossPlatformPosting } from '@/hooks/use-cross-platform-posting'
import { ARTIST_PRIMARY_BTN } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ContentHubOverviewResponse } from '@/app/api/artist/content/overview/route'

type HubTab = 'overview' | 'compose' | 'socials' | 'analytics'

interface ContentFeature {
  label: string
  icon: any
  href?: string
  tab?: HubTab
  postType?: 'video' | 'image'
  description: string
  color: string
  stats: { total: number; recent: number }
  statsLabel?: string
  category: string
}

const staticFeatures: Omit<ContentFeature, 'stats'>[] = [
  {
    label: "Music",
    icon: Music2,
    href: "/artist/music",
    description: "Upload and manage your tracks",
    color: "from-purple-500 to-violet-600",
    category: "media"
  },
  {
    label: "Videos",
    icon: Video,
    tab: "compose",
    postType: "video",
    description: "Compose and schedule video posts",
    color: "from-blue-500 to-cyan-600",
    category: "media",
    statsLabel: "Open compose",
  },
  {
    label: "Photos",
    icon: ImageIcon,
    tab: "compose",
    postType: "image",
    description: "Compose and schedule photo posts",
    color: "from-green-500 to-emerald-600",
    category: "media",
    statsLabel: "Open compose",
  },
  {
    label: "Blog",
    icon: FileText,
    href: "/artist/features/blog",
    description: "Create and manage blog posts",
    color: "from-orange-500 to-red-600",
    category: "content"
  },
  {
    label: "Press Kit",
    icon: FileSpreadsheet,
    href: "/artist/epk",
    description: "Build your EPK",
    color: "from-indigo-500 to-purple-600",
    category: "business",
    statsLabel: "Open EPK",
  },
  {
    label: "Socials",
    icon: Share2,
    tab: "socials",
    description: "Public links and connected accounts",
    color: "from-pink-500 to-rose-600",
    category: "showcase"
  },
]

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return `${n}`
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const VALID_TABS = new Set<HubTab>(['overview', 'compose', 'socials', 'analytics'])

function ContentFeatureCard({
  feature,
  index,
  onOpenCompose,
  onOpenTab,
}: {
  feature: ContentFeature
  index: number
  onOpenCompose: (opts?: { postType?: 'video' | 'image' }) => void
  onOpenTab: (tab: HubTab) => void
}) {
  const inner = (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-lg group-hover:shadow-purple-500/10 h-full rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            {feature.stats.recent > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                +{feature.stats.recent} new
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
            {feature.label}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {feature.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {feature.statsLabel || `${feature.stats.total} items`}
          </span>
          <span className="text-purple-400 group-hover:text-purple-300 transition-colors">
            Open →
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {feature.href ? (
        <Link href={feature.href} className="block group focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl">
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          className="block w-full text-left group focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl"
          onClick={() => {
            if (feature.tab === 'compose') onOpenCompose({ postType: feature.postType })
            else if (feature.tab) onOpenTab(feature.tab)
          }}
        >
          {inner}
        </button>
      )}
    </motion.div>
  )
}

function ContentDashboardInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: HubTab = VALID_TABS.has(tabParam as HubTab) ? (tabParam as HubTab) : 'overview'

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [marketplaceMerchandiseRevenue, setMarketplaceMerchandiseRevenue] = useState(0)
  const [overview, setOverview] = useState<ContentHubOverviewResponse | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const { stats } = useArtist()
  const { integrations, reload: reloadIntegrations } = useSocialIntegrations()
  const { scheduledPosts } = useCrossPlatformPosting({ autoRefresh: false })

  const composePostTypeParam = searchParams.get('postType')
  const composeHashtagsParam = searchParams.get('hashtags')
  const defaultPostType =
    composePostTypeParam === 'video' || composePostTypeParam === 'image'
      ? composePostTypeParam
      : undefined
  const initialHashtags = useMemo(
    () =>
      composeHashtagsParam
        ? composeHashtagsParam.split(',').map(t => t.trim()).filter(Boolean)
        : [],
    [composeHashtagsParam]
  )

  const setHubParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === '') params.delete(key)
      else params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const setActiveTab = useCallback((tab: HubTab) => {
    setHubParams({ tab })
  }, [setHubParams])

  const openCompose = useCallback((opts?: {
    postType?: 'video' | 'image'
    status?: string
    postId?: string
    hashtags?: string
  }) => {
    setHubParams({
      tab: 'compose',
      postType: opts?.postType || null,
      status: opts?.status || null,
      postId: opts?.postId || null,
      hashtags: opts?.hashtags || null,
    })
  }, [setHubParams])

  const analyticsData = useMemo(
    () =>
      buildAnalyticsDataFromArtistStats(stats, {
        marketplaceMerchandiseRevenue,
        integrations,
        weeklyGrowth: overview?.thisWeekCount
          ? Math.min(100, overview.thisWeekCount * 5)
          : 0,
      }),
    [stats, marketplaceMerchandiseRevenue, integrations, overview?.thisWeekCount]
  )

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const response = await fetch('/api/artist/content/overview', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        setOverview(null)
        setOverviewError('Failed to load attention inbox')
        return
      }
      const body = await response.json()
      setOverview(body.data || null)
    } catch {
      setOverview(null)
      setOverviewError('Failed to load attention inbox')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/marketplace/analytics?range=30d", {
          credentials: "include",
          cache: "no-store",
        })
        const body = await response.json().catch(() => ({}))
        if (!cancelled && response.ok) {
          setMarketplaceMerchandiseRevenue(Number(body.data?.grossRevenue || 0))
        }
      } catch {
        if (!cancelled) setMarketplaceMerchandiseRevenue(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('oauth_error')
    if (!connected && !oauthError) return

    if (connected === '1') {
      toast.success('Social account connected')
      setActiveTab('socials')
      void reloadIntegrations()
    } else if (oauthError) {
      toast.error(decodeURIComponent(oauthError))
      setActiveTab('socials')
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('connected')
    params.delete('oauth_error')
    if (!params.get('tab')) params.set('tab', 'socials')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router, setActiveTab, reloadIntegrations])

  const contentFeatures: ContentFeature[] = useMemo(() => {
    const blogDrafts = overview?.attention?.blogDrafts || 0
    const totals = {
      Music: stats.musicCount,
      Videos: 0,
      Photos: 0,
      Blog: stats.blogCount,
      'Press Kit': 1,
      Socials: integrations.filter(i => i.is_connected).length,
    } as Record<string, number>
    const recent = {
      Music: overview?.recent.music || 0,
      Videos: 0,
      Photos: 0,
      Blog: overview?.recent.blog || 0,
      'Press Kit': 0,
      Socials: 0,
    } as Record<string, number>
    return staticFeatures.map(f => {
      if (f.label === 'Blog') {
        const published = stats.blogCount
        const draftSuffix = blogDrafts > 0 ? ` · ${blogDrafts} draft${blogDrafts === 1 ? '' : 's'}` : ''
        return {
          ...f,
          stats: { total: published, recent: recent.Blog },
          statsLabel: `${published} published${draftSuffix}`,
        }
      }
      return {
        ...f,
        stats: { total: totals[f.label] ?? 0, recent: recent[f.label] ?? 0 },
      }
    })
  }, [stats.musicCount, stats.blogCount, overview, integrations])

  const quickStats = useMemo(() => ([
    {
      label: "Total Content",
      value: `${stats.musicCount + stats.videoCount + stats.photoCount + stats.blogCount}`,
      change: "",
      icon: TrendingUp
    },
    {
      label: "This Week",
      value: overviewLoading ? "…" : overview ? String(overview.thisWeekCount) : "—",
      change: overview && overview.thisWeekCount > 0 ? "new assets" : "",
      icon: Clock
    },
    {
      label: "Total Views",
      value: formatNumber(stats.totalViews || 0),
      change: "",
      icon: Eye
    },
  ]), [stats, overview, overviewLoading])

  const filteredFeatures = useMemo(() => {
    return contentFeatures.filter(feature => {
      const matchesSearch = feature.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || feature.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory, contentFeatures])

  const categories = useMemo(() => {
    const cats = ["all", ...new Set(contentFeatures.map(f => f.category))]
    return cats.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: cat === "all" ? contentFeatures.length : contentFeatures.filter(f => f.category === cat).length
    }))
  }, [contentFeatures])

  const socialSearchHits = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return integrations.filter(i =>
      i.platform.toLowerCase().includes(q) ||
      i.account_handle.toLowerCase().includes(q)
    )
  }, [integrations, searchQuery])

  const scheduledSearchHits = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return scheduledPosts
      .filter(post => String(post.content || '').toLowerCase().includes(q))
      .slice(0, 5)
  }, [scheduledPosts, searchQuery])

  function handleExportCsv() {
    downloadContentHubAnalyticsCsv({
      stats,
      analytics: analyticsData,
      overview,
      integrations,
    })
    toast.success('Analytics CSV downloaded')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Content Hub
              </h1>
              <p className="text-sm text-slate-400">
                Oversee content, socials, publishing, and analytics in one place
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search destinations & handles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[250px] bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl"
                />
              </div>
              <Button
                onClick={() => openCompose()}
                className={cn(ARTIST_PRIMARY_BTN, 'rounded-xl')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Content
              </Button>
            </div>
          </motion.div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="w-full">
            <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="compose" className="rounded-lg">Compose</TabsTrigger>
              <TabsTrigger value="socials" className="rounded-lg">Socials</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div role="tabpanel" hidden={activeTab !== 'overview'} className={activeTab === 'overview' ? 'space-y-8' : 'hidden'}>
        {activeTab === 'overview' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6 md:grid-cols-3"
            >
              {quickStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                          {stat.change ? (
                            <p className="text-xs text-green-400 flex items-center mt-1">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {stat.change}
                            </p>
                          ) : null}
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <stat.icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <ContentAttentionInbox
              overview={overview}
              isLoading={overviewLoading}
              error={overviewError}
              onRetry={() => void loadOverview()}
              onOpenComposeTriage={({ status, postId }) => openCompose({ status, postId })}
              onOpenTab={(tab) => setActiveTab(tab)}
            />

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-purple-400" />
                  Content Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.value}
                      variant={selectedCategory === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.value)}
                      className={`transition-all duration-200 rounded-xl ${
                        selectedCategory === category.value
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "border-slate-700 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      {category.label}
                      <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="wait">
                {filteredFeatures.map((feature, index) => (
                  <ContentFeatureCard
                    key={feature.label}
                    feature={feature}
                    index={index}
                    onOpenCompose={openCompose}
                    onOpenTab={setActiveTab}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {searchQuery && (socialSearchHits.length > 0 || scheduledSearchHits.length > 0) && (
              <div className="space-y-4">
                {socialSearchHits.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-slate-200 text-base">Matching connected handles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {socialSearchHits.map(hit => (
                        <button
                          key={hit.id}
                          type="button"
                          onClick={() => setActiveTab('socials')}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-left hover:border-purple-500/40"
                        >
                          <span className="text-sm text-slate-200 capitalize">
                            {hit.platform} · {hit.account_handle}
                          </span>
                          <Badge variant="secondary">Open Socials</Badge>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {scheduledSearchHits.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-slate-200 text-base">Matching scheduled posts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {scheduledSearchHits.map(post => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => openCompose({ status: post.status === 'failed' ? 'failed' : undefined, postId: post.id })}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-left hover:border-purple-500/40"
                        >
                          <span className="text-sm text-slate-200 line-clamp-1">{post.content || 'Untitled post'}</span>
                          <Badge variant="secondary" className="capitalize shrink-0 ml-2">{post.status}</Badge>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {filteredFeatures.length === 0 && (
              <div className="text-center py-12">
                <div className="text-slate-500 mb-4">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p>No content found matching your criteria</p>
                </div>
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("all")
                  }}
                  variant="outline"
                  className="border-slate-700 text-slate-300 rounded-xl"
                >
                  Clear Filters
                </Button>
              </div>
            )}

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Fast access to hub workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Upload Music", icon: Upload, href: "/artist/music/upload" },
                    { label: "Compose Post", icon: Share2, tab: "compose" as HubTab },
                    { label: "Write Blog", icon: FileText, href: "/artist/features/blog?new=1" },
                    { label: "Manage Socials", icon: Link2, tab: "socials" as HubTab },
                  ].map((action) => (
                    <motion.div
                      key={action.label}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {action.href ? (
                        <Link href={action.href}>
                          <Button
                            variant="ghost"
                            className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-slate-800/50 transition-all duration-200 rounded-xl border border-slate-700/50"
                          >
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                              <action.icon className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-300">{action.label}</span>
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => action.tab && setActiveTab(action.tab)}
                          className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-slate-800/50 transition-all duration-200 rounded-xl border border-slate-700/50"
                        >
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <action.icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-300">{action.label}</span>
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
                <Link href="/artist/music/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Music analytics
                </Link>
              </Button>
              <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
                <Link href="/artist/business/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Business analytics
                </Link>
              </Button>
            </div>
          </>
        )}
        </div>

        <div role="tabpanel" hidden={activeTab !== 'compose'} className={activeTab === 'compose' ? 'space-y-6' : 'hidden'}>
        {activeTab === 'compose' && (
          <div className="space-y-6">
            <CrossPlatformComposer
              onPostCreated={() => void loadOverview()}
              defaultPostType={defaultPostType}
              initialHashtags={initialHashtags}
            />
            <ScheduledPostsPanel
              highlightPostId={searchParams.get('postId')}
              forceStatus={searchParams.get('status') === 'failed' ? 'failed' : null}
            />
            <HashtagGroupsPanel
              onUseInComposer={(tags) => openCompose({ hashtags: tags.join(',') })}
            />
          </div>
        )}
        </div>

        <div role="tabpanel" hidden={activeTab !== 'socials'} className={activeTab === 'socials' ? 'space-y-6' : 'hidden'}>
        {activeTab === 'socials' && (
          <div className="space-y-6">
            <ContentSocialLinksPanel />
            <SocialIntegrationsManager />
          </div>
        )}
        </div>

        <div role="tabpanel" hidden={activeTab !== 'analytics'} className={activeTab === 'analytics' ? 'space-y-6' : 'hidden'}>
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Audience & content analytics</h2>
                <p className="text-sm text-slate-400">
                  Tourify metrics plus synced social platforms (honest empty states when not connected)
                </p>
              </div>
              <Button variant="outline" className="border-slate-700 rounded-xl" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <ArtistAnalyticsOverview data={analyticsData} />
            <CrossPlatformAnalyticsOverview />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
                <Link href="/artist/music/analytics">Music detail</Link>
              </Button>
              <Button variant="outline" className="border-slate-700 rounded-xl" asChild>
                <Link href="/artist/business/analytics">Business detail</Link>
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default function ContentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
          Loading Content Hub...
        </div>
      }
    >
      <ContentDashboardInner />
    </Suspense>
  )
}
