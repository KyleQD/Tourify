"use client"

import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Eye,
  Heart,
  Music,
  Calendar,
  Target,
  ShoppingBag,
  FileText,
  ArrowLeft,
  Download,
  Filter,
  RefreshCw
} from "lucide-react"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from "recharts"
import Link from "next/link"

interface BusinessAnalytics {
  overview: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    revenueGrowth: number
    profitMargin: number
    fanGrowth: number
    engagementRate: number
    conversionRate: number
  }
  revenueStreams: {
    merchandise: number
    events: number
    streaming: number
    licensing: number
    other: number
  }
  monthlyData: {
    month: string
    revenue: number
    expenses: number
    profit: number
    fanGrowth: number
    engagement: number
  }[]
  topProducts: {
    name: string
    revenue: number
    units: number
    growth: number
  }[]
  marketingROI: {
    campaign: string
    spent: number
    revenue: number
    roi: number
    conversions: number
  }[]
  businessHealth: {
    score: number
    factors: {
      financial: number
      marketing: number
      content: number
      engagement: number
    }
  }
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280']

export default function BusinessAnalytics() {
  const { user } = useArtist()
  const supabase = createClientComponentClient()
  
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("12m")
  const [selectedTab, setSelectedTab] = useState("overview")

  useEffect(() => {
    if (user) loadAnalytics()
  }, [user, timeRange])

  const loadAnalytics = async () => {
    if (!user) return
    try {
      setIsLoading(true)

      const now = new Date()
      const start = format(subMonths(now, 11), 'yyyy-MM-01')
      const end = format(now, 'yyyy-MM-28')

      const [txRes, merchRes, eventsRes, campaignsRes, profileRes] = await Promise.all([
        supabase
          .from('artist_financial_transactions')
          .select('id,type,amount,occurred_at,metadata')
          .eq('user_id', user.id)
          .gte('occurred_at', start)
          .lte('occurred_at', end),
        supabase.from('artist_merchandise').select('name, price, inventory_count, is_active, id').eq('user_id', user.id),
        supabase.from('artist_events').select('id, title, ticket_price_min, expected_attendance').eq('user_id', user.id),
        supabase.from('artist_marketing_campaigns').select('id, name, budget, spent, status').eq('user_id', user.id),
        supabase.from('profiles').select('followers_count').eq('id', user.id).maybeSingle(),
      ])

      const { data: userPosts } = await supabase.from('posts').select('id').eq('user_id', user.id)
      const postIds = (userPosts || []).map((p: { id: string }) => p.id)
      let likeCount = 0
      if (postIds.length > 0) {
        const { count, error: likesErr } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds)
        likeCount = likesErr ? 0 : count || 0
      }

      const tx = txRes.data || []
      const incomeTypes = new Set(['income','royalty','merchandise','event'])
      let totalRevenue = 0
      let totalExpenses = 0
      const monthsMap = new Map<string, { revenue: number; expenses: number; profit: number; fanGrowth: number; engagement: number }>()

      for (let i = 11; i >= 0; i--) {
        const m = format(subMonths(now, i), 'MMM')
        monthsMap.set(m, { revenue: 0, expenses: 0, profit: 0, fanGrowth: 0, engagement: 0 })
      }

      tx.forEach(row => {
        const amt = Number(row.amount) || 0
        const monthKey = format(new Date(row.occurred_at), 'MMM')
        const entry = monthsMap.get(monthKey)
        if (!entry) return
        if (incomeTypes.has(row.type)) {
          entry.revenue += amt
          totalRevenue += amt
        } else {
          entry.expenses += amt
          totalExpenses += amt
        }
        entry.profit = entry.revenue - entry.expenses
        entry.fanGrowth = entry.fanGrowth || 0
        entry.engagement = entry.engagement || 0
      })

      const monthlyData = Array.from(monthsMap.entries()).map(([month, v]) => ({
        month,
        revenue: Math.round(v.revenue),
        expenses: Math.round(v.expenses),
        profit: Math.round(v.profit),
        fanGrowth: Math.round(v.fanGrowth),
        engagement: Math.round(v.engagement)
      }))

      // Streams
      const revenueStreams = {
        merchandise: sumByType(tx, ['merchandise']),
        events: sumByType(tx, ['event']),
        streaming: sumByMeta(tx, 'source', 'streaming'),
        licensing: sumByType(tx, ['royalty']),
        other: sumByType(tx, ['income'])
      }

      // Top products heuristic: active merch sorted by price desc
      const topProducts = (merchRes.data || []).slice(0, 5).map((item: any) => ({
        name: item.name || 'Product',
        revenue: Number(item.price) || 0,
        units: item.inventory_count || 0,
        growth: 0
      }))

      const campaigns = campaignsRes.data || []
      const marketingROI = campaigns.map((c: { name?: string; spent?: unknown; budget?: unknown }) => {
        const spent = Number(c.spent) || 0
        const budget = Number(c.budget) || 0
        const attributed = sumByMeta(tx, 'campaign_name', String(c.name || ''))
        const revenue = attributed
        const roi = spent > 0 ? Math.round(((revenue - spent) / spent) * 100) : revenue > 0 ? 100 : 0
        return {
          campaign: c.name || 'Campaign',
          spent,
          revenue,
          roi,
          conversions: 0,
        }
      })

      const followers = Number(profileRes.data?.followers_count) || 0
      const engagementRate =
        followers > 0 ? Math.min(100, Math.round((likeCount / Math.max(followers, 1)) * 25)) : likeCount > 0 ? 25 : 0

      const netProfit = totalRevenue - totalExpenses
      const profitMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
      const revenueGrowth = calcGrowth(monthlyData.map(m => m.revenue))

      const marketingScore = Math.min(100, campaigns.length * 18 + (campaigns.some((c: { status?: string }) => c.status === 'active') ? 25 : 0))
      const contentScore = Math.min(100, (merchRes.data || []).length * 8 + (eventsRes.data || []).length * 10)

      const analyticsData: BusinessAnalytics = {
        overview: {
          totalRevenue: Math.round(totalRevenue),
          totalExpenses: Math.round(totalExpenses),
          netProfit: Math.round(netProfit),
          revenueGrowth,
          profitMargin: profitMarginPct,
          fanGrowth: followers,
          engagementRate,
          conversionRate: 0
        },
        revenueStreams,
        monthlyData,
        topProducts,
        marketingROI,
        businessHealth: {
          score: clamp(Math.round(profitMarginPct * 0.35 + revenueGrowth * 0.25 + marketingScore * 0.15 + contentScore * 0.15 + engagementRate * 0.1), 0, 100),
          factors: {
            financial: clamp(profitMarginPct, 0, 100),
            marketing: marketingScore,
            content: contentScore,
            engagement: clamp(engagementRate, 0, 100)
          }
        }
      }

      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = () => {
    if (!analytics) return
    
    // Create a simple CSV report
    const csvData = [
      ['Business Analytics Report'],
      ['Generated:', new Date().toISOString()],
      [''],
      ['Overview'],
      ['Total Revenue', analytics.overview.totalRevenue],
      ['Total Expenses', analytics.overview.totalExpenses],
      ['Net Profit', analytics.overview.netProfit],
      ['Profit Margin', `${analytics.overview.profitMargin}%`],
      [''],
      ['Revenue Streams'],
      ['Merchandise', analytics.revenueStreams.merchandise],
      ['Events', analytics.revenueStreams.events],
      ['Streaming', analytics.revenueStreams.streaming],
      ['Licensing', analytics.revenueStreams.licensing],
      ['Other', analytics.revenueStreams.other]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Failed to load analytics data</p>
      </div>
    )
  }

  const revenueStreamData = Object.entries(analytics.revenueStreams)
    .filter(([_, value]) => value > 0)
    .map(([key, value], index) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: COLORS[index % COLORS.length]
    }))

  function sumByType(rows: any[], types: string[]) {
    const set = new Set(types)
    return rows.reduce((sum, r) => sum + (set.has(r.type) ? Number(r.amount) || 0 : 0), 0)
  }
  function sumByMeta(rows: any[], key: string, value: string) {
    return rows.reduce((sum, r) => sum + ((r.metadata && (r.metadata[key] || r.metadata[key]?.toLowerCase?.()) === value) ? Number(r.amount) || 0 : 0), 0)
  }
  function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }
  function calcGrowth(series: number[]) {
    if (series.length < 2) return 0
    const first = series[0]
    const last = series[series.length - 1]
    if (first <= 0) return last > 0 ? 100 : 0
    return Math.round(((last - first) / first) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/artist/business">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business
            </Button>
          </Link>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Business Analytics</h1>
              <p className="text-gray-400">Comprehensive business performance insights</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline" className="border-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportReport} className="bg-orange-600 hover:bg-orange-700">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">{formatSafeCurrency(analytics.overview.totalRevenue)}</p>
                <p className="text-xs text-slate-500 flex items-center mt-1">
                  {analytics.overview.totalRevenue > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                      {analytics.overview.revenueGrowth >= 0 ? '+' : ''}
                      {analytics.overview.revenueGrowth}% vs window start
                    </>
                  ) : (
                    'No revenue in this range — log transactions'
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Net Profit</p>
                <p className={`text-2xl font-bold ${analytics.overview.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSafeCurrency(Math.abs(analytics.overview.netProfit))}
                </p>
                <p className="text-xs text-gray-400">
                  {analytics.overview.profitMargin}% margin
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Audience</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatSafeNumber(analytics.overview.fanGrowth)}
                </p>
                <p className="text-xs text-slate-400">
                  followers · {analytics.overview.engagementRate}% est. engagement (likes vs reach)
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Business Health</p>
                <p className="text-2xl font-bold text-yellow-400">{analytics.businessHealth.score}/100</p>
                <p className="text-xs text-gray-400">
                  Overall score
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-yellow-500" />
            </div>
            <Progress value={analytics.businessHealth.score} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-5 gap-4 bg-slate-800/50 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="health">Health Score</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Trend */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                      <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#8B5CF6" strokeWidth={3} name="Profit" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Fan Growth */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Fan & Engagement Growth</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Month-by-month fan totals are not stored yet; chart stays at zero until we add history.
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="fanGrowth" 
                        stroke="#8B5CF6" 
                        fill="#8B5CF6" 
                        fillOpacity={0.3}
                        name="New Fans"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="engagement" 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3}
                        name="Engagement"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Streams */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueStreamData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {revenueStreamData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueStreamData.map((stream, index) => (
                    <div key={stream.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stream.color }}
                          ></div>
                          <span className="text-gray-300">{stream.name}</span>
                        </div>
                        <span className="font-bold text-white">{formatSafeCurrency(stream.value)}</span>
                      </div>
                      <Progress 
                        value={(stream.value / analytics.overview.totalRevenue) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-gray-400">
                        {Math.round((stream.value / analytics.overview.totalRevenue) * 100)}% of total revenue
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Marketing ROI Analysis</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Spend comes from campaigns. Revenue fills in when financial transactions include matching metadata (e.g. campaign name).
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.marketingROI.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-10">
                    No campaigns yet.{" "}
                    <Link href="/artist/business/marketing" className="text-purple-400 hover:underline">
                      Open Marketing Hub
                    </Link>{" "}
                    to create one.
                  </p>
                ) : null}
                {analytics.marketingROI.map((campaign, index) => (
                  <div key={campaign.campaign} className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{campaign.campaign}</h3>
                      <Badge className={
                        campaign.roi >= 100 ? 'bg-green-600/20 text-green-300' :
                        campaign.roi >= 50 ? 'bg-yellow-600/20 text-yellow-300' :
                        'bg-red-600/20 text-red-300'
                      }>
                        {campaign.roi}% ROI
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Spent</p>
                        <p className="font-bold text-red-400">${campaign.spent}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Revenue</p>
                        <p className="font-bold text-green-400">${campaign.revenue}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Profit</p>
                        <p className="font-bold text-blue-400">${campaign.revenue - campaign.spent}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Conversions</p>
                        <p className="font-bold text-purple-400">{campaign.conversions}</p>
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(campaign.roi, 300) / 3} 
                      className="mt-3"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topProducts.map((product, index) => (
                  <div key={product.name} className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <h3 className="font-medium text-white">{product.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          product.growth >= 0 ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
                        }>
                          {product.growth >= 0 ? '+' : ''}{product.growth}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Revenue</p>
                        <p className="font-bold text-green-400">{formatSafeCurrency(product.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Units Sold</p>
                        <p className="font-bold text-blue-400">{formatSafeNumber(product.units)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Avg. Price</p>
                        <p className="font-bold text-purple-400">
                          ${product.units > 0 ? (product.revenue / product.units).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Health Score Breakdown */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Business Health Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {analytics.businessHealth.score}/100
                    </div>
                    <div className={`text-lg ${
                      analytics.businessHealth.score >= 80 ? 'text-green-400' :
                      analytics.businessHealth.score >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analytics.businessHealth.score >= 80 ? 'Excellent' :
                       analytics.businessHealth.score >= 60 ? 'Good' :
                       analytics.businessHealth.score >= 40 ? 'Fair' : 'Needs Improvement'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(analytics.businessHealth.factors).map(([factor, score]) => (
                      <div key={factor} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize">{factor}</span>
                          <span className="font-bold text-white">{score}/100</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.businessHealth.factors.financial < 70 && (
                    <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-300">Improve Financial Performance</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Focus on increasing profit margins by optimizing expenses or raising prices.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.businessHealth.factors.marketing < 70 && (
                    <div className="p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-300">Enhance Marketing ROI</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Review marketing campaigns and focus on higher-converting channels.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.businessHealth.factors.content < 70 && (
                    <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Music className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-300">Increase Content Output</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Create more music and content to expand your catalog and reach.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.businessHealth.score >= 80 && (
                    <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-300">Excellent Performance!</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Your business is performing well across all areas. Consider scaling up operations.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 