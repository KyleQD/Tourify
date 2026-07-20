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
import { useAuth } from '@/contexts/auth-context'
import type {
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarScopeMode,
} from '@/lib/admin/calendar/types'
import { cn } from '@/lib/utils'

type CreateKind = 'task' | 'shift' | 'event' | 'tour' | 'production'

const TOUR_LEVEL_VALUE = '__tour_level__'

interface AssigneeOption {
  id: string
  name: string
  isSelf?: boolean
}

interface CalendarDaySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  items: AdminCalendarItem[]
  /** Events available for task linking (typically current view range). */
  linkableEvents?: AdminCalendarItem[]
  scopeMode?: AdminCalendarScopeMode | null
  scopeId?: string | null
  scopeName?: string | null
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
  { kind: 'event', label: 'Show', icon: Music },
  { kind: 'tour', label: 'Tour', icon: Truck },
  { kind: 'production', label: 'Production', icon: CalendarClock },
]

function formatItemTime(item: AdminCalendarItem): string {
  if (item.allDay) return 'All day'
  const start = new Date(item.start)
  if (Number.isNaN(start.getTime())) return '—'
  return format(start, 'h:mm a')
}

function nearestEventId(events: AdminCalendarItem[], dateKey: string): string {
  if (events.length === 0) return ''
  const target = new Date(`${dateKey}T12:00:00`).getTime()
  let best = events[0]
  let bestDelta = Math.abs(new Date(best.start).getTime() - target)
  for (const event of events.slice(1)) {
    const delta = Math.abs(new Date(event.start).getTime() - target)
    if (delta < bestDelta) {
      best = event
      bestDelta = delta
    }
  }
  return best.sourceId
}

function normalizeAssignees(
  members: Array<Record<string, unknown>>,
  currentUserId: string | null,
  currentUserName: string | null,
): AssigneeOption[] {
  const byId = new Map<string, AssigneeOption>()

  if (currentUserId) {
    byId.set(currentUserId, {
      id: currentUserId,
      name: currentUserName ? `Me (${currentUserName})` : 'Me',
      isSelf: true,
    })
  }

  for (const member of members) {
    const profile = member.profiles && typeof member.profiles === 'object'
      ? member.profiles as Record<string, unknown>
      : null
    const id = String(
      member.user_id
      || profile?.id
      || member.id
      || '',
    )
    if (!id) continue
    const name = String(
      profile?.full_name
      || member.full_name
      || profile?.email
      || member.email
      || 'Team member',
    )
    if (currentUserId && id === currentUserId) {
      byId.set(id, {
        id,
        name: `Me (${name})`,
        isSelf: true,
      })
      continue
    }
    if (!byId.has(id))
      byId.set(id, { id, name })
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.isSelf) return -1
    if (b.isSelf) return 1
    return a.name.localeCompare(b.name)
  })
}

export function CalendarDaySheet({
  open,
  onOpenChange,
  date,
  items,
  linkableEvents,
  scopeMode = null,
  scopeId = null,
  scopeName = null,
  onCreated,
}: CalendarDaySheetProps) {
  const router = useRouter()
  const { user } = useAuth()
  const dateKey = format(date, 'yyyy-MM-dd')
  const today = isToday(date)

  const [createKind, setCreateKind] = useState<CreateKind>('task')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [eventId, setEventId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [assignees, setAssignees] = useState<AssigneeOption[]>([])
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const density = Math.min(5, items.length)
  const eventOptions = useMemo(() => {
    const source = linkableEvents && linkableEvents.length > 0 ? linkableEvents : items
    return source.filter((item) => item.kind === 'event')
  }, [items, linkableEvents])

  const createOptions = useMemo(() => {
    if (scopeMode === 'tour')
      return CREATE_OPTIONS.filter((option) => option.kind !== 'tour')
    if (scopeMode === 'event')
      return CREATE_OPTIONS.filter((option) => option.kind !== 'tour' && option.kind !== 'event')
    return CREATE_OPTIONS
  }, [scopeMode])

  useEffect(() => {
    if (!open) return
    if (scopeMode === 'event' && scopeId) {
      setEventId(scopeId)
      return
    }
    if (scopeMode === 'tour') {
      setEventId(nearestEventId(eventOptions, dateKey) || TOUR_LEVEL_VALUE)
      return
    }
    if (eventOptions[0]?.sourceId)
      setEventId(eventOptions[0].sourceId)
  }, [open, scopeMode, scopeId, dateKey])

  useEffect(() => {
    if (!open) return
    if (!createOptions.some((option) => option.kind === createKind))
      setCreateKind(createOptions[0]?.kind || 'task')
  }, [open, createOptions, createKind])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadAssignees() {
      setIsLoadingAssignees(true)
      try {
        const params = new URLSearchParams()
        if (scopeMode === 'tour' && scopeId) params.set('tour_id', scopeId)
        if (scopeMode === 'event' && scopeId) params.set('event_id', scopeId)
        if (scopeMode === 'org' && scopeId) {
          params.set('employer_entity_type', 'organization')
          params.set('employer_entity_id', scopeId)
        }

        const workforceUrl = params.size > 0
          ? `/api/admin/workforce/people?${params.toString()}`
          : '/api/admin/team-members'
        const response = await fetch(workforceUrl, {
          credentials: 'include',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))
        const members = Array.isArray(payload.people)
          ? payload.people
          : Array.isArray(payload.members)
            ? payload.members
            : Array.isArray(payload.teamMembers)
              ? payload.teamMembers
              : []
        if (cancelled) return
        const normalizedMembers = members.map((member: Record<string, unknown>) => ({
          ...member,
          user_id: member.userId || member.user_id || member.id,
          full_name: member.name || member.full_name,
          email: member.email,
        }))
        const next = normalizeAssignees(
          normalizedMembers,
          user?.id || null,
          (user?.user_metadata?.full_name as string | undefined)
            || user?.email
            || null,
        )
        setAssignees(next)
        setAssigneeId((prev) => prev || user?.id || next[0]?.id || '')
      } catch {
        if (cancelled) return
        const fallback = normalizeAssignees(
          [],
          user?.id || null,
          (user?.user_metadata?.full_name as string | undefined) || user?.email || null,
        )
        setAssignees(fallback)
        setAssigneeId((prev) => prev || user?.id || '')
      } finally {
        if (!cancelled) setIsLoadingAssignees(false)
      }
    }

    void loadAssignees()
    return () => {
      cancelled = true
    }
  }, [open, scopeId, scopeMode, user?.email, user?.id, user?.user_metadata?.full_name])

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
    setAssigneeId(user?.id || assignees[0]?.id || '')
    if (scopeMode === 'event' && scopeId)
      setEventId(scopeId)
    else if (scopeMode === 'tour')
      setEventId(nearestEventId(eventOptions, dateKey) || TOUR_LEVEL_VALUE)
    else
      setEventId(eventOptions[0]?.sourceId || '')
  }

  async function createInlineItem() {
    if (!title.trim()) {
      toast.error('Add a title first')
      return
    }

    const isTourLevelTask = createKind === 'task'
      && scopeMode === 'tour'
      && (eventId === TOUR_LEVEL_VALUE || !eventId)

    if (createKind === 'task' && !isTourLevelTask && !eventId && scopeMode !== 'event') {
      toast.error('Select a show for this task, or choose Tour-level')
      return
    }

    if (createKind === 'task' && scopeMode === 'event' && !scopeId) {
      toast.error('Event context is missing')
      return
    }

    if (isTourLevelTask && !scopeId) {
      toast.error('Tour context is missing')
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

      if (createKind === 'task') {
        if (isTourLevelTask)
          body.tour_id = scopeId
        else
          body.event_id = scopeMode === 'event' ? scopeId : eventId
      }

      if (createKind === 'shift') {
        const shiftEventId = scopeMode === 'event'
          ? scopeId
          : eventId && eventId !== TOUR_LEVEL_VALUE
            ? eventId
            : undefined
        if (shiftEventId)
          body.event_id = shiftEventId
      }

      if (assigneeId)
        body.assignee_id = assigneeId

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
      const tourQuery = scopeMode === 'tour' && scopeId ? `&tourId=${scopeId}` : ''
      router.push(`/admin/dashboard/events/create?date=${dateKey}${tourQuery}`)
      return
    }
    if (createKind === 'tour') {
      router.push('/admin/dashboard/tours/builder')
      return
    }
    if (createKind === 'production') {
      const dayEvent = items.find((item) => item.kind === 'event')
      const firstEvent = dayEvent || eventOptions[0]
      const targetEventId = scopeMode === 'event' ? scopeId : firstEvent?.sourceId
      if (targetEventId)
        router.push(`/admin/dashboard/events/${targetEventId}/hq`)
      else
        router.push('/admin/dashboard/events')
    }
  }

  const isInlineCreate = createKind === 'task' || createKind === 'shift'
  const canSubmitTask = createKind !== 'task'
    || Boolean(scopeMode === 'event' && scopeId)
    || Boolean(scopeMode === 'tour' && scopeId)
    || eventOptions.length > 0

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
                {scopeName
                  ? `${scopeName}${items.length > 0 ? ` · ${items.length}` : ''}`
                  : items.length > 0
                    ? `${items.length} item${items.length === 1 ? '' : 's'}`
                    : 'Add to schedule'}
              </SheetDescription>
            </div>
          </div>

          {items.length > 0 ? (
            <>
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
            </>
          ) : null}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {items.length > 0 ? (
            <section className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Agenda
              </p>
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
            </section>
          ) : null}

          <section className="space-y-3 rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Add to schedule
            </p>

            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background/40 p-0.5">
              {createOptions.map((option) => {
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

                <div className="space-y-1.5">
                  <Label htmlFor="cal-create-assignee" className="text-xs">
                    Assign to
                  </Label>
                  <select
                    id="cal-create-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={isLoadingAssignees}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                  >
                    {isLoadingAssignees ? (
                      <option value="">Loading…</option>
                    ) : assignees.length === 0 ? (
                      <option value="">No teammates found</option>
                    ) : (
                      <>
                        <option value="">Unassigned</option>
                        {assignees.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {(createKind === 'task' || createKind === 'shift') && scopeMode !== 'event' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cal-create-event" className="text-xs">
                      {createKind === 'task' ? 'Link to show' : 'Link to show (optional)'}
                    </Label>
                    {eventOptions.length > 0 || scopeMode === 'tour' ? (
                      <select
                        id="cal-create-event"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                      >
                        {scopeMode === 'tour' && createKind === 'task' ? (
                          <option value={TOUR_LEVEL_VALUE}>Tour-level (no show)</option>
                        ) : null}
                        {createKind === 'shift' && scopeMode === 'tour' ? (
                          <option value="">No show link</option>
                        ) : null}
                        {eventOptions.map((event) => (
                          <option key={event.id} value={event.sourceId}>
                            {event.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-2.5 text-xs text-muted-foreground">
                        No events available.{' '}
                        <Link
                          href="/admin/dashboard/events/create"
                          className="text-neon-cyan underline-offset-2 hover:underline"
                        >
                          Create an event
                        </Link>
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
                  eventOptions.length > 0 || (scopeMode === 'event' && scopeId)
                    ? `Opens HQ production calendar${eventOptions[0] ? ` for “${eventOptions[0].title}”` : ''}.`
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
                disabled={isSubmitting || !canSubmitTask}
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
