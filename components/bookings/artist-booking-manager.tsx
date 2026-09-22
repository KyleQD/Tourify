'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, CheckCircle2, Clock3, Inbox, Loader2, MapPin, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useActingContext } from '@/hooks/use-acting-context'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import type { ArtistBookingRequest, ArtistBookingView } from '@/lib/bookings/artist-booking-types'

const VIEW_COPY: Record<ArtistBookingView, { label: string; empty: string }> = {
  incoming: { label: 'Incoming', empty: 'No new booking requests.' },
  sent: { label: 'Sent', empty: 'No sent requests for this account.' },
  active: { label: 'Active', empty: 'No accepted bookings yet.' },
  history: { label: 'History', empty: 'No completed booking history.' },
}

function statusBadge(status: ArtistBookingRequest['status']) {
  if (status === 'accepted') return <Badge className="bg-emerald-600">Accepted</Badge>
  if (status === 'declined') return <Badge variant="destructive">Declined</Badge>
  return <Badge variant="outline" className="border-amber-500/40 text-amber-200">Pending</Badge>
}

export function ArtistBookingManager({ defaultView = 'incoming' }: { defaultView?: ArtistBookingView }) {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [view, setView] = useState<ArtistBookingView>(defaultView)
  const [bookings, setBookings] = useState<ArtistBookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [decisionId, setDecisionId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null)
  const [note, setNote] = useState('')
  const [responding, setResponding] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    try {
      const response = await fetch(`/api/booking-requests?view=${view}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: actingHeaders,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not load bookings.')
      setBookings(payload.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load bookings.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, isActingReady, view])

  useEffect(() => { void load() }, [actingContextKey, load])

  const openDecision = (id: string, nextDecision: 'accepted' | 'declined') => {
    setDecisionId(id)
    setDecision(nextDecision)
    setNote('')
  }

  const submitDecision = async () => {
    if (!decisionId || !decision) return
    setResponding(true)
    try {
      const response = await fetch(`/api/booking-requests/${decisionId}/decision`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ decision, note: decision === 'declined' ? note : undefined }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not respond to this request.')
      toast.success(decision === 'accepted' ? 'Booking accepted' : 'Booking declined')
      setDecisionId(null)
      setDecision(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not respond to this request.')
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bookings</h1>
          <p className="mt-1 text-slate-400">Track requests, decisions, shared details, and booking conversations.</p>
        </div>
        <Button asChild variant="outline" className="border-slate-700 text-slate-200">
          <Link href="/discover">Find artists</Link>
        </Button>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as ArtistBookingView)}>
        <TabsList className="grid h-auto w-full grid-cols-2 bg-slate-950/70 sm:grid-cols-4">
          {(Object.keys(VIEW_COPY) as ArtistBookingView[]).map((key) => (
            <TabsTrigger key={key} value={key}>{VIEW_COPY[key].label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <Card className="border-slate-800 bg-slate-950/50">
          <CardContent className="flex min-h-52 items-center justify-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading bookings…
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/50">
          <CardContent className="flex min-h-52 flex-col items-center justify-center text-center">
            <Inbox className="mb-4 h-12 w-12 text-slate-600" />
            <h2 className="font-medium text-white">{VIEW_COPY[view].empty}</h2>
            <p className="mt-1 text-sm text-slate-400">Requests for the active account will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => {
            const counterparty = booking.participant_role === 'artist' ? booking.requester : booking.artist
            return (
              <Card key={booking.id} className="border-slate-800 bg-slate-950/50 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{booking.booking_details.performanceType}</CardTitle>
                      <p className="mt-1 text-sm text-slate-400">
                        {booking.participant_role === 'artist' ? 'From' : 'With'} {counterparty.displayName}
                      </p>
                    </div>
                    {statusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" />{formatSafeDate(booking.booking_details.performanceDate)}</span>
                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" />{booking.booking_details.location}</span>
                    <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-500" />Requested {formatSafeDate(booking.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-400">{booking.booking_details.venue}</p>
                  {booking.status === 'declined' && booking.response_message ? (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                      {booking.response_message}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="border-slate-700">
                      <Link href={`/bookings/requests/${booking.id}`}>Open booking</Link>
                    </Button>
                    {booking.participant_role === 'artist' && booking.status === 'pending' ? (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openDecision(booking.id, 'accepted')}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDecision(booking.id, 'declined')}>
                          <XCircle className="mr-2 h-4 w-4" />Decline
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(decisionId)} onOpenChange={(open) => { if (!open) setDecisionId(null) }}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle>{decision === 'accepted' ? 'Accept booking request?' : 'Decline booking request?'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {decision === 'accepted'
                ? 'Acceptance opens shared details and booking chat for both parties.'
                : 'The requester will receive your decision and any optional note.'}
            </DialogDescription>
          </DialogHeader>
          {decision === 'declined' ? (
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Optional reason or note…" className="border-slate-700 bg-slate-900" />
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecisionId(null)}>Cancel</Button>
            <Button variant={decision === 'declined' ? 'destructive' : 'default'} disabled={responding} onClick={() => void submitDecision()}>
              {responding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : decision === 'accepted' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
