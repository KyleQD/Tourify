'use client'

import type { AdminCalendarScopeMode } from '@/lib/admin/calendar/types'

export interface CalendarScopeOption {
  id: string
  name: string
  status?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type CalendarScopeValue = {
  mode: 'tour' | 'event'
  id: string
}

interface CalendarScopeDropdownProps {
  scopeMode: AdminCalendarScopeMode | null
  scopeId: string | null
  tours: CalendarScopeOption[]
  events: CalendarScopeOption[]
  isLoadingOptions?: boolean
  onChange: (value: CalendarScopeValue) => void
  className?: string
}

function encodeScopeValue(mode: 'tour' | 'event', id: string) {
  return `${mode}:${id}`
}

function parseScopeValue(value: string): CalendarScopeValue | null {
  const colon = value.indexOf(':')
  if (colon <= 0) return null
  const mode = value.slice(0, colon)
  const id = value.slice(colon + 1)
  if ((mode !== 'tour' && mode !== 'event') || !id) return null
  return { mode, id }
}

export function CalendarScopeDropdown({
  scopeMode,
  scopeId,
  tours,
  events,
  isLoadingOptions = false,
  onChange,
  className = '',
}: CalendarScopeDropdownProps) {
  const selectedValue =
    (scopeMode === 'tour' || scopeMode === 'event') && scopeId
      ? encodeScopeValue(scopeMode, scopeId)
      : ''

  return (
    <select
      aria-label="Tour or event"
      value={selectedValue}
      disabled={isLoadingOptions || (tours.length === 0 && events.length === 0)}
      onChange={(e) => {
        const parsed = parseScopeValue(e.target.value)
        if (parsed) onChange(parsed)
      }}
      className={`h-8 max-w-[240px] truncate rounded-lg border border-border/60 bg-background/40 px-2.5 text-xs font-medium text-foreground ${className}`}
    >
      {isLoadingOptions ? (
        <option value="">Loading…</option>
      ) : tours.length === 0 && events.length === 0 ? (
        <option value="">No tours or events</option>
      ) : (
        <>
          {!selectedValue ? <option value="">Select…</option> : null}
          {tours.length > 0 ? (
            <optgroup label="Tours">
              {tours.map((tour) => (
                <option key={`tour-${tour.id}`} value={encodeScopeValue('tour', tour.id)}>
                  {tour.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {events.length > 0 ? (
            <optgroup label="Events">
              {events.map((event) => (
                <option key={`event-${event.id}`} value={encodeScopeValue('event', event.id)}>
                  {event.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </>
      )}
    </select>
  )
}

/** @deprecated Use CalendarScopeDropdown */
export const CalendarContextBar = CalendarScopeDropdown
