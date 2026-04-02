"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface AnalyticsData {
  revenue: number
  statusDistribution: Record<string, number>
  dailyRevenue: Record<string, number>
  eventPopularity: Array<{
    id: string
    title: string
    date: string
    capacity: number
    bookings: number
    occupancyRate: number
  }>
  totalEvents: number
  totalBookings: number
  period: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const searchParams = useSearchParams()
  const accountId = searchParams.get("accountId") || ""
  const scope = searchParams.get("scope") || "dashboard"

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?period=${period}&accountId=${accountId}&scope=${scope}`)
      const raw = await response.json()

      // Normalize backend shapes to the UI's expected format
      const dailyRevenue: Record<string, number> = raw.dailyRevenue
        ? raw.dailyRevenue
        : Array.isArray(raw.revenueTrend)
          ? Object.fromEntries(raw.revenueTrend.map((r: any) => [r.date, r.revenue]))
          : {}

      const eventPopularity = raw.eventPopularity
        ? raw.eventPopularity
        : Array.isArray(raw.popularEvents)
          ? raw.popularEvents.map((e: any) => ({
              id: e.id,
              title: e.title,
              date: typeof e.date === 'string' ? e.date : new Date(e.date).toISOString(),
              capacity: e.capacity,
              bookings: e.bookings,
              occupancyRate: e.occupancyRate
            }))
          : []

      const normalized: AnalyticsData = {
        revenue: raw.totalRevenue || 0,
        statusDistribution: raw.statusDistribution || {},
        dailyRevenue,
        eventPopularity,
        totalEvents: raw.totalEvents || 0,
        totalBookings: raw.totalBookings || 0,
        period
      }

      setData(normalized)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error loading analytics</h1>
          <p>Please try again later</p>
        </div>
      </div>
    )
  }

  // Prepare data for charts
  const revenueData = Object.entries(data.dailyRevenue).map(([date, amount]) => ({
    date,
    amount
  }))

  const statusData = Object.entries(data.statusDistribution).map(([status, count]) => ({
    name: status,
    value: count
  }))

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="text-sm text-slate-400">Scope: {scope || 'dashboard'} {accountId && `(Account: ${accountId})`}</div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.revenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalEvents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(data.eventPopularity.reduce((sum, event) => sum + event.occupancyRate, 0) / data.eventPopularity.length).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Popularity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Event</th>
                  <th className="text-right">Date</th>
                  <th className="text-right">Capacity</th>
                  <th className="text-right">Bookings</th>
                  <th className="text-right">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.eventPopularity.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2">{event.title}</td>
                    <td className="text-right">{formatSafeDate(event.date)}</td>
                    <td className="text-right">{event.capacity}</td>
                    <td className="text-right">{event.bookings}</td>
                    <td className="text-right">{event.occupancyRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
