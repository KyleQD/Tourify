"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useArtist } from "@/contexts/artist-context"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import type { BusinessOverview, BusinessTransaction } from "@/lib/services/artist-business.service"
import {
  ShoppingBag,
  DollarSign,
  Users,
  Share2,
  BarChart2,
  Search,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown,
  Zap,
  CreditCard,
  FileText,
  Briefcase,
  MessageSquare,
  BookOpen,
} from "lucide-react"

type FeatureMetric =
  | "finance"
  | "commerce"
  | "legal"
  | "campaigns"
  | "followers"
  | "analytics"
  | "tours"
  | "education"

const businessFeatures = [
  {
    label: "Financial Dashboard",
    icon: DollarSign,
    href: "/artist/business/financial",
    description: "Track revenue, expenses, and financial analytics",
    color: "from-green-500 to-emerald-600",
    category: "finance",
    metric: "finance" as FeatureMetric,
  },
  {
    label: "Merchandise Store",
    icon: ShoppingBag,
    href: "/artist/features/merchandise",
    description: "Manage products and online store",
    color: "from-blue-500 to-cyan-600",
    category: "commerce",
    metric: "commerce",
  },
  {
    label: "Contracts & Legal",
    icon: FileText,
    href: "/artist/business/contracts",
    description: "Manage contracts and legal documents",
    color: "from-purple-500 to-violet-600",
    category: "legal",
    metric: "legal",
  },
  {
    label: "Marketing Hub",
    icon: Share2,
    href: "/artist/business/marketing",
    description: "Run campaigns and social media management",
    color: "from-pink-500 to-rose-600",
    category: "marketing",
    metric: "campaigns",
  },
  {
    label: "Business Analytics",
    icon: BarChart2,
    href: "/artist/business/analytics",
    description: "Revenue and business performance insights",
    color: "from-orange-500 to-red-600",
    category: "analytics",
    metric: "analytics",
  },
  {
    label: "Team Collaboration",
    icon: Users,
    href: "/artist/business/collaboration",
    description: "Tours, teams, and logistics tasks",
    color: "from-indigo-500 to-purple-600",
    category: "projects",
    metric: "tours",
  },
  {
    label: "Fan Engagement",
    icon: MessageSquare,
    href: "/artist/business/fans",
    description: "Connect with fans and build community",
    color: "from-cyan-500 to-blue-600",
    category: "marketing",
    metric: "followers",
  },
  {
    label: "Business Education",
    icon: BookOpen,
    href: "/artist/business/education",
    description: "Guides, FAQ, and external learning resources",
    color: "from-yellow-500 to-orange-600",
    category: "education",
    metric: "education",
  },
]

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } }
const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } }

function emptyOverview(): BusinessOverview {
  return {
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowthPercent: null,
    activeProducts: 0,
    totalEvents: 0,
    totalTracks: 0,
    fanEngagement: 0,
    contractsActive: 0,
    expenses: 0,
    profit: 0,
    revenueFromTransactions: false,
    marketingCampaignsCount: 0,
    toursCount: 0,
  }
}

function isFeatureInUse(feature: (typeof businessFeatures)[0], stats: BusinessOverview): boolean {
  switch (feature.metric) {
    case "finance":
      return stats.revenueFromTransactions || stats.totalRevenue > 0
    case "commerce":
      return stats.activeProducts > 0
    case "legal":
      return stats.contractsActive > 0
    case "campaigns":
      return stats.marketingCampaignsCount > 0
    case "followers":
      return stats.fanEngagement > 0
    case "analytics":
      return stats.totalTracks > 0 || stats.revenueFromTransactions
    case "tours":
      return stats.toursCount > 0
    case "education":
      return false
    default:
      return false
  }
}

function featureStatLine(feature: (typeof businessFeatures)[0], stats: BusinessOverview): string {
  switch (feature.metric) {
    case "finance":
      return stats.revenueFromTransactions
        ? `$${stats.totalRevenue.toLocaleString()} logged revenue`
        : stats.totalRevenue > 0
          ? `$${stats.totalRevenue.toLocaleString()} projected (events)`
          : "Log transactions for accurate totals"
    case "commerce":
      return `${stats.activeProducts} active product${stats.activeProducts === 1 ? "" : "s"}`
    case "legal":
      return `${stats.contractsActive} active contract${stats.contractsActive === 1 ? "" : "s"}`
    case "campaigns":
      return `${stats.marketingCampaignsCount} campaign${stats.marketingCampaignsCount === 1 ? "" : "s"}`
    case "followers":
      return `${stats.fanEngagement.toLocaleString()} followers`
    case "analytics":
      return `${stats.totalTracks} track${stats.totalTracks === 1 ? "" : "s"}`
    case "tours":
      return `${stats.toursCount} tour${stats.toursCount === 1 ? "" : "s"}`
    case "education":
      return "Guides & links"
    default:
      return ""
  }
}

function BusinessFeatureCard({
  feature,
  stats,
  index,
}: {
  feature: (typeof businessFeatures)[0]
  stats: BusinessOverview
  index: number
}) {
  const inUse = isFeatureInUse(feature, stats)
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Link href={feature.href} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 rounded-2xl">
        <Card
          className={cn(
            dashboardCreatePattern.shell,
            "h-full border-slate-700/50 bg-slate-900/50 backdrop-blur-sm transition-all duration-300",
            "group-hover:border-purple-500/40 group-hover:shadow-lg group-hover:shadow-purple-500/10"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                  "border border-white/10 group-hover:scale-105 transition-transform duration-200",
                  feature.color
                )}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  inUse
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-600 bg-slate-800/60 text-slate-400"
                )}
              >
                {inUse ? "In use" : "Get started"}
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-white group-hover:text-purple-200 transition-colors">
                {feature.label}
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">{feature.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{featureStatLine(feature, stats)}</p>
              <p className="text-sm text-purple-400 group-hover:text-purple-300 transition-colors">Open →</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

interface PageClientProps {
  initialStats: BusinessOverview | null
  initialTransactions: BusinessTransaction[]
}

export default function BusinessDashboardClient({ initialStats, initialTransactions }: PageClientProps) {
  const { user } = useArtist()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [businessStats, setBusinessStats] = useState<BusinessOverview | null>(() => initialStats ?? null)
  const [recentTransactions, setRecentTransactions] = useState<BusinessTransaction[]>(initialTransactions || [])
  const [isLoading, setIsLoading] = useState(false)

  const runClientFetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/artist/business/overview", { cache: "no-store" })
      if (res.status === 401) {
        setBusinessStats(emptyOverview())
        setRecentTransactions([])
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBusinessStats(data.overview ?? emptyOverview())
      setRecentTransactions(data.transactions ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Could not load business overview")
      setBusinessStats(emptyOverview())
      setRecentTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setBusinessStats(initialStats ?? null)
    setRecentTransactions(initialTransactions || [])
  }, [initialStats, initialTransactions])

  useEffect(() => {
    if (!user) {
      setBusinessStats(emptyOverview())
      setRecentTransactions([])
      return
    }
    if (initialStats !== null) return
    runClientFetch()
  }, [user, initialStats, runClientFetch])

  const filteredFeatures = useMemo(() => {
    return businessFeatures.filter(feature => {
      const matchesSearch =
        feature.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || feature.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const categories = useMemo(() => {
    const cats = ["all", ...new Set(businessFeatures.map(f => f.category))]
    return cats.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: cat === "all" ? businessFeatures.length : businessFeatures.filter(f => f.category === cat).length,
    }))
  }, [])

  const statsForUi = businessStats ?? emptyOverview()

  const quickStats = useMemo(() => {
    const s = statsForUi
    const profitMargin = s.totalRevenue > 0 ? Math.round((s.profit / s.totalRevenue) * 100) : null
    const revSub =
      s.revenueGrowthPercent != null
        ? `${s.revenueGrowthPercent >= 0 ? "+" : ""}${s.revenueGrowthPercent}% vs last month`
        : "MoM — log income to compare"
    const productsSub = `${s.totalEvents} scheduled event${s.totalEvents === 1 ? "" : "s"}`
    const profitSub = profitMargin != null ? `${profitMargin >= 0 ? "+" : ""}${profitMargin}% margin` : "— margin until revenue > 0"

    return [
      {
        label: "Total Revenue",
        value: `$${s.totalRevenue.toLocaleString()}`,
        sub: revSub,
        trend: s.revenueGrowthPercent != null && s.revenueGrowthPercent < 0 ? ("down" as const) : ("up" as const),
        icon: DollarSign,
        progress: Math.min((s.totalRevenue / 10000) * 100, 100),
      },
      {
        label: "Active Products",
        value: String(s.activeProducts),
        sub: productsSub,
        trend: "neutral" as const,
        icon: ShoppingBag,
        progress: Math.min((s.activeProducts / 20) * 100, 100),
      },
      {
        label: "Monthly Profit",
        value: `$${s.profit.toLocaleString()}`,
        sub: profitSub,
        trend: s.profit < 0 ? ("down" as const) : ("up" as const),
        icon: TrendingUp,
        progress: Math.min((Math.abs(s.profit) / 5000) * 100, 100),
      },
    ]
  }, [statsForUi])

  if (isLoading && !businessStats && user) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-800 rounded-xl w-1/3 max-w-xs" />
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-2xl border border-slate-700/50" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-800 rounded-2xl border border-slate-700/50" />
              ))}
            </div>
            <div className="h-96 bg-slate-800 rounded-2xl border border-slate-700/50" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(dashboardCreatePattern.headerIcon, "p-3")}>
            <Briefcase className="h-6 w-6 text-purple-200" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Business Hub</h1>
            <p className="text-slate-400 text-sm md:text-base">Manage your music business and grow your revenue</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search business tools..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn("pl-10 w-full bg-slate-900/80", dashboardCreatePattern.input)}
            />
          </div>
          <Button asChild className={cn("shrink-0", dashboardCreatePattern.btnPrimary)}>
            <Link href="/artist/business/collaboration?focus=task">
              <Plus className="mr-2 h-4 w-4" />
              New task
            </Link>
          </Button>
        </div>
      </div>

      {!statsForUi.revenueFromTransactions && statsForUi.totalRevenue > 0 && user && (
        <p className="text-xs text-slate-500 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2">
          Revenue shows ticket × expected attendance estimates until you add entries in{" "}
          <Link href="/artist/business/financial" className="text-purple-400 hover:underline">
            Financial
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p
                      className={cn(
                        "text-xs flex items-center gap-1 mt-1",
                        stat.trend === "down" ? "text-rose-400" : stat.trend === "up" ? "text-emerald-400" : "text-slate-400"
                      )}
                    >
                      {stat.trend === "down" ? (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      ) : stat.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : null}
                      {stat.sub}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/20 flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-purple-200" />
                  </div>
                </div>
                <Progress value={stat.progress} className="h-2 bg-slate-800" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-400" />
                Business Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    className={cn(
                      "transition-all duration-200 rounded-xl",
                      selectedCategory === category.value
                        ? dashboardCreatePattern.btnPrimary
                        : dashboardCreatePattern.btnOutline
                    )}
                  >
                    {category.label}
                    <Badge variant="secondary" className="ml-2 bg-slate-800 text-slate-300 border-slate-600">
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <AnimatePresence mode="wait">
              {filteredFeatures.map((feature, index) => (
                <BusinessFeatureCard key={feature.label} feature={feature} stats={statsForUi} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="space-y-6">
          <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                Recent activity
              </CardTitle>
              <CardDescription className="text-slate-400">Latest entries from your financial log</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{transaction.description}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              transaction.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : transaction.status === "failed"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            )}
                          >
                            {transaction.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(transaction.date), "MMM d")}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "font-semibold text-sm shrink-0 ml-2",
                          transaction.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {transaction.amount >= 0 ? "+" : ""}$
                        {Math.abs(transaction.amount).toLocaleString()}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No transactions yet</p>
                    <p className="text-slate-500 text-xs mt-1">Add income and expenses in Financial</p>
                  </div>
                )}
              </div>
              <Button asChild variant="outline" className={cn("w-full mt-4", dashboardCreatePattern.btnOutline)}>
                <Link href="/artist/business/financial">View financial log</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Add product", icon: ShoppingBag, href: "/artist/features/merchandise" },
                  { label: "Contract", icon: FileText, href: "/artist/business/contracts" },
                  { label: "Campaign", icon: Share2, href: "/artist/business/marketing" },
                  { label: "Analytics", icon: BarChart2, href: "/artist/business/analytics" },
                ].map(action => (
                  <Link key={action.label} href={action.href}>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-16 w-full flex flex-col items-center justify-center gap-1 rounded-xl border border-transparent hover:border-slate-700 hover:bg-slate-800/50 text-slate-300"
                    >
                      <action.icon className="h-5 w-5 text-purple-400" />
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
