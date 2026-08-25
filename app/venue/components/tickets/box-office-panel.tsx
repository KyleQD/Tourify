"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// VEN-153 — box office sell: cash / comp / card against live inventory.

export interface BoxOfficeTicketType {
  id: string
  name: string
  all_in_price?: number
  available?: number
  is_complimentary?: boolean
}

export function BoxOfficeSellPanel({
  eventId,
  ticketTypes,
  onSold,
}: {
  eventId: string
  ticketTypes: BoxOfficeTicketType[]
  onSold?: () => void
}) {
  const [typeId, setTypeId] = useState(ticketTypes[0]?.id || "")
  const [quantity, setQuantity] = useState("1")
  const [buyerName, setBuyerName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "comp">("cash")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selected = ticketTypes.find((t) => t.id === typeId)
  const emailValid = /.+@.+\..+/.test(buyerEmail)
  const qty = Math.max(1, parseInt(quantity, 10) || 1)
  const canSell = Boolean(typeId && buyerName.trim() && emailValid && !busy && selected && (selected.available === undefined || qty <= selected.available))

  const sell = async () => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/ticketing/box-office", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sell",
          event_id: eventId,
          ticket_type_id: typeId,
          quantity: qty,
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          payment_method: paymentMethod,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Sale failed")
      if (payload.checkout_url) {
        window.open(payload.checkout_url, "_blank", "noopener")
        setSuccess(`Card order ${payload.order_number} opened for payment.`)
      } else {
        setSuccess(`Sold ${qty} × ${selected?.name} (${paymentMethod}). Order ${payload.order_number}.`)
      }
      setBuyerName("")
      setBuyerEmail("")
      onSold?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {success && <p role="status" className="rounded-md border border-green-700 bg-green-950/30 p-2 text-sm text-green-300">{success}</p>}
      {error && <p role="alert" className="rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

      {ticketTypes.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
          No active ticket types. Run Ticketing setup first.
        </p>
      ) : (
        <fieldset className="grid grid-cols-1 gap-3 rounded-md border border-zinc-800 p-3 sm:grid-cols-2">
          <legend className="px-1 text-xs uppercase tracking-wide text-zinc-500">Walk-up sale</legend>
          <div className="space-y-1.5">
            <Label htmlFor="bo-type">Ticket type</Label>
            <select id="bo-type" value={typeId} onChange={(e) => setTypeId(e.target.value)} className="h-10 w-full rounded-md border border-zinc-700 bg-gray-800 px-2 text-sm">
              {ticketTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{typeof t.all_in_price === "number" ? ` — $${t.all_in_price.toFixed(2)} all-in` : ""}
                  {typeof t.available === "number" ? ` · ${t.available} left` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bo-qty">Quantity</Label>
            <Input id="bo-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, "")) || "1"} className="bg-gray-800" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bo-name">Buyer name</Label>
            <Input id="bo-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Walk-up guest" className="bg-gray-800" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bo-email">Buyer email</Label>
            <Input id="bo-email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="guest@example.com" className="bg-gray-800" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-sm text-zinc-300">Payment</span>
            <div role="radiogroup" aria-label="Payment method" className="flex gap-2">
              {(["cash", "comp"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                    paymentMethod === method ? "border-purple-500 bg-purple-600/20 text-purple-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={sell} disabled={!canSell}>{busy ? "Processing…" : `Sell ${qty} ticket${qty === 1 ? "" : "s"}`}</Button>
          </div>
        </fieldset>
      )}
    </div>
  )
}
