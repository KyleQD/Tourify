"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { VenueEmptyState } from "@/components/dashboard/venue-empty-state"
import { AlertCircle, RotateCcw, Search } from "lucide-react"

// VEN-153 — order lookup with privacy-scoped contact data and refunds.

interface OrderRow {
  id: string
  order_number: string | null
  buyer_name: string | null
  buyer_email: string | null
  quantity: number
  total_amount: number | null
  payment_status: string
  created_at: string
}

interface TicketRow {
  id: string
  owner_name: string | null
  owner_email: string | null
  status: string
  ticket_types?: { name?: string } | null
  order_id: string | null
}

const STATUS_TONE: Record<string, string> = {
  completed: "border-green-600 text-green-400",
  pending: "border-yellow-600 text-yellow-500",
  refunded: "border-red-600 text-red-400",
  failed: "border-red-700 text-red-400",
  cancelled: "border-zinc-600 text-zinc-400",
}

export function OrdersPanel({ eventId, canRefund }: { eventId: string; canRefund: boolean }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [contactVisible, setContactVisible] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refundTarget, setRefundTarget] = useState<OrderRow | null>(null)
  const [refundBusy, setRefundBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ event_id: eventId })
      if (query.trim()) params.set("q", query.trim())
      const response = await fetch(`/api/ticketing/box-office?${params}`, { credentials: "include", cache: "no-store" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Lookup failed (${response.status})`)
      }
      const payload = await response.json()
      setOrders(Array.isArray(payload.orders) ? payload.orders : [])
      setTickets(Array.isArray(payload.tickets) ? payload.tickets : [])
      setContactVisible(Boolean(payload.contact_visible))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [eventId, query])

  useEffect(() => {
    void load()
  }, [load])

  const refundOrder = async () => {
    if (!refundTarget) return
    setRefundBusy(true)
    try {
      const response = await fetch("/api/ticketing/box-office", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", event_id: eventId, order_id: refundTarget.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Refund failed")
      setNotice(`Refunded ${refundTarget.order_number || refundTarget.id}.`)
      setRefundTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed")
    } finally {
      setRefundBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
        <Input
          aria-label="Search orders and guests"
          placeholder="Search by name, email or order number…"
          className="pl-10 bg-gray-800 border-gray-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!contactVisible && (
        <p className="text-xs text-zinc-500">Contact details are hidden without the “View attendee contact” permission.</p>
      )}
      {notice && <p role="status" className="rounded-md border border-green-700 bg-green-950/30 p-2 text-sm text-green-300">{notice}</p>}
      {error && (
        <div className="flex items-center justify-between rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}><RotateCcw className="mr-1 h-3.5 w-3.5" />Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
      ) : orders.length === 0 && tickets.length === 0 ? (
        <VenueEmptyState icon={Search} title="No orders found" description={query ? "Nothing matches this search." : "Orders appear here once tickets sell."} />
      ) : (
        <>
          {orders.length > 0 && (
            <ul className="divide-y divide-zinc-800 overflow-x-auto rounded-md border border-zinc-800" aria-label="Orders">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-zinc-100">{order.buyer_name || "Guest"} · ×{order.quantity}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {order.order_number || order.id.slice(0, 8)}
                      {order.buyer_email ? ` · ${order.buyer_email}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={STATUS_TONE[order.payment_status] || "border-zinc-600"}>
                      {order.payment_status}
                    </Badge>
                    {canRefund && order.payment_status === "completed" && (
                      <Button size="sm" variant="outline" className="border-red-800 text-red-300" onClick={() => setRefundTarget(order)}>
                        Refund
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tickets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm" aria-label="Admissions">
                <thead className="text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Ticket</th>
                    <th scope="col" className="py-2 pr-3">Holder</th>
                    <th scope="col" className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="py-2 pr-3">{ticket.ticket_types?.name || "Ticket"}</td>
                      <td className="py-2 pr-3 text-zinc-300">{ticket.owner_name || ticket.owner_email || "—"}</td>
                      <td className="py-2 text-zinc-400">{ticket.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {refundTarget && (
        <div role="alertdialog" aria-label="Confirm refund" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-zinc-700 bg-gray-900 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Refund this order?</h2>
            <p className="text-sm text-zinc-400">
              This refunds order {refundTarget.order_number || refundTarget.id} ({refundTarget.quantity} ticket
              {refundTarget.quantity === 1 ? "" : "s"}) in full and releases the admissions. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-700" onClick={() => setRefundTarget(null)} disabled={refundBusy}>Cancel</Button>
              <Button variant="destructive" onClick={refundOrder} disabled={refundBusy}>{refundBusy ? "Refunding…" : "Refund order"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
