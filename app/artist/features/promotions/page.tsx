"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Megaphone,
  Plus,
  Eye,
  MousePointer,
  TrendingUp,
  DollarSign,
  Calendar,
  Play,
  Pause,
  Trash2,
  BarChart3,
  Target,
  Users,
  AlertCircle,
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  budget: number
  spent: number
  start_date: string | null
  end_date: string | null
  platforms: string[]
  objectives: string[]
  description: string | null
  metrics: {
    impressions: number
    reach: number
    engagement: number
    clicks: number
    conversions: number
  }
  created_at: string
}

const CAMPAIGN_TYPES = [
  { value: "song_release", label: "Song Release" },
  { value: "album_release", label: "Album Release" },
  { value: "tour_promotion", label: "Tour Promotion" },
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "custom", label: "Custom" },
]

const PLATFORMS = ["Instagram", "Facebook", "Twitter", "YouTube", "TikTok", "Spotify"]

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-600/20 text-green-400 border-green-600/30",
  draft: "bg-gray-600/20 text-gray-400 border-gray-600/30",
  paused: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  completed: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  cancelled: "bg-red-600/20 text-red-400 border-red-600/30",
}

export default function PromotionsPage() {
  const { profile: artistProfile } = useArtist()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    type: "song_release",
    budget: "",
    start_date: "",
    end_date: "",
    platforms: [] as string[],
    description: "",
  })

  useEffect(() => {
    loadCampaigns()
  }, [artistProfile])

  async function loadCampaigns() {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("artist_marketing_campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      const mapped: Campaign[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        budget: Number(row.budget ?? 0),
        spent: Number(row.spent ?? 0),
        start_date: row.start_date,
        end_date: row.end_date,
        platforms: row.platforms ?? [],
        objectives: row.objectives ?? [],
        description: row.description,
        metrics: row.metrics ?? {
          impressions: 0,
          reach: 0,
          engagement: 0,
          clicks: 0,
          conversions: 0,
        },
        created_at: row.created_at,
      }))

      setCampaigns(mapped)
    } catch {
      setCampaigns([])
    } finally {
      setIsLoading(false)
    }
  }

  const totalReach = campaigns.reduce((s, c) => s + (c.metrics.reach || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.metrics.clicks || 0), 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length

  function togglePlatform(platform: string) {
    setFormData((p) => ({
      ...p,
      platforms: p.platforms.includes(platform)
        ? p.platforms.filter((pl) => pl !== platform)
        : [...p.platforms, platform],
    }))
  }

  async function createCampaign() {
    if (!formData.name) {
      toast.error("Campaign name is required")
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("artist_marketing_campaigns")
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          status: "draft",
          budget: parseFloat(formData.budget || "0"),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          platforms: formData.platforms,
          description: formData.description || null,
        })

      if (error) throw error
      toast.success("Campaign created")
      setShowCreateDialog(false)
      setFormData({
        name: "",
        type: "song_release",
        budget: "",
        start_date: "",
        end_date: "",
        platforms: [],
        description: "",
      })
      loadCampaigns()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create campaign")
    }
  }

  async function toggleCampaignStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active"
    try {
      const { error } = await supabase
        .from("artist_marketing_campaigns")
        .update({ status: newStatus })
        .eq("id", campaign.id)

      if (error) throw error
      toast.success(`Campaign ${newStatus}`)
      loadCampaigns()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update campaign")
    }
  }

  async function deleteCampaign(id: string) {
    try {
      const { error } = await supabase
        .from("artist_marketing_campaigns")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Campaign deleted")
      loadCampaigns()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete campaign")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Promotions
              </h1>
              <p className="text-sm text-slate-400">
                Create and manage promotional campaigns to reach more fans
              </p>
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-700 rounded-xl"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Analytics overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Megaphone className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Active Campaigns</span>
              </div>
              <div className="text-2xl font-bold text-white">{activeCampaigns}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-sm text-gray-400">Total Reach</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {totalReach.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <MousePointer className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-sm text-gray-400">Total Clicks</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {totalClicks.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-600/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="text-sm text-gray-400">Total Spent</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatSafeCurrency(totalSpent)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 rounded-xl shadow-lg">
            <CardContent className="py-20 text-center">
              <Megaphone className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No campaigns yet
              </h3>
              <p className="text-gray-400 mb-6">
                Launch your first promotional campaign to grow your audience
              </p>
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const budgetPct =
                campaign.budget > 0
                  ? Math.min((campaign.spent / campaign.budget) * 100, 100)
                  : 0

              return (
                <Card
                  key={campaign.id}
                  className="bg-slate-900/50 border-slate-700/50 rounded-xl shadow-lg hover:border-purple-500/30 transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-white">
                            {campaign.name}
                          </h3>
                          <Badge className={STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          {CAMPAIGN_TYPES.find((t) => t.value === campaign.type)?.label ?? campaign.type}
                          {campaign.start_date &&
                            ` · ${format(new Date(campaign.start_date), "MMM d, yyyy")}`}
                          {campaign.end_date &&
                            ` - ${format(new Date(campaign.end_date), "MMM d, yyyy")}`}
                        </p>
                        {campaign.platforms.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {campaign.platforms.map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="border-slate-600 text-gray-300 text-xs"
                              >
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleCampaignStatus(campaign)}
                          title={campaign.status === "active" ? "Pause" : "Activate"}
                        >
                          {campaign.status === "active" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-red-400"
                          onClick={() => deleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-2 bg-slate-800/40 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Impressions</div>
                        <div className="font-semibold text-white">
                          {campaign.metrics.impressions.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/40 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Reach</div>
                        <div className="font-semibold text-white">
                          {campaign.metrics.reach.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/40 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Engagement</div>
                        <div className="font-semibold text-white">
                          {campaign.metrics.engagement.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/40 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Clicks</div>
                        <div className="font-semibold text-white">
                          {campaign.metrics.clicks.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/40 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Conversions</div>
                        <div className="font-semibold text-white">
                          {campaign.metrics.conversions.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Budget bar */}
                    {campaign.budget > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>
                            Budget: {formatSafeCurrency(campaign.spent)} /{" "}
                            {formatSafeCurrency(campaign.budget)}
                          </span>
                          <span>{budgetPct.toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={budgetPct}
                          className="h-2 bg-slate-800"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>New Promotional Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Summer Single Drop"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, type: v }))
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, budget: e.target.value }))
                  }
                  placeholder="500"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, start_date: e.target.value }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, end_date: e.target.value }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <Button
                    key={platform}
                    type="button"
                    size="sm"
                    variant={
                      formData.platforms.includes(platform)
                        ? "default"
                        : "outline"
                    }
                    className={
                      formData.platforms.includes(platform)
                        ? "bg-purple-600 hover:bg-purple-700 rounded-xl"
                        : "border-slate-600 text-gray-300 rounded-xl hover:border-purple-500"
                    }
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What is this campaign about?"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="border-slate-700 text-white rounded-xl"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={createCampaign}
              >
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
