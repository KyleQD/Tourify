"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useArtist } from "@/contexts/artist-context"
import { 
  Music2, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  GalleryHorizontal, 
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Clock,
  Eye,
  Upload,
  Zap,
  Sparkles
} from "lucide-react"
import { CrossPlatformComposer } from '@/components/cross-platform/cross-platform-composer'
import { SocialIntegrationsManager } from '@/components/social/social-integrations-manager'
import { ArtistAnalyticsOverview } from '@/components/dashboard/artist-analytics-overview'
import { ScheduledPostsPanel } from '@/components/cross-platform/scheduled-posts-panel'
import { HashtagGroupsPanel } from '@/components/cross-platform/hashtag-groups-panel'
import { CrossPlatformAnalyticsOverview } from '@/components/cross-platform/analytics-overview'
import { buildAnalyticsDataFromArtistStats } from '@/lib/artist/build-analytics-from-stats'

interface ContentFeature {
  label: string
  icon: any
  href: string
  description: string
  color: string
  stats: { total: number; recent: number }
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
    href: "/artist/content/videos", 
    description: "Upload and manage videos",
    color: "from-blue-500 to-cyan-600",
    category: "media"
  },
  { 
    label: "Photos", 
    icon: ImageIcon, 
    href: "/artist/content/photos", 
    description: "Manage your photo gallery",
    color: "from-green-500 to-emerald-600",
    category: "media"
  },
  { 
    label: "Blog", 
    icon: FileText, 
    href: "/artist/content/blog", 
    description: "Create and manage blog posts",
    color: "from-orange-500 to-red-600",
    category: "content"
  },
  { 
    label: "Portfolio", 
    icon: GalleryHorizontal, 
    href: "/artist/features/portfolio", 
    description: "Showcase your best work",
    color: "from-pink-500 to-rose-600",
    category: "showcase"
  },
  { 
    label: "Press Kit", 
    icon: FileSpreadsheet, 
    href: "/artist/features/press-kit", 
    description: "Build your EPK",
    color: "from-indigo-500 to-purple-600",
    category: "business"
  },
]

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`
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

function ContentFeatureCard({ feature, index }: { feature: ContentFeature, index: number }) {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={feature.href} className="block group focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl">
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
              <span className="text-slate-500">{feature.stats.total} items</span>
              <span className="text-purple-400 group-hover:text-purple-300 transition-colors">
                View all →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

export default function ContentDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { stats } = useArtist()
  const analyticsData = useMemo(() => buildAnalyticsDataFromArtistStats(stats), [stats])

  const contentFeatures: ContentFeature[] = useMemo(() => {
    const totals = {
      Music: stats.musicCount,
      Videos: stats.videoCount,
      Photos: stats.photoCount,
      Blog: stats.blogCount,
      Portfolio: 1,
      'Press Kit': 1
    } as Record<string, number>
    return staticFeatures.map(f => ({
      ...f,
      stats: { total: totals[f.label] ?? 0, recent: 0 }
    }))
  }, [stats.musicCount, stats.videoCount, stats.photoCount, stats.blogCount])

  const quickStats = useMemo(() => ([
    { label: "Total Content", value: `${stats.musicCount + stats.videoCount + stats.photoCount + stats.blogCount}`, change: "", icon: TrendingUp },
    { label: "This Week", value: "-", change: "", icon: Clock },
    { label: "Total Views", value: formatNumber(stats.totalViews || 0), change: "", icon: Eye },
  ]), [stats])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Content Hub
              </h1>
              <p className="text-sm text-slate-400">Manage all your creative content in one place</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[250px] bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl"
                />
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Content
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-green-400 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.change}
                      </p>
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

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
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
        </motion.div>

        {/* Content Features Grid */}
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
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredFeatures.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
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
          </motion.div>
        )}

        {/* Social Posting & Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 gap-6">
            <CrossPlatformComposer />
            <SocialIntegrationsManager />
          </div>
        </motion.div>

        {/* Scheduling & Hashtags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <div className="grid grid-cols-1 gap-6">
            <ScheduledPostsPanel />
            <HashtagGroupsPanel />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-400">
                Fast access to content creation tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Upload Music", icon: Upload, href: "/artist/music/upload" },
                  { label: "Record Video", icon: Video, href: "/artist/content/videos/record" },
                  { label: "Write Blog", icon: FileText, href: "/artist/content/blog/new" },
                  { label: "Add Photos", icon: ImageIcon, href: "/artist/content/photos/upload" }
                ].map((action, index) => (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
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
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <ArtistAnalyticsOverview data={analyticsData} />
        </motion.div>

        {/* Cross-platform Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75 }}
        >
          <CrossPlatformAnalyticsOverview />
        </motion.div>
      </div>
    </div>
  )
} 