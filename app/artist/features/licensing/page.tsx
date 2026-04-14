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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  FileText,
  DollarSign,
  Plus,
  Music,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  Trash2,
  Copy,
  AlertCircle,
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface LicensingDeal {
  id: string
  track_name: string
  licensee_name: string
  licensee_company: string | null
  license_type: string
  usage_context: string | null
  territory: string
  duration_months: number | null
  fee: number
  royalty_percentage: number | null
  status: string
  notes: string | null
  created_at: string
}

interface LicenseTemplate {
  id: string
  name: string
  license_type: string
  base_fee: number
  royalty_percentage: number
  terms: string
  created_at: string
}

const LICENSE_TYPES = [
  "sync",
  "mechanical",
  "master_use",
  "performance",
  "blanket",
  "custom",
]

const LICENSE_TYPE_LABELS: Record<string, string> = {
  sync: "Sync License",
  mechanical: "Mechanical License",
  master_use: "Master Use",
  performance: "Performance",
  blanket: "Blanket License",
  custom: "Custom",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  active: "bg-green-600/20 text-green-400 border-green-600/30",
  negotiating: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  expired: "bg-gray-600/20 text-gray-400 border-gray-600/30",
  rejected: "bg-red-600/20 text-red-400 border-red-600/30",
}

export default function LicensingPage() {
  const { artistProfile } = useArtist()
  const [deals, setDeals] = useState<LicensingDeal[]>([])
  const [templates, setTemplates] = useState<LicenseTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("deals")
  const [showDealDialog, setShowDealDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [totalLicensingRevenue, setTotalLicensingRevenue] = useState(0)
  const [activeDealCount, setActiveDealCount] = useState(0)

  const [dealForm, setDealForm] = useState({
    track_name: "",
    licensee_name: "",
    licensee_company: "",
    license_type: "sync",
    usage_context: "",
    territory: "Worldwide",
    duration_months: "12",
    fee: "",
    royalty_percentage: "",
    status: "pending",
    notes: "",
  })

  const [templateForm, setTemplateForm] = useState({
    name: "",
    license_type: "sync",
    base_fee: "",
    royalty_percentage: "",
    terms: "",
  })

  useEffect(() => {
    loadData()
  }, [artistProfile])

  async function loadData() {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [dealsRes, templatesRes] = await Promise.all([
        supabase
          .from("artist_licensing_deals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_license_templates")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ])

      const dealData: LicensingDeal[] = (dealsRes.data ?? []).map((r: any) => ({
        id: r.id,
        track_name: r.track_name ?? "",
        licensee_name: r.licensee_name ?? "",
        licensee_company: r.licensee_company,
        license_type: r.license_type ?? "custom",
        usage_context: r.usage_context,
        territory: r.territory ?? "Worldwide",
        duration_months: r.duration_months,
        fee: Number(r.fee ?? 0),
        royalty_percentage: r.royalty_percentage != null ? Number(r.royalty_percentage) : null,
        status: r.status ?? "pending",
        notes: r.notes,
        created_at: r.created_at,
      }))

      const tmplData: LicenseTemplate[] = (templatesRes.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? "",
        license_type: r.license_type ?? "custom",
        base_fee: Number(r.base_fee ?? 0),
        royalty_percentage: Number(r.royalty_percentage ?? 0),
        terms: r.terms ?? "",
        created_at: r.created_at,
      }))

      setDeals(dealData)
      setTemplates(tmplData)
      setTotalLicensingRevenue(
        dealData
          .filter((d) => d.status === "active")
          .reduce((s, d) => s + d.fee, 0)
      )
      setActiveDealCount(dealData.filter((d) => d.status === "active").length)
    } catch {
      setDeals([])
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  async function saveDeal() {
    if (!dealForm.track_name || !dealForm.licensee_name) {
      toast.error("Track name and licensee are required")
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("artist_licensing_deals").insert({
        user_id: user.id,
        track_name: dealForm.track_name,
        licensee_name: dealForm.licensee_name,
        licensee_company: dealForm.licensee_company || null,
        license_type: dealForm.license_type,
        usage_context: dealForm.usage_context || null,
        territory: dealForm.territory,
        duration_months: dealForm.duration_months ? parseInt(dealForm.duration_months) : null,
        fee: parseFloat(dealForm.fee || "0"),
        royalty_percentage: dealForm.royalty_percentage
          ? parseFloat(dealForm.royalty_percentage)
          : null,
        status: dealForm.status,
        notes: dealForm.notes || null,
      })

      if (error) throw error
      toast.success("Licensing deal created")
      setShowDealDialog(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create deal")
    }
  }

  async function saveTemplate() {
    if (!templateForm.name) {
      toast.error("Template name is required")
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("artist_license_templates").insert({
        user_id: user.id,
        name: templateForm.name,
        license_type: templateForm.license_type,
        base_fee: parseFloat(templateForm.base_fee || "0"),
        royalty_percentage: parseFloat(templateForm.royalty_percentage || "0"),
        terms: templateForm.terms,
      })

      if (error) throw error
      toast.success("Template created")
      setShowTemplateDialog(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create template")
    }
  }

  async function deleteDeal(id: string) {
    try {
      const { error } = await supabase
        .from("artist_licensing_deals")
        .delete()
        .eq("id", id)
      if (error) throw error
      toast.success("Deal removed")
      loadData()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete deal")
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const { error } = await supabase
        .from("artist_license_templates")
        .delete()
        .eq("id", id)
      if (error) throw error
      toast.success("Template removed")
      loadData()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete template")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Licensing
              </h1>
              <p className="text-sm text-slate-400">
                Manage music licensing deals, templates, and revenue
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {formatSafeCurrency(totalLicensingRevenue)}
              </div>
              <div className="text-sm text-gray-400">Licensing Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{activeDealCount}</div>
              <div className="text-sm text-gray-400">Active Deals</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl shadow-lg">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{templates.length}</div>
              <div className="text-sm text-gray-400">License Templates</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-slate-800/50 border-slate-700/50 rounded-xl p-1">
              <TabsTrigger value="deals" className="rounded-lg">
                Licensing Deals
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-lg">
                Templates
              </TabsTrigger>
            </TabsList>
            <Button
              className="bg-purple-600 hover:bg-purple-700 rounded-xl"
              onClick={() =>
                activeTab === "deals"
                  ? setShowDealDialog(true)
                  : setShowTemplateDialog(true)
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === "deals" ? "New Deal" : "New Template"}
            </Button>
          </div>

          {/* Deals tab */}
          <TabsContent value="deals">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-slate-800/50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : deals.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-700/50 rounded-xl">
                <CardContent className="py-16 text-center">
                  <Music className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No licensing deals yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Start licensing your music for commercial use
                  </p>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                    onClick={() => setShowDealDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Deal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="bg-slate-900/50 border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-purple-600/20 rounded-lg text-purple-400">
                            <Music className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {deal.track_name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {deal.licensee_name}
                              {deal.licensee_company &&
                                ` · ${deal.licensee_company}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="border-slate-600 text-gray-300 text-xs"
                              >
                                {LICENSE_TYPE_LABELS[deal.license_type] ??
                                  deal.license_type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {deal.territory}
                              </span>
                              {deal.duration_months && (
                                <span className="text-xs text-gray-500">
                                  · {deal.duration_months} months
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-400">
                              {formatSafeCurrency(deal.fee)}
                            </div>
                            {deal.royalty_percentage != null && (
                              <div className="text-xs text-gray-400">
                                +{deal.royalty_percentage}% royalties
                              </div>
                            )}
                          </div>
                          <Badge className={STATUS_COLORS[deal.status] ?? STATUS_COLORS.pending}>
                            {deal.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-400"
                            onClick={() => deleteDeal(deal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates tab */}
          <TabsContent value="templates">
            {templates.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-700/50 rounded-xl">
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No license templates
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Create reusable templates to speed up licensing negotiations
                  </p>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                    onClick={() => setShowTemplateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tmpl) => (
                  <Card
                    key={tmpl.id}
                    className="bg-slate-900/50 border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-base">
                          {tmpl.name}
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-red-400"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-gray-300"
                      >
                        {LICENSE_TYPE_LABELS[tmpl.license_type] ??
                          tmpl.license_type}
                      </Badge>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Base Fee</span>
                        <span className="text-green-400 font-medium">
                          {formatSafeCurrency(tmpl.base_fee)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Royalty</span>
                        <span className="text-purple-400 font-medium">
                          {tmpl.royalty_percentage}%
                        </span>
                      </div>
                      {tmpl.terms && (
                        <p className="text-xs text-gray-500 line-clamp-3">
                          {tmpl.terms}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Deal Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Licensing Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Track Name</Label>
              <Input
                value={dealForm.track_name}
                onChange={(e) =>
                  setDealForm((p) => ({ ...p, track_name: e.target.value }))
                }
                placeholder="Song or album title"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Licensee Name</Label>
                <Input
                  value={dealForm.licensee_name}
                  onChange={(e) =>
                    setDealForm((p) => ({ ...p, licensee_name: e.target.value }))
                  }
                  placeholder="Contact name"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={dealForm.licensee_company}
                  onChange={(e) =>
                    setDealForm((p) => ({
                      ...p,
                      licensee_company: e.target.value,
                    }))
                  }
                  placeholder="Company name"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>License Type</Label>
                <Select
                  value={dealForm.license_type}
                  onValueChange={(v) =>
                    setDealForm((p) => ({ ...p, license_type: v }))
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {LICENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LICENSE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={dealForm.status}
                  onValueChange={(v) =>
                    setDealForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Usage Context</Label>
              <Input
                value={dealForm.usage_context}
                onChange={(e) =>
                  setDealForm((p) => ({ ...p, usage_context: e.target.value }))
                }
                placeholder="e.g. TV commercial, film soundtrack"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fee ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dealForm.fee}
                  onChange={(e) =>
                    setDealForm((p) => ({ ...p, fee: e.target.value }))
                  }
                  placeholder="5000"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>Royalty %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dealForm.royalty_percentage}
                  onChange={(e) =>
                    setDealForm((p) => ({
                      ...p,
                      royalty_percentage: e.target.value,
                    }))
                  }
                  placeholder="5"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>Duration (mo)</Label>
                <Input
                  type="number"
                  min="1"
                  value={dealForm.duration_months}
                  onChange={(e) =>
                    setDealForm((p) => ({
                      ...p,
                      duration_months: e.target.value,
                    }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={dealForm.notes}
                onChange={(e) =>
                  setDealForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Additional notes..."
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="border-slate-700 text-white rounded-xl"
                onClick={() => setShowDealDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={saveDeal}
              >
                Create Deal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>New License Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Standard Sync License"
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label>License Type</Label>
              <Select
                value={templateForm.license_type}
                onValueChange={(v) =>
                  setTemplateForm((p) => ({ ...p, license_type: v }))
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {LICENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LICENSE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Fee ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={templateForm.base_fee}
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, base_fee: e.target.value }))
                  }
                  placeholder="5000"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label>Royalty %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={templateForm.royalty_percentage}
                  onChange={(e) =>
                    setTemplateForm((p) => ({
                      ...p,
                      royalty_percentage: e.target.value,
                    }))
                  }
                  placeholder="5"
                  className="bg-slate-800/50 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Terms &amp; Conditions</Label>
              <Textarea
                value={templateForm.terms}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, terms: e.target.value }))
                }
                placeholder="Standard licensing terms..."
                className="bg-slate-800/50 border-slate-700 text-white mt-1"
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="border-slate-700 text-white rounded-xl"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={saveTemplate}
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
