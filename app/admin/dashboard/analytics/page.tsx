"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import type { AdminDashboardStats } from "@/types/admin"
import type { LucideIcon } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar as CalendarIcon,
  Music,
  Target,
  Activity,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  PieChart,
  LineChart as LineChartIcon,
  Award,
  Sparkles,
  Radio,
  Ticket,
} from "lucide-react"

const EMPTY_STATS: AdminDashboardStats = {
  totalTours: 0,
  activeTours: 0,
  totalEvents: 0,
  upcomingEvents: 0,
  totalArtists: 0,
  totalVenues: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  ticketsSold: 0,
  totalCapacity: 0,
  staffMembers: 0,
  completedTasks: 0,
  pendingTasks: 0,
  averageRating: 0,
  totalTravelGroups: 0,
  totalTravelers: 0,
  confirmedTravelers: 0,
  coordinationCompletionRate: 0,
  fullyCoordinatedGroups: 0,
  activeTransportation: 0,
  completedTransportation: 0,
  logisticsCompletionRate: 0,
}

function PerformanceMetric({
  title,
  value,
  target = 100,
  unit = "%",
  color = "from-blue-500 to-purple-500",
}: {
  title: string
  value: number
  target?: number
  unit?: string
  color?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-lg font-bold text-white">
          {value}
          {unit}
        </p>
      </div>
      <div className="relative">
        <div className="h-2 w-full rounded-full bg-slate-700/50">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
            style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
          />
        </div>
        {target !== 100 && (
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>0</span>
            <span>
              {target}
              {unit} target
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ChartPlaceholderCard({ title }: { title: string }) {
  return (
    <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg text-white">
          <LineChartIcon className="mr-2 h-5 w-5 text-blue-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-sm border border-dashed border-slate-700/60 bg-slate-950/40 px-6 py-12 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">
            No data available yet
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [statsRes, finRes, eventsRes] = await Promise.allSettled([
        fetch("/api/admin/dashboard/stats", { credentials: "include" }).then(r => r.json()),
        fetch("/api/admin/finances?type=overview", { credentials: "include" }).then(r => r.json()),
        fetch("/api/admin/events", { credentials: "include" }).then(r => r.json()),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.stats as AdminDashboardStats)
      } else {
        throw new Error('Failed to load stats')
      }

      if (finRes.status === 'fulfilled') {
        setTransactions(finRes.value.recentTransactions || [])
      }

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.events || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setStats(EMPTY_STATS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const revenueChartData = useMemo(() => {
    const grouped: Record<string, { month: string; income: number; expenses: number }> = {}
    transactions.forEach((tx: any) => {
      const m = tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 7) : null
      if (!m) return
      if (!grouped[m]) grouped[m] = { month: m, income: 0, expenses: 0 }
      if (tx.type === 'income') grouped[m].income += Number(tx.amount) || 0
      else grouped[m].expenses += Number(tx.amount) || 0
    })
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
  }, [transactions])

  const audienceData = useMemo(() => {
    return events.filter((e: any) => e.capacity > 0).map((e: any) => ({
      name: (e.name || '').slice(0, 20),
      capacity: e.capacity || 0,
      sold: e.tickets_sold || 0,
      utilization: e.capacity > 0 ? Math.round(((e.tickets_sold || 0) / e.capacity) * 100) : 0,
    })).slice(0, 10)
  }, [events])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const s = stats ?? EMPTY_STATS

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics & Insights"
        subtitle="Performance metrics and data insights"
        icon={BarChart3}
        actions={
          <>
            <Button
              type="button"
              onClick={() => void fetchStats()}
              disabled={isLoading}
              variant="outline"
              className="border-slate-700 text-slate-300 backdrop-blur-sm transition-all duration-200 hover:bg-slate-800"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              disabled
              className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 opacity-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="border-slate-600 bg-slate-800/80 text-slate-300"
        >
          All time
        </Badge>
        {error ? (
          <span className="text-sm text-amber-400/90">{error}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard title="Total Revenue" value={formatSafeCurrency(s.totalRevenue)} icon={DollarSign} color="green" size="lg" isLoading={isLoading && stats === null} />
          <AdminStatCard title="Total Events" value={s.totalEvents} icon={CalendarIcon} color="blue" size="lg" isLoading={isLoading && stats === null} />
          <AdminStatCard title="Tickets Sold" value={s.ticketsSold} icon={Users} color="purple" size="lg" isLoading={isLoading && stats === null} />
          <AdminStatCard title="Upcoming Events" value={s.upcomingEvents} icon={Ticket} color="amber" size="lg" isLoading={isLoading && stats === null} />
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm">
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger
              value="audience"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
            >
              Audience
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
            >
              Trends
            </TabsTrigger>
            <TabsTrigger
              value="real-time"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
            >
              Real-time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Target className="mr-2 h-5 w-5 text-green-400" />
                    Operations & logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PerformanceMetric
                    title="Coordination completion"
                    value={s.coordinationCompletionRate}
                    color="from-green-500 to-emerald-500"
                  />
                  <PerformanceMetric
                    title="Logistics completion"
                    value={s.logisticsCompletionRate}
                    color="from-blue-500 to-purple-500"
                  />
                  <PerformanceMetric
                    title="Active tours (share of all)"
                    value={
                      s.totalTours > 0
                        ? Math.round((s.activeTours / s.totalTours) * 100)
                        : 0
                    }
                    color="from-yellow-500 to-orange-500"
                  />
                  <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                    <div className="rounded-sm bg-slate-800/40 p-3">
                      <p className="text-slate-400">Completed tasks</p>
                      <p className="text-lg font-semibold text-white">
                        {formatSafeNumber(s.completedTasks)}
                      </p>
                    </div>
                    <div className="rounded-sm bg-slate-800/40 p-3">
                      <p className="text-slate-400">Pending tasks</p>
                      <p className="text-lg font-semibold text-white">
                        {formatSafeNumber(s.pendingTasks)}
                      </p>
                    </div>
                    <div className="rounded-sm bg-slate-800/40 p-3">
                      <p className="text-slate-400">Active transport</p>
                      <p className="text-lg font-semibold text-white">
                        {formatSafeNumber(s.activeTransportation)}
                      </p>
                    </div>
                    <div className="rounded-sm bg-slate-800/40 p-3">
                      <p className="text-slate-400">Staff members</p>
                      <p className="text-lg font-semibold text-white">
                        {formatSafeNumber(s.staffMembers)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Sparkles className="mr-2 h-5 w-5 text-purple-400" />
                    Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-sm border border-green-500/20 bg-green-500/10 backdrop-blur-sm p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-400" />
                      <div>
                        <h4 className="font-medium text-green-400">Live data</h4>
                        <p className="mt-1 text-sm text-slate-300">
                          Figures above come from tours, events, ticket sales,
                          logistics, and staff tables.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-sm border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-sm p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-400" />
                      <div>
                        <h4 className="font-medium text-yellow-400">
                          Limited context
                        </h4>
                        <p className="mt-1 text-sm text-slate-300">
                          There is no period comparison yet; use Refresh to
                          reload totals.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-sm border border-blue-500/20 bg-blue-500/10 backdrop-blur-sm p-4">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="mt-0.5 h-5 w-5 text-blue-400" />
                      <div>
                        <h4 className="font-medium text-blue-400">Capacity</h4>
                        <p className="mt-1 text-sm text-slate-300">
                          Total event capacity:{" "}
                          <span className="font-medium text-white">
                            {formatSafeNumber(s.totalCapacity)}
                          </span>
                          . Upcoming events:{" "}
                          <span className="font-medium text-white">
                            {formatSafeNumber(s.upcomingEvents)}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <PieChart className="mr-2 h-5 w-5 text-green-400" />
                    Revenue summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total (tours)</span>
                    <span className="font-semibold text-white">
                      {formatSafeCurrency(s.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Monthly (tracked)</span>
                    <span className="font-semibold text-white">
                      {formatSafeCurrency(s.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ticket sales count</span>
                    <span className="font-semibold text-white">
                      {formatSafeNumber(s.ticketsSold)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Breakdown by source is not exposed by the stats API yet.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Award className="mr-2 h-5 w-5 text-yellow-400" />
                    Top revenue events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-slate-700/60 bg-slate-950/40 px-4 py-10 text-center">
                    <p className="text-sm text-slate-400">
                      No per-event revenue ranking in this dataset yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {revenueChartData.length > 0 ? (
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <LineChartIcon className="mr-2 h-5 w-5 text-blue-400" />
                    Monthly Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stroke="#4ade80" fill="url(#gradIncome)" name="Income" />
                        <Area type="monotone" dataKey="expenses" stroke="#f87171" fill="none" name="Expenses" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartPlaceholderCard title="Monthly revenue trend" />
            )}
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            {audienceData.length > 0 ? (
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Users className="mr-2 h-5 w-5 text-purple-400" />
                    Capacity Utilization by Event
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={audienceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="capacity" fill="#6366f1" name="Capacity" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="sold" fill="#a855f7" name="Sold" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartPlaceholderCard title="Audience analytics" />
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-blue-400" />
                  <p className="text-2xl font-bold text-white">{s.totalEvents}</p>
                  <p className="text-sm text-slate-400">Total Events</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Music className="mx-auto mb-2 h-8 w-8 text-purple-400" />
                  <p className="text-2xl font-bold text-white">{s.totalArtists}</p>
                  <p className="text-sm text-slate-400">Artists</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Target className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-2xl font-bold text-white">{s.totalVenues}</p>
                  <p className="text-sm text-slate-400">Venues</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
                  <p className="text-2xl font-bold text-white">{s.staffMembers}</p>
                  <p className="text-sm text-slate-400">Staff Members</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="real-time" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Activity className="mx-auto mb-2 h-8 w-8 text-blue-400" />
                  <p className="text-2xl font-bold text-white">—</p>
                  <p className="text-sm text-slate-400">Live users</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Music className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-2xl font-bold text-white">
                    {formatSafeNumber(s.upcomingEvents)}
                  </p>
                  <p className="text-sm text-slate-400">Upcoming events</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Ticket className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
                  <p className="text-2xl font-bold text-white">
                    {formatSafeNumber(s.ticketsSold)}
                  </p>
                  <p className="text-sm text-slate-400">Tickets sold (total)</p>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <DollarSign className="mx-auto mb-2 h-8 w-8 text-green-400" />
                  <p className="text-2xl font-bold text-white">
                    {formatSafeCurrency(s.totalRevenue)}
                  </p>
                  <p className="text-sm text-slate-400">Revenue (total)</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-sm border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Radio className="mr-2 h-5 w-5 text-red-400" />
                  Live activity feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex min-h-[120px] items-center justify-center rounded-sm border border-dashed border-slate-700/60 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-400">
                  Real-time activity is not connected yet.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
