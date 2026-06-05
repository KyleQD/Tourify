"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, ExternalLink } from "lucide-react"
import { AdminPageHeader } from "../../components/admin-page-header"
import { AdminPageSkeleton } from "../../components/admin-page-skeleton"
import { AdminEmptyState } from "../../components/admin-empty-state"
import { AdminErrorCard } from "../../components/admin-error-card"
import { AdminFilterBar } from "../../components/admin-filter-bar"
import { AdminStatCard } from "../../components/admin-stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatSafeCurrency, formatSafeDate } from "@/lib/events/admin-event-normalization"

interface Order {
  id: string
  buyer_name?: string
  buyer_email?: string
  total_amount: number
  payment_status: string
  fulfillment_status?: string
  created_at: string
  item_count?: number
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    refunded: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  }
  return map[status] ?? "bg-slate-700/50 text-slate-400"
}

export default function MarketplaceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/marketplace/orders", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load orders")
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchOrders() }, [fetchOrders])

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.payment_status === statusFilter
    const matchSearch =
      !search ||
      (o.buyer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer_email || "").toLowerCase().includes(search.toLowerCase()) ||
      o.id.includes(search)
    return matchStatus && matchSearch
  })

  const totalRevenue = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "completed")
    .reduce((s, o) => s + (o.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketplace Orders"
        subtitle="Customer orders and fulfillment"
        icon={ShoppingBag}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard title="Total Orders" value={orders.length} icon={ShoppingBag} color="blue" isLoading={loading} />
        <AdminStatCard title="Revenue" value={formatSafeCurrency(totalRevenue)} icon={ShoppingBag} color="green" isLoading={loading} />
        <AdminStatCard title="Pending" value={orders.filter((o) => o.payment_status === "pending").length} icon={ShoppingBag} color="orange" isLoading={loading} />
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by buyer name, email, or order ID..."
        searchValue={search}
        onSearchChange={setSearch}
        statusOptions={[
          { value: "all", label: "All Status" },
          { value: "paid", label: "Paid" },
          { value: "pending", label: "Pending" },
          { value: "refunded", label: "Refunded" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {loading ? (
        <AdminPageSkeleton />
      ) : error ? (
        <AdminErrorCard title="Could not load orders" message={error} onRetry={fetchOrders} />
      ) : filtered.length === 0 ? (
        <AdminEmptyState icon={ShoppingBag} title="No orders found" description="Orders will appear here once customers make purchases." />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card key={order.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{order.buyer_name || "Unknown Buyer"}</p>
                    <p className="text-slate-400 text-sm truncate">{order.buyer_email || order.id}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatSafeDate(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-white font-semibold">{formatSafeCurrency(order.total_amount)}</span>
                  <Badge className={statusBadge(order.payment_status)}>{order.payment_status}</Badge>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" asChild>
                    <Link href={`/admin/dashboard/marketplace/orders/${order.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
