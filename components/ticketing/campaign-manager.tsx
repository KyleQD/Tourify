"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Target,
  Plus,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  Edit,
  Trash2,
  Eye,
  BarChart3
} from 'lucide-react'
import { type TicketCampaign, type PromoCode, CAMPAIGN_TYPES } from '@/types/ticketing'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface CampaignManagerProps {
  campaigns: TicketCampaign[]
  promoCodes: PromoCode[]
  onRefresh: () => void
}

export function CampaignManager({ campaigns, promoCodes, onRefresh }: CampaignManagerProps) {
  const [activeTab, setActiveTab] = useState('campaigns')
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [showCreatePromo, setShowCreatePromo] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({
      title: 'Code copied!',
      description: 'Promo code has been copied to clipboard',
    })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const response = await fetch('/api/admin/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_campaign',
          ...campaignData
        })
      })

      if (response.ok) {
        toast({
          title: 'Campaign Created',
          description: 'New promotional campaign has been created successfully',
        })
        setShowCreateCampaign(false)
        onRefresh()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create campaign',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive'
      })
    }
  }

  const handleCreatePromoCode = async (promoData: any) => {
    try {
      const response = await fetch('/api/admin/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_promo_code',
          ...promoData
        })
      })

      if (response.ok) {
        toast({
          title: 'Promo Code Created',
          description: 'New promotional code has been created successfully',
        })
        setShowCreatePromo(false)
        onRefresh()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create promo code',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create promo code',
        variant: 'destructive'
      })
    }
  }

  const getCampaignStatus = (campaign: TicketCampaign) => {
    const now = new Date()
    const startDate = new Date(campaign.start_date)
    const endDate = new Date(campaign.end_date)

    if (now < startDate) return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400' }
    if (now > endDate) return { status: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' }
    if (campaign.max_uses && campaign.current_uses >= campaign.max_uses) {
      return { status: 'exhausted', label: 'Exhausted', color: 'bg-red-500/20 text-red-400' }
    }
    return { status: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400' }
  }

  const getPromoStatus = (promo: PromoCode) => {
    const now = new Date()
    const startDate = new Date(promo.start_date)
    const endDate = new Date(promo.end_date)

    if (now < startDate) return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400' }
    if (now > endDate) return { status: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' }
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return { status: 'exhausted', label: 'Exhausted', color: 'bg-red-500/20 text-red-400' }
    }
    return { status: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400' }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="promo_codes" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Promo Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Campaigns</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">{campaigns.length}</h3>
                  </div>
                  <div className="bg-purple-500/20 p-2 rounded-md">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Active Campaigns</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {campaigns.filter(c => getCampaignStatus(c).status === 'active').length}
                    </h3>
                  </div>
                  <div className="bg-green-500/20 p-2 rounded-md">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Uses</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {campaigns.reduce((sum, c) => sum + c.current_uses, 0)}
                    </h3>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-md">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns List */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100">Promotional Campaigns</CardTitle>
              <Button onClick={() => setShowCreateCampaign(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns created yet</p>
                    <p className="text-sm">Create your first promotional campaign to boost ticket sales</p>
                  </div>
                ) : (
                  campaigns.map((campaign) => {
                    const status = getCampaignStatus(campaign)
                    const campaignType = CAMPAIGN_TYPES[campaign.campaign_type]
                    
                    return (
                      <div key={campaign.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-slate-200">{campaign.name}</h3>
                              <Badge className={status.color}>{status.label}</Badge>
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                {campaignType?.label}
                              </Badge>
                            </div>
                            
                            {campaign.description && (
                              <p className="text-sm text-slate-400 mb-3">{campaign.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Discount</p>
                                <p className="text-slate-200 font-medium">
                                  {campaign.discount_type === 'percentage' ? `${campaign.discount_value}%` : formatCurrency(campaign.discount_value)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Duration</p>
                                <p className="text-slate-200 font-medium">
                                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Usage</p>
                                <p className="text-slate-200 font-medium">
                                  {campaign.current_uses}/{campaign.max_uses || '∞'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Usage Rate</p>
                                <p className="text-slate-200 font-medium">
                                  {campaign.usage_percentage?.toFixed(1) || 0}%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo_codes" className="space-y-6">
          {/* Promo Codes Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Promo Codes</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">{promoCodes.length}</h3>
                  </div>
                  <div className="bg-green-500/20 p-2 rounded-md">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Active Codes</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {promoCodes.filter(p => getPromoStatus(p).status === 'active').length}
                    </h3>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-md">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Uses</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {promoCodes.reduce((sum, p) => sum + p.current_uses, 0)}
                    </h3>
                  </div>
                  <div className="bg-purple-500/20 p-2 rounded-md">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Promo Codes List */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-slate-100">Promotional Codes</CardTitle>
              <Button onClick={() => setShowCreatePromo(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Promo Code
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promoCodes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No promo codes created yet</p>
                    <p className="text-sm">Create promotional codes to offer discounts to your customers</p>
                  </div>
                ) : (
                  promoCodes.map((promo) => {
                    const status = getPromoStatus(promo)
                    
                    return (
                      <div key={promo.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium text-slate-200 font-mono">{promo.code}</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyCode(promo.code)}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedCode === promo.code ? (
                                    <Check className="h-3 w-3 text-green-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <Badge className={status.color}>{status.label}</Badge>
                            </div>
                            
                            {promo.description && (
                              <p className="text-sm text-slate-400 mb-3">{promo.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Discount</p>
                                <p className="text-slate-200 font-medium">
                                  {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Min Purchase</p>
                                <p className="text-slate-200 font-medium">
                                  {promo.min_purchase_amount > 0 ? formatCurrency(promo.min_purchase_amount) : 'No minimum'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Usage</p>
                                <p className="text-slate-200 font-medium">
                                  {promo.current_uses}/{promo.max_uses || '∞'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Valid Until</p>
                                <p className="text-slate-200 font-medium">
                                  {formatDate(promo.end_date)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <CreateCampaignModal
          onClose={() => setShowCreateCampaign(false)}
          onSubmit={handleCreateCampaign}
        />
      )}

      {/* Create Promo Code Modal */}
      {showCreatePromo && (
        <CreatePromoCodeModal
          onClose={() => setShowCreatePromo(false)}
          onSubmit={handleCreatePromoCode}
        />
      )}
    </div>
  )
}

// Create Campaign Modal Component
function CreateCampaignModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'early_bird' as const,
    discount_type: 'percentage' as const,
    discount_value: 0,
    start_date: '',
    end_date: '',
    max_uses: '',
    applicable_ticket_types: [] as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
      discount_value: parseFloat(formData.discount_value.toString())
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Create Campaign</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign_type">Campaign Type</Label>
              <select
                id="campaign_type"
                value={formData.campaign_type}
                onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as any })}
                className="w-full p-2 border rounded-md bg-background"
              >
                {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <select
                id="discount_type"
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="buy_one_get_one">Buy One Get One</option>
                <option value="free_upgrade">Free Upgrade</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="discount_value">Discount Value</Label>
            <Input
              id="discount_value"
              type="number"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_uses">Max Uses (optional)</Label>
            <Input
              id="max_uses"
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">Create Campaign</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Promo Code Modal Component
function CreatePromoCodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as const,
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: '',
    max_uses: '',
    start_date: '',
    end_date: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
      discount_value: parseFloat(formData.discount_value.toString()),
      min_purchase_amount: parseFloat(formData.min_purchase_amount.toString())
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Create Promo Code</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Promo Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., SUMMER20"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <select
                id="discount_type"
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            <div>
              <Label htmlFor="discount_value">Discount Value</Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_purchase">Min Purchase</Label>
              <Input
                id="min_purchase"
                type="number"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="max_discount">Max Discount</Label>
              <Input
                id="max_discount"
                type="number"
                value={formData.max_discount_amount}
                onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_uses">Max Uses (optional)</Label>
            <Input
              id="max_uses"
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">Create Promo Code</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 