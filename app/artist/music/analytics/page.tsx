"use client"

import { useEffect, useMemo, useState } from "react"
import type { ComponentType } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, Download, Heart, MessageCircle, Music2, RefreshCw, Share2, ShoppingBag, Star, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type RangeKey = "7d" | "30d" | "90d"

interface AnalyticsResponse {
  data: {
    range: RangeKey
    totals: {
      plays: number
      previewPlays: number
      fullPlays: number
      completedPlays: number
      saves: number
      profileFeatures: number
      shares: number
      likes: number
      comments: number
      purchases: number
      downloads: number
      revenue: number
    }
    conversion: {
      previewToLibraryRate: number
      previewToPurchaseRate: number
      completionRate: number
    }
    timeSeries: Array<{
      date: string
      plays: number
      previewPlays: number
      fullPlays: number
      saves: number
      purchases: number
      revenue: number
    }>
    topTracks: Array<{
      id: string
      title: string
      accessMode: string
      previewMode: string
      events: {
        plays: number
        previewPlays: number
        fullPlays: number
        saves: number
        profileFeatures: number
        shares: number
        likes: number
        comments: number
        purchases: number
        downloads: number
      }
      revenue: number
      unitsSold: number
      conversion: {
        previewToLibraryRate: number
        previewToPurchaseRate: number
      }
    }>
  }
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat().format(Math.round(value || 0))
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value || 0)
}

function formatPercent(value?: number) {
  return `${Math.round((value || 0) * 1000) / 10}%`
}

export default function ArtistMusicAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d")
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function load(nextRange = range) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/artist/music/analytics?range=${nextRange}`, {
        credentials: "include",
        cache: "no-store",
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error?.message || json?.message || "Failed to load analytics")
      setAnalytics(json.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load analytics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load(range)

  }, [range])

  const chartData = useMemo(
    () =>
      (analytics?.timeSeries || []).map((point) => ({
        ...point,
        label: new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    [analytics?.timeSeries],
  )

  const totals = analytics?.totals

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-cyan-400/30 bg-cyan-400/10">
                <BarChart3 className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-normal">Music Analytics</h1>
                <p className="text-sm text-slate-400">Track performance, saves, purchases, and listener conversion.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(value) => setRange(value as RangeKey)}>
              <SelectTrigger className="h-9 w-28 border-slate-700 bg-slate-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-200" onClick={() => load(range)} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Music2} label="Plays" value={formatNumber(totals?.plays)} sub={`${formatNumber(totals?.previewPlays)} sample · ${formatNumber(totals?.fullPlays)} full`} />
          <MetricCard icon={Star} label="Saves + Features" value={formatNumber((totals?.saves || 0) + (totals?.profileFeatures || 0))} sub={`${formatNumber(totals?.saves)} saves · ${formatNumber(totals?.profileFeatures)} features`} />
          <MetricCard icon={ShoppingBag} label="Revenue" value={formatCurrency(totals?.revenue)} sub={`${formatNumber(totals?.purchases)} purchases`} />
          <MetricCard icon={TrendingUp} label="Conversion" value={formatPercent(analytics?.conversion.previewToLibraryRate)} sub={`${formatPercent(analytics?.conversion.previewToPurchaseRate)} sample to purchase`} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-sm border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Listening Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 4 }} />
                  <Area type="monotone" dataKey="previewPlays" name="Sample plays" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="fullPlays" name="Full plays" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.16} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 4 }} />
                  <Bar dataKey="saves" name="Saves" fill="#34d399" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 rounded-sm border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Top Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
            ) : analytics?.topTracks?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                      <th className="py-3 pr-3 font-semibold">Track</th>
                      <th className="px-3 py-3 font-semibold">Plays</th>
                      <th className="px-3 py-3 font-semibold">Saves</th>
                      <th className="px-3 py-3 font-semibold">Social</th>
                      <th className="px-3 py-3 font-semibold">Purchases</th>
                      <th className="px-3 py-3 font-semibold">Revenue</th>
                      <th className="py-3 pl-3 font-semibold">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topTracks.map((track) => (
                      <tr key={track.id} className="border-b border-slate-800/70 text-slate-200">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{track.title || "Untitled track"}</span>
                            <Badge className="rounded-sm border-slate-700 bg-slate-800 text-xs text-slate-300">{track.accessMode}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{track.previewMode === "clip" ? "Sample preview" : "Full preview"}</div>
                        </td>
                        <td className="px-3 py-3">
                          {formatNumber(track.events.plays)}
                          <div className="text-xs text-slate-500">{formatNumber(track.events.previewPlays)} sample</div>
                        </td>
                        <td className="px-3 py-3">{formatNumber(track.events.saves)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3 text-slate-300">
                            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{formatNumber(track.events.likes)}</span>
                            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{formatNumber(track.events.comments)}</span>
                            <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5" />{formatNumber(track.events.shares)}</span>
                            <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />{formatNumber(track.events.downloads)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">{formatNumber(track.unitsSold)}</td>
                        <td className="px-3 py-3">{formatCurrency(track.revenue)}</td>
                        <td className="py-3 pl-3">
                          <div>{formatPercent(track.conversion.previewToLibraryRate)} save</div>
                          <div className="text-xs text-slate-500">{formatPercent(track.conversion.previewToPurchaseRate)} purchase</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No music activity for this range.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
}) {
  return (
    <Card className="rounded-sm border-slate-800 bg-slate-900/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-700 bg-slate-950">
            <Icon className="h-5 w-5 text-cyan-300" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">{sub}</p>
      </CardContent>
    </Card>
  )
}
