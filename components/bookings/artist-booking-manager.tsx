'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Clock3, HelpCircle, Inbox, Loader2, MapPin, MessageCircle, Send, Sparkles, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useActingContext } from '@/hooks/use-acting-context'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import type { ArtistBookingAudience, ArtistBookingRequest, ArtistBookingSummary, ArtistBookingView } from '@/lib/bookings/artist-booking-types'

const VIEW_COPY: Record<ArtistBookingView, { label: string; empty: string }> = {
  incoming: { label: 'Incoming', empty: 'No new booking requests.' },
  needs_info: { label: 'Needs info', empty: 'No requests need more information right now.' },
  sent: { label: 'Sent', empty: 'No requests are waiting on an artist yet.' },
  active: { label: 'Active', empty: 'No accepted bookings yet.' },
  history: { label: 'History', empty: 'No completed booking history yet.' },
}

const REQUESTER_VIEWS: ArtistBookingView[] = ['sent', 'needs_info', 'active', 'history']
const ARTIST_VIEWS: ArtistBookingView[] = ['incoming', 'needs_info', 'active', 'history']
const EMPTY_SUMMARY: ArtistBookingSummary = { incoming: 0, needs_info: 0, sent: 0, active: 0, history: 0 }

function statusBadge(status: ArtistBookingRequest['status']) {
  if (status === 'accepted') return <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">Accepted</Badge>
  if (status === 'declined') return <Badge className="bg-rose-500/15 text-rose-200 hover:bg-rose-500/15">Declined</Badge>
  if (status === 'needs_info') return <Badge className="bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/15">Needs info</Badge>
  return <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/15">Pending</Badge>
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'T'
}

function dateLabel(value: string) {
  return value ? formatSafeDate(value) : 'Date flexible'
}

function nextStep(booking: ArtistBookingRequest, audience: ArtistBookingAudience) {
  if (booking.status === 'needs_info') {
    return audience === 'requester'
      ? { title: 'Your reply is needed', detail: 'Share the details the artist requested to return this request to review.', action: 'Reply with info', icon: MessageCircle }
      : { title: 'Waiting on the requester', detail: 'Your request for more information is in their booking thread.', action: 'Open booking', icon: Clock3 }
  }
  if (booking.status === 'accepted') return { title: 'Booking accepted', detail: 'Shared details and the booking chat are ready.', action: 'Open booking', icon: CheckCircle2 }
  if (booking.status === 'declined') return { title: 'Request closed', detail: booking.response_message || 'The artist declined this request.', action: 'View outcome', icon: XCircle }
  return audience === 'requester'
    ? { title: 'Waiting for the artist', detail: 'The artist can accept, decline, or ask for more information.', action: 'Open booking', icon: Clock3 }
    : { title: 'Ready for review', detail: 'Choose how you want to respond to this request.', action: 'Open booking', icon: Inbox }
}

export function ArtistBookingManager({
  audience = 'artist',
  defaultView,
}: {
  audience?: ArtistBookingAudience
  defaultView?: ArtistBookingView
}) {
  const views = audience === 'requester' ? REQUESTER_VIEWS : ARTIST_VIEWS
  const initialView = defaultView && views.includes(defaultView) ? defaultView : views[0]
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [view, setView] = useState<ArtistBookingView>(initialView)
  const [bookings, setBookings] = useState<ArtistBookingRequest[]>([])
  const [summary, setSummary] = useState<ArtistBookingSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decisionId, setDecisionId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'accepted' | 'declined' | 'needs_info' | null>(null)
  const [note, setNote] = useState('')
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    if (!views.includes(view)) setView(views[0])
  }, [view, views])

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/booking-requests?view=${view}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: actingHeaders,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not load bookings.')
      setBookings(payload.data || [])
      setSummary({ ...EMPTY_SUMMARY, ...(payload.summary || {}) })
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load bookings.'
      setError(message)
      setBookings([])
      setSummary(EMPTY_SUMMARY)
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, isActingReady, view])

  useEffect(() => { void load() }, [actingContextKey, load])

  const openDecision = (id: string, nextDecision: 'accepted' | 'declined' | 'needs_info') => {
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
        body: JSON.stringify({ decision, note: decision === 'declined' || decision === 'needs_info' ? note : undefined }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not respond to this request.')
      toast.success(decision === 'accepted' ? 'Booking accepted' : decision === 'needs_info' ? 'Information requested' : 'Booking declined')
      setDecisionId(null)
      setDecision(null)
      await load()
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Could not respond to this request.')
    } finally {
      setResponding(false)
    }
  }

  const overview = audience === 'requester'
    ? [
        { label: 'Needs your reply', value: summary.needs_info, tone: 'text-cyan-200', icon: MessageCircle },
        { label: 'Awaiting artist', value: summary.sent, tone: 'text-amber-200', icon: Clock3 },
        { label: 'Active bookings', value: summary.active, tone: 'text-emerald-200', icon: CheckCircle2 },
      ]
    : [
        { label: 'New requests', value: summary.incoming, tone: 'text-amber-200', icon: Inbox },
        { label: 'Waiting on reply', value: summary.needs_info, tone: 'text-cyan-200', icon: MessageCircle },
        { label: 'Active bookings', value: summary.active, tone: 'text-emerald-200', icon: CheckCircle2 },
      ]

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-200"><Sparkles className="h-4 w-4" /> Booking requests</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{audience === 'requester' ? 'Your booking requests' : 'Manage booking requests'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {audience === 'requester'
              ? 'Follow each request from first contact through confirmation, without losing the next step.'
              : 'Review incoming requests, ask questions, and move confirmed work into your active bookings.'}
          </p>
        </div>
        {audience === 'requester' ? (
          <Button asChild className="shrink-0"><Link href="/discover">Discover artists</Link></Button>
        ) : null}
      </header>

      <section className="grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-3" aria-label="Booking request overview">
        {overview.map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 bg-slate-950/70 px-4 py-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 ${tone}`}><Icon className="h-4 w-4" /></div>
            <div><p className="text-2xl font-semibold leading-none">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>
          </div>
        ))}
      </section>

      <Tabs value={view} onValueChange={(value) => setView(value as ArtistBookingView)}>
        <TabsList className="grid h-auto w-full grid-cols-2 bg-slate-950/70 sm:grid-cols-4">
          {views.map((key) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              {VIEW_COPY[key].label}<span className="text-xs text-slate-400">{summary[key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <Card className="border-slate-800 bg-slate-950/50"><CardContent className="flex min-h-64 items-center justify-center gap-3 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> Loading requests…</CardContent></Card>
      ) : error ? (
        <Card className="border-rose-500/30 bg-rose-500/10"><CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><XCircle className="h-10 w-10 text-rose-300" /><h2 className="mt-4 font-medium">Could not load your requests</h2><p className="mt-1 max-w-md text-sm text-rose-100/70">{error}</p><Button variant="outline" className="mt-5 border-rose-300/40 text-rose-100" onClick={() => void load()}>Try again</Button></CardContent></Card>
      ) : bookings.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/50"><CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><Inbox className="mb-4 h-11 w-11 text-slate-600" /><h2 className="font-medium">{VIEW_COPY[view].empty}</h2><p className="mt-1 max-w-md text-sm text-slate-400">{audience === 'requester' ? 'Requests from this account will appear here as soon as you contact an artist.' : 'Requests for the active artist account will appear here.'}</p>{audience === 'requester' && view === 'sent' ? <Button asChild className="mt-5"><Link href="/discover">Find an artist</Link></Button> : null}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => {
            const counterparty = audience === 'requester' ? booking.artist : booking.requester
            const step = nextStep(booking, audience)
            const StepIcon = step.icon
            return (
              <Card key={booking.id} className="overflow-hidden border-slate-800 bg-slate-950/60 text-white transition-colors hover:border-slate-700">
                <CardContent className="p-0">
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.45fr)_minmax(12rem,0.8fr)_auto] lg:items-center lg:gap-6 lg:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-11 w-11 border border-slate-700"><AvatarImage src={counterparty.avatarUrl || undefined} alt="" /><AvatarFallback className="bg-slate-800 text-sm text-slate-200">{initials(counterparty.displayName)}</AvatarFallback></Avatar>
                      <div className="min-w-0"><p className="truncate font-medium">{counterparty.displayName}</p><p className="mt-0.5 text-xs text-slate-400">{audience === 'requester' ? 'Artist' : 'Requester'}</p></div>
                    </div>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{booking.booking_details.performanceType}</p>{statusBadge(booking.status)}</div><p className="mt-1 line-clamp-2 text-sm text-slate-400">{booking.booking_details.description || 'No additional note was provided.'}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateLabel(booking.booking_details.performanceDate)}</span><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{booking.booking_details.location || 'Location flexible'}</span>{booking.linked_event ? <span className="flex items-center gap-1.5 text-violet-200"><CalendarDays className="h-3.5 w-3.5" />{booking.linked_event.title}</span> : null}</div></div>
                    <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-center gap-2 text-sm font-medium"><StepIcon className="h-4 w-4 text-slate-300" />{step.title}</div><p className="mt-1 text-xs leading-5 text-slate-400">{step.detail}</p></div>
                    <div className="flex flex-wrap gap-2 lg:justify-end"><Button asChild size="sm"><Link href={`/bookings/requests/${booking.id}`}>{step.action}</Link></Button>{audience === 'artist' && booking.status === 'pending' ? <><Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-100" onClick={() => openDecision(booking.id, 'needs_info')}><HelpCircle className="mr-1.5 h-3.5 w-3.5" />Info</Button><Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-100" onClick={() => openDecision(booking.id, 'accepted')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Accept</Button><Button size="icon" variant="ghost" className="text-rose-200 hover:bg-rose-500/10 hover:text-rose-100" aria-label={`Decline ${booking.booking_details.performanceType}`} onClick={() => openDecision(booking.id, 'declined')}><XCircle className="h-4 w-4" /></Button></> : null}</div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(decisionId)} onOpenChange={(open) => { if (!open) setDecisionId(null) }}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white"><DialogHeader><DialogTitle>{decision === 'accepted' ? 'Accept booking request?' : decision === 'needs_info' ? 'Request more information?' : 'Decline booking request?'}</DialogTitle><DialogDescription className="text-slate-400">{decision === 'accepted' ? 'Acceptance opens shared details and booking chat for both parties.' : decision === 'needs_info' ? 'The requester will see your question in the booking workspace and can reply there.' : 'The requester will receive your decision and any optional note.'}</DialogDescription></DialogHeader>{decision === 'declined' || decision === 'needs_info' ? <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder={decision === 'needs_info' ? 'What details do you need before deciding?' : 'Optional reason or note…'} className="border-slate-700 bg-slate-900" /> : null}<DialogFooter><Button variant="ghost" onClick={() => setDecisionId(null)}>Cancel</Button><Button variant={decision === 'declined' ? 'destructive' : 'default'} disabled={responding || (decision === 'needs_info' && !note.trim())} onClick={() => void submitDecision()}>{responding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : decision === 'accepted' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}Confirm</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
