"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Eye, 
  Share2, 
  Users, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Calendar,
  MapPin,
  BarChart3,
  Activity,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ExternalLink
} from "lucide-react"
import { useEvents } from "@/context/venue/events-context"
import { useAuth } from "@/contexts/auth-context"
import type { VenueEvent } from "@/app/venue/lib/hooks/use-venue-events"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EventAnalyticsDashboardProps {
  eventId?: string
  className?: string
}

export function EventAnalyticsDashboard({ eventId, className }: EventAnalyticsDashboardProps) {
  const { events, getEventById } = useEvents()
  const { user } = useAuth()
  const [selectedEventId, setSelectedEventId] = useState(eventId || "")
  const [timeRange, setTimeRange] = useState("7d")

  // Get user's events if no specific event is selected
  const userEvents = events.filter(event => event.organizerId === user?.id)
  const selectedEvent = selectedEventId ? getEventById(selectedEventId) : null

  // Calculate engagement rate
  const calculateEngagementRate = (event: VenueEvent) => {
    const totalInteractions = event.analytics.likes + event.analytics.comments + event.analytics.shares
    return event.analytics.views > 0 ? ((totalInteractions / event.analytics.views) * 100).toFixed(1) : "0"
  }

  // Calculate conversion rate (RSVPs to views)
  const calculateConversionRate = (event: VenueEvent) => {
    return event.analytics.views > 0 ? ((event.analytics.rsvps / event.analytics.views) * 100).toFixed(1) : "0"
  }

  // Mock data for trends (in real app, this would come from analytics API)
  const getTrendData = (metric: string) => {
    const trends = {
      views: { value: "+12%", isPositive: true },
      shares: { value: "+8%", isPositive: true },
      rsvps: { value: "+15%", isPositive: true },
      likes: { value: "+5%", isPositive: true },
      comments: { value: "-2%", isPositive: false }
    }
    return trends[metric as keyof typeof trends] || { value: "0%", isPositive: true }
  }

  if (!user) {
    return (
      <Card className={`bg-slate-900 border-white/10 ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-gray-400">Please sign in to view analytics</div>
        </CardContent>
      </Card>
    )
  }

  if (userEvents.length === 0) {
    return (
      <Card className={`bg-slate-900 border-white/10 ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-gray-400">No events found. Create an event to see analytics.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Event Analytics</h2>
            <p className="text-sm text-gray-400">Track your event performance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {userEvents.length > 1 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[200px] bg-slate-800 border-white/20 text-white">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {userEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] bg-slate-800 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEvent && (
        <>
          {/* Event Info */}
          <Card className="bg-slate-900 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {selectedEvent.image && (
                  <img 
                    src={selectedEvent.image} 
                    alt={selectedEvent.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{selectedEvent.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatSafeDate(selectedEvent.startDate)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedEvent.location}
                    </div>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-500/30">
                      {selectedEvent.type}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Event
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Views"
              value={selectedEvent.analytics.views}
              icon={<Eye className="h-4 w-4" />}
              trend={getTrendData("views")}
              color="blue"
            />
            <MetricCard
              title="Shares"
              value={selectedEvent.analytics.shares}
              icon={<Share2 className="h-4 w-4" />}
              trend={getTrendData("shares")}
              color="green"
            />
            <MetricCard
              title="RSVPs"
              value={selectedEvent.analytics.rsvps}
              icon={<Users className="h-4 w-4" />}
              trend={getTrendData("rsvps")}
              color="purple"
            />
            <MetricCard
              title="Likes"
              value={selectedEvent.analytics.likes}
              icon={<Heart className="h-4 w-4" />}
              trend={getTrendData("likes")}
              color="pink"
            />
            <MetricCard
              title="Comments"
              value={selectedEvent.analytics.comments}
              icon={<MessageCircle className="h-4 w-4" />}
              trend={getTrendData("comments")}
              color="orange"
            />
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  Engagement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">
                    {calculateEngagementRate(selectedEvent)}%
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedEvent.analytics.likes + selectedEvent.analytics.comments + selectedEvent.analytics.shares} interactions
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {calculateConversionRate(selectedEvent)}%
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedEvent.analytics.rsvps} RSVPs from {selectedEvent.analytics.views} views
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card className="bg-slate-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Detailed Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Audience</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Views</span>
                      <span className="text-white">{selectedEvent.analytics.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Unique Visitors</span>
                      <span className="text-white">{(selectedEvent.analytics.views * 0.8).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg. Time on Page</span>
                      <span className="text-white">2m 34s</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Engagement</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Likes</span>
                      <span className="text-white">{selectedEvent.analytics.likes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Comments</span>
                      <span className="text-white">{selectedEvent.analytics.comments}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Shares</span>
                      <span className="text-white">{selectedEvent.analytics.shares}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Attendance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Confirmed RSVPs</span>
                      <span className="text-white">{selectedEvent.analytics.rsvps}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Capacity</span>
                      <span className="text-white">{selectedEvent.capacity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Fill Rate</span>
                      <span className="text-white">
                        {((selectedEvent.analytics.rsvps / selectedEvent.capacity) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  icon: React.ReactNode
  trend: { value: string; isPositive: boolean }
  color: string
}

function MetricCard({ title, value, icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: "text-blue-400 bg-blue-500/20 border-blue-500/30",
    green: "text-green-400 bg-green-500/20 border-green-500/30",
    purple: "text-purple-400 bg-purple-500/20 border-purple-500/30",
    pink: "text-pink-400 bg-pink-500/20 border-pink-500/30",
    orange: "text-orange-400 bg-orange-500/20 border-orange-500/30"
  }

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-xs">
            {trend.isPositive ? (
              <ArrowUp className="h-3 w-3 text-green-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-400" />
            )}
            <span className={trend.isPositive ? "text-green-400" : "text-red-400"}>
              {trend.value}
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">{title}</div>
      </CardContent>
    </Card>
  )
}
