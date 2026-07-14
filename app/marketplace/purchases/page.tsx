"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { extractApiError } from "@/lib/api/extract-error"

interface BuyerOrder {
  id: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  created_at: string
  marketplace_order_items?: Array<{
    id: string
    title: string
    quantity: number
    product_type: string
    fulfillment_status?: string | null
  }>
}

export default function MarketplacePurchasesPage() {
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    void loadOrders()
  }, [])

  async function loadOrders() {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/marketplace/orders?role=buyer", {
        credentials: "include",
        cache: "no-store",
      })
      const body = await response.json()
      if (response.status === 401) {
        window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent("/marketplace/purchases")}`
        return
      }
      if (!response.ok) {
        setErrorMessage(extractApiError(body, "Failed to load purchases"))
        setOrders([])
        return
      }
      setOrders(Array.isArray(body.data) ? body.data : [])
    } catch {
      setErrorMessage("Unable to load purchases right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">My purchases</h1>
            <p className="mt-1 text-sm text-slate-300">Orders and digital deliveries from the creator marketplace.</p>
          </div>
          <Button asChild variant="outline" className="border-slate-700 text-white">
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-slate-300">Loading purchases...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-300">
            No purchases yet.{" "}
            <Link href="/marketplace" className="underline">
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <section className="space-y-4">
            {orders.map(order => (
              <article key={order.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Order {order.id.slice(0, 8)}</div>
                    <div className="mt-1 text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200">{order.payment_status}</Badge>
                    <div className="text-sm font-semibold">
                      {order.currency || "USD"} {Number(order.total_amount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {(order.marketplace_order_items || []).map(item => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                      <span>
                        {item.title} × {item.quantity}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                          {item.product_type}
                        </Badge>
                        {item.product_type === "digital_asset" ? (
                          <Button asChild size="sm" variant="outline" className="border-slate-700">
                            <Link href={`/api/marketplace/delivery/${item.id}`}>Download</Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
