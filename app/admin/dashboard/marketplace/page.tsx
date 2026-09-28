"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ShieldCheck, RefreshCw, ShoppingBag, DollarSign, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { extractApiError } from "@/lib/api/extract-error"

interface ModerationItem {
  id: string
  listing_id: string | null
  order_id: string | null
  reason: string
  details: string | null
  status: "open" | "in_review" | "resolved" | "dismissed"
  created_at: string
  resolution: string | null
  marketplace_listings?: { title?: string | null; seller_user_id?: string | null } | null
  marketplace_orders?: { total_amount?: number | null; payment_status?: string | null } | null
}

export default function AdminMarketplaceModerationPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ModerationItem[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | ModerationItem["status"]>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<"created_at" | "status">("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      params.set("status", statusFilter)
      params.set("sortBy", sortBy)
      params.set("sortDirection", sortDirection)
      if (searchQuery.trim()) params.set("q", searchQuery.trim())

      const response = await fetch(`/api/admin/marketplace/moderation?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      const body = await response.json()
      if (!response.ok) throw new Error(extractApiError(body, "Failed to load moderation queue"))
      setItems(Array.isArray(body.data) ? body.data : [])
      const pagination = body.pagination || {}
      setTotal(Number(pagination.total || 0))
      setTotalPages(Math.max(Number(pagination.totalPages || 1), 1))
    } catch (error) {
      console.error("Failed to load moderation queue", error)
      toast.error("Unable to load marketplace moderation queue")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortDirection])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const filteredItems = useMemo(() => items, [items])

  async function updateStatus(item: ModerationItem, status: ModerationItem["status"]) {
    try {
      setSavingId(item.id)
      const response = await fetch("/api/admin/marketplace/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
          resolution: resolutionDraft[item.id] || item.resolution || null,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(extractApiError(body, "Failed to update moderation item"))
      setItems(current =>
        current.map(existing => (existing.id === item.id ? { ...existing, ...body.data } : existing))
      )
      toast.success("Moderation item updated")
    } catch (error) {
      console.error("Failed to update moderation item", error)
      toast.error("Unable to update moderation item")
    } finally {
      setSavingId(null)
    }
  }

  const openCount = items.filter(item => item.status === "open").length
  const inReviewCount = items.filter(item => item.status === "in_review").length
  const resolvedCount = items.filter(item => item.status === "resolved").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-sm text-slate-300">Orders, moderation, and payouts.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
          <Link href="/admin/dashboard/marketplace/orders">All orders</Link>
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm">
          <TabsTrigger value="orders" className="data-[state=active]:bg-purple-600/80 data-[state=active]:text-white rounded-sm text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />Orders
          </TabsTrigger>
          <TabsTrigger value="moderation" className="data-[state=active]:bg-purple-600/80 data-[state=active]:text-white rounded-sm text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />Moderation
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-purple-600/80 data-[state=active]:text-white rounded-sm text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 pt-4">
          <MarketplaceOrdersList />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Moderation Queue</h2>
                <p className="text-xs text-slate-400">Review reports and resolve disputes.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
          </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={openCount} />
        <StatCard label="In Review" value={inReviewCount} />
        <StatCard label="Resolved" value={resolvedCount} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-300">Status:</span>
        <Select
          value={statusFilter}
          onValueChange={value => {
            setStatusFilter(value as typeof statusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search reason/details/resolution"
          className="max-w-xs"
        />
        <Button
          variant="outline"
          onClick={() => {
            setPage(1)
            void loadQueue()
          }}
        >
          Apply
        </Button>
        <span className="ml-2 text-sm text-slate-300">Sort:</span>
        <Select
          value={sortBy}
          onValueChange={value => {
            setSortBy(value as typeof sortBy)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created At</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={value => {
            setSortDirection(value as typeof sortDirection)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Desc</SelectItem>
            <SelectItem value="asc">Asc</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-1">
          Sort: {sortBy === "created_at" ? "Created At" : "Status"} ({sortDirection.toUpperCase()})
        </Badge>
      </div>

      {loading ? (
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="p-6 text-sm text-slate-300">Loading moderation queue...</CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="p-6 text-sm text-slate-300">No moderation items match this filter.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="border-slate-700/50 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base text-white">
                  <span>{item.reason}</span>
                  <Badge variant="secondary">{item.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                {item.details ? <p>{item.details}</p> : <p>No additional details provided.</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-700/70 p-2">
                    <div className="text-xs uppercase text-slate-400">Listing</div>
                    <div>{item.marketplace_listings?.title || "N/A"}</div>
                  </div>
                  <div className="rounded-md border border-slate-700/70 p-2">
                    <div className="text-xs uppercase text-slate-400">Order</div>
                    <div>
                      {item.marketplace_orders?.total_amount != null
                        ? `${item.marketplace_orders?.payment_status || "unknown"} • $${Number(item.marketplace_orders.total_amount).toFixed(2)}`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <Textarea
                  value={resolutionDraft[item.id] ?? item.resolution ?? ""}
                  onChange={event =>
                    setResolutionDraft(current => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="Add internal resolution notes"
                  rows={3}
                />

                <div className="flex flex-wrap gap-2">
                  {item.order_id ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/dashboard/marketplace/orders/${item.order_id}`}>View Order</Link>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => void updateStatus(item, "in_review")} disabled={savingId === item.id}>
                    Mark In Review
                  </Button>
                  <Button size="sm" onClick={() => void updateStatus(item, "resolved")} disabled={savingId === item.id}>
                    Resolve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void updateStatus(item, "dismissed")} disabled={savingId === item.id}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
        <div>
          Page {page} of {totalPages} • {total} total items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(current => Math.max(current - 1, 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(current => Math.min(current + 1, totalPages))}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4 pt-4">
          <MarketplacePayoutsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MarketplaceOrdersList() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/marketplace/orders?limit=50', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(d => setOrders(d.orders || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-8 text-slate-400">Loading orders...</div>
  if (orders.length === 0) return <div className="text-center py-8 text-slate-400">No orders yet.</div>

  return (
    <div className="space-y-2">
      {orders.map((o: any) => (
        <Card key={o.id} className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div>
              <p className="text-white text-sm font-medium">{o.buyer_name || o.buyer_email || 'Unknown buyer'}</p>
              <p className="text-slate-400 text-xs">{o.item_count} item{o.item_count !== 1 ? 's' : ''} · {new Date(o.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-semibold">${Number(o.total_amount || 0).toFixed(2)}</span>
              <Badge className={o.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : o.payment_status === 'refunded' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                {o.payment_status}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" asChild>
                <a href={`/admin/dashboard/marketplace/orders/${o.id}`}><ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MarketplacePayoutsList() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finances?type=overview', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { transactions: [] })
      .then(d => {
        const all: any[] = d.transactions || []
        setPayouts(all.filter((t: any) => t.category === 'payout' || t.type === 'payout'))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-8 text-slate-400">Loading payouts...</div>

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <DollarSign className="h-10 w-10 text-slate-600 mx-auto" />
        <p className="text-slate-400">No payouts recorded yet.</p>
        <p className="text-xs text-slate-500">Payouts will appear here as transactions are processed with category &quot;payout&quot;.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {payouts.map((p: any) => (
        <Card key={p.id} className="border-slate-700/50 bg-slate-900/50">
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div>
              <p className="text-white text-sm font-medium">{p.description || p.vendor_name || 'Payout'}</p>
              <p className="text-slate-400 text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-semibold">${Number(p.amount || 0).toFixed(2)}</span>
              <Badge className={p.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : p.payment_status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                {p.payment_status || 'pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-slate-700/50 bg-slate-900/50">
      <CardContent className="p-4">
        <div className="text-xs uppercase text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      </CardContent>
    </Card>
  )
}
