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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  CreditCard,
  Users,
  Plus,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Star,
  Crown,
  Zap,
} from "lucide-react"

interface SubscriptionTier {
  id: string
  name: string
  description: string
  price: number
  interval: "monthly" | "yearly"
  features: string[]
  subscriber_count: number
  status: "active" | "draft" | "archived"
  created_at: string
  stripe_product_id: string | null
  stripe_price_id: string | null
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-600/20 text-green-400 border-green-600/30",
  draft: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  archived: "bg-gray-600/20 text-gray-400 border-gray-600/30",
}

const TIER_ICONS = [
  <Star key="star" className="h-6 w-6" />,
  <Crown key="crown" className="h-6 w-6" />,
  <Zap key="zap" className="h-6 w-6" />,
]

export default function SubscriptionsPage() {
  const { profile: artistProfile } = useArtist()
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null)
  const [totalSubscribers, setTotalSubscribers] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    interval: "monthly" as "monthly" | "yearly",
    features: "",
    status: "draft" as "active" | "draft" | "archived",
  })

  useEffect(() => {
    loadTiers()
  }, [artistProfile])

  async function loadTiers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("artist_subscription_tiers")
        .select("*")
        .eq("user_id", user.id)
        .order("price", { ascending: true })

      if (error) throw error

      const mapped: SubscriptionTier[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        price: Number(row.price),
        interval: row.interval ?? "monthly",
        features: row.features ?? [],
        subscriber_count: row.subscriber_count ?? 0,
        status: row.status ?? "active",
        created_at: row.created_at,
        stripe_product_id: row.stripe_product_id ?? null,
        stripe_price_id: row.stripe_price_id ?? null,
      }))

      setTiers(mapped)
      setTotalSubscribers(mapped.reduce((sum, t) => sum + t.subscriber_count, 0))
      setMonthlyRevenue(
        mapped
          .filter((t) => t.status === "active")
          .reduce((sum, t) => sum + t.price * t.subscriber_count, 0)
      )
    } catch {
      setTiers([])
      setTotalSubscribers(0)
      setMonthlyRevenue(0)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      price: "",
      interval: "monthly",
      features: "",
      status: "draft",
    })
    setEditingTier(null)
  }

  function openEdit(tier: SubscriptionTier) {
    setEditingTier(tier)
    setFormData({
      name: tier.name,
      description: tier.description,
      price: tier.price.toString(),
      interval: tier.interval,
      features: tier.features.join("\n"),
      status: tier.status,
    })
    setShowCreateDialog(true)
  }

  async function syncTierToStripe(tierId: string) {
    try {
      const res = await fetch("/api/subscriptions/tiers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error("Stripe sync failed:", data.error)
        toast.error("Tier saved, but Stripe sync failed. You can retry from the tier card.")
        return
      }
      toast.success("Tier synced to Stripe")
    } catch {
      toast.error("Tier saved, but Stripe sync failed.")
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        interval: formData.interval,
        features: formData.features.split("\n").filter(Boolean),
        status: formData.status,
      }

      let savedTierId: string

      if (editingTier) {
        const { error } = await supabase
          .from("artist_subscription_tiers")
          .update(payload)
          .eq("id", editingTier.id)

        if (error) throw error
        savedTierId = editingTier.id
        toast.success("Tier updated")
      } else {
        const { data: inserted, error } = await supabase
          .from("artist_subscription_tiers")
          .insert(payload)
          .select("id")
          .single()

        if (error) throw error
        savedTierId = inserted.id
        toast.success("Tier created")
      }

      if (formData.status === "active") {
        await syncTierToStripe(savedTierId)
      }

      setShowCreateDialog(false)
      resetForm()
      loadTiers()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save tier")
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("artist_subscription_tiers")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Tier deleted")
      loadTiers()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete tier")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Subscriptions
              </h1>
              <p className="text-sm text-slate-400">
                Manage your subscription tiers and recurring revenue
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setShowCreateDialog(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Subscription Tier
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {totalSubscribers}
              </div>
              <div className="text-sm text-gray-400">Total Subscribers</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                ${monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-400">Monthly Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {tiers.filter((t) => t.status === "active").length}
              </div>
              <div className="text-sm text-gray-400">Active Tiers</div>
            </CardContent>
          </Card>
        </div>

        {/* Tier cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="bg-slate-900/50 border-slate-700/50 rounded-xl animate-pulse h-64"
              />
            ))}
          </div>
        ) : tiers.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 rounded-xl shadow-lg">
            <CardContent className="py-20 text-center">
              <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No subscription tiers yet
              </h3>
              <p className="text-gray-400 mb-6">
                Create tiers to offer your fans exclusive content and perks
              </p>
              <Button
                onClick={() => {
                  resetForm()
                  setShowCreateDialog(true)
                }}
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier, idx) => (
              <Card
                key={tier.id}
                className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg hover:border-purple-500/50 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-600/20 rounded-lg text-purple-400">
                        {TIER_ICONS[idx % TIER_ICONS.length]}
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">
                          {tier.name}
                        </CardTitle>
                        <Badge className={STATUS_COLORS[tier.status]}>
                          {tier.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white"
                        onClick={() => openEdit(tier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-400"
                        onClick={() => handleDelete(tier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-white">
                    ${tier.price}
                    <span className="text-sm font-normal text-gray-400">
                      /{tier.interval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {tier.description || "No description"}
                  </p>
                  {tier.features.length > 0 && (
                    <ul className="space-y-1.5 text-sm">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-300">
                          <div className="h-1.5 w-1.5 bg-purple-500 rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {tier.subscriber_count} subscribers
                    </span>
                    <span className="text-green-400 font-medium">
                      ${(tier.price * tier.subscriber_count).toFixed(2)}/
                      {tier.interval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    {tier.stripe_price_id ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Synced to Stripe
                      </span>
                    ) : (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Not synced
                      </span>
                    )}
                    {tier.status === "active" && !tier.stripe_price_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-400 hover:text-purple-300 text-xs h-6 px-2"
                        onClick={() => syncTierToStripe(tier.id).then(loadTiers)}
                      >
                        Sync Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "Edit Subscription Tier" : "Create Subscription Tier"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Backstage Pass"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What subscribers get with this tier..."
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, price: e.target.value }))
                  }
                  placeholder="9.99"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>Billing Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      interval: v as "monthly" | "yearly",
                    }))
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((p) => ({
                    ...p,
                    status: v as "active" | "draft" | "archived",
                  }))
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, features: e.target.value }))
                }
                placeholder={"Exclusive tracks\nBehind-the-scenes content\nEarly access to tickets"}
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
                rows={4}
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
                onClick={handleSave}
              >
                {editingTier ? "Save Changes" : "Create Tier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
