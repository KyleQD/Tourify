"use client"

import { useCallback, useState, useEffect, useMemo } from 'react'
import Link from "next/link"
import { BarChart3, Download, LineChart, Ticket, TrendingUp, Share2, DollarSign, Target, Settings, Tag, RotateCcw, Plus, Edit, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast as sonnerToast } from "sonner"
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
import { useActingContext } from "@/hooks/use-acting-context"
import { mapAdminScopeError, readAdminErrorMessage } from "@/lib/admin/admin-request"
import { TicketingReadModelPanel } from "@/components/admin/ticketing/ticketing-read-model-panel"
import { InventoryLedgerTable } from "@/components/admin/ticketing/inventory-ledger-table"
import { TicketingSetupPanel } from "@/components/admin/ticketing/ticketing-setup-panel"
import { AllocationMatrixPanel } from "@/components/admin/ticketing/allocation-matrix-panel"
import { GuestApprovalsPanel } from "@/components/admin/ticketing/guest-approvals-panel"
import { AdmissionsDevicesPanel } from "@/components/admin/ticketing/admissions-devices-panel"

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

function buildNoStoreInit(
  actingHeaders: Record<string, string>,
  input?: RequestInit,
): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

type AdminRequestBuilder = (input?: RequestInit) => RequestInit

export default function TicketingPage() {
  const { actingAccount, actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const adminRequest = useCallback(
    (input?: RequestInit) => buildNoStoreInit(actingHeaders, input),
    [actingHeaders],
  )
  const [metrics, setMetrics] = useState<TicketingMetrics | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [sales, setSales] = useState<TicketSale[]>([])
  const [campaigns, setCampaigns] = useState<TicketCampaign[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [socialPerformance, setSocialPerformance] = useState<SocialMediaPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedContextKey, setLoadedContextKey] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string }>>([])
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const actingOrgLabel = actingAccount?.profile_data?.display_name
    ? `Showing ${actingAccount.profile_data.display_name}`
    : 'Showing the selected organization account only'

  const fetchEvents = useCallback(async () => {
    if (!isActingReady) return
    try {
      setEvents([])
      const response = await fetch('/api/admin/events', adminRequest())
      
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
  }, [adminRequest, isActingReady])

  const fetchTicketingData = useCallback(async () => {
    if (!isActingReady) return
    try {
      setLoading(true)
      setLoadError(null)
      setMetrics(null)
      setTicketTypes([])
      setSales([])
      setCampaigns([])
      setPromoCodes([])
      setSocialPerformance([])

      const selectedEventForRequest = loadedContextKey === actingContextKey
        ? selectedEvent
        : 'all'
      const eventFilter = selectedEventForRequest !== 'all'
        ? `&event_id=${selectedEventForRequest}`
        : ''

      const [
        overviewResponse,
        ticketTypesResponse,
        salesResponse,
        campaignsResponse,
        promoCodesResponse,
        socialResponse,
      ] = await Promise.all([
        fetch(`/api/admin/ticketing/enhanced?type=overview${eventFilter}`, adminRequest()),
        fetch(`/api/admin/ticketing/enhanced?type=ticket_types${eventFilter}`, adminRequest()),
        fetch(`/api/admin/ticketing/enhanced?type=sales${eventFilter}`, adminRequest()),
        fetch(`/api/admin/ticketing/enhanced?type=campaigns${eventFilter}`, adminRequest()),
        fetch(`/api/admin/ticketing/enhanced?type=promo_codes${eventFilter}`, adminRequest()),
        fetch(`/api/admin/ticketing/enhanced?type=social_performance${eventFilter}`, adminRequest()),
      ])

      if (!overviewResponse.ok) {
        const message = await readAdminErrorMessage(overviewResponse)
        const mapped = mapAdminScopeError(overviewResponse.status, null, message)
        setLoadError(mapped.message)
        setMetrics(null)
        toast({
          title: mapped.title,
          description: mapped.message,
          variant: 'destructive',
        })
        return
      }

      const [
        overviewData,
        ticketTypesData,
        salesData,
        campaignsData,
        promoCodesData,
        socialData,
      ] = await Promise.all([
        overviewResponse.json(),
        ticketTypesResponse.json(),
        salesResponse.json(),
        campaignsResponse.json(),
        promoCodesResponse.json(),
        socialResponse.json(),
      ])

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

      setTicketTypes(ticketTypesResponse.ok ? (ticketTypesData.ticket_types || []) : [])
      setSales(salesResponse.ok ? (salesData.sales || []) : [])
      setCampaigns(campaignsResponse.ok ? (campaignsData.campaigns || []) : [])
      setPromoCodes(promoCodesResponse.ok ? (promoCodesData.promo_codes || []) : [])
      setSocialPerformance(
        socialResponse.ok
          ? mapApiSocialPerformanceToUi(socialData.social_performance)
          : [],
      )
    } catch (error) {
      console.error('Error fetching ticketing data:', error)
      const message = error instanceof Error
        ? error.message
        : 'Failed to load ticketing data for this organization.'
      setLoadError(message)
      setMetrics(null)
      setTicketTypes([])
      setSales([])
      setCampaigns([])
      setPromoCodes([])
      setSocialPerformance([])
      toast({
        title: 'Unable to load ticketing',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoadedContextKey(actingContextKey)
      setLoading(false)
    }
  }, [actingContextKey, adminRequest, isActingReady, loadedContextKey, selectedEvent, toast])

  useEffect(() => {
    setSelectedEvent('all')
  }, [actingContextKey])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    void fetchTicketingData()
  }, [fetchTicketingData])

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

  if (loading || !isActingReady || loadedContextKey !== actingContextKey) {
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
        subtitle="Organization overview, with live event workspaces for sales and admissions."
        icon={Ticket}
        actions={selectedEvent !== 'all' ? <Button asChild variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"><Link href={`/admin/dashboard/events/${selectedEvent}?tab=tickets`}>Open event workspace</Link></Button> : undefined}
      />

      <div className="rounded-md border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
        {actingOrgLabel}
      </div>

      {loadError ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </div>
      ) : null}

      <TicketingReadModelPanel eventId={selectedEvent !== "all" ? selectedEvent : null} />

      {/* TIX-502 — Canonical inventory ledger */}
      <InventoryLedgerTable eventId={selectedEvent !== "all" ? selectedEvent : null} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm flex flex-wrap gap-0.5">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <BarChart3 className="h-4 w-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Settings className="h-4 w-4" />Setup
          </TabsTrigger>
          <TabsTrigger value="allocations" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Download className="h-4 w-4" />Allocations
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <DollarSign className="h-4 w-4" />Guests
          </TabsTrigger>
          <TabsTrigger value="admissions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Ticket className="h-4 w-4" />Admissions
          </TabsTrigger>
          <TabsTrigger value="ticket-types" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Ticket className="h-4 w-4" />Ticket Types
          </TabsTrigger>
          <TabsTrigger value="promo-codes" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Tag className="h-4 w-4" />Promo Codes
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <RotateCcw className="h-4 w-4" />Refunds
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Target className="h-4 w-4" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <TrendingUp className="h-4 w-4" />Analytics
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Share2 className="h-4 w-4" />Sharing
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Settings className="h-4 w-4" />Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Metrics Cards — never show zero KPIs for a failed org-scoped load */}
          {!loadError && metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard title="Total Tickets Sold" value={formatNumber(metrics.total_tickets_sold || 0)} icon={Ticket} color="purple" size="lg" change={metrics.weekly_trend || undefined} trend={(metrics.weekly_trend ?? 0) > 0 ? 'up' : (metrics.weekly_trend ?? 0) < 0 ? 'down' : 'neutral'} />
            <AdminStatCard title="Revenue Generated" value={formatCurrency(metrics.revenue_generated || 0)} icon={DollarSign} color="green" size="lg" change={metrics.revenue_trend || undefined} trend={(metrics.revenue_trend ?? 0) > 0 ? 'up' : (metrics.revenue_trend ?? 0) < 0 ? 'down' : 'neutral'} />
            <AdminStatCard title="Conversion Rate" value={`${metrics.conversion_rate || 0}%`} icon={TrendingUp} color="blue" size="lg" />
            <AdminStatCard title="Social Shares" value={formatNumber(metrics.social_shares || 0)} icon={Share2} color="cyan" size="lg" />
          </div>
          ) : null}

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
                      <div className="space-y-3 py-4 text-center">
                        <p className="text-slate-400">No ticket types available</p>
                        <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-200">
                          <Link href="/admin/dashboard/events">Open events</Link>
                        </Button>
                      </div>
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                          {sales.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                                No transactions found
                              </td>
                            </tr>
                          ) : (
                            sales.slice(0, 10).map((sale) => (
                              <TransactionRow
                                key={sale.id}
                                id={sale.order_number}
                                saleId={sale.id}
                                customer={sale.customer_name}
                                event={getSaleEventTitle(sale)}
                                ticketType={sale.ticket_type?.name || 'Unknown Type'}
                                amount={formatCurrency(sale.total_amount)}
                                date={formatSafeDate(sale.purchase_date)}
                                status={sale.payment_status}
                                onRefundSuccess={() => { void fetchTicketingData() }}
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
            eventId={selectedEvent === 'all' ? null : selectedEvent}
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
                <Button variant="outline" size="sm" onClick={() => sonnerToast.info('Ticket code settings are configured per event — open an event to edit.')}>Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Email notifications</p>
                  <p className="text-xs text-slate-400">Send email confirmations for ticket purchases</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => sonnerToast.info('Email notification settings are managed under Organization Settings.')}>Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Social sharing tracking</p>
                  <p className="text-xs text-slate-400">Track social media shares and conversions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => sonnerToast.info('Social tracking is configured in the Sharing tab — select an event first.')}>Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ticket Types Tab */}
        <TabsContent value="ticket-types" className="space-y-6">
          <TicketTypesCRUD events={events} selectedEvent={selectedEvent} onEventChange={setSelectedEvent} adminRequest={adminRequest} />
        </TabsContent>

        {/* Promo Codes Tab */}
        <TabsContent value="promo-codes" className="space-y-6">
          <PromoCodesPanel selectedEvent={selectedEvent} adminRequest={adminRequest} />
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-6">
          <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base">Refunded Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <RefundsList selectedEvent={selectedEvent} adminRequest={adminRequest} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIX-501 — Ticketing Setup */}
        <TabsContent value="setup" className="space-y-6">
          <TicketingSetupPanel eventId={selectedEvent !== "all" ? selectedEvent : null} />
        </TabsContent>

        {/* TIX-503 — Allocation Matrix */}
        <TabsContent value="allocations" className="space-y-6">
          <AllocationMatrixPanel eventId={selectedEvent !== "all" ? selectedEvent : null} />
        </TabsContent>

        {/* TIX-504 — Guest & Comp Approvals */}
        <TabsContent value="guests" className="space-y-6">
          <GuestApprovalsPanel eventId={selectedEvent !== "all" ? selectedEvent : null} />
        </TabsContent>

        {/* TIX-509 / TIX-511 — Admissions & Devices */}
        <TabsContent value="admissions" className="space-y-6">
          <AdmissionsDevicesPanel eventId={selectedEvent !== "all" ? selectedEvent : null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TicketTypesCRUD({
  events,
  selectedEvent,
  onEventChange,
  adminRequest,
}: {
  events: any[]
  selectedEvent: string
  onEventChange: (value: string) => void
  adminRequest: AdminRequestBuilder
}) {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingType, setEditingType] = useState<any>(null)
  const [form, setForm] = useState({ name: '', price: '', quantity_available: '', category: 'general', is_active: true })

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'ticket_types' })
      if (selectedEvent && selectedEvent !== 'all') params.set('event_id', selectedEvent)
      const res = await fetch(`/api/admin/ticketing/enhanced?${params}`, adminRequest())
      if (res.ok) { const d = await res.json(); setTypes(d.ticket_types || d.data || []) }
    } finally { setLoading(false) }
  }, [adminRequest, selectedEvent])

  useEffect(() => { void fetchTypes() }, [fetchTypes])

  function openCreate() {
    if (selectedEvent === 'all') {
      sonnerToast.error('Select an event before creating a ticket type')
      return
    }
    setEditingType(null)
    setForm({ name: '', price: '', quantity_available: '', category: 'general', is_active: true })
    setShowDialog(true)
  }
  function openEdit(t: any) {
    setEditingType(t)
    setForm({ name: t.name, price: String(t.price), quantity_available: String(t.quantity_available), category: t.category || 'general', is_active: t.is_active })
    setShowDialog(true)
  }

  async function save() {
    const body = editingType
      ? { action: 'update_ticket_type', id: editingType.id, ...form, price: Number(form.price), quantity_available: Number(form.quantity_available) }
      : { action: 'create_ticket_type', event_id: selectedEvent !== 'all' ? selectedEvent : undefined, ...form, price: Number(form.price), quantity_available: Number(form.quantity_available) }
    const res = await fetch('/api/admin/ticketing/enhanced', adminRequest({ method: editingType ? 'PATCH' : 'POST', body: JSON.stringify(body) }))
    if (res.ok) { sonnerToast.success(editingType ? 'Updated' : 'Created'); setShowDialog(false); void fetchTypes() }
    else { sonnerToast.error('Failed to save') }
  }

  async function toggleActive(t: any) {
    await fetch('/api/admin/ticketing/enhanced', adminRequest({ method: 'PATCH', body: JSON.stringify({ action: 'update_ticket_type', id: t.id, is_active: !t.is_active }) }))
    void fetchTypes()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={selectedEvent} onValueChange={onEventChange}>
          <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700/50 text-white text-sm h-8">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-white">
            <SelectItem value="all">All Events</SelectItem>
            {events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate} disabled={selectedEvent === 'all'} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Type
        </Button>
      </div>
      {types.length === 0 ? (
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50"><CardContent className="text-center py-10"><p className="text-slate-400">No ticket types. Add one above.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {types.map((t: any) => (
            <Card key={t.id} className="rounded-sm bg-slate-900/60 border-slate-700/50">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="text-white text-sm font-medium">{t.name}</p>
                  <p className="text-slate-400 text-xs">${t.price} · {t.quantity_sold}/{t.quantity_available} sold · {t.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>{t.is_active ? 'Active' : 'Paused'}</Badge>
                  <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-white p-1"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggleActive(t)} className="text-slate-400 hover:text-yellow-400 p-1" title={t.is_active ? 'Pause' : 'Activate'}>⏸</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle className="text-white">{editingType ? 'Edit' : 'Add'} Ticket Type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300">Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Price ($)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
              <div><Label className="text-slate-300">Quantity</Label><Input type="number" value={form.quantity_available} onChange={e => setForm(p => ({ ...p, quantity_available: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
            </div>
            <div><Label className="text-slate-300">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {['general','vip','premium','early_bird','student','backstage','group'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={save} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PromoCodesPanel({
  selectedEvent,
  adminRequest,
}: {
  selectedEvent: string
  adminRequest: AdminRequestBuilder
}) {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' })

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'promo_codes' })
      if (selectedEvent && selectedEvent !== 'all') params.set('event_id', selectedEvent)
      const res = await fetch(`/api/admin/ticketing/enhanced?${params}`, adminRequest())
      if (res.ok) { const d = await res.json(); setCodes(d.promo_codes || d.data || []) }
    } finally { setLoading(false) }
  }, [adminRequest, selectedEvent])

  useEffect(() => { void fetchCodes() }, [fetchCodes])

  async function createCode() {
    if (selectedEvent === 'all') { sonnerToast.error('Select an event first'); return }
    if (!form.code.trim()) { sonnerToast.error('Code is required'); return }
    if (!form.expires_at) { sonnerToast.error('Expiration date is required'); return }
    const res = await fetch('/api/admin/ticketing/enhanced', adminRequest({ method: 'POST', body: JSON.stringify({ action: 'create_promo_code', event_id: selectedEvent, ...form, discount_value: Number(form.discount_value), max_uses: form.max_uses ? Number(form.max_uses) : null }) }))
    if (res.ok) { sonnerToast.success('Promo code created'); setShowDialog(false); setForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' }); void fetchCodes() }
    else { sonnerToast.error('Failed to create') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={selectedEvent === 'all'} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8"><Plus className="h-3.5 w-3.5 mr-1.5" />Create Promo Code</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle className="text-white">Create Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-slate-300">Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" className="bg-slate-800/50 border-slate-700/50 text-white font-mono" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-300">Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white"><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed ($)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-300">Discount {form.discount_type === 'percentage' ? '%' : '$'}</Label><Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-300">Max Uses</Label><Input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
                <div><Label className="text-slate-300">Expires At</Label><Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button onClick={createCode} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {codes.length === 0 ? (
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50"><CardContent className="text-center py-10"><p className="text-slate-400">No promo codes yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {codes.map((c: any) => (
            <Card key={c.id} className="rounded-sm bg-slate-900/60 border-slate-700/50">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div><p className="text-white font-mono font-bold text-sm">{c.code}</p><p className="text-slate-400 text-xs">{c.discount_value}{c.discount_type === 'percentage' ? '%' : '$'} off · {c.current_uses || 0}/{c.max_uses || '∞'} uses</p></div>
                <Badge className={c.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>{c.is_active !== false ? 'Active' : 'Disabled'}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function RefundsList({
  selectedEvent,
  adminRequest,
}: {
  selectedEvent: string
  adminRequest: AdminRequestBuilder
}) {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ type: 'sales' })
    if (selectedEvent && selectedEvent !== 'all') params.set('event_id', selectedEvent)
    fetch(`/api/admin/ticketing/enhanced?${params}`, adminRequest())
      .then(r => r.ok ? r.json() : { sales: [] })
      .then(d => setRefunds((d.sales || d.data || []).filter((s: any) => s.payment_status === 'refunded')))
      .finally(() => setLoading(false))
  }, [adminRequest, selectedEvent])

  if (loading) return <p className="text-slate-400 text-sm text-center py-8">Loading refunds...</p>
  if (refunds.length === 0) return <p className="text-slate-400 text-sm text-center py-8">No refunded tickets.</p>
  return (
    <div className="space-y-2">
      {refunds.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-sm">
          <div><p className="text-white text-sm">{s.buyer_name || 'Unknown'}</p><p className="text-slate-400 text-xs">{s.buyer_email}</p></div>
          <div className="text-right"><p className="text-white text-sm font-medium">${s.total_amount}</p><Badge className="bg-red-500/20 text-red-400 text-xs">Refunded</Badge></div>
        </div>
      ))}
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
  saleId?: string
  customer: string
  event: string
  ticketType: string
  amount: string
  date: string
  status: string
  onRefundSuccess?: () => void
}

function TransactionRow({ id, saleId, customer, event, ticketType, amount, date, status, onRefundSuccess }: TransactionRowProps) {
  const [refunding, setRefunding] = useState(false)

  const getStatusBadge = () => {
    switch (status) {
      case "paid":
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case "refunded":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Refunded</Badge>
      case "pending":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pending</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  async function handleRefund() {
    if (!saleId || !confirm('Issue a refund for this sale?')) return
    setRefunding(true)
    try {
      const res = await fetch('/api/admin/ticketing/refund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: saleId, reason: 'Admin-issued refund' }),
      })
      if (!res.ok) {
        const d = await res.json()
        sonnerToast.error(d.error || 'Refund failed')
      } else {
        sonnerToast.success('Refund issued successfully')
        onRefundSuccess?.()
      }
    } catch {
      sonnerToast.error('Refund request failed')
    } finally {
      setRefunding(false)
    }
  }

  const canRefund = saleId && (status === 'paid' || status === 'completed')

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{id}</td>
      <td className="px-4 py-3 text-slate-300">{customer}</td>
      <td className="px-4 py-3 text-slate-300">{event}</td>
      <td className="px-4 py-3 text-slate-300">{ticketType}</td>
      <td className="px-4 py-3 text-slate-300">{amount}</td>
      <td className="px-4 py-3 text-slate-400">{date}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        {canRefund && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefund}
            disabled={refunding}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2"
          >
            {refunding ? '...' : 'Refund'}
          </Button>
        )}
      </td>
    </tr>
  )
}
