'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isToday } from 'date-fns'
import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  MapPin,
  Music,
  Plus,
  Truck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/admin/scheduling/ui/badge'
import { Button } from '@/components/admin/scheduling/ui/button'
import { Input } from '@/components/admin/scheduling/ui/input'
import { Label } from '@/components/admin/scheduling/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/admin/scheduling/ui/sheet'
import { Textarea } from '@/components/admin/scheduling/ui/textarea'
import type { AdminCalendarItem, AdminCalendarKind } from '@/lib/admin/calendar/types'
import { cn } from '@/lib/utils'

type CreateKind = 'task' | 'shift' | 'event' | 'tour' | 'production'

interface CalendarDaySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  items: AdminCalendarItem[]
  /** Events available for task linking (typically current view range). */
  linkableEvents?: AdminCalendarItem[]
  onCreated: () => Promise<void> | void
}

const KIND_CHIP: Record<AdminCalendarKind, string> = {
  event: 'bg-neon-cyan/15 text-neon-cyan',
  tour: 'bg-neon-purple/15 text-neon-purple',
  task: 'bg-neon-amber/15 text-neon-amber',
  shift: 'bg-neon-cyan/10 text-neon-cyan',
  production: 'bg-neon-green/15 text-neon-green',
  hiring: 'bg-neon-pink/15 text-neon-pink',
}

const CREATE_OPTIONS: Array<{
  kind: CreateKind
  label: string
  icon: typeof ClipboardList
}> = [
  { kind: 'task', label: 'Task', icon: ClipboardList },
  { kind: 'shift', label: 'Shift', icon: Users },
  { kind: 'event', label: 'Event', icon: Music },
  { kind: 'tour', label: 'Tour', icon: Truck },
  { kind: 'production', label: 'Production', icon: CalendarClock },
]

function formatItemTime(item: AdminCalendarItem): string {
  if (item.allDay) return 'All day'
  const start = new Date(item.start)
  if (Number.isNaN(start.getTime())) return '—'
  return format(start, 'h:mm a')
}

export function CalendarDaySheet({
  open,
  onOpenChange,
  date,
  items,
  linkableEvents,
  onCreated,
}: CalendarDaySheetProps) {
  const router = useRouter()
  const dateKey = format(date, 'yyyy-MM-dd')
  const today = isToday(date)

  const [createKind, setCreateKind] = useState<CreateKind>('shift')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [eventId, setEventId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const density = Math.min(5, items.length)
  const eventOptions = useMemo(() => {
    const source = linkableEvents && linkableEvents.length > 0 ? linkableEvents : items
    return source.filter((item) => item.kind === 'event')
  }, [items, linkableEvents])

  useEffect(() => {
    if (!open) return
    if (!eventId && eventOptions[0]?.sourceId)
      setEventId(eventOptions[0].sourceId)
  }, [open, eventId, eventOptions])

  const kindCounts = useMemo(() => {
    const counts: Partial<Record<AdminCalendarKind, number>> = {}
    for (const item of items)
      counts[item.kind] = (counts[item.kind] || 0) + 1
    return counts
  }, [items])

  function resetForm() {
    setTitle('')
    setStartTime('09:00')
    setEndTime('17:00')
    setNotes('')
    setEventId(eventOptions[0]?.sourceId || '')
  }

  async function createInlineItem() {
    if (!title.trim()) {
      toast.error('Add a title first')
      return
    }

    if (createKind === 'task' && !eventId) {
      toast.error('Select an event for this task, or open Logistics')
      return
    }

    setIsSubmitting(true)
    try {
      const startIso = new Date(`${dateKey}T${startTime}:00`).toISOString()
      const endIso = new Date(`${dateKey}T${endTime || startTime}:00`).toISOString()

      const body: Record<string, unknown> = {
        title: title.trim(),
        type: createKind === 'shift' ? 'shift' : createKind,
        start: startIso,
        end: endIso,
        description: notes.trim() || undefined,
        priority: 'medium',
      }

      if (createKind === 'task')
        body.event_id = eventId

      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok)
        throw new Error(payload.error || 'Failed to add to schedule')

      toast.success(createKind === 'task' ? 'Task added' : 'Shift added')
      resetForm()
      await onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDeepLink() {
    if (createKind === 'event') {
      router.push(`/admin/dashboard/events/create?date=${dateKey}`)
      return
    }
    if (createKind === 'tour') {
      router.push('/admin/dashboard/tours/builder')
      return
    }
    if (createKind === 'production') {
      const dayEvent = items.find((item) => item.kind === 'event')
      const firstEvent = dayEvent || eventOptions[0]
      if (firstEvent)
        router.push(`/admin/dashboard/events/${firstEvent.sourceId}/hq`)
      else
        router.push('/admin/dashboard/events')
    }
  }

  const isInlineCreate = createKind === 'task' || createKind === 'shift'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="staff-scheduling-prototype w-full gap-0 border-border/60 bg-card/95 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 items-center justify-center rounded-md bg-neon-purple/15 text-neon-purple">
              <CalendarClock className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-base font-semibold tracking-tight">
                  {format(date, 'EEEE, MMM d')}
                </SheetTitle>
                {today ? (
                  <span className="rounded-full border border-neon-purple/40 bg-neon-purple/15 px-2 py-0.5 text-[10px] font-medium text-neon-purple">
                    Today
                  </span>
                ) : null}
              </div>
              <SheetDescription className="text-xs">
                {items.length} item{items.length === 1 ? '' : 's'} on this day
              </SheetDescription>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index < density ? 'bg-neon-purple/60' : 'bg-border',
                )}
              />
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.entries(kindCounts) as Array<[AdminCalendarKind, number]>).map(([kind, count]) => (
              <span
                key={kind}
                className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', KIND_CHIP[kind])}
              >
                {kind} {count}
              </span>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Agenda
            </p>

            {items.length === 0 ? (
              <button
                type="button"
                onClick={() => setCreateKind('shift')}
                className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-8 text-center text-muted-foreground transition-colors hover:border-neon-purple/50 hover:text-neon-purple"
              >
                <Plus className="size-4" />
                <span className="text-xs font-medium">Nothing scheduled — add something</span>
              </button>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--color-ring),0_8px_24px_-12px_var(--color-primary)]"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatItemTime(item)}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('shrink-0 capitalize border-0', KIND_CHIP[item.kind])}
                      >
                        {item.kind}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.status}
                      </span>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neon-cyan hover:underline"
                      >
                        Open
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Add to schedule
            </p>

            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background/40 p-0.5">
              {CREATE_OPTIONS.map((option) => {
                const Icon = option.icon
                const active = createKind === option.kind
                return (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => setCreateKind(option.kind)}
                    className={cn(
                      'inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors',
                      active
                        ? 'bg-neon-purple/20 text-neon-purple'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3" />
                    {option.label}
                  </button>
                )
              })}
            </div>

            {isInlineCreate ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cal-create-title" className="text-xs">
                    {createKind === 'shift' ? 'Role / title' : 'Task title'}
                  </Label>
                  <Input
                    id="cal-create-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={createKind === 'shift' ? 'Security, bartender…' : 'Confirm riders…'}
                  />
                </div>

                {createKind === 'task' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cal-create-event" className="text-xs">
                      Link to event
                    </Label>
                    {eventOptions.length > 0 ? (
                      <select
                        id="cal-create-event"
                        value={eventId || eventOptions[0]?.sourceId || ''}
                        onChange={(e) => setEventId(e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                      >
                        {eventOptions.map((event) => (
                          <option key={event.id} value={event.sourceId}>
                            {event.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-2.5 text-xs text-muted-foreground">
                        No events on this day.{' '}
                        <Link
                          href="/admin/dashboard/logistics"
                          className="text-neon-cyan underline-offset-2 hover:underline"
                        >
                          Open Logistics
                        </Link>
                        {' '}or create an event first.
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cal-create-start" className="text-xs">Start</Label>
                    <Input
                      id="cal-create-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cal-create-end" className="text-xs">End</Label>
                    <Input
                      id="cal-create-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cal-create-notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="cal-create-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional details"
                    className="min-h-16"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-3 text-xs text-muted-foreground">
                {createKind === 'event' && 'Opens the event builder with this date prefilled.'}
                {createKind === 'tour' && 'Opens the tour builder to plan a multi-day run.'}
                {createKind === 'production' && (
                  eventOptions.length > 0
                    ? `Opens HQ production calendar for “${eventOptions[0].title}”.`
                    : 'No event on this day — you’ll land on the events list.'
                )}
              </div>
            )}
          </section>
        </div>

        <SheetFooter className="border-t border-border/60">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {isInlineCreate ? (
              <Button
                className="flex-1 bg-neon-purple text-primary-foreground hover:bg-neon-purple/85 shadow-[0_0_20px_-6px_var(--color-neon-purple)]"
                disabled={isSubmitting || (createKind === 'task' && eventOptions.length === 0)}
                onClick={() => void createInlineItem()}
              >
                <Plus className="size-3.5" />
                {isSubmitting ? 'Adding…' : 'Add'}
              </Button>
            ) : (
              <Button
                className="flex-1 bg-neon-purple text-primary-foreground hover:bg-neon-purple/85 shadow-[0_0_20px_-6px_var(--color-neon-purple)]"
                onClick={handleDeepLink}
              >
                Continue
                <ExternalLink className="size-3.5" />
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CalendarAgendaItemCard({ item }: { item: AdminCalendarItem }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{item.kind}</p>
        </div>
        <Badge variant="outline" className="capitalize">{item.status}</Badge>
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>{formatItemTime(item)}</span>
        {item.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {item.location}
          </span>
        ) : null}
      </div>
      <Link
        href={item.href}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-neon-cyan hover:underline"
      >
        Open details
        <ExternalLink className="size-3" />
      </Link>
    </div>
  )
}
