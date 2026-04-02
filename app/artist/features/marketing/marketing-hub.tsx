"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Mail, Share2, BarChart2, Users, Calendar as CalendarIcon, Send } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Campaign {
  id: string
  title: string
  type: "email" | "social"
  status: "draft" | "scheduled" | "sent"
  scheduledFor?: string
  content: string
  metrics?: CampaignMetrics
}

interface CampaignMetrics {
  opens?: number
  clicks?: number
  engagement?: number
  reach?: number
}

interface SocialPost {
  id: string
  content: string
  platforms: string[]
  scheduledFor?: string
  status: "draft" | "scheduled" | "posted"
  media?: string[]
  metrics?: PostMetrics
}

interface PostMetrics {
  likes: number
  shares: number
  comments: number
  reach: number
}

const socialMetrics = [
  { date: "2024-03-01", followers: 1200, engagement: 4.5, reach: 5000 },
  { date: "2024-03-02", followers: 1250, engagement: 5.2, reach: 6000 },
  { date: "2024-03-03", followers: 1300, engagement: 4.8, reach: 5500 },
  { date: "2024-03-04", followers: 1350, engagement: 5.5, reach: 7000 },
  { date: "2024-03-05", followers: 1400, engagement: 5.8, reach: 8000 },
  { date: "2024-03-06", followers: 1450, engagement: 6.2, reach: 9000 },
  { date: "2024-03-07", followers: 1500, engagement: 6.5, reach: 10000 }
]

export function MarketingHub() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  const createCampaign = (campaign: Omit<Campaign, "id">) => {
    const newCampaign: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      ...campaign
    }
    setCampaigns([...campaigns, newCampaign])
  }

  const createSocialPost = (post: Omit<SocialPost, "id">) => {
    const newPost: SocialPost = {
      id: Math.random().toString(36).substr(2, 9),
      ...post
    }
    setSocialPosts([...socialPosts, newPost])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 gap-4">
              <TabsTrigger value="overview">
                <BarChart2 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                <Mail className="w-4 h-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="social">
                <Share2 className="w-4 h-4 mr-2" />
                Social Media
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Followers</p>
                        <h3 className="text-2xl font-bold">15.2K</h3>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Engagement Rate</p>
                        <h3 className="text-2xl font-bold">6.5%</h3>
                      </div>
                      <BarChart2 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Campaign Reach</p>
                        <h3 className="text-2xl font-bold">10K</h3>
                      </div>
                      <Share2 className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Social Media Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={socialMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="followers" stroke="#8884d8" />
                        <Line type="monotone" dataKey="engagement" stroke="#82ca9d" />
                        <Line type="monotone" dataKey="reach" stroke="#ffc658" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Email Campaigns</h3>
                <Button variant="outline" size="sm">
                  New Campaign
                </Button>
              </div>
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <Card key={campaign.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{campaign.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{campaign.content}</p>
                          <div className="flex items-center mt-2 space-x-2">
                            <Badge variant={
                              campaign.status === "sent" ? "default" :
                              campaign.status === "scheduled" ? "secondary" : "outline"
                            }>
                              {campaign.status.toUpperCase()}
                            </Badge>
                            {campaign.scheduledFor && (
                              <span className="text-sm text-gray-500">
                                Scheduled: {new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(campaign.scheduledFor))}
                              </span>
                            )}
                          </div>
                        </div>
                        {campaign.metrics && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Opens: {campaign.metrics.opens}</p>
                            <p className="text-sm text-gray-500">Clicks: {campaign.metrics.clicks}</p>
                            <p className="text-sm text-gray-500">
                              Engagement: {campaign.metrics.engagement}%
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Social Media Posts</h3>
                <Button variant="outline" size="sm">
                  New Post
                </Button>
              </div>
              <div className="space-y-4">
                {socialPosts.map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500 mb-2">
                            {post.platforms.join(", ")}
                          </p>
                          <p>{post.content}</p>
                          <div className="flex items-center mt-2 space-x-2">
                            <Badge variant={
                              post.status === "posted" ? "default" :
                              post.status === "scheduled" ? "secondary" : "outline"
                            }>
                              {post.status.toUpperCase()}
                            </Badge>
                            {post.scheduledFor && (
                              <span className="text-sm text-gray-500">
                                Scheduled: {new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(post.scheduledFor))}
                              </span>
                            )}
                          </div>
                        </div>
                        {post.metrics && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Likes: {post.metrics.likes}</p>
                            <p className="text-sm text-gray-500">Shares: {post.metrics.shares}</p>
                            <p className="text-sm text-gray-500">Comments: {post.metrics.comments}</p>
                            <p className="text-sm text-gray-500">Reach: {post.metrics.reach}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Calendar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...campaigns, ...socialPosts]
                        .filter(item => item.scheduledFor)
                        .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
                        .map(item => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">
                                {"title" in item ? item.title : item.content.substring(0, 30) + "..."}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Scheduled: {new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(item.scheduledFor!))}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
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