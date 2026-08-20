"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ReceiptText, Ticket } from "lucide-react"

import { TicketingShell, TicketEventMeta, TicketStateNotice, TicketStatusBadge } from "@/components/ticketing/ticketing-experience-ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TicketOrderPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void (async () => { const response = await fetch(`/api/ticketing/orders/${id}`, { credentials: "include", cache: "no-store" }); const json = await response.json(); if (!response.ok) { setError(json.error || "Order unavailable"); return } setData(json) })() }, [id])
  if (error) return <TicketingShell title="Order unavailable" backHref="/tickets/my-tickets" backLabel="Wallet"><TicketStateNotice tone="warning" title="We could not open this order">{error}</TicketStateNotice></TicketingShell>
  if (!data) return <TicketingShell title="Loading order" backHref="/tickets/my-tickets" backLabel="Wallet"><Card className="h-72 animate-pulse" /></TicketingShell>
  const { order, tickets } = data
  return <TicketingShell title="Order details" description={`Receipt ${order.order_number || order.id}`} backHref="/tickets/my-tickets" backLabel="Wallet"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" />{order.events_v2?.title || "Ticket order"}</CardTitle></CardHeader><CardContent className="space-y-4"><TicketEventMeta startsAt={order.events_v2?.start_at} /><div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm"><div><p className="text-muted-foreground">Order total</p><p className="mt-1 text-lg font-semibold">${Number(order.total_amount || 0).toFixed(2)}</p></div><div><p className="text-muted-foreground">Payment</p><p className="mt-1 capitalize">{order.payment_status || "pending"}</p></div></div></CardContent></Card><section><h2 className="mb-3 text-lg font-semibold">Tickets</h2><div className="space-y-3">{tickets.map((ticket: any) => <Card key={ticket.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="flex items-center gap-2 font-medium"><Ticket className="h-4 w-4" />{order.ticket_types?.name || "Admission"}</p><p className="mt-1 text-sm text-muted-foreground">{ticket.owner_name || ticket.owner_email || "Ticket holder"}</p></div><div className="flex items-center gap-2"><TicketStatusBadge status={ticket.status} /><Button asChild size="sm"><Link href={`/tickets/${ticket.id}`}>Open pass</Link></Button></div></CardContent></Card>)}</div></section></div><Card className="h-fit"><CardContent className="space-y-3 p-5"><p className="text-sm font-medium">Receipt and entry passes are separate</p><p className="text-sm text-muted-foreground">You can share this receipt, but each ticket holder needs their own live pass for entry.</p><Button asChild variant="outline" className="w-full"><Link href="/tickets/my-tickets">Open wallet</Link></Button></CardContent></Card></div></TicketingShell>
}
