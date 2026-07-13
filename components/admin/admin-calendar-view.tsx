'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Radio,
  Search,
} from 'lucide-react'
import {
  CalendarAgendaItemCard,
  CalendarDaySheet,
} from '@/components/admin/calendar-day-sheet'
import { OrgCalendarSync } from '@/components/admin/org-calendar-sync'
import { Button } from '@/components/admin/scheduling/ui/button'
import { Input } from '@/components/admin/scheduling/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/admin/scheduling/ui/sheet'
import { useAdminCalendar } from '@/hooks/use-admin-calendar'
import type { AdminCalendarItem, AdminCalendarKind } from '@/lib/admin/calendar/types'
import { ADMIN_CALENDAR_KINDS, KIND_LABELS } from '@/lib/admin/calendar/types'
import { cn } from '@/lib/utils'

type CalendarViewMode = 'month' | 'week' | 'day'

interface AdminCalendarViewProps {
  showHeader?: boolean
  showSubscribePanel?: boolean
  syncUrlState?: boolean
  className?: string
}

const KIND_CHIP: Record<AdminCalendarKind, string> = {
  event: 'bg-neon-cyan/15 text-neon-cyan',
  tour: 'bg-neon-purple/15 text-neon-purple',
  task: 'bg-neon-amber/15 text-neon-amber',
  shift: 'bg-neon-cyan/10 text-neon-cyan',
  production: 'bg-neon-green/15 text-neon-green',
  hiring: 'bg-neon-pink/15 text-neon-pink',
}

function parseDateParam(value: string | null): Date {
  if (!value) return new Date()
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function parseTypesParam(value: string | null): AdminCalendarKind[] {
  if (!value) return [...ADMIN_CALENDAR_KINDS]
  const allowed = new Set(ADMIN_CALENDAR_KINDS)
  const parsed = value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is AdminCalendarKind => allowed.has(part as AdminCalendarKind))
  return parsed.length > 0 ? parsed : [...ADMIN_CALENDAR_KINDS]
}

function itemOccursOnDay(item: AdminCalendarItem, day: Date): boolean {
  const start = startOfDay(new Date(item.start))
  const end = endOfDay(new Date(item.end || item.start))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return isWithinInterval(day, { start, end }) || isSameDay(start, day)
}

export function AdminCalendarView({
  showHeader = true,
  showSubscribePanel = true,
  syncUrlState = true,
  className = '',
}: AdminCalendarViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedDate, setSelectedDate] = useState(() => parseDateParam(searchParams.get('date')))
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const view = searchParams.get('view')
    return view === 'week' || view === 'day' || view === 'month' ? view : 'month'
  })
  const [enabledKinds, setEnabledKinds] = useState<AdminCalendarKind[]>(() =>
    parseTypesParam(searchParams.get('types')),
  )
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const range = useMemo(() => {
    if (viewMode === 'day') {
      return {
        startDate: format(startOfDay(selectedDate), 'yyyy-MM-dd'),
        endDate: format(endOfDay(selectedDate), 'yyyy-MM-dd'),
      }
    }
    if (viewMode === 'week') {
      return {
        startDate: format(startOfWeek(selectedDate), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(selectedDate), 'yyyy-MM-dd'),
      }
    }
    return {
      startDate: format(startOfWeek(startOfMonth(selectedDate)), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(endOfMonth(selectedDate)), 'yyyy-MM-dd'),
    }
  }, [selectedDate, viewMode])

  const { items, summary, isLoading, error, refetch } = useAdminCalendar({
    startDate: range.startDate,
    endDate: range.endDate,
    types: enabledKinds,
  })

  const syncUrl = useCallback((next: {
    date?: Date
    view?: CalendarViewMode
    types?: AdminCalendarKind[]
    q?: string
  }) => {
    if (!syncUrlState) return

    const params = new URLSearchParams(searchParams.toString())
    const date = next.date || selectedDate
    const view = next.view || viewMode
    const types = next.types || enabledKinds
    const q = next.q !== undefined ? next.q : searchQuery

    const nextDate = format(date, 'yyyy-MM-dd')
    const nextTypes = types.length === ADMIN_CALENDAR_KINDS.length ? '' : types.join(',')
    const nextQ = q.trim()

    if (
      params.get('date') === nextDate
      && params.get('view') === view
      && (params.get('types') || '') === nextTypes
      && (params.get('q') || '') === nextQ
    ) {
      return
    }

    params.set('date', nextDate)
    params.set('view', view)
    if (nextTypes) params.set('types', nextTypes)
    else params.delete('types')
    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [enabledKinds, pathname, router, searchParams, searchQuery, selectedDate, syncUrlState, viewMode])

  useEffect(() => {
    syncUrl({})
  }, [selectedDate, viewMode, enabledKinds, searchQuery, syncUrl])

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (!enabledKinds.includes(item.kind)) return false
      if (!query) return true
      return (
        item.title.toLowerCase().includes(query)
        || item.status.toLowerCase().includes(query)
        || (item.location || '').toLowerCase().includes(query)
        || item.kind.toLowerCase().includes(query)
      )
    })
  }, [enabledKinds, items, searchQuery])

  const getItemsForDay = useCallback(
    (day: Date) => visibleItems.filter((item) => itemOccursOnDay(item, day)),
    [visibleItems],
  )

  const selectedDayItems = useMemo(
    () => getItemsForDay(selectedDate),
    [getItemsForDay, selectedDate],
  )

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(selectedDate)),
      end: endOfWeek(endOfMonth(selectedDate)),
    })
  }, [selectedDate])

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(selectedDate),
      end: endOfWeek(selectedDate),
    })
  }, [selectedDate])

  function goPrevious() {
    if (viewMode === 'month') setSelectedDate((d) => subMonths(d, 1))
    else if (viewMode === 'week') setSelectedDate((d) => subWeeks(d, 1))
    else setSelectedDate((d) => subDays(d, 1))
  }

  function goNext() {
    if (viewMode === 'month') setSelectedDate((d) => addMonths(d, 1))
    else if (viewMode === 'week') setSelectedDate((d) => addWeeks(d, 1))
    else setSelectedDate((d) => addDays(d, 1))
  }

  function goToday() {
    setSelectedDate(new Date())
  }

  function toggleKind(kind: AdminCalendarKind) {
    setEnabledKinds((prev) => {
      if (prev.includes(kind)) {
        if (prev.length === 1) return prev
        return prev.filter((k) => k !== kind)
      }
      return [...prev, kind]
    })
  }

  function selectDay(day: Date) {
    setSelectedDate(day)
    if (viewMode === 'month' || viewMode === 'week')
      setDaySheetOpen(true)
  }

  function titleForView() {
    if (viewMode === 'day') return format(selectedDate, 'EEEE, MMMM d, yyyy')
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate)
      const end = endOfWeek(selectedDate)
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    return format(selectedDate, 'MMMM yyyy')
  }

  function renderDayCell(day: Date, opts?: { minHeight?: string; showWeekday?: boolean }) {
    const dayItems = getItemsForDay(day)
    const selected = isSameDay(day, selectedDate)
    const inMonth = isSameMonth(day, selectedDate)
    const dayIsToday = isToday(day)

    return (
      <button
        key={day.toISOString()}
        type="button"
        onClick={() => selectDay(day)}
        className={cn(
          'group rounded-xl border p-2 text-left transition-all',
          opts?.minHeight || 'min-h-28',
          dayIsToday
            ? 'border-neon-purple/50 bg-neon-purple/10'
            : 'border-border/60 bg-card/40 hover:bg-card/70',
          selected && !dayIsToday ? 'ring-1 ring-neon-purple/50' : '',
          !inMonth && viewMode === 'month' ? 'opacity-45' : '',
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className={cn(
              'text-sm font-semibold',
              dayIsToday ? 'text-neon-purple' : 'text-foreground',
            )}
          >
            {opts?.showWeekday ? (
              <span className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {format(day, 'EEE')}
                </span>
                {format(day, 'd')}
              </span>
            ) : (
              format(day, 'd')
            )}
          </span>
          {dayItems.length > 0 ? (
            <span className="rounded-full bg-background/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {dayItems.length}
            </span>
          ) : null}
        </div>

        {dayItems.length > 0 ? (
          <div className="mb-1.5 flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  index < Math.min(5, dayItems.length) ? 'bg-neon-purple/60' : 'bg-border',
                )}
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-1">
          {dayItems.slice(0, viewMode === 'week' ? 5 : 3).map((item) => (
            <div
              key={item.id}
              className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium', KIND_CHIP[item.kind])}
              title={item.title}
            >
              {item.title}
            </div>
          ))}
          {dayItems.length > (viewMode === 'week' ? 5 : 3) ? (
            <p className="text-[10px] text-muted-foreground">
              +{dayItems.length - (viewMode === 'week' ? 5 : 3)} more
            </p>
          ) : null}
          {dayItems.length === 0 ? (
            <span className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/50 py-2 text-[10px] text-muted-foreground opacity-60 transition-all group-hover:border-neon-purple/50 group-hover:text-neon-purple group-hover:opacity-100">
              <Plus className="size-3" />
              Add
            </span>
          ) : null}
        </div>
      </button>
    )
  }

  return (
    <div className={cn('staff-scheduling-prototype space-y-4', className)}>
      {showHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-neon-purple/15 text-neon-purple">
                <CalendarIcon className="size-4" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Calendar</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Ops schedule across events, tours, shifts, tasks, production, and hiring
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showSubscribePanel ? (
              <Button variant="outline" size="sm" onClick={() => setSubscribeOpen(true)}>
                <Radio className="size-3.5" />
                Subscribe
              </Button>
            ) : null}
            <Button
              size="sm"
              className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85 shadow-[0_0_20px_-6px_var(--color-neon-purple)]"
              onClick={() => {
                setDaySheetOpen(true)
              }}
            >
              <CalendarPlus className="size-3.5" />
              Add to schedule
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Viewing
            </p>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {titleForView()}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border/60 bg-background/40 p-0.5">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    viewMode === mode
                      ? 'bg-neon-purple/20 text-neon-purple'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={goPrevious}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goNext}>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calendar…"
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {ADMIN_CALENDAR_KINDS.map((kind) => {
              const active = enabledKinds.includes(kind)
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleKind(kind)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-neon-purple/40 bg-neon-purple/20 text-neon-purple'
                      : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {KIND_LABELS[kind]}
                  {summary ? (
                    <span className="ml-1 opacity-70">{summary[kind]}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-neon-red/30 bg-neon-red/10 p-3 text-sm text-neon-red">
            {error}
            <Button variant="ghost" size="sm" className="ml-2 text-neon-red" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading calendar…</p>
        ) : viewMode === 'day' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Day agenda
              </p>
              <Button
                size="sm"
                className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
                onClick={() => setDaySheetOpen(true)}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
            {selectedDayItems.length === 0 ? (
              <button
                type="button"
                onClick={() => setDaySheetOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-10 text-muted-foreground transition-colors hover:border-neon-purple/50 hover:text-neon-purple"
              >
                <Plus className="size-4" />
                <span className="text-xs font-medium">Nothing scheduled — add something</span>
              </button>
            ) : (
              selectedDayItems.map((item) => (
                <CalendarAgendaItemCard key={item.id} item={item} />
              ))
            )}
          </div>
        ) : viewMode === 'week' ? (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => renderDayCell(day, { minHeight: 'min-h-52', showWeekday: true }))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {monthDays.map((day) => renderDayCell(day))}
          </div>
        )}
      </div>

      {!showHeader && showSubscribePanel ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setSubscribeOpen(true)}>
            <Radio className="size-3.5" />
            Subscribe
          </Button>
        </div>
      ) : null}

      <CalendarDaySheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        date={selectedDate}
        items={selectedDayItems}
        linkableEvents={visibleItems.filter((item) => item.kind === 'event')}
        onCreated={async () => {
          await refetch()
        }}
      />

      {showSubscribePanel ? (
        <Sheet open={subscribeOpen} onOpenChange={setSubscribeOpen}>
          <SheetContent
            side="right"
            className="staff-scheduling-prototype w-full border-border/60 bg-card/95 sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>Subscribe to calendar</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <OrgCalendarSync />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}
