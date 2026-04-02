"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Headphones, Heart, Share2, Download, Calendar, ChevronDown, ChevronUp, Users } from "lucide-react"
import Image from "next/image"
import { formatSafeNumber } from "@/lib/format/number-format"

export function MusicAnalytics() {
  const [timeRange, setTimeRange] = useState("30days")
  const [selectedRelease, setSelectedRelease] = useState("all")

  // Mock data for analytics
  const overviewStats = {
    plays: {
      total: 12580,
      change: 15.3,
    },
    listeners: {
      total: 4250,
      change: 8.7,
    },
    saves: {
      total: 820,
      change: 12.5,
    },
    shares: {
      total: 345,
      change: -2.8,
    },
  }

  // Mock data for top tracks
  const topTracks = [
    {
      id: "track-1",
      title: "Summer Vibes",
      album: "Summer Vibes - Single",
      coverArt: "/placeholder.svg?height=60&width=60&text=Summer+Vibes",
      plays: 4500,
      change: 12.5,
    },
    {
      id: "track-2",
      title: "Midnight Drive",
      album: "Midnight Sessions",
      coverArt: "/placeholder.svg?height=60&width=60&text=Midnight+Sessions",
      plays: 3200,
      change: 8.3,
    },
    {
      id: "track-3",
      title: "Acoustic Dreams",
      album: "Acoustic Sessions EP",
      coverArt: "/placeholder.svg?height=60&width=60&text=Acoustic+Sessions",
      plays: 2800,
      change: -1.2,
    },
    {
      id: "track-4",
      title: "Night Sky",
      album: "Midnight Sessions",
      coverArt: "/placeholder.svg?height=60&width=60&text=Midnight+Sessions",
      plays: 2100,
      change: 5.7,
    },
  ]

  // Mock data for listener demographics
  const listenerDemographics = {
    age: [
      { group: "18-24", percentage: 35 },
      { group: "25-34", percentage: 42 },
      { group: "35-44", percentage: 15 },
      { group: "45-54", percentage: 5 },
      { group: "55+", percentage: 3 },
    ],
    gender: [
      { group: "Male", percentage: 58 },
      { group: "Female", percentage: 40 },
      { group: "Non-binary", percentage: 2 },
    ],
    topCountries: [
      { country: "United States", percentage: 45, flag: "🇺🇸" },
      { country: "United Kingdom", percentage: 12, flag: "🇬🇧" },
      { country: "Germany", percentage: 8, flag: "🇩🇪" },
      { country: "Canada", percentage: 7, flag: "🇨🇦" },
      { country: "Australia", percentage: 5, flag: "🇦🇺" },
    ],
    platforms: [
      { name: "Spotify", percentage: 52, icon: "🎧" },
      { name: "Apple Music", percentage: 28, icon: "🎵" },
      { name: "YouTube Music", percentage: 12, icon: "▶️" },
      { name: "Amazon Music", percentage: 5, icon: "📱" },
      { name: "Other", percentage: 3, icon: "🎶" },
    ],
  }

  // Mock data for releases
  const releases = [
    {
      id: "all",
      title: "All Releases",
    },
    {
      id: "album-1",
      title: "Midnight Sessions",
      type: "Album",
    },
    {
      id: "ep-1",
      title: "Acoustic Sessions",
      type: "EP",
    },
    {
      id: "single-1",
      title: "Summer Vibes",
      type: "Single",
    },
    {
      id: "single-2",
      title: "Night Drive",
      type: "Single",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Select value={selectedRelease} onValueChange={setSelectedRelease}>
          <SelectTrigger className="bg-gray-800 border-gray-700 w-full sm:w-[200px]">
            <SelectValue placeholder="Select release" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {releases.map((release) => (
              <SelectItem key={release.id} value={release.id}>
                {release.title} {release.type && `(${release.type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="bg-gray-800 border-gray-700 w-full sm:w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
              <SelectItem value="alltime">All time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="border-gray-700">
            <Calendar className="h-4 w-4 mr-2" />
            Custom
          </Button>

          <Button variant="outline" className="border-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Plays</p>
                <p className="text-2xl font-bold">{formatSafeNumber(overviewStats.plays.total)}</p>
              </div>
              <Headphones className="h-8 w-8 text-purple-500 opacity-80" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Badge
                variant="outline"
                className={`${
                  overviewStats.plays.change >= 0
                    ? "text-green-500 border-green-500/20"
                    : "text-red-500 border-red-500/20"
                }`}
              >
                {overviewStats.plays.change >= 0 ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(overviewStats.plays.change)}%
              </Badge>
              <span className="ml-2 text-gray-400">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Unique Listeners</p>
                <p className="text-2xl font-bold">{formatSafeNumber(overviewStats.listeners.total)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Badge
                variant="outline"
                className={`${
                  overviewStats.listeners.change >= 0
                    ? "text-green-500 border-green-500/20"
                    : "text-red-500 border-red-500/20"
                }`}
              >
                {overviewStats.listeners.change >= 0 ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(overviewStats.listeners.change)}%
              </Badge>
              <span className="ml-2 text-gray-400">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Saves/Likes</p>
                <p className="text-2xl font-bold">{formatSafeNumber(overviewStats.saves.total)}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500 opacity-80" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Badge
                variant="outline"
                className={`${
                  overviewStats.saves.change >= 0
                    ? "text-green-500 border-green-500/20"
                    : "text-red-500 border-red-500/20"
                }`}
              >
                {overviewStats.saves.change >= 0 ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(overviewStats.saves.change)}%
              </Badge>
              <span className="ml-2 text-gray-400">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Shares</p>
                <p className="text-2xl font-bold">{formatSafeNumber(overviewStats.shares.total)}</p>
              </div>
              <Share2 className="h-8 w-8 text-green-500 opacity-80" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Badge
                variant="outline"
                className={`${
                  overviewStats.shares.change >= 0
                    ? "text-green-500 border-green-500/20"
                    : "text-red-500 border-red-500/20"
                }`}
              >
                {overviewStats.shares.change >= 0 ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(overviewStats.shares.change)}%
              </Badge>
              <span className="ml-2 text-gray-400">vs previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>Track plays, listeners, and engagement</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[300px] flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        {/* Top Tracks */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle>Top Tracks</CardTitle>
            <CardDescription>Your most popular tracks</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {topTracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-3">
                  <div className="text-gray-400 font-medium w-5 text-center">{index + 1}</div>
                  <Image
                    src={track.coverArt || "/placeholder.svg"}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-xs text-gray-400 truncate">{track.album}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatSafeNumber(track.plays)}</p>
                    <p
                      className={`text-xs ${
                        track.change >= 0 ? "text-green-500" : "text-red-500"
                      } flex items-center justify-end`}
                    >
                      {track.change >= 0 ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(track.change)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audience Insights */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Audience Insights</CardTitle>
          <CardDescription>Understand who's listening to your music</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="demographics">
            <TabsList className="bg-gray-800">
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="geography">Geography</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
            </TabsList>
            <TabsContent value="demographics" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Age Distribution</h3>
                  {listenerDemographics.age.map((item) => (
                    <div key={item.group} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{item.group}</span>
                        <span className="text-sm">{item.percentage}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-1 bg-gray-700" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Gender Distribution</h3>
                  {listenerDemographics.gender.map((item) => (
                    <div key={item.group} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{item.group}</span>
                        <span className="text-sm">{item.percentage}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-1 bg-gray-700" />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="geography" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Top Countries</h3>
                {listenerDemographics.topCountries.map((item) => (
                  <div key={item.country} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center">
                        <span className="mr-2">{item.flag}</span>
                        {item.country}
                      </span>
                      <span className="text-sm">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-1 bg-gray-700" />
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="platforms" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Streaming Platforms</h3>
                {listenerDemographics.platforms.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center">
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </span>
                      <span className="text-sm">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-1 bg-gray-700" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
