"use client"

import { supabase } from '@/lib/supabase'
import React, { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Music, Users, DollarSign, TrendingUp, MapPin, Clock, Heart, MessageSquare, ShoppingBag, Calendar } from "lucide-react"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"

interface AnalyticsData {
  streaming: {
    total: number
    platforms: {
      name: string
      count: number
      color: string
    }[]
    daily: {
      date: string
      count: number
    }[]
  }
  revenue: {
    total: number
    sources: {
      name: string
      amount: number
      color: string
    }[]
    monthly: {
      month: string
      amount: number
    }[]
  }
  audience: {
    total: number
    demographics: {
      age: string
      count: number
      color: string
    }[]
    locations: {
      country: string
      count: number
    }[]
  }
  engagement: {
    total: number
    platforms: {
      name: string
      count: number
      color: string
    }[]
    daily: {
      date: string
      count: number
    }[]
  }
  content: {
    music: number
    videos: number
    photos: number
    blog: number
  }
}

export function AnalyticsDashboard() {
  const { user, stats } = useArtist()
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("30d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
    }
  }, [user, timeRange])

  const loadAnalyticsData = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // Load content counts
      const [
        { data: musicData },
        { data: videosData },
        { data: photosData },
        { data: blogData },
        { data: merchandiseData },
        { data: eventsData }
      ] = await Promise.all([
        supabase.from('artist_works').select('id').eq('user_id', user.id).eq('media_type', 'audio'),
        supabase.from('artist_works').select('id').eq('user_id', user.id).eq('media_type', 'video'),
        supabase.from('artist_works').select('id').eq('user_id', user.id).eq('media_type', 'image'),
        supabase.from('artist_blog_posts').select('id, stats').eq('user_id', user.id),
        supabase.from('artist_merchandise').select('id, price, inventory_count').eq('user_id', user.id),
        supabase.from('artist_events').select('id, status').eq('user_id', user.id)
      ])

      // Calculate blog engagement
      const blogStats = blogData?.reduce((acc, post) => {
        const postStats = post.stats || { views: 0, likes: 0, comments: 0, shares: 0 }
        return {
          views: acc.views + (postStats.views || 0),
          likes: acc.likes + (postStats.likes || 0),
          comments: acc.comments + (postStats.comments || 0),
          shares: acc.shares + (postStats.shares || 0)
        }
      }, { views: 0, likes: 0, comments: 0, shares: 0 }) || { views: 0, likes: 0, comments: 0, shares: 0 }

      // Calculate merchandise value
      const merchandiseStats = merchandiseData?.reduce((acc, item) => ({
        totalValue: acc.totalValue + (item.price * item.inventory_count),
        totalItems: acc.totalItems + 1
      }), { totalValue: 0, totalItems: 0 }) || { totalValue: 0, totalItems: 0 }

      // Generate sample analytics data based on real content
      const mockPlatformData = [
        { name: "Spotify", count: Math.floor(stats.totalStreams * 0.4), color: "#1DB954" },
        { name: "Apple Music", count: Math.floor(stats.totalStreams * 0.25), color: "#FA243C" },
        { name: "YouTube", count: Math.floor(stats.totalStreams * 0.2), color: "#FF0000" },
        { name: "SoundCloud", count: Math.floor(stats.totalStreams * 0.1), color: "#FF5500" },
        { name: "Other", count: Math.floor(stats.totalStreams * 0.05), color: "#666666" }
      ]

      // Generate daily data for the last 30 days
      const dailyData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 1000) + 500
        }
      })

      const monthlyRevenue = [
        { month: "Jan", amount: Math.floor(Math.random() * 5000) + 2000 },
        { month: "Feb", amount: Math.floor(Math.random() * 5000) + 2000 },
        { month: "Mar", amount: Math.floor(Math.random() * 5000) + 2000 },
        { month: "Apr", amount: Math.floor(Math.random() * 5000) + 2000 },
        { month: "May", amount: Math.floor(Math.random() * 5000) + 2000 },
        { month: "Jun", amount: Math.floor(Math.random() * 5000) + 2000 }
      ]

      const mockEngagementData = [
        { name: "Instagram", count: blogStats.likes + Math.floor(Math.random() * 5000), color: "#E1306C" },
        { name: "Twitter", count: blogStats.shares + Math.floor(Math.random() * 3000), color: "#1DA1F2" },
        { name: "Facebook", count: blogStats.comments + Math.floor(Math.random() * 2000), color: "#4267B2" },
        { name: "TikTok", count: Math.floor(Math.random() * 1000), color: "#000000" }
      ]

      const analyticsData: AnalyticsData = {
        streaming: {
          total: stats.totalStreams,
          platforms: mockPlatformData,
          daily: dailyData
        },
        revenue: {
          total: merchandiseStats.totalValue + Math.floor(Math.random() * 10000),
          sources: [
            { name: "Streaming", amount: Math.floor(stats.totalStreams * 0.001), color: "#8884d8" },
            { name: "Merchandise", amount: merchandiseStats.totalValue, color: "#82ca9d" },
            { name: "Live Shows", amount: Math.floor(Math.random() * 8000), color: "#ffc658" },
            { name: "Other", amount: Math.floor(Math.random() * 2500), color: "#666666" }
          ],
          monthly: monthlyRevenue
        },
        audience: {
          total: stats.totalFans,
          demographics: [
            { age: "18-24", count: Math.floor(stats.totalFans * 0.35), color: "#8884d8" },
            { age: "25-34", count: Math.floor(stats.totalFans * 0.40), color: "#82ca9d" },
            { age: "35-44", count: Math.floor(stats.totalFans * 0.20), color: "#ffc658" },
            { age: "45+", count: Math.floor(stats.totalFans * 0.05), color: "#666666" }
          ],
          locations: [
            { country: "USA", count: Math.floor(stats.totalFans * 0.45) },
            { country: "UK", count: Math.floor(stats.totalFans * 0.20) },
            { country: "Canada", count: Math.floor(stats.totalFans * 0.15) },
            { country: "Germany", count: Math.floor(stats.totalFans * 0.10) },
            { country: "Other", count: Math.floor(stats.totalFans * 0.10) }
          ]
        },
        engagement: {
          total: mockEngagementData.reduce((acc, platform) => acc + platform.count, 0),
          platforms: mockEngagementData,
          daily: dailyData.map(d => ({ ...d, count: Math.floor(d.count * 0.1) }))
        },
        content: {
          music: musicData?.length || 0,
          videos: videosData?.length || 0,
          photos: photosData?.length || 0,
          blog: blogData?.length || 0
        }
      }

      setAnalyticsData(analyticsData)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Analytics Dashboard</CardTitle>
              <p className="text-gray-400 mt-1">Track your performance and growth</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 gap-4 bg-slate-800/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-purple-600">
                <Music className="w-4 h-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="audience" className="data-[state=active]:bg-purple-600">
                <Users className="w-4 h-4 mr-2" />
                Audience
              </TabsTrigger>
              <TabsTrigger value="revenue" className="data-[state=active]:bg-purple-600">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="engagement" className="data-[state=active]:bg-purple-600">
                <Heart className="w-4 h-4 mr-2" />
                Engagement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Streams</p>
                        <h3 className="text-2xl font-bold text-white">
                          {(analyticsData.streaming.total / 1000).toFixed(1)}K
                        </h3>
                        <p className="text-xs text-green-400 mt-1">+12% from last month</p>
                      </div>
                      <Music className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-white">
                          ${analyticsData.revenue.total.toLocaleString()}
                        </h3>
                        <p className="text-xs text-green-400 mt-1">+8% from last month</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Fans</p>
                        <h3 className="text-2xl font-bold text-white">
                          {(analyticsData.audience.total / 1000).toFixed(1)}K
                        </h3>
                        <p className="text-xs text-green-400 mt-1">+15% from last month</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Engagement</p>
                        <h3 className="text-2xl font-bold text-white">
                          {(analyticsData.engagement.total / 1000).toFixed(1)}K
                        </h3>
                        <p className="text-xs text-green-400 mt-1">+25% from last month</p>
                      </div>
                      <Heart className="w-8 h-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Streaming Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.streaming.daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} />
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
                            dataKey="count"
                            stroke="#8B5CF6"
                            fill="#8B5CF6"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.revenue.sources}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {analyticsData.revenue.sources.map((entry, index) => (
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
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Music Tracks</p>
                        <h3 className="text-2xl font-bold text-white">{analyticsData.content.music}</h3>
                      </div>
                      <Music className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Videos</p>
                        <h3 className="text-2xl font-bold text-white">{analyticsData.content.videos}</h3>
                      </div>
                      <MessageSquare className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Photos</p>
                        <h3 className="text-2xl font-bold text-white">{analyticsData.content.photos}</h3>
                      </div>
                      <Users className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Blog Posts</p>
                        <h3 className="text-2xl font-bold text-white">{analyticsData.content.blog}</h3>
                      </div>
                      <MessageSquare className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Streaming Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.streaming.platforms}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {analyticsData.streaming.platforms.map((entry, index) => (
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
            </TabsContent>

            <TabsContent value="audience" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Age Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.audience.demographics}
                            dataKey="count"
                            nameKey="age"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {analyticsData.audience.demographics.map((entry, index) => (
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
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Top Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.audience.locations.map((location, index) => (
                        <div key={location.country} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mr-3"></div>
                            <span className="text-white">{location.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{location.count.toLocaleString()}</span>
                            <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full" 
                                style={{ 
                                  width: `${(location.count / analyticsData.audience.total) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6 mt-6">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.revenue.monthly}>
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
                        <Bar dataKey="amount" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Social Media Platforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.engagement.platforms}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F3F4F6'
                            }} 
                          />
                          <Bar dataKey="count" fill="#EF4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Daily Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.engagement.daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F3F4F6'
                            }} 
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={{ fill: '#EF4444' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 