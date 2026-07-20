"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { format, addDays, isAfter, startOfMonth, endOfMonth } from "date-fns"
import { 
  Share2, 
  Plus, 
  Edit, 
  Trash2,
  Target,
  Users,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Calendar,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  ArrowLeft,
  BarChart3,
  Clock,
  Send,
  Image,
  Video,
  Music,
  MoreHorizontal,
  Play,
  Pause
} from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { upsertCampaignAction, toggleCampaignPauseAction, deleteCampaignAction, updateSocialPostAction, deleteSocialPostAction, createSocialPostAction } from '@/app/lib/actions/marketing.actions'

interface Campaign {
  id?: string
  name: string
  type: 'song_release' | 'album_release' | 'tour_promotion' | 'brand_awareness' | 'engagement' | 'custom'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  budget: number
  spent: number
  start_date: string
  end_date: string
  target_audience?: string
  platforms: string[]
  objectives: string[]
  content_types: string[]
  description?: string
  metrics: {
    impressions: number
    reach: number
    engagement: number
    clicks: number
    conversions: number
  }
  created_at?: string
  updated_at?: string
}

interface SocialPost {
  id?: string
  platform: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'tiktok'
  content: string
  media_type: 'text' | 'image' | 'video' | 'audio'
  media_url?: string
  scheduled_for: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  campaign_id?: string
  hashtags: string[]
  mentions: string[]
  metrics?: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  created_at?: string
}

const CAMPAIGN_TYPES = [
  { value: 'song_release', label: 'Song Release', description: 'Promote a new single' },
  { value: 'album_release', label: 'Album Release', description: 'Launch a new album' },
  { value: 'tour_promotion', label: 'Tour Promotion', description: 'Promote upcoming shows' },
  { value: 'brand_awareness', label: 'Brand Awareness', description: 'Build artist recognition' },
  { value: 'engagement', label: 'Fan Engagement', description: 'Connect with existing fans' },
  { value: 'custom', label: 'Custom', description: 'Create a custom campaign' }
]

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { value: 'twitter', label: 'Twitter', icon: Twitter, color: '#1DA1F2' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { value: 'tiktok', label: 'TikTok', icon: Video, color: '#000000' }
]

export default function MarketingHub() {
  const { user } = useArtist()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [selectedTab, setSelectedTab] = useState("overview")
  const [workingCampaignId, setWorkingCampaignId] = useState<string | null>(null)
  const [workingPostId, setWorkingPostId] = useState<string | null>(null)
  const [showEditPost, setShowEditPost] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  
  const [campaignForm, setCampaignForm] = useState<Campaign>({
    name: '',
    type: 'song_release',
    status: 'draft',
    budget: 0,
    spent: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: addDays(new Date(), 30).toISOString().split('T')[0],
    platforms: [],
    objectives: [],
    content_types: [],
    description: '',
    metrics: {
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      conversions: 0
    }
  })

  const [postForm, setPostForm] = useState<SocialPost>({
    platform: 'instagram',
    content: '',
    media_type: 'text',
    scheduled_for: new Date().toISOString().slice(0, 16),
    status: 'draft',
    hashtags: [],
    mentions: []
  })

  useEffect(() => {
    if (user) {
      loadMarketingData()
    }
  }, [user])

  const loadMarketingData = async () => {
    try {
      setIsLoading(true)

      // Load real campaigns and posts
      const [campaignsRes, postsRes] = await Promise.all([
        supabase
          .from('artist_marketing_campaigns')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('artist_social_posts')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ])

      const realCampaigns = (campaignsRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        budget: Number(c.budget) || 0,
        spent: Number(c.spent) || 0,
        start_date: c.start_date || '',
        end_date: c.end_date || '',
        platforms: c.platforms || [],
        objectives: c.objectives || [],
        content_types: c.content_types || [],
        description: c.description || '',
        metrics: c.metrics || { impressions: 0, reach: 0, engagement: 0, clicks: 0, conversions: 0 },
        created_at: c.created_at,
        updated_at: c.updated_at,
      })) as Campaign[]

      const realPosts = (postsRes.data || []).map((p: any) => ({
        id: p.id,
        platform: p.platform,
        content: p.content,
        media_type: p.media_type,
        media_url: p.media_url || undefined,
        scheduled_for: (p.scheduled_for || new Date().toISOString()).toString().slice(0, 16),
        status: p.status,
        campaign_id: p.campaign_id || undefined,
        hashtags: p.hashtags || [],
        mentions: p.mentions || [],
        metrics: p.metrics || undefined,
        created_at: p.created_at,
      })) as SocialPost[]

      if (realCampaigns.length > 0 || realPosts.length > 0) {
        setCampaigns(realCampaigns)
        setSocialPosts(realPosts)
        return
      }

      // Fallback to small demo set when no data yet
      setCampaigns([])
      setSocialPosts([])
    } catch (error) {
      console.error('Error loading marketing data:', error)
      toast.error('Failed to load marketing data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCampaign = async () => {
    if (!campaignForm.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    try {
      const payload = editingCampaign?.id ? { ...campaignForm, id: editingCampaign.id } : { ...campaignForm }
      const res = await upsertCampaignAction(payload as any)
      if (!res?.data?.success) throw new Error((res?.data as any)?.error || (res as any)?.serverError || 'Failed to save campaign')
      toast.success(editingCampaign ? 'Campaign updated successfully!' : 'Campaign created successfully!')
      await loadMarketingData()
      setShowCreateCampaign(false)
      setEditingCampaign(null)
    } catch (error) {
      console.error('Error saving campaign:', error)
      toast.error('Failed to save campaign')
    }
  }

  const handleCreatePost = async () => {
    if (!postForm.content.trim()) {
      toast.error('Please enter post content')
      return
    }

    try {
      const res = await createSocialPostAction({
        platform: postForm.platform,
        content: postForm.content,
        media_type: postForm.media_type,
        media_url: postForm.media_url,
        scheduled_for: postForm.scheduled_for,
        status: postForm.status,
        campaign_id: postForm.campaign_id,
        hashtags: postForm.hashtags,
        mentions: postForm.mentions,
      })
      if (!res?.data?.success) throw new Error((res?.data as any)?.error || (res as any)?.serverError || 'Failed to create post')

      await loadMarketingData()
      setShowCreatePost(false)
      setPostForm({
        platform: 'instagram',
        content: '',
        media_type: 'text',
        scheduled_for: new Date().toISOString().slice(0, 16),
        status: 'draft',
        hashtags: [],
        mentions: []
      })
      toast.success('Post created successfully!')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const getMarketingStats = () => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0)
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.metrics.impressions, 0)
    const totalEngagement = campaigns.reduce((sum, c) => sum + c.metrics.engagement, 0)
    const scheduledPosts = socialPosts.filter(p => p.status === 'scheduled').length

    return {
      activeCampaigns,
      totalBudget,
      totalSpent,
      budgetRemaining: totalBudget - totalSpent,
      totalImpressions,
      totalEngagement,
      scheduledPosts,
      engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions * 100).toFixed(2) : '0'
    }
  }

  const stats = getMarketingStats()

  const getPlatformIcon = (platform: string) => {
    const platformData = PLATFORMS.find(p => p.value === platform)
    return platformData ? platformData.icon : Share2
  }

  const getPlatformColor = (platform: string) => {
    const platformData = PLATFORMS.find(p => p.value === platform)
    return platformData ? platformData.color : '#6B7280'
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
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Marketing Hub</h1>
              <p className="text-gray-400">Manage campaigns and social media</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreatePost(true)} variant="outline" className="border-slate-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
          <Button onClick={() => setShowCreateCampaign(true)} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">{stats.activeCampaigns}</p>
              </div>
              <Target className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Impressions</p>
                <p className="text-2xl font-bold text-white">{stats.totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Engagement Rate</p>
                <p className="text-2xl font-bold text-white">{stats.engagementRate}%</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Budget Remaining</p>
                <p className="text-2xl font-bold text-white">${stats.budgetRemaining.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-3 gap-4 bg-slate-800/50 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Campaigns */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign) => (
                    <div key={campaign.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{campaign.name}</h3>
                        <Badge className={
                          campaign.status === 'active' ? 'bg-green-600/20 text-green-300' :
                          campaign.status === 'completed' ? 'bg-blue-600/20 text-blue-300' :
                          'bg-gray-600/20 text-gray-300'
                        }>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        {campaign.platforms.map(platform => (
                          <span key={platform} className="inline-flex items-center gap-1 mr-2">
                            {React.createElement(getPlatformIcon(platform), { 
                              className: "h-3 w-3", 
                              style: { color: getPlatformColor(platform) } 
                            })}
                            {PLATFORMS.find(p => p.value === platform)?.label}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Budget: ${campaign.budget}</span>
                        <span className="text-gray-400">Spent: ${campaign.spent}</span>
                      </div>
                      <Progress 
                        value={(campaign.spent / campaign.budget) * 100} 
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Posts */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Scheduled Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {socialPosts.filter(p => p.status === 'scheduled').slice(0, 4).map((post) => (
                    <div key={post.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {React.createElement(getPlatformIcon(post.platform), { 
                          className: "h-5 w-5 mt-0.5", 
                          style: { color: getPlatformColor(post.platform) } 
                        })}
                        <div className="flex-1">
                          <p className="text-white text-sm line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(post.scheduled_for), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Marketing Campaigns</h2>
            <Button onClick={() => setShowCreateCampaign(true)} className="bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                        <Badge className={
                          campaign.status === 'active' ? 'bg-green-600/20 text-green-300' :
                          campaign.status === 'completed' ? 'bg-blue-600/20 text-blue-300' :
                          campaign.status === 'paused' ? 'bg-yellow-600/20 text-yellow-300' :
                          'bg-gray-600/20 text-gray-300'
                        }>
                          {campaign.status}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-600/20 text-purple-300">
                          {CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.label}
                        </Badge>
                      </div>

                      {campaign.description && (
                        <p className="text-gray-400 mb-4">{campaign.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-400">{campaign.metrics.impressions.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Impressions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">{campaign.metrics.engagement.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Engagement</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-400">{campaign.metrics.clicks.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Clicks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-400">{campaign.metrics.conversions}</p>
                          <p className="text-xs text-gray-400">Conversions</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Budget: ${campaign.budget} | Spent: ${campaign.spent}
                        </div>
                        <div className="flex items-center gap-2">
                          {campaign.platforms.map(platform => 
                            React.createElement(getPlatformIcon(platform), { 
                              key: platform,
                              className: "h-4 w-4", 
                              style: { color: getPlatformColor(platform) } 
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem 
                          onClick={() => {
                            setEditingCampaign(campaign)
                            setShowCreateCampaign(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        {campaign.status === 'active' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                setWorkingCampaignId(campaign.id || null)
                                // optimistic update
                                setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'paused' } : c))
                                const res = await toggleCampaignPauseAction({ id: campaign.id!, pause: true })
                                if (!res?.data?.success) {
                                  const errMsg = (res?.data as any)?.error || (res as any)?.serverError || 'Failed to pause'
                                  toast.error(errMsg)
                                  loadMarketingData()
                                } else toast.success('Campaign paused')
                                setWorkingCampaignId(null)
                              }}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Campaign
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'paused' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                setWorkingCampaignId(campaign.id || null)
                                setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'active' } : c))
                                const res = await toggleCampaignPauseAction({ id: campaign.id!, pause: false })
                                if (!res?.data?.success) {
                                  const errMsg = (res?.data as any)?.error || (res as any)?.serverError || 'Failed to resume'
                                  toast.error(errMsg)
                                  loadMarketingData()
                                } else toast.success('Campaign resumed')
                                setWorkingCampaignId(null)
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume Campaign
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={async () => {
                          setWorkingCampaignId(campaign.id || null)
                          // optimistic
                          setCampaigns(prev => prev.filter(c => c.id !== campaign.id))
                          const res = await deleteCampaignAction({ id: campaign.id! })
                          if (!res?.data?.success) {
                            const errMsg = (res?.data as any)?.error || (res as any)?.serverError || 'Failed to delete'
                            toast.error(errMsg)
                            loadMarketingData()
                          } else toast.success('Campaign deleted')
                          setWorkingCampaignId(null)
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Campaign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Content Calendar</h2>
            <Button onClick={() => setShowCreatePost(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Post
            </Button>
          </div>

          <div className="space-y-4">
            {socialPosts.map((post) => (
              <Card key={post.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${getPlatformColor(post.platform)}20` }}>
                      {React.createElement(getPlatformIcon(post.platform), { 
                        className: "h-5 w-5", 
                        style: { color: getPlatformColor(post.platform) } 
                      })}
                    </div>
                    
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          post.status === 'published' ? 'bg-green-600/20 text-green-300' :
                          post.status === 'scheduled' ? 'bg-blue-600/20 text-blue-300' :
                          'bg-gray-600/20 text-gray-300'
                        }>
                          {post.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {post.status === 'scheduled' ? 'Scheduled for' : 'Published'} {format(new Date(post.scheduled_for), 'MMM d, h:mm a')}
                        </span>
                         <div className="ml-auto flex items-center gap-2">
                          <Button 
                             variant="ghost" 
                             size="sm"
                             className="text-xs"
                             onClick={async () => {
                              setWorkingPostId(post.id || null)
                              const newStatus = post.status === 'published' ? 'draft' : 'published'
                              // optimistic
                              setSocialPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p))
                              const res = await updateSocialPostAction({ id: post.id!, status: newStatus as any })
                              if (!res?.data?.success) {
                                const errMsg = (res?.data as any)?.error || (res as any)?.serverError || 'Failed to update post'
                                toast.error(errMsg)
                                loadMarketingData()
                              } else toast.success(`Post marked as ${newStatus}`)
                              setWorkingPostId(null)
                             }}
                           >
                             {post.status === 'published' ? 'Mark Draft' : 'Publish'}
                           </Button>
                          <Button 
                             variant="ghost" 
                             size="sm"
                             className="text-red-300 hover:text-red-200"
                             onClick={async () => {
                              setWorkingPostId(post.id || null)
                              // optimistic
                              setSocialPosts(prev => prev.filter(p => p.id !== post.id))
                              const res = await deleteSocialPostAction({ id: post.id! })
                              if (!res?.data?.success) {
                                const errMsg = (res?.data as any)?.error || (res as any)?.serverError || 'Failed to delete post'
                                toast.error(errMsg)
                                loadMarketingData()
                              } else toast.success('Post deleted')
                              setWorkingPostId(null)
                             }}
                           >
                             Delete
                           </Button>
                         </div>
                      </div>
                      
                      <p className="text-white mb-2">{post.content}</p>
                      
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.hashtags.map(tag => (
                            <span key={tag} className="text-xs text-blue-400">#{tag}</span>
                          ))}
                        </div>
                      )}

                      {post.metrics && post.status === 'published' && (
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.metrics.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.metrics.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {post.metrics.shares}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.metrics.views}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Campaign Name</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Campaign name..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Campaign Type</Label>
                <Select 
                  value={campaignForm.type}
                  onValueChange={(value) => setCampaignForm(prev => ({ ...prev, type: value as Campaign['type'] }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-400">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Budget</Label>
                <Input
                  type="number"
                  value={campaignForm.budget || ''}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.start_date}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.end_date}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Platforms</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(platform => (
                  <label key={platform.value} className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={campaignForm.platforms.includes(platform.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCampaignForm(prev => ({ 
                            ...prev, 
                            platforms: [...prev.platforms, platform.value] 
                          }))
                        } else {
                          setCampaignForm(prev => ({ 
                            ...prev, 
                            platforms: prev.platforms.filter(p => p !== platform.value) 
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    {React.createElement(platform.icon, { 
                      className: "h-4 w-4", 
                      style: { color: platform.color } 
                    })}
                    {platform.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={campaignForm.description || ''}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Campaign description..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCampaign} className="bg-pink-600 hover:bg-pink-700">
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Post Modal */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Schedule Social Media Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Platform</Label>
              <Select 
                value={postForm.platform}
                onValueChange={(value) => setPostForm(prev => ({ ...prev, platform: value as SocialPost['platform'] }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <div className="flex items-center gap-2">
                        {React.createElement(platform.icon, { 
                          className: "h-4 w-4", 
                          style: { color: platform.color } 
                        })}
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Content</Label>
              <Textarea
                value={postForm.content}
                onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What's happening?"
                className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Media Type</Label>
                <Select 
                  value={postForm.media_type}
                  onValueChange={(value) => setPostForm(prev => ({ ...prev, media_type: value as SocialPost['media_type'] }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Schedule For</Label>
                <Input
                  type="datetime-local"
                  value={postForm.scheduled_for}
                  onChange={(e) => setPostForm(prev => ({ ...prev, scheduled_for: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePost} className="bg-blue-600 hover:bg-blue-700">
                Schedule Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 