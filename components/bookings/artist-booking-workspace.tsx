'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, CheckCircle2, HelpCircle, Loader2, LockKeyhole, MapPin, MessageSquare, Save, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActingContext } from '@/hooks/use-acting-context'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import type { ArtistBookingMessage, ArtistBookingRequest } from '@/lib/bookings/artist-booking-types'

interface DeferredForm {
  description: string
  compensation: string
  additionalNotes: string
  email: string
  phone: string
}

const EMPTY_DETAILS: DeferredForm = { description: '', compensation: '', additionalNotes: '', email: '', phone: '' }

export function ArtistBookingWorkspace({ bookingId }: { bookingId: string }) {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [booking, setBooking] = useState<ArtistBookingRequest | null>(null)
  const [details, setDetails] = useState<DeferredForm>(EMPTY_DETAILS)
  const [messages, setMessages] = useState<ArtistBookingMessage[]>([])
  const [message, setMessage] = useState('')
  const [declineNote, setDeclineNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/booking-requests/${bookingId}/messages`, { credentials: 'include', cache: 'no-store', headers: actingHeaders })
    if (!response.ok) return
    const payload = await response.json()
    setMessages(payload.data || [])
  }, [actingHeaders, bookingId])

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    try {
      const response = await fetch(`/api/booking-requests/${bookingId}`, { credentials: 'include', cache: 'no-store', headers: actingHeaders })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Booking request not found.')
      const next = payload.data as ArtistBookingRequest
      setBooking(next)
      setDetails({
        description: next.booking_details.description || '',
        compensation: next.booking_details.compensation || '',
        additionalNotes: next.booking_details.additionalNotes || '',
        email: next.email || '',
        phone: next.phone || '',
      })
      if (['pending', 'needs_info', 'accepted'].includes(next.status)) await loadMessages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Booking request not found.')
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, bookingId, isActingReady, loadMessages])

  useEffect(() => { void load() }, [actingContextKey, load])

  const decide = async (decision: 'accepted' | 'declined') => {
    setActing(true)
    try {
      const response = await fetch(`/api/booking-requests/${bookingId}/decision`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ decision, note: decision === 'declined' ? declineNote : undefined }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not respond to this request.')
      toast.success(decision === 'accepted' ? 'Booking accepted' : 'Booking declined')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not respond to this request.')
    } finally { setActing(false) }
  }

  const requestInfo = async () => {
    if (!declineNote.trim()) return
    setActing(true)
    try {
      const response = await fetch(`/api/booking-requests/${bookingId}/decision`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ decision: 'needs_info', note: declineNote }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not request more information.')
      setDeclineNote('')
      toast.success('Information requested')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request more information.')
    } finally { setActing(false) }
  }

  const saveDetails = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/booking-requests/${bookingId}/details`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify(details),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not save booking details.')
      setBooking(payload.data)
      toast.success('Booking details saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save booking details.')
    } finally { setSaving(false) }
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    setActing(true)
    try {
      const response = await fetch(`/api/booking-requests/${bookingId}/messages`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({ content: message }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not send this message.')
      setMessage('')
      if (booking?.status === 'needs_info' && booking.participant_role === 'requester') await load()
      else await loadMessages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send this message.')
    } finally { setActing(false) }
  }

  if (loading) return <div className="flex min-h-72 items-center justify-center gap-3 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" />Loading booking…</div>
  if (!booking) return <Card className="border-slate-800 bg-slate-950/50"><CardContent className="py-16 text-center text-slate-300">This booking is unavailable for the active account.</CardContent></Card>

  const counterparty = booking.participant_role === 'artist' ? booking.requester : booking.artist
  const isRequester = booking.participant_role === 'requester'
  const statusClass = booking.status === 'accepted' ? 'bg-emerald-600' : booking.status === 'declined' ? 'bg-rose-600' : booking.status === 'needs_info' ? 'bg-cyan-600' : 'bg-amber-600'
  const canShowThread = ['pending', 'needs_info', 'accepted'].includes(booking.status)
  const canSendThreadMessage = booking.status === 'accepted' || (isRequester && booking.status === 'needs_info')

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0 text-slate-400"><Link href="/bookings/requests">← Back to bookings</Link></Button>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{booking.booking_details.performanceType}</h1><Badge className={statusClass}>{booking.status}</Badge></div>
          <p className="mt-1 text-slate-400">{booking.participant_role === 'artist' ? 'Requested by' : 'Booking with'} {counterparty.displayName}</p>
        </div>
        {booking.status === 'accepted' && booking.participant_role === 'artist' ? (
          <Button asChild variant="outline" className="border-cyan-500/40 text-cyan-200">
            <Link href={`/artist/events/create?fromBooking=${encodeURIComponent(JSON.stringify({ eventName: booking.booking_details.performanceType, eventDate: booking.booking_details.performanceDate, booking_details: booking.booking_details }))}`}>Create event</Link>
          </Button>
        ) : null}
      </div>

      <Card className="border-slate-800 bg-slate-950/50 text-white">
        <CardHeader><CardTitle>Request essentials</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label className="text-slate-500">Category</Label><p className="mt-1 capitalize">{booking.request_type}</p></div>
          <div><Label className="text-slate-500">Target date</Label><p className="mt-1 flex items-center gap-2"><Calendar className="h-4 w-4" />{formatSafeDate(booking.booking_details.performanceDate)}</p></div>
          <div><Label className="text-slate-500">Business or venue</Label><p className="mt-1">{booking.booking_details.venue}</p></div>
          <div><Label className="text-slate-500">Location</Label><p className="mt-1 flex items-center gap-2"><MapPin className="h-4 w-4" />{booking.booking_details.location}</p></div>
        </CardContent>
      </Card>

      {booking.status === 'accepted' && booking.linked_event ? (
        <Card className="border-cyan-500/20 bg-cyan-500/10 text-white">
          <CardHeader><CardTitle>Linked event collaborator access</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{booking.linked_event.title}</p>
                <p className="text-sm text-cyan-100/80">
                  Artist access includes promotion, public event details, artist activity, and limited insights.
                </p>
              </div>
              <Button asChild variant="outline" className="border-cyan-400/40 text-cyan-100">
                <Link href={`/events/${booking.linked_event.slug || booking.linked_event.id}`}>Open event</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {booking.status === 'pending' || booking.status === 'needs_info' ? (
        <Card className="border-amber-500/20 bg-amber-500/10 text-white">
          <CardContent className="space-y-4 pt-6">
            {isRequester ? (
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-amber-200" />
                <div>
                  <h2 className="font-medium">{booking.status === 'needs_info' ? 'More information requested' : 'Waiting for the artist'}</h2>
                  <p className="text-sm text-amber-100/80">
                    {booking.status === 'needs_info'
                      ? 'Reply in the request thread below. Your response will return the request to the artist for review.'
                      : 'The artist can accept, decline, or request more information.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="font-medium">{booking.status === 'needs_info' ? 'Waiting on requester' : 'Respond to this request'}</h2>
                  <p className="text-sm text-amber-100/80">
                    {booking.status === 'needs_info'
                      ? 'The request will return to Incoming when the requester replies.'
                      : 'Acceptance opens a shared workspace. You can also ask for more information first.'}
                  </p>
                </div>
                {booking.status === 'pending' ? (
                  <>
                    <Textarea value={declineNote} onChange={(event) => setDeclineNote(event.target.value)} placeholder="Optional note, decline reason, or question for the requester…" className="border-amber-500/20 bg-slate-950/50" />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={acting} className="bg-emerald-600" onClick={() => void decide('accepted')}><CheckCircle2 className="mr-2 h-4 w-4" />Accept</Button>
                      <Button disabled={acting || !declineNote.trim()} variant="outline" className="border-cyan-500/40 text-cyan-100" onClick={() => void requestInfo()}><HelpCircle className="mr-2 h-4 w-4" />Request info</Button>
                      <Button disabled={acting} variant="destructive" onClick={() => void decide('declined')}><XCircle className="mr-2 h-4 w-4" />Decline</Button>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {booking.status === 'declined' ? (
        <Card className="border-rose-500/20 bg-rose-500/10 text-white"><CardContent className="pt-6"><h2 className="font-medium">Request declined</h2><p className="mt-2 text-sm text-rose-100/80">{booking.response_message || 'No note was provided.'}</p></CardContent></Card>
      ) : null}

      {booking.status === 'accepted' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <Card className="border-slate-800 bg-slate-950/50 text-white">
            <CardHeader><CardTitle>Booking details</CardTitle><p className="text-sm text-slate-400">The requester owns these deferred details.</p></CardHeader>
            <CardContent className="space-y-4">
              {isRequester ? (
                <>
                  <div className="space-y-2"><Label htmlFor="scope">Project scope</Label><Textarea id="scope" value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} className="min-h-28 border-slate-700 bg-slate-900" /></div>
                  <div className="space-y-2"><Label htmlFor="budget">Compensation or budget</Label><Input id="budget" value={details.compensation} onChange={(event) => setDetails((current) => ({ ...current, compensation: event.target.value }))} className="border-slate-700 bg-slate-900" /></div>
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={details.email} onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))} className="border-slate-700 bg-slate-900" /></div><div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={details.phone} onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))} className="border-slate-700 bg-slate-900" /></div></div>
                  <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={details.additionalNotes} onChange={(event) => setDetails((current) => ({ ...current, additionalNotes: event.target.value }))} className="border-slate-700 bg-slate-900" /></div>
                  <Button disabled={saving} onClick={() => void saveDetails()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save details</Button>
                </>
              ) : (
                <div className="space-y-5 text-sm"><div><Label className="text-slate-500">Project scope</Label><p className="mt-1 whitespace-pre-wrap text-slate-200">{details.description || 'Not added yet.'}</p></div><div><Label className="text-slate-500">Compensation or budget</Label><p className="mt-1 text-slate-200">{details.compensation || 'Not added yet.'}</p></div><div><Label className="text-slate-500">Contact</Label><p className="mt-1 text-slate-200">{[details.email, details.phone].filter(Boolean).join(' · ') || 'Not added yet.'}</p></div><div><Label className="text-slate-500">Notes</Label><p className="mt-1 whitespace-pre-wrap text-slate-200">{details.additionalNotes || 'No notes yet.'}</p></div></div>
              )}
            </CardContent>
          </Card>

          <BookingThreadCard messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} acting={acting} canSend={canSendThreadMessage} isRequester={isRequester} booking={booking} />
        </div>
      ) : null}

      {booking.status !== 'accepted' && canShowThread ? (
        <BookingThreadCard messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} acting={acting} canSend={canSendThreadMessage} isRequester={isRequester} booking={booking} />
      ) : null}
    </div>
  )
}

function BookingThreadCard({
  messages,
  message,
  setMessage,
  sendMessage,
  acting,
  canSend,
  isRequester,
  booking,
}: {
  messages: ArtistBookingMessage[]
  message: string
  setMessage: (value: string) => void
  sendMessage: () => Promise<void>
  acting: boolean
  canSend: boolean
  isRequester: boolean
  booking: ArtistBookingRequest
}) {
  return (
    <Card className="flex min-h-[24rem] flex-col border-slate-800 bg-slate-950/50 text-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />{booking.status === 'accepted' ? 'Booking chat' : 'Request thread'}</CardTitle></CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          {messages.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No messages yet.</p> : messages.map((item) => {
            const mine = item.sender_id === (isRequester ? booking.requester_id : booking.artist_id)
            const label = item.message_type === 'info_request' ? 'Info requested' : item.message_type === 'info_response' ? 'Info response' : null
            return (
              <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                  {label ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p> : null}
                  <p className="whitespace-pre-wrap">{item.content}</p>
                  <p className="mt-1 text-[10px] opacity-60">{formatSafeDate(item.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
        {canSend ? (
          <div className="flex gap-2"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder={booking.status === 'needs_info' ? 'Reply with the requested details…' : 'Write a booking message…'} className="min-h-11 resize-none border-slate-700 bg-slate-900" /><Button size="icon" disabled={acting || !message.trim()} onClick={() => void sendMessage()} aria-label="Send booking message"><Send className="h-4 w-4" /></Button></div>
        ) : null}
      </CardContent>
    </Card>
  )
}
