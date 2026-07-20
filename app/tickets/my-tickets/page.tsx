"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Ticket, QrCode, Calendar, ArrowRight, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TicketQrCode } from '@/components/ticketing/ticket-qr-code'
import { useToast } from '@/components/ui/use-toast'

interface WalletTicket {
  id: string
  status: string
  is_complimentary: boolean
  qr_token: string | null
  ticket_types?: { name?: string; category?: string } | null
  events_v2?: { id?: string; title?: string; start_at?: string } | null
}

interface TransferRow {
  id: string
  status: string
  from_user_id: string
  to_user_id?: string | null
  to_email?: string | null
  ticket_id: string
  tickets?: { ticket_types?: { name?: string }; events_v2?: { title?: string } }
}

export default function MyTicketsPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<WalletTicket[]>([])
  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WalletTicket | null>(null)
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferUserId, setTransferUserId] = useState('')

  const load = useCallback(async () => {
    try {
      const [walletRes, transferRes] = await Promise.all([
        fetch('/api/ticketing/wallet', { credentials: 'include' }),
        fetch('/api/ticketing/transfers', { credentials: 'include' }),
      ])
      if (walletRes.status === 401) {
        setError('Sign in to view your tickets')
        return
      }
      const walletData = await walletRes.json()
      if (!walletRes.ok) throw new Error(walletData.error || 'Failed to load tickets')
      setTickets(walletData.tickets || [])

      if (transferRes.ok) {
        const transferData = await transferRes.json()
        setTransfers(transferData.transfers || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function sendTransfer() {
    if (!transferTicketId) return
    if (!transferEmail && !transferUserId) {
      toast({ title: 'Recipient required', description: 'Enter a user ID or email', variant: 'destructive' })
      return
    }
    const res = await fetch('/api/ticketing/transfers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        ticket_id: transferTicketId,
        to_email: transferEmail || undefined,
        to_user_id: transferUserId || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Transfer failed', description: data.error || 'Unable to start transfer', variant: 'destructive' })
      return
    }
    toast({ title: 'Transfer sent', description: 'Waiting for the recipient to accept.' })
    setTransferTicketId(null)
    setTransferEmail('')
    setTransferUserId('')
    void load()
  }

  async function respondTransfer(transferId: string, action: 'accept' | 'decline' | 'cancel') {
    const res = await fetch('/api/ticketing/transfers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, transfer_id: transferId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Action failed', description: data.error || 'Unable to update transfer', variant: 'destructive' })
      return
    }
    toast({ title: action === 'accept' ? 'Ticket received' : 'Transfer updated' })
    void load()
  }

  const pendingInbound = transfers.filter((t) => t.status === 'pending')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">My Tickets</h1>
        <p className="mt-2 text-muted-foreground">
          Your Tourify ticket wallet. Present the QR code at the door.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading tickets…</p>}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4">{error}</p>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && pendingInbound.length > 0 && (
        <Card className="mb-6 border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">Pending transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInbound.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  {t.tickets?.events_v2?.title || 'Event'} · {t.tickets?.ticket_types?.name || 'Ticket'}
                  <div className="text-xs text-muted-foreground">{t.to_email || t.to_user_id || 'Pending recipient'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void respondTransfer(t.id, 'accept')}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => void respondTransfer(t.id, 'decline')}>Decline</Button>
                  <Button size="sm" variant="ghost" onClick={() => void respondTransfer(t.id, 'cancel')}>Cancel</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && !error && tickets.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Ticket className="mx-auto mb-3 h-10 w-10 opacity-50" />
            No tickets yet. Discover events to get started.
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/discover/events">Browse events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-lg">
                  {ticket.events_v2?.title || 'Event'}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ticket.ticket_types?.name || 'Admission'}
                </p>
              </div>
              <Badge variant={ticket.status === 'checked_in' ? 'secondary' : 'default'}>
                {ticket.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {ticket.events_v2?.start_at
                  ? new Date(ticket.events_v2.start_at).toLocaleString()
                  : 'Date TBA'}
                {ticket.is_complimentary && (
                  <Badge variant="outline" className="ml-2">Comp</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTransferTicketId(ticket.id)}
                  disabled={ticket.status === 'checked_in' || ticket.status === 'refunded'}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelected(ticket)}
                  disabled={!ticket.qr_token || ticket.status === 'checked_in'}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {transferTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Transfer ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Recipient Tourify user ID (preferred)"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
              />
              <Input
                placeholder="Or recipient email"
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void sendTransfer()}>Send</Button>
                <Button variant="outline" className="flex-1" onClick={() => setTransferTicketId(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selected?.qr_token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center">Entry QR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <TicketQrCode
                value={selected.qr_token}
                className="mx-auto rounded bg-white p-3"
              />
              <p className="text-xs text-muted-foreground">
                Credential is stored securely. Do not share screenshots publicly.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selected.events_v2?.id && (
                <Button asChild variant="ghost" className="w-full">
                  <Link href={`/events/${selected.events_v2.id}`}>
                    Event details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
