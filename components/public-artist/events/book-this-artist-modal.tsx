'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Loader2, Send } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { paBtnRound } from '@/components/public-artist/public-artist-ui'
import { ThemedDialogContent } from '@/components/public-artist/themed-dialog-content'
import { useActingContext } from '@/hooks/use-acting-context'
import type { ArtistProfileAppearance } from '@/lib/public-artist/artist-profile-appearance'
import type { ArtistBookingAttachableEvent } from '@/lib/bookings/artist-booking-types'
import { bookingStepOneSchema, type PublicBookingDraft } from '@/lib/public-artist/booking-request-schema'

const INITIAL_DRAFT: PublicBookingDraft = {
  requestType: 'performance',
  performanceType: 'project',
  description: '',
  venue: '',
  location: '',
  performanceDate: '',
}

function zodErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

export function BookThisArtistModal({
  isOpen,
  onOpenChange,
  artistUserId,
  artistProfileId,
  artistName,
  creatorType,
  serviceOfferings,
  profileAppearance,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  artistUserId: string
  artistProfileId: string
  artistName: string
  creatorType?: string | null
  serviceOfferings?: string[]
  profileAppearance?: ArtistProfileAppearance | null
}) {
  const { actingHeaders } = useActingContext()
  const storageKey = useMemo(
    () => `tourify:artist-booking-draft:v1:${artistProfileId}`,
    [artistProfileId],
  )
  const [draft, setDraft] = useState<PublicBookingDraft>(INITIAL_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [attachableEvents, setAttachableEvents] = useState<ArtistBookingAttachableEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState('none')

  useEffect(() => {
    if (!isOpen || createdBookingId) return
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) return
      const parsed = bookingStepOneSchema.safeParse(JSON.parse(stored))
      if (parsed.success) setDraft(parsed.data)
    } catch {
      // Invalid or unavailable local storage should not block a new request.
    }
  }, [createdBookingId, isOpen, storageKey])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    async function loadAttachableEvents() {
      try {
        const response = await fetch('/api/booking-requests/attachable-events', {
          credentials: 'include',
          cache: 'no-store',
          headers: actingHeaders,
        })
        if (response.status === 401) return
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) return
        if (!cancelled) setAttachableEvents(Array.isArray(payload.events) ? payload.events : [])
      } catch {
        if (!cancelled) setAttachableEvents([])
      }
    }
    void loadAttachableEvents()
    return () => { cancelled = true }
  }, [actingHeaders, isOpen])

  const update = <K extends keyof PublicBookingDraft>(field: K, value: PublicBookingDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const saveDraft = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch {
      // The API still provides the final authentication guard.
    }
  }

  const redirectToSignIn = () => {
    const returnUrl = new URL(window.location.href)
    returnUrl.searchParams.set('booking', '1')
    returnUrl.hash = ''
    window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}`
  }

  const submit = async () => {
    const result = bookingStepOneSchema.safeParse(draft)
    if (!result.success) {
      setErrors(zodErrors(result.error))
      return
    }

    setErrors({})
    setSubmissionError(null)
    setIsSubmitting(true)
    saveDraft()
    try {
      const response = await fetch('/api/booking-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({
          artistId: artistUserId,
          artistProfileId,
          eventId: selectedEventId === 'none' ? undefined : selectedEventId,
          requestType: result.data.requestType,
          bookingDetails: {
            performanceType: result.data.performanceType,
            performanceDate: result.data.performanceDate,
            venue: result.data.venue,
            location: result.data.location,
            description: result.data.description,
          },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        redirectToSignIn()
        return
      }
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'Your request could not be sent.')

      try {
        window.localStorage.removeItem(storageKey)
      } catch {}
      setCreatedBookingId(payload?.data?.id || null)
      setSelectedEventId('none')
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Your request could not be sent.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open && createdBookingId) {
      setDraft(INITIAL_DRAFT)
      setSelectedEventId('none')
      setCreatedBookingId(null)
      setSubmissionError(null)
    }
    onOpenChange(open)
  }

  const fieldClass = 'rounded-xl border-white/15 bg-white/[0.06] text-[var(--artist-theme-text,#fff)]'
  const labelClass = 'text-sm text-[var(--artist-theme-text,#fff)]'
  const selectStyle = profileAppearance ? {
    backgroundColor: profileAppearance.surfaceColor,
    borderColor: profileAppearance.accentColor,
    color: profileAppearance.textColor,
  } : undefined

  const field = (id: keyof PublicBookingDraft, label: string, control: React.ReactNode) => (
    <div className="grid gap-1.5">
      <Label htmlFor={String(id)} className={labelClass}>{label}</Label>
      {control}
      {errors[id] ? <p id={`${String(id)}-error`} className="text-xs text-rose-400">{errors[id]}</p> : null}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <ThemedDialogContent
        profileAppearance={profileAppearance}
        className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-slate-950/95 p-0 text-[var(--artist-theme-text,#fff)] sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-[min(44rem,calc(100vw-2rem))] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <DialogHeader className="border-b border-white/10 px-5 py-5 pr-14 sm:px-7">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--artist-theme-muted,#94a3b8)]">
            {createdBookingId ? 'Request sent' : 'Booking request'}
          </div>
          <DialogTitle className="mt-2 text-2xl text-[var(--artist-theme-text,#fff)]">
            {createdBookingId ? 'Your request is on its way' : `Hire or book ${artistName}`}
          </DialogTitle>
          <DialogDescription className="text-[var(--artist-theme-muted,#94a3b8)]">
            {createdBookingId
              ? `${artistName} can now accept or decline your request. You can track its status in Bookings.`
              : `Send the essentials${creatorType ? ` for this ${creatorType.toLowerCase()}` : ''}. More details unlock after acceptance.`}
          </DialogDescription>
        </DialogHeader>

        {createdBookingId ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-400" aria-hidden="true" />
            <h3 className="mt-5 text-xl font-semibold">Request pending</h3>
            <p className="mt-2 max-w-md text-sm text-[var(--artist-theme-muted,#94a3b8)]">
              You can view the request now and reply in its booking thread if the artist needs more information.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button variant="outline" className={paBtnRound} onClick={() => onOpenChange(false)}>Done</Button>
              <Button asChild className={paBtnRound}>
                <Link href={`/bookings/requests/${createdBookingId}`}>View request</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {field('performanceType', 'Booking type', serviceOfferings?.length ? (
                  <Select value={draft.performanceType} onValueChange={(value) => update('performanceType', value)}>
                    <SelectTrigger id="performanceType" className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent style={selectStyle}>
                      <SelectItem value="project">General project</SelectItem>
                      {serviceOfferings.map((service) => <SelectItem key={service} value={service}>{service}</SelectItem>)}
                      <SelectItem value="custom-project">Custom project</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="performanceType" value={draft.performanceType} onChange={(event) => update('performanceType', event.target.value)} className={fieldClass} placeholder="Performance, project, or service" />
                ))}
                {field('location', 'Location', <Input id="location" value={draft.location} onChange={(event) => update('location', event.target.value)} className={fieldClass} placeholder="City, state, or remote" />)}
                <div className="sm:col-span-2">
                  {field('description', 'Note for the artist', <Textarea id="description" value={draft.description} onChange={(event) => update('description', event.target.value)} className={`${fieldClass} min-h-28`} placeholder="Share what you have in mind, including any important context." />)}
                </div>
                {attachableEvents.length > 0 ? (
                  <div className="sm:col-span-2">
                    <Label htmlFor="linkedEvent" className={labelClass}>Add an event from one of your accounts <span className="text-[var(--artist-theme-muted,#94a3b8)]">(optional)</span></Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger id="linkedEvent" className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={selectStyle}>
                        <SelectItem value="none">No event attached</SelectItem>
                        {attachableEvents.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}{event.startAt ? ` · ${event.startAt.slice(0, 10)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--artist-theme-muted,#94a3b8)]">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Accepted artists get promotion access and limited artist activity insights.
                    </p>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <Accordion type="single" collapsible className="border-y border-white/10">
                    <AccordionItem value="advanced" className="border-0">
                      <AccordionTrigger className="py-3 text-sm font-medium text-[var(--artist-theme-text,#fff)] hover:no-underline">
                        Advanced options <span className="ml-2 font-normal text-[var(--artist-theme-muted,#94a3b8)]">Optional</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1">
                        <div className="grid gap-5 sm:grid-cols-2">
                          {field('requestType', 'Request category', (
                            <Select value={draft.requestType} onValueChange={(value: 'performance' | 'collaboration') => update('requestType', value)}>
                              <SelectTrigger id="requestType" className={fieldClass}><SelectValue /></SelectTrigger>
                              <SelectContent style={selectStyle}>
                                <SelectItem value="performance">Paid booking / project</SelectItem>
                                <SelectItem value="collaboration">Creative collaboration</SelectItem>
                              </SelectContent>
                            </Select>
                          ))}
                          {field('venue', 'Business or venue', <Input id="venue" value={draft.venue} onChange={(event) => update('venue', event.target.value)} className={fieldClass} placeholder="Company, brand, or venue" />)}
                          <div className="sm:col-span-2">
                            {field('performanceDate', 'Target date', <Input id="performanceDate" type="date" value={draft.performanceDate} onChange={(event) => update('performanceDate', event.target.value)} className={fieldClass} />)}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
              {submissionError ? <div role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-300">{submissionError}</div> : null}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[var(--artist-theme-surface,#020617)] px-5 py-4 sm:px-7">
              <Button variant="ghost" className={paBtnRound} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className={paBtnRound} onClick={() => void submit()} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Sending…' : 'Send request'}
              </Button>
            </div>
          </>
        )}
      </ThemedDialogContent>
    </Dialog>
  )
}
