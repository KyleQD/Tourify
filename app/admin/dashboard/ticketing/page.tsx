"use client"

import { useState, useEffect, useMemo } from 'react'
import { BarChart3, Download, LineChart, Ticket, TrendingUp, Share2, DollarSign, Target, Settings } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { TicketSharingTools } from "@/components/ticketing/ticket-sharing-tools"
import { CampaignManager } from "@/components/ticketing/campaign-manager"
import { type TicketingMetrics, type TicketType, type TicketSale, type TicketCampaign, type PromoCode, type SocialMediaPerformance } from "@/types/ticketing"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"

/** API aggregates use `clicks`, `conversions`, `revenue`; UI uses ticketing types. */
function mapApiSocialPerformanceToUi(rows: unknown[]): SocialMediaPerformance[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row, index) => {
    const r = row as Record<string, unknown>
    const clicks = Number(r.clicks ?? r.clicks_count ?? 0)
    const conversions = Number(r.conversions ?? r.conversions_count ?? 0)
    const revenue = Number(r.revenue ?? r.revenue_generated ?? 0)
    const platform = String(r.platform ?? 'unknown')
    return {
      id: String(r.id ?? `${platform}-${index}`),
      event_id: String(r.event_id ?? ''),
      platform,
      post_id: typeof r.post_id === 'string' ? r.post_id : undefined,
      post_url: typeof r.post_url === 'string' ? r.post_url : undefined,
      shares_count: Number(r.shares_count ?? 0),
      clicks_count: clicks,
      conversions_count: conversions,
      revenue_generated: revenue,
      engagement_rate: Number(r.engagement_rate ?? 0),
      post_date: typeof r.post_date === 'string' ? r.post_date : undefined,
      created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
      conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    }
  })
}

export default function TicketingPage() {
  const [metrics, setMetrics] = useState<TicketingMetrics | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [sales, setSales] = useState<TicketSale[]>([])
  const [campaigns, setCampaigns] = useState<TicketCampaign[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [socialPerformance, setSocialPerformance] = useState<SocialMediaPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string }>>([])
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    fetchTicketingData()
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const raw = data.events || []
        setEvents(
          raw.map((event: any) => {
            const normalizedEvent = normalizeAdminEvent(event)
            return {
              id: normalizedEvent.id,
              title: normalizedEvent.name || 'Untitled',
              event_date: normalizedEvent.event_date || '',
            }
          })
        )
      } else {
        console.error('Failed to fetch events')
        setEvents([])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    }
  }

  const fetchTicketingData = async () => {
    try {
      setLoading(true)
      
      // Build query parameters for event filtering
      const eventFilter = selectedEvent !== 'all' ? `&event_id=${selectedEvent}` : ''
      
      // Fetch comprehensive overview
      const overviewResponse = await fetch(`/api/admin/ticketing/enhanced?type=overview${eventFilter}`)
      const overviewData = await overviewResponse.json()
      
      if (overviewResponse.ok) {
        setMetrics({
          total_tickets_sold: overviewData.metrics?.total_tickets_sold || 0,
          revenue_generated: overviewData.metrics?.total_revenue || 0,
          average_ticket_price: overviewData.metrics?.average_ticket_price || 0,
          weekly_trend: overviewData.metrics?.weekly_trend || 0,
          revenue_trend: overviewData.metrics?.revenue_trend || 0,
          conversion_rate: overviewData.metrics?.conversion_rate || 0,
          social_shares: overviewData.metrics?.social_shares || 0,
          referral_revenue: overviewData.metrics?.referral_revenue || 0
        })
      } else {
        // Set default metrics if API is not ready
        setMetrics({
          total_tickets_sold: 0,
          revenue_generated: 0,
          average_ticket_price: 0,
          weekly_trend: 0,
          revenue_trend: 0,
          conversion_rate: 0,
          social_shares: 0,
          referral_revenue: 0
        })
      }

      // Fetch ticket types
      const ticketTypesResponse = await fetch(`/api/admin/ticketing/enhanced?type=ticket_types${eventFilter}`)
      const ticketTypesData = await ticketTypesResponse.json()
      
      if (ticketTypesResponse.ok) {
        setTicketTypes(ticketTypesData.ticket_types || [])
      } else {
        setTicketTypes([])
      }

      // Fetch sales
      const salesResponse = await fetch(`/api/admin/ticketing/enhanced?type=sales${eventFilter}`)
      const salesData = await salesResponse.json()
      
      if (salesResponse.ok) {
        setSales(salesData.sales || [])
      } else {
        setSales([])
      }

      // Fetch campaigns
      const campaignsResponse = await fetch(`/api/admin/ticketing/enhanced?type=campaigns${eventFilter}`)
      const campaignsData = await campaignsResponse.json()
      
      if (campaignsResponse.ok) {
        setCampaigns(campaignsData.campaigns || [])
      } else {
        setCampaigns([])
      }

      // Fetch promo codes
      const promoCodesResponse = await fetch(`/api/admin/ticketing/enhanced?type=promo_codes${eventFilter}`)
      const promoCodesData = await promoCodesResponse.json()
      
      if (promoCodesResponse.ok) {
        setPromoCodes(promoCodesData.promo_codes || [])
      } else {
        setPromoCodes([])
      }

      // Fetch social performance
      const socialResponse = await fetch(`/api/admin/ticketing/enhanced?type=social_performance${eventFilter}`)
      const socialData = await socialResponse.json()
      
      if (socialResponse.ok) {
        setSocialPerformance(mapApiSocialPerformanceToUi(socialData.social_performance))
      } else {
        setSocialPerformance([])
      }

    } catch (error) {
      console.error('Error fetching ticketing data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load ticketing data. Some features may not be available.',
        variant: 'destructive'
      })
      
      // Set default data on error
      setMetrics({
        total_tickets_sold: 0,
        revenue_generated: 0,
        average_ticket_price: 0,
        weekly_trend: 0,
        revenue_trend: 0,
        conversion_rate: 0,
        social_shares: 0,
        referral_revenue: 0
      })
      setTicketTypes([])
      setSales([])
      setCampaigns([])
      setPromoCodes([])
      setSocialPerformance([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const selectedEventData = useMemo(
    () => events.find((event) => event.id === selectedEvent),
    [events, selectedEvent]
  )

  function getSaleEventTitle(sale: TicketSale) {
    const anySale = sale as any
    if (anySale?.event && typeof anySale.event.title === 'string') return anySale.event.title as string
    if (typeof anySale?.event_title === 'string') return anySale.event_title as string
    return 'Unknown Event'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Ticketing"
          subtitle="Manage ticket sales and analytics"
          icon={Ticket}
        />
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ticketing"
        subtitle="Manage ticket sales and analytics"
        icon={Ticket}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <Target className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Sharing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard title="Total Tickets Sold" value={formatNumber(metrics?.total_tickets_sold || 0)} icon={Ticket} color="purple" size="lg" change={metrics?.weekly_trend || undefined} trend={(metrics?.weekly_trend ?? 0) > 0 ? 'up' : (metrics?.weekly_trend ?? 0) < 0 ? 'down' : 'neutral'} />
            <AdminStatCard title="Revenue Generated" value={formatCurrency(metrics?.revenue_generated || 0)} icon={DollarSign} color="green" size="lg" change={metrics?.revenue_trend || undefined} trend={(metrics?.revenue_trend ?? 0) > 0 ? 'up' : (metrics?.revenue_trend ?? 0) < 0 ? 'down' : 'neutral'} />
            <AdminStatCard title="Conversion Rate" value={`${metrics?.conversion_rate || 0}%`} icon={TrendingUp} color="blue" size="lg" />
            <AdminStatCard title="Social Shares" value={formatNumber(metrics?.social_shares || 0)} icon={Share2} color="cyan" size="lg" />
          </div>

          {/* Ticket Types and Sales Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg font-semibold text-white flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5 text-purple-500" />
                      Ticket Sales Overview
                    </CardTitle>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-800/70 border-slate-700">
                          <SelectValue placeholder="Select Event" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="all">All Events</SelectItem>
                          {events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-700"
                        onClick={() => {
                          const header = 'Order,Customer,Event,Amount,Date,Status\n'
                          const rows = sales.map(s => [s.order_number, s.customer_name, getSaleEventTitle(s), s.total_amount, s.purchase_date, s.payment_status].join(',')).join('\n')
                          const blob = new Blob([header + rows], { type: 'text/csv' })
                          const u = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href = u; a.download = 'ticket-sales.csv'; a.click()
                          URL.revokeObjectURL(u)
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full relative bg-slate-800/30 rounded-sm border border-slate-700/50 backdrop-blur-sm overflow-hidden p-4">
                    <TicketSalesChart sales={sales} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white">Ticket Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ticketTypes.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No ticket types available</p>
                    ) : (
                      ticketTypes.map((ticketType) => (
                        <TicketTypeItem
                          key={ticketType.id}
                          name={ticketType.name}
                          price={formatCurrency(ticketType.price)}
                          sold={ticketType.quantity_sold}
                          total={ticketType.quantity_available}
                          percentage={ticketType.quantity_available > 0 
                            ? Math.round((ticketType.quantity_sold / ticketType.quantity_available) * 100)
                            : 0
                          }
                          soldOut={ticketType.quantity_sold >= ticketType.quantity_available}
                          category={ticketType.category}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions */}
          <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm mb-4">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10"
                  >
                    All Transactions
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10"
                  >
                    Completed
                  </TabsTrigger>
                  <TabsTrigger
                    value="refunded"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10"
                  >
                    Refunded
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="rounded-md border border-slate-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Order #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Event
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Ticket Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                          {sales.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                No transactions found
                              </td>
                            </tr>
                          ) : (
                            sales.slice(0, 10).map((sale) => (
                              <TransactionRow
                                key={sale.id}
                                id={sale.order_number}
                                customer={sale.customer_name}
                                event={getSaleEventTitle(sale)}
                                ticketType={sale.ticket_type?.name || 'Unknown Type'}
                                amount={formatCurrency(sale.total_amount)}
                                date={formatSafeDate(sale.purchase_date)}
                                status={sale.payment_status}
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  <div className="rounded-md border border-slate-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Order #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Event
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Ticket Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                          {sales.filter(sale => sale.payment_status === 'paid').slice(0, 10).map((sale) => (
                            <TransactionRow
                              key={sale.id}
                              id={sale.order_number}
                              customer={sale.customer_name}
                              event={getSaleEventTitle(sale)}
                              ticketType={sale.ticket_type?.name || 'Unknown Type'}
                              amount={formatCurrency(sale.total_amount)}
                              date={formatSafeDate(sale.purchase_date)}
                              status={sale.payment_status}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="refunded" className="mt-0">
                  <div className="rounded-md border border-slate-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Order #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Event
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Ticket Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                          {sales.filter(sale => sale.payment_status === 'refunded').slice(0, 10).map((sale) => (
                            <TransactionRow
                              key={sale.id}
                              id={sale.order_number}
                              customer={sale.customer_name}
                              event={getSaleEventTitle(sale)}
                              ticketType={sale.ticket_type?.name || 'Unknown Type'}
                              amount={formatCurrency(sale.total_amount)}
                              date={formatSafeDate(sale.purchase_date)}
                              status={sale.payment_status}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignManager 
            campaigns={campaigns}
            promoCodes={promoCodes}
            onRefresh={fetchTicketingData}
          />
        </TabsContent>

        <TabsContent value="sharing" className="space-y-6">
          <TicketSharingTools
            eventId={selectedEvent === 'all' ? '' : selectedEvent}
            event={selectedEvent !== 'all' ? selectedEventData ? {
              id: selectedEvent,
              title: selectedEventData.title || 'Selected Event',
              date: selectedEventData.event_date || new Date().toISOString(),
              location: 'Event Location'
            } : {
              id: selectedEvent,
              title: 'Selected Event',
              date: new Date().toISOString(),
              location: 'Event Location'
            } : {
              id: '',
              title: 'All Events',
              date: new Date().toISOString(),
              location: 'Multiple Locations'
            }}
            ticketTypes={ticketTypes}
            onShare={(platform, data) => {
              toast({
                title: 'Shared Successfully',
                description: `Event shared on ${platform}`,
              })
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Social Performance */}
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Social Media Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {socialPerformance.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No social performance data available</p>
                  ) : (
                    socialPerformance.map((performance) => (
                      <div key={performance.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <Share2 className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{performance.platform}</p>
                            <p className="text-xs text-slate-400">{performance.clicks_count} clicks</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-400">
                            {formatCurrency(performance.revenue_generated)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {performance.conversion_rate?.toFixed(1)}% conversion
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaign Performance */}
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No campaigns available</p>
                  ) : (
                    campaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-sm">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{campaign.name}</p>
                          <p className="text-xs text-slate-400">{campaign.campaign_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-400">
                            {campaign.current_uses}/{campaign.max_uses || '∞'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {campaign.usage_percentage?.toFixed(1)}% used
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Ticketing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Auto-generate ticket codes</p>
                  <p className="text-xs text-slate-400">Automatically generate unique codes for new ticket types</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Email notifications</p>
                  <p className="text-xs text-slate-400">Send email confirmations for ticket purchases</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Social sharing tracking</p>
                  <p className="text-xs text-slate-400">Track social media shares and conversions</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


function TicketSalesChart({ sales }: { sales: any[] }) {
  const chartData = useMemo(() => {
    if (!sales || sales.length === 0) return []
    const grouped: Record<string, { date: string; revenue: number; tickets: number }> = {}
    sales.forEach((s: any) => {
      const d = s.purchase_date ? new Date(s.purchase_date).toISOString().slice(0, 10) : null
      if (!d) return
      if (!grouped[d]) grouped[d] = { date: d, revenue: 0, tickets: 0 }
      grouped[d].revenue += Number(s.total_amount) || 0
      grouped[d].tickets += Number(s.quantity) || 1
    })
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [sales])

  if (chartData.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
        <LineChart className="h-10 w-10 text-slate-500 mb-3 opacity-70" />
        <p className="text-sm text-slate-300 font-medium">No sales data yet</p>
        <p className="text-xs text-slate-500 mt-1">Sales will appear here as tickets are sold.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          itemStyle={{ color: '#c084fc' }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#a855f7" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue ($)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface TicketTypeItemProps {
  name: string
  price: string
  sold: number
  total: number
  percentage: number
  soldOut?: boolean
  category?: string
}

function TicketTypeItem({ name, price, sold, total, percentage, soldOut, category }: TicketTypeItemProps) {
  return (
    <div className="bg-slate-800/50 rounded-sm p-3 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-medium text-slate-200">{name}</div>
          <div className="text-xs text-slate-400">{price} per ticket</div>
          {category && <p className="text-xs text-slate-500 mt-1">{category}</p>}
        </div>
        {soldOut && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Sold Out</Badge>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-slate-500">
            {sold} / {total} sold
          </div>
          <div className="text-xs text-purple-400">{percentage}%</div>
        </div>
        <Progress value={percentage} className="h-1.5 bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </Progress>
      </div>
    </div>
  )
}

interface TransactionRowProps {
  id: string
  customer: string
  event: string
  ticketType: string
  amount: string
  date: string
  status: string
}

function TransactionRow({ id, customer, event, ticketType, amount, date, status }: TransactionRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case "refunded":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Refunded</Badge>
      case "pending":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pending</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{id}</td>
      <td className="px-4 py-3 text-slate-300">{customer}</td>
      <td className="px-4 py-3 text-slate-300">{event}</td>
      <td className="px-4 py-3 text-slate-300">{ticketType}</td>
      <td className="px-4 py-3 text-slate-300">{amount}</td>
      <td className="px-4 py-3 text-slate-400">{date}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
    </tr>
  )
}
