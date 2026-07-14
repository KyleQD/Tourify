"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Props {
  eventIdOrSlug: string
  /** Prefer events_v2 id when available — allocations API is v2-scoped. */
  eventsV2Id?: string | null
}

/**
 * Deprecated guestlist UI — issues comps via ticket allocations API.
 */
export function GuestlistManager({ eventIdOrSlug, eventsV2Id }: Props) {
  const eventId = eventsV2Id || eventIdOrSlug
  const [allocations, setAllocations] = useState<any[]>([])
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [allocationId, setAllocationId] = useState("")
  const [ticketTypeId, setTicketTypeId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [isLoading, setIsLoading] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)

  async function load() {
    setIsLoading(true)
    try {
      const [allocRes, typesRes] = await Promise.all([
        fetch(`/api/ticketing/allocations?event_id=${eventId}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/ticketing/enhanced?action=event_tickets&event_id=${eventId}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ])
      const allocData = await allocRes.json().catch(() => ({}))
      const typesData = await typesRes.json().catch(() => ({}))
      if (allocRes.ok) {
        setAllocations(allocData.allocations || [])
        if (allocData.allocations?.[0]?.id) setAllocationId(String(allocData.allocations[0].id))
      }
      const types = typesData.ticket_types || typesData.ticketTypes || []
      setTicketTypes(types)
      if (types[0]?.id) setTicketTypeId(String(types[0].id))
    } catch {
      setAllocations([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [eventId])

  async function issueGuest() {
    if (!allocationId || !ticketTypeId) {
      toast.error("Allocation and ticket type required")
      return
    }
    setIsIssuing(true)
    try {
      const res = await fetch("/api/ticketing/allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          allocation_id: allocationId,
          ticket_type_id: ticketTypeId,
          quantity: Math.max(1, Number(quantity) || 1),
          recipient_email: email || undefined,
          recipient_name: name || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to issue guest tickets")
      toast.success("Guest tickets issued from allocation")
      setName("")
      setEmail("")
      setQuantity("1")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Issue failed")
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-950/50">
      <CardHeader>
        <CardTitle className="text-white">Guestlist (allocations)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Legacy guestlist writes are deprecated. Comps now issue from ticket allocation pools for this event.
        </p>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading allocations…</p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-amber-300/90">
            No allocations found. Create an artist/venue pool in the event ticket manager first.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-slate-400">Allocation</Label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  value={allocationId}
                  onChange={(e) => setAllocationId(e.target.value)}
                >
                  {allocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.quantity_issued}/{a.quantity_total})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-400">Ticket type</Label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  value={ticketTypeId}
                  onChange={(e) => setTicketTypeId(e.target.value)}
                >
                  {ticketTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-slate-400">Guest name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-slate-700 bg-slate-900" />
              </div>
              <div>
                <Label className="text-slate-400">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 border-slate-700 bg-slate-900" />
              </div>
              <div>
                <Label className="text-slate-400">Quantity</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 border-slate-700 bg-slate-900" />
              </div>
            </div>
            <Button disabled={isIssuing} onClick={() => void issueGuest()}>
              Issue guest tickets
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
