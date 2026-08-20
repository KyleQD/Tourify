"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Download, ReceiptText, ShieldCheck } from "lucide-react"

import { TicketingShell, TicketEventMeta, TicketPassHint, TicketStateNotice, TicketStatusBadge } from "@/components/ticketing/ticketing-experience-ui"
import { TicketQrCode } from "@/components/ticketing/ticket-qr-code"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TicketExperienceTicket } from "@/types/ticketing-experience"

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<TicketExperienceTicket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void (async () => {
    const response = await fetch(`/api/ticketing/experience?ticket_id=${id}`, { credentials: "include", cache: "no-store" })
    const data = await response.json()
    if (!response.ok || !data.tickets?.[0]) { setError(data.error || "This ticket is unavailable."); return }
    setTicket(data.tickets[0])
  })() }, [id])

  if (error) return <TicketingShell title="Ticket unavailable" backHref="/tickets/my-tickets" backLabel="Wallet"><TicketStateNotice tone="warning" title="We could not open this pass">{error}</TicketStateNotice></TicketingShell>
  if (!ticket) return <TicketingShell title="Loading ticket" backHref="/tickets/my-tickets" backLabel="Wallet"><Card className="h-96 animate-pulse" /></TicketingShell>

  return (
    <TicketingShell title={ticket.event.title} description={ticket.ticketType.name} backHref="/tickets/my-tickets" backLabel="Wallet" actions={ticket.orderId ? <Button asChild variant="outline"><Link href={`/tickets/orders/${ticket.orderId}`}><ReceiptText className="mr-2 h-4 w-4" />Order</Link></Button> : undefined}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden"><div className="h-1 bg-primary/70" /><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-xl">{ticket.ticketType.name}</CardTitle><TicketEventMeta className="mt-3" startsAt={ticket.event.startsAt} venue={ticket.event.venueName} /></div><TicketStatusBadge status={ticket.status} /></CardHeader><CardContent className="space-y-5"><div className="rounded-sm border border-border bg-muted/30 p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Entry credential</p>{ticket.qrToken && ticket.eligibility.canShowPass ? <div className="mt-4 flex flex-col items-center gap-4"><TicketQrCode value={ticket.qrToken} className="rounded-sm bg-white p-4" /><TicketPassHint /></div> : <TicketStateNotice tone={ticket.status === "checked_in" ? "neutral" : "warning"} title="No active entry pass">{ticket.status === "checked_in" ? "This pass has already been used for entry." : "An active QR credential is not available for this ticket."}</TicketStateNotice>}</div><div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase text-muted-foreground">Transfer</p><p className="mt-1 text-sm">{ticket.eligibility.canTransfer ? "Available until the event starts" : ticket.eligibility.transferReason}</p></div><div><p className="text-xs font-medium uppercase text-muted-foreground">Refund policy</p><p className="mt-1 text-sm">{ticket.ticketType.refundPolicy || "Contact the event organizer for eligibility."}</p></div></div></CardContent></Card>
        <div className="space-y-4"><Card><CardContent className="space-y-3 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><p className="font-medium">Live pass protection</p></div><p className="text-sm text-muted-foreground">Your credential is refreshed when ticket ownership changes. Present this screen at the door.</p>{ticket.isComplimentary ? <Badge variant="outline">Guest ticket</Badge> : null}</CardContent></Card><Button asChild className="w-full" variant="outline"><Link href="/tickets/my-tickets"><Download className="mr-2 h-4 w-4" />Open wallet</Link></Button></div>
      </div>
    </TicketingShell>
  )
}
