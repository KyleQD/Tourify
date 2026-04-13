"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  Globe,
  LineChart,
  Music,
  PieChart,
  Share2,
  Users,
  FileText,
  Video,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

// Mock data for charts
const audienceData = [
  { month: "Jan", followers: 1200, engagement: 3.2 },
  { month: "Feb", followers: 1350, engagement: 3.5 },
  { month: "Mar", followers: 1500, engagement: 3.8 },
  { month: "Apr", followers: 1750, engagement: 4.2 },
  { month: "May", followers: 2000, engagement: 4.5 },
  { month: "Jun", followers: 2250, engagement: 4.8 },
]

const contentData = [
  { month: "Jan", posts: 12, tracks: 2, videos: 1 },
  { month: "Feb", posts: 15, tracks: 3, videos: 2 },
  { month: "Mar", posts: 18, tracks: 2, videos: 1 },
  { month: "Apr", posts: 20, tracks: 4, videos: 3 },
  { month: "May", posts: 22, tracks: 3, videos: 2 },
  { month: "Jun", posts: 25, tracks: 5, videos: 4 },
]

const revenueData = [
  { month: "Jan", streaming: 1200, merchandise: 800, tickets: 2000 },
  { month: "Feb", streaming: 1300, merchandise: 900, tickets: 1500 },
  { month: "Mar", streaming: 1400, merchandise: 1000, tickets: 3000 },
  { month: "Apr", streaming: 1500, merchandise: 1200, tickets: 2500 },
  { month: "May", streaming: 1600, merchandise: 1100, tickets: 4000 },
  { month: "Jun", streaming: 1700, merchandise: 1300, tickets: 5000 },
]

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState("30d")
  const [platformFilter, setPlatformFilter] = useState("all")

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format number with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your performance and audience insights</p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-700">
                {dateRange === "7d" && "Last 7 days"}
                {dateRange === "30d" && "Last 30 days"}
                {dateRange === "90d" && "Last 90 days"}
                {dateRange === "1y" && "Last year"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800">
              <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("90d")}>Last 90 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("1y")}>Last year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="border-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Followers</p>
                    <p className="text-2xl font-bold">2,250</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500 opacity-80" />
                </div>
                <div className="mt-2 flex items-center text-xs">
                  <Badge variant="outline" className="text-green-500 border-green-500/20">
                    +12.5%
                  </Badge>
                  <span className="ml-2 text-gray-400">vs previous period</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Engagement</p>
                    <p className="text-2xl font-bold">4.8%</p>
                  </div>
                  <Share2 className="h-8 w-8 text-blue-500 opacity-80" />
                </div>
                <div className="mt-2 flex items-center text-xs">
                  <Badge variant="outline" className="text-green-500 border-green-500/20">
                    +0.3%
                  </Badge>
                  <span className="ml-2 text-gray-400">vs previous period</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Profile Views</p>
                    <p className="text-2xl font-bold">5.6K</p>
                  </div>
                  <LineChart className="h-8 w-8 text-green-500 opacity-80" />
                </div>
                <div className="mt-2 flex items-center text-xs">
                  <Badge variant="outline" className="text-green-500 border-green-500/20">
                    +18.2%
                  </Badge>
                  <span className="ml-2 text-gray-400">vs previous period</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(8000)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-amber-500 opacity-80" />
                </div>
                <div className="mt-2 flex items-center text-xs">
                  <Badge variant="outline" className="text-green-500 border-green-500/20">
                    +15.7%
                  </Badge>
                  <span className="ml-2 text-gray-400">vs previous period</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
                <CardDescription>Followers and engagement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-full">
                    {/* This would be a real chart in a production app */}
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        {audienceData.map((item, index) => (
                          <div key={index}>{item.month}</div>
                        ))}
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 flex items-end">
                          {audienceData.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-4/5 bg-purple-500 rounded-t"
                                style={{ height: `${(item.followers / 2500) * 100}%` }}
                              ></div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-end">
                          {audienceData.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-1/3 bg-blue-500 rounded-t ml-6"
                                style={{ height: `${(item.engagement / 5) * 100}%` }}
                              ></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                          Followers
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                          Engagement
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>Views and engagement by content type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-full">
                    {/* This would be a real chart in a production app */}
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        {contentData.map((item, index) => (
                          <div key={index}>{item.month}</div>
                        ))}
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 flex items-end">
                          {contentData.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div className="w-full flex justify-center space-x-1">
                                <div
                                  className="w-2 bg-green-500 rounded-t"
                                  style={{ height: `${(item.posts / 30) * 100}%` }}
                                ></div>
                                <div
                                  className="w-2 bg-amber-500 rounded-t"
                                  style={{ height: `${(item.tracks / 6) * 100}%` }}
                                ></div>
                                <div
                                  className="w-2 bg-red-500 rounded-t"
                                  style={{ height: `${(item.videos / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                          Posts
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div>
                          Tracks
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                          Videos
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Your most engaging content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">New Album Announcement</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Post
                      </Badge>
                      <span>June 1, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">3.2K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <Music className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Summer Vibes (New Single)</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Track
                      </Badge>
                      <span>May 15, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1.5K</p>
                    <p className="text-sm text-gray-400">Plays</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Behind the Scenes: Studio Session</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Video
                      </Badge>
                      <span>April 28, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1.8K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Age groups of your audience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>18-24</span>
                      <span>35%</span>
                    </div>
                    <Progress value={35} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>25-34</span>
                      <span>40%</span>
                    </div>
                    <Progress value={40} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>35-44</span>
                      <span>15%</span>
                    </div>
                    <Progress value={15} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>45-54</span>
                      <span>7%</span>
                    </div>
                    <Progress value={7} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>55+</span>
                      <span>3%</span>
                    </div>
                    <Progress value={3} className="h-2 bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Gender breakdown of your audience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center">
                  <PieChart className="h-16 w-16 text-gray-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">55%</div>
                    <div className="text-sm text-gray-400">Male</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">42%</div>
                    <div className="text-sm text-gray-400">Female</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">3%</div>
                    <div className="text-sm text-gray-400">Non-binary</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 md:col-span-2">
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Where your audience is located</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-[300px] flex items-center justify-center">
                    <Globe className="h-16 w-16 text-gray-600" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>United States</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2 bg-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>United Kingdom</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} className="h-2 bg-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Canada</span>
                        <span>10%</span>
                      </div>
                      <Progress value={10} className="h-2 bg-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Australia</span>
                        <span>8%</span>
                      </div>
                      <Progress value={8} className="h-2 bg-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Germany</span>
                        <span>7%</span>
                      </div>
                      <Progress value={7} className="h-2 bg-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Other</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} className="h-2 bg-gray-800" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
              <CardDescription>Where your audience follows you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Platforms</h3>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="streaming">Streaming</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src="/placeholder.svg?height=40&width=40&text=IG" alt="Instagram" />
                    <AvatarFallback>IG</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">Instagram</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Social Media
                      </Badge>
                      <span>+125 new followers this month</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1.2K</p>
                    <p className="text-sm text-gray-400">Followers</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src="/placeholder.svg?height=40&width=40&text=SP" alt="Spotify" />
                    <AvatarFallback>SP</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">Spotify</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Streaming
                      </Badge>
                      <span>+85 new followers this month</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">850</p>
                    <p className="text-sm text-gray-400">Followers</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src="/placeholder.svg?height=40&width=40&text=YT" alt="YouTube" />
                    <AvatarFallback>YT</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">YouTube</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Social Media
                      </Badge>
                      <span>+65 new subscribers this month</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">650</p>
                    <p className="text-sm text-gray-400">Subscribers</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>How your content is performing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">New Album Announcement</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Post
                      </Badge>
                      <span>June 1, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">3.2K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-medium">12.5%</p>
                    <p className="text-sm text-gray-400">Engagement</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Summer Festival Announcement</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Event
                      </Badge>
                      <span>May 20, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">2.8K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-medium">9.8%</p>
                    <p className="text-sm text-gray-400">Engagement</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <Music className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Summer Vibes (New Single)</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Track
                      </Badge>
                      <span>May 15, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1.5K</p>
                    <p className="text-sm text-gray-400">Plays</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-medium">320</p>
                    <p className="text-sm text-gray-400">Saves</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Tour Dates Announced</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Post
                      </Badge>
                      <span>April 15, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">2.1K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-medium">8.3%</p>
                    <p className="text-sm text-gray-400">Engagement</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-gray-800 p-2 rounded-md mr-3">
                    <Video className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">Behind the Scenes: Studio Session</h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <Badge variant="outline" className="mr-2 border-gray-700">
                        Video
                      </Badge>
                      <span>April 28, 2025</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1.8K</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="font-medium">7.5%</p>
                    <p className="text-sm text-gray-400">Engagement</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Content Type Breakdown</CardTitle>
                <CardDescription>Distribution of your content by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <PieChart className="h-16 w-16 text-gray-600" />
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">65%</div>
                    <div className="text-sm text-gray-400">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">15%</div>
                    <div className="text-sm text-gray-400">Tracks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">12%</div>
                    <div className="text-sm text-gray-400">Videos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">8%</div>
                    <div className="text-sm text-gray-400">Events</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Engagement by Content Type</CardTitle>
                <CardDescription>Which content types perform best</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <BarChart3 className="h-16 w-16 text-gray-600" />
                </div>
                <div className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Videos</span>
                      <span>12.5%</span>
                    </div>
                    <Progress value={12.5} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Tracks</span>
                      <span>10.2%</span>
                    </div>
                    <Progress value={10.2} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Events</span>
                      <span>9.8%</span>
                    </div>
                    <Progress value={9.8} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Posts</span>
                      <span>7.5%</span>
                    </div>
                    <Progress value={7.5} className="h-2 bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Total revenue by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <PieChart className="h-16 w-16 text-gray-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">45%</div>
                    <div className="text-sm text-gray-400">Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">30%</div>
                    <div className="text-sm text-gray-400">Streaming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">25%</div>
                    <div className="text-sm text-gray-400">Merch</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 md:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-full">
                    {/* This would be a real chart in a production app */}
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        {revenueData.map((item, index) => (
                          <div key={index}>{item.month}</div>
                        ))}
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 flex items-end">
                          {revenueData.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div className="w-full flex justify-center space-x-1">
                                <div
                                  className="w-2 bg-blue-500 rounded-t"
                                  style={{ height: `${(item.streaming / 2000) * 100}%` }}
                                ></div>
                                <div
                                  className="w-2 bg-green-500 rounded-t"
                                  style={{ height: `${(item.merchandise / 2000) * 100}%` }}
                                ></div>
                                <div
                                  className="w-2 bg-purple-500 rounded-t"
                                  style={{ height: `${(item.tickets / 6000) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                          Streaming
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                          Merchandise
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                          Tickets
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Ticket Sales</CardTitle>
                <CardDescription>Revenue from ticket sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Summer Music Festival</h3>
                      <p className="text-sm text-gray-400">June 15, 2025</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(93750)}</p>
                      <p className="text-sm text-gray-400">1,250 tickets</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Acoustic Sessions</h3>
                      <p className="text-sm text-gray-400">June 5, 2025</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(2400)}</p>
                      <p className="text-sm text-gray-400">75 tickets</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Merchandise Sales</CardTitle>
                <CardDescription>Revenue from merchandise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">T-Shirts</h3>
                      <p className="text-sm text-gray-400">120 units</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(3600)}</p>
                      <p className="text-sm text-gray-400">$30 per unit</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Vinyl Records</h3>
                      <p className="text-sm text-gray-400">85 units</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(2550)}</p>
                      <p className="text-sm text-gray-400">$30 per unit</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
