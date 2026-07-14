"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SelectableEvent {
  id: string
  name: string
  status?: string
  event_date?: string | null
  venue_id?: string | null
  created_at?: string
}

interface EventSelectProps {
  onSelect: (event?: SelectableEvent) => void
  placeholder?: string
  className?: string
  defaultEventId?: string
}

export function EventSelect({ onSelect, placeholder = "Select an event", className, defaultEventId }: EventSelectProps) {
  const [events, setEvents] = useState<SelectableEvent[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultEventId)
  // Keep a stable reference to the callback to avoid effect-triggered render loops
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    setSelectedId(defaultEventId)
  }, [defaultEventId])

  useEffect(function loadEvents() {
    let isActive = true
    async function run() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/admin/events", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch events")
        const data = await res.json()
        const list: SelectableEvent[] = Array.isArray(data?.events)
          ? data.events.map((e: any) => ({
              id: String(e.id),
              name: String(e.name ?? e.title ?? "Untitled Event"),
              status: e.status ?? undefined,
              event_date: e.event_date ?? e.date ?? null,
              venue_id: e.venue_id ?? null,
              created_at: e.created_at ?? undefined,
            }))
          : []
        if (isActive) setEvents(list)
      } catch {
        if (isActive) setEvents([])
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    run()
    return () => {
      isActive = false
    }
  }, [])

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedId),
    [events, selectedId]
  )

  // Notify parent only when the selected event actually changes
  useEffect(function notifyChange() {
    onSelectRef.current(selectedEvent)
  }, [selectedEvent?.id])

  return (
    <div className={cn("w-full", className)}>
      <Select
        value={selectedId}
        onValueChange={value => setSelectedId(value || undefined)}
        disabled={isLoading || events.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {events.map(evt => (
            <SelectItem key={evt.id} value={evt.id}>
              {evt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


