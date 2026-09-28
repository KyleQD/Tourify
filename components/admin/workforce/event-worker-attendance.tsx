"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface AttendanceEvent {
  id: string
  workerId: string
  workerName: string
  roleTitle: string
  action: "check_in" | "check_out"
  occurredAt: string
}

export function EventWorkerAttendance({ eventId }: { eventId: string }) {
  const { actingHeaders } = useActingContext()
  const [events, setEvents] = useState<AttendanceEvent[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "disabled">("loading")
  const requestSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    setStatus("loading")
    setEvents([])
    try {
      const response = await fetch(`/api/admin/events/${eventId}/work-mode/attendance`, {
        credentials: "include",
        cache: "no-store",
        headers: actingHeaders,
      })
      const payload = (await response.json()) as { data?: AttendanceEvent[]; error?: string }
      if (sequence !== requestSequence.current) return
      if (response.status === 503 && payload.error === "Worker attendance is not enabled.") {
        setStatus("disabled")
        return
      }
      if (!response.ok || !Array.isArray(payload.data)) throw new Error("Attendance unavailable")
      setEvents(payload.data)
      setStatus("ready")
    } catch {
      if (sequence !== requestSequence.current) return
      setStatus("error")
    }
  }, [actingHeaders, eventId])

  useEffect(() => {
    void load()
    return () => { requestSequence.current += 1 }
  }, [load])

  return (
    <Card className="border-slate-700 bg-slate-900/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base text-slate-100">Worker attendance</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>Refresh</Button>
      </CardHeader>
      <CardContent aria-live="polite" className="text-sm text-slate-300">
        {status === "loading" ? <p>Loading attendance…</p> : null}
        {status === "disabled" ? <p>Worker attendance is not enabled for this event.</p> : null}
        {status === "error" ? <p>Attendance could not be loaded.</p> : null}
        {status === "ready" && events.length === 0 ? <p>No worker attendance recorded yet.</p> : null}
        {status === "ready" && events.length > 0 ? (
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <span className="font-medium text-slate-100">{event.workerName}</span>
                {" · "}{event.roleTitle}{" · "}
                {event.action === "check_in" ? "Checked in" : "Checked out"}
                {" · "}{new Date(event.occurredAt).toLocaleString()}
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  )
}
