"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  MessageSquare, 
  Briefcase, 
  Heart,
  Search,
  Filter,
  TrendingUp,
  UserPlus,
  Zap,
  Star,
  Calendar,
} from "lucide-react"
import { useCommunityStats } from "@/hooks/use-community-stats"
import { EnhancedCollaborationHub } from "@/components/collaboration/enhanced-collaboration-hub"
import { RealTimeActivityFeed } from "@/components/collaboration/real-time-activity-feed"

interface CommunityFeature {
  label: string
  icon: typeof Heart
  href: string
  description: string
  color: string
  statsKey: string
  category: string
  statsLabel: string
}

const communityFeatures: CommunityFeature[] = [
  { 
    label: "Fan Engagement", 
    icon: Heart, 
    href: "/artist/features/fan-engagement", 
    description: "Manage your fan club and connect with your audience",
    color: "from-pink-500 to-rose-600",
    statsKey: "fanEngagement",
    category: "fans",
    statsLabel: "fans",
  },
  { 
    label: "Network", 
    icon: Users, 
    href: "/artist/network", 
    description: "Connect with other artists and industry professionals",
    color: "from-blue-500 to-cyan-600",
    statsKey: "network",
    category: "professional",
    statsLabel: "connections",
  },
  { 
    label: "Jobs", 
    icon: Briefcase, 
    href: "/artist/jobs", 
    description: "Find and post music industry jobs",
    color: "from-green-500 to-emerald-600",
    statsKey: "jobs",
    category: "professional",
    statsLabel: "open jobs",
  },
  { 
    label: "Messages", 
    icon: MessageSquare, 
    href: "/artist/messages", 
    description: "Send and receive direct messages",
    color: "from-purple-500 to-violet-600",
    statsKey: "messages",
    category: "communication",
    statsLabel: "conversations",
  },
  {
    label: "Events",
    icon: Calendar,
    href: "/artist/events",
    description: "Discover and create community events",
    color: "from-orange-500 to-red-600",
    statsKey: "events",
    category: "events",
    statsLabel: "upcoming",
  },
  {
    label: "Collaborations",
    icon: Star,
    href: "/artist/collaborations",
    description: "Find artists to collaborate with and manage projects",
    color: "from-indigo-500 to-purple-600",
    statsKey: "collaborations",
    category: "professional",
    statsLabel: "projects",
  },
]

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

function StatCardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 bg-slate-700/50 rounded w-24" />
            <div className="h-7 bg-slate-700/50 rounded w-16" />
            <div className="h-3 bg-slate-700/30 rounded w-12" />
          </div>
          <div className="h-12 w-12 bg-slate-700/50 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function FeatureCardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm animate-pulse h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 rounded-xl bg-slate-700/50" />
          <div className="h-5 w-16 bg-slate-700/30 rounded" />
        </div>
        <div className="space-y-2 mt-3">
          <div className="h-5 bg-slate-700/50 rounded w-3/4" />
          <div className="h-4 bg-slate-700/30 rounded w-full" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-4 bg-slate-700/30 rounded w-1/2" />
      </CardContent>
    </Card>
  )
}

function CommunityFeatureCard({ 
  feature, 
  index, 
  stats 
}: { 
  feature: CommunityFeature
  index: number
  stats: { total: number; recent: number } | null
}) {
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
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-lg group-hover:shadow-purple-500/10 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                {stats && stats.recent > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    +{stats.recent} new
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
                {stats ? `${stats.total.toLocaleString()} ${feature.statsLabel}` : '...'}
              </span>
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

export default function CommunityDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { quickStats, featureStats, isLoading } = useCommunityStats()

  const filteredFeatures = useMemo(() => {
    return communityFeatures.filter(feature => {
      const matchesSearch = feature.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           feature.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || feature.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const categories = useMemo(() => {
    const cats = ["all", ...new Set(communityFeatures.map(f => f.category))]
    return cats.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: cat === "all" ? communityFeatures.length : communityFeatures.filter(f => f.category === cat).length,
    }))
  }, [])

  function getFeatureStat(statsKey: string): { total: number; recent: number } | null {
    if (isLoading) return null
    return (featureStats as any)[statsKey] ?? { total: 0, recent: 0 }
  }

  const displayStats = [
    { 
      label: "Total Connections", 
      value: isLoading ? '...' : quickStats.totalConnections.toLocaleString(), 
      change: quickStats.connectionsChange, 
      icon: Users,
    },
    { 
      label: "Active Conversations", 
      value: isLoading ? '...' : String(quickStats.activeConversations), 
      change: quickStats.conversationsChange, 
      icon: MessageSquare,
    },
    { 
      label: "Community Events", 
      value: isLoading ? '...' : String(quickStats.communityEvents), 
      change: quickStats.eventsChange, 
      icon: Calendar,
    },
  ]

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
                Community Hub
              </h1>
              <p className="text-sm text-slate-400">Connect, collaborate, and grow with the music community</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[250px] bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>
              <Link href="/artist/network">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Find People
                </Button>
              </Link>
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
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            displayStats.map((stat, index) => (
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
                        {stat.change && stat.change !== '0' && (
                          <p className="text-xs text-green-400 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {stat.change}
                          </p>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Community Features */}
          <div className="lg:col-span-2 space-y-6">
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
                    Community Categories
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
                        className={`transition-all duration-200 ${
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

            {/* Community Features Grid */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <AnimatePresence mode="wait">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <FeatureCardSkeleton key={`skel-${i}`} />)
                  : filteredFeatures.map((feature, index) => (
                      <CommunityFeatureCard
                        key={feature.label}
                        feature={feature}
                        index={index}
                        stats={getFeatureStat(feature.statsKey)}
                      />
                    ))
                }
              </AnimatePresence>
            </motion.div>

            {!isLoading && filteredFeatures.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-slate-500 mb-4">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p>No community features found matching your criteria</p>
                </div>
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("all")
                  }}
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </div>

          {/* Real-time Activity Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <RealTimeActivityFeed />
          </motion.div>
        </div>

        {/* Enhanced Collaboration Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <EnhancedCollaborationHub />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-400">
                Fast access to community features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Send Message", icon: MessageSquare, href: "/artist/messages" },
                  { label: "Find Collaborators", icon: Users, href: "/artist/collaborations" },
                  { label: "Browse Opportunities", icon: TrendingUp, href: "/artist/collaborations?tab=browse" },
                ].map((action) => (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href={action.href}>
                      <Button
                        variant="ghost"
                        className="h-20 w-full flex flex-col items-center justify-center space-y-2 hover:bg-slate-800/50 transition-all duration-200"
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
      </div>
    </div>
  )
}
