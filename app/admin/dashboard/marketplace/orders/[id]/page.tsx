"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { extractApiError } from "@/lib/api/extract-error"

interface MarketplaceOrderDetails {
  id: string
  status: string
  payment_status: string
  currency: string
  total_amount: number
  created_at: string
  buyer_user_id: string | null
  seller_user_id: string
  marketplace_order_items?: Array<{
    id: string
    title: string
    product_type: string
    quantity: number
    unit_price: number
    line_total: number
    fulfillment_status: string
  }>
  marketplace_payout_ledger?: Array<{
    id: string
    payout_status: string
    net_amount: number
    platform_fee_amount: number
    payout_reference: string | null
    metadata?: {
      retryAttempts?: number
      lastRetryBy?: string
      lastRetryAt?: string
    } | null
  }>
}

export default function AdminMarketplaceOrderDetailsPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<MarketplaceOrderDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryingPayoutId, setRetryingPayoutId] = useState<string | null>(null)

  useEffect(() => {
    void loadOrder()
  }, [params?.id])

  async function loadOrder() {
    try {
      setLoading(true)
      setErrorMessage(null)
      const response = await fetch(`/api/admin/marketplace/orders/${params.id}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      const body = await response.json()
      if (!response.ok) {
        setErrorMessage(extractApiError(body, "Failed to load order details"))
        return
      }
      setOrder(body.data || null)
    } finally {
      setLoading(false)
    }
  }

  async function retryPayout(payoutId: string) {
    try {
      setRetryingPayoutId(payoutId)
      const response = await fetch(`/api/admin/marketplace/payouts/${payoutId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const body = await response.json()
      if (!response.ok) {
        toast.error(extractApiError(body, "Failed to retry payout"))
        return
      }
      toast.success("Payout scheduled for retry")
      await loadOrder()
    } catch (error) {
      console.error("Failed to retry payout", error)
      toast.error("Failed to retry payout")
    } finally {
      setRetryingPayoutId(null)
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-300">Loading order details...</div>
  if (errorMessage) return <div className="p-6 text-sm text-rose-200">{errorMessage}</div>
  if (!order) return <div className="p-6 text-sm text-slate-300">Order not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-300">Detailed moderation and payout context for this order.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard/marketplace">Back to moderation queue</Link>
        </Button>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <div>Status: <Badge variant="secondary" className="ml-1">{order.status}</Badge></div>
          <div>Payment: <Badge variant="secondary" className="ml-1">{order.payment_status}</Badge></div>
          <div>Total: {order.currency || "USD"} {Number(order.total_amount || 0).toFixed(2)}</div>
          <div>Created: {new Date(order.created_at).toLocaleString()}</div>
          <div>Seller: {order.seller_user_id}</div>
          <div>Buyer: {order.buyer_user_id || "Guest/unknown"}</div>
        </CardContent>
      </Card>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Order Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          {(order.marketplace_order_items || []).length === 0 ? (
            <div>No order items.</div>
          ) : (
            order.marketplace_order_items?.map(item => (
              <div key={item.id} className="rounded-md border border-slate-700/60 p-3">
                <div className="font-medium text-white">{item.title}</div>
                <div>
                  {item.product_type} • qty {item.quantity} • {order.currency || "USD"} {Number(item.line_total || 0).toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">Fulfillment: {item.fulfillment_status}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Payout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          {(order.marketplace_payout_ledger || []).length === 0 ? (
            <div>No payout ledger rows.</div>
          ) : (
            order.marketplace_payout_ledger?.map(row => (
              <div key={row.id} className="rounded-md border border-slate-700/60 p-3">
                <div>Status: <Badge variant="secondary" className="ml-1">{row.payout_status}</Badge></div>
                <div>Net amount: {order.currency || "USD"} {Number(row.net_amount || 0).toFixed(2)}</div>
                <div>Platform fee: {order.currency || "USD"} {Number(row.platform_fee_amount || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-400">Reference: {row.payout_reference || "N/A"}</div>
                <div className="text-xs text-slate-400">
                  Retry attempts: {Number(row.metadata?.retryAttempts || 0)}
                  {row.metadata?.lastRetryAt ? ` • Last retry: ${new Date(row.metadata.lastRetryAt).toLocaleString()}` : ""}
                </div>
                {row.metadata?.lastRetryBy ? (
                  <div className="text-xs text-slate-500">Last retry by admin: {row.metadata.lastRetryBy}</div>
                ) : null}
                {["on_hold", "failed", "pending"].includes(row.payout_status) ? (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryingPayoutId === row.id}
                      onClick={() => void retryPayout(row.id)}
                    >
                      {retryingPayoutId === row.id ? "Retrying..." : "Retry scheduling"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
