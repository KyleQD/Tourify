"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, ExternalLink, Send, Ticket, UserRoundCheck } from "lucide-react"

import { TicketingShell, TicketEmptyState, TicketEventMeta, TicketStatusBadge, TicketStateNotice } from "@/components/ticketing/ticketing-experience-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import type { TicketExperienceTicket, TicketExperienceTransfer } from "@/types/ticketing-experience"

export default function MyTicketsPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<TicketExperienceTicket[]>([])
  const [transfers, setTransfers] = useState<TicketExperienceTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketExperienceTicket | null>(null)
  const [recipientEmail, setRecipientEmail] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ticketing/experience", { credentials: "include", cache: "no-store" })
      const data = await response.json()
      if (response.status === 401) { setError("Sign in to access your wallet."); return }
      if (!response.ok) throw new Error(data.error || "Unable to load your tickets")
      setTickets(data.tickets || [])
      setTransfers(data.transfers || [])
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your tickets")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    return {
      upcoming: tickets.filter((ticket) => !ticket.event.startsAt || new Date(ticket.event.startsAt).getTime() >= now),
      past: tickets.filter((ticket) => ticket.event.startsAt && new Date(ticket.event.startsAt).getTime() < now),
    }
  }, [tickets])
  const pendingTransfers = transfers.filter((transfer) => transfer.status === "pending")

  async function sendTransfer() {
    if (!selectedTicket || !recipientEmail.trim()) return
    const response = await fetch("/api/ticketing/transfers", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ticket_id: selectedTicket.id, to_email: recipientEmail.trim() }),
    })
    const data = await response.json()
    if (!response.ok) { toast({ title: "Transfer could not be sent", description: data.error || "Try again.", variant: "destructive" }); return }
    toast({ title: "Transfer sent", description: `A secure claim link was sent to ${recipientEmail.trim()}.` })
    setSelectedTicket(null); setRecipientEmail(""); void load()
  }

  async function updateTransfer(transferId: string, action: "accept" | "decline" | "cancel") {
    const response = await fetch("/api/ticketing/transfers", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, transfer_id: transferId }),
    })
    const data = await response.json()
    if (!response.ok) { toast({ title: "Transfer could not be updated", description: data.error || "Try again.", variant: "destructive" }); return }
    toast({ title: action === "accept" ? "Ticket added to your wallet" : "Transfer updated" })
    void load()
  }

  const renderTickets = (rows: TicketExperienceTicket[]) => rows.length ? (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((ticket) => (
        <Card key={ticket.id} className="overflow-hidden border-border bg-card transition-colors hover:border-primary/45">
          <div className="h-1 bg-primary/70" />
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-lg">{ticket.event.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{ticket.ticketType.name}</p></div><TicketStatusBadge status={ticket.status} /></div>
            <TicketEventMeta startsAt={ticket.event.startsAt} />
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{ticket.isComplimentary ? <Badge variant="outline">Guest ticket</Badge> : null}{ticket.eligibility.canTransfer ? "Transfer available" : ticket.eligibility.transferReason}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild><Link href={`/tickets/${ticket.id}`}>View pass<ExternalLink className="ml-2 h-3.5 w-3.5" /></Link></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!ticket.eligibility.canTransfer} aria-label="Transfer ticket" title={ticket.eligibility.canTransfer ? "Transfer ticket" : ticket.eligibility.transferReason || "Transfer unavailable"} onClick={() => setSelectedTicket(ticket)}><Send className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : <TicketEmptyState title="No tickets here" description="Tickets for events in this time period will appear here." />

  return (
    <TicketingShell title="Your ticket wallet" description="Keep your entry passes, orders, and transfers in one place." actions={<Button asChild variant="outline"><Link href="/discover/events">Discover events</Link></Button>}>
      {error ? <TicketStateNotice tone="warning" title="Wallet unavailable">{error} <Link className="ml-1 underline" href="/login">Sign in</Link></TicketStateNotice> : null}
      {loading ? <div className="grid gap-4 md:grid-cols-2"><Card className="h-52 animate-pulse" /><Card className="h-52 animate-pulse" /></div> : null}
      {!loading && !error ? <>
        {pendingTransfers.length ? <section className="mb-6 rounded-sm border border-amber-400/30 bg-amber-400/10 p-4"><div className="flex items-start gap-3"><UserRoundCheck className="mt-0.5 h-5 w-5 text-amber-200" /><div className="min-w-0 flex-1"><h2 className="font-medium text-amber-100">Transfers awaiting action</h2><div className="mt-3 space-y-3">{pendingTransfers.map((transfer) => <div key={transfer.id} className="flex flex-col gap-3 border-t border-amber-300/15 pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-amber-100/80">{transfer.eventTitle || "Event"} · {transfer.ticketTypeName || "Ticket"}{transfer.expiresAt ? ` · expires ${new Date(transfer.expiresAt).toLocaleDateString()}` : ""}</p><div className="flex gap-2">{transfer.direction === "incoming" ? <><Button size="sm" onClick={() => void updateTransfer(transfer.id, "accept")}>Accept</Button><Button size="sm" variant="outline" onClick={() => void updateTransfer(transfer.id, "decline")}>Decline</Button></> : <Button size="sm" variant="outline" onClick={() => void updateTransfer(transfer.id, "cancel")}>Cancel transfer</Button>}</div></div>)}</div></div></div></section> : null}
        <Tabs defaultValue="upcoming" className="space-y-5"><TabsList className="w-full justify-start border border-border bg-muted/30 sm:w-auto"><TabsTrigger value="upcoming"><CalendarDays className="mr-2 h-4 w-4" />Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="past">Past ({past.length})</TabsTrigger><TabsTrigger value="transfers">Transfers ({transfers.length})</TabsTrigger></TabsList><TabsContent value="upcoming">{renderTickets(upcoming)}</TabsContent><TabsContent value="past">{renderTickets(past)}</TabsContent><TabsContent value="transfers">{transfers.length ? <Card><CardContent className="divide-y divide-border p-0">{transfers.map((transfer) => <div key={transfer.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{transfer.eventTitle || "Event"}</p><p className="text-sm text-muted-foreground">{transfer.direction === "incoming" ? "Received" : `Sent to ${transfer.recipientEmail || "recipient"}`}</p></div><TicketStatusBadge status={transfer.status} /></div>)}</CardContent></Card> : <TicketEmptyState title="No transfers yet" description="Transfers you send and receive will appear here." />}</TabsContent></Tabs>
      </> : null}
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => { if (!open) { setSelectedTicket(null); setRecipientEmail("") } }}><DialogContent><DialogHeader><DialogTitle>Transfer ticket</DialogTitle><DialogDescription>Send a secure claim link to the recipient. Your current entry QR will stop working when they accept.</DialogDescription></DialogHeader><Input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="Recipient email" autoComplete="email" /><DialogFooter><Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button><Button onClick={() => void sendTransfer()} disabled={!recipientEmail.trim()}>Send transfer</Button></DialogFooter></DialogContent></Dialog>
    </TicketingShell>
  )
}
