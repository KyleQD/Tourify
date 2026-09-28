"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

interface AttendanceEvent {
  id: string
  action: "check_in" | "check_out"
  occurredAt: string
}

export function WorkModeAttendanceHistory({
  assignmentId,
  refreshKey,
}: {
  assignmentId: string
  refreshKey: number
}) {
  const [events, setEvents] = useState<AttendanceEvent[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const requestSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    setStatus("loading")
    try {
      const response = await fetch(`/api/work-mode/assignments/${assignmentId}/actions`, {
        credentials: "include",
        cache: "no-store",
      })
      const payload = (await response.json()) as { data?: AttendanceEvent[] }
      if (!response.ok || !Array.isArray(payload.data)) throw new Error("Attendance unavailable")
      if (sequence !== requestSequence.current) return
      setEvents(payload.data)
      setStatus("ready")
    } catch {
      if (sequence !== requestSequence.current) return
      setEvents([])
      setStatus("error")
    }
  }, [assignmentId])

  useEffect(() => {
    void load()
    return () => { requestSequence.current += 1 }
  }, [load, refreshKey])

  if (status === "loading") return <p className="text-sm text-slate-400" role="status">Loading attendance history…</p>
  if (status === "error") {
    return (
      <div className="text-sm text-amber-300" role="status">
        <p>Attendance history is temporarily unavailable.</p>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    )
  }
  if (events.length === 0) return <p className="text-sm text-slate-400">No attendance recorded yet.</p>

  return (
    <div aria-live="polite">
      <p className="mb-2 text-sm font-medium text-slate-200">Recorded attendance</p>
      <ol className="space-y-1 text-sm text-slate-300">
        {events.map((event) => (
          <li key={event.id}>
            {event.action === "check_in" ? "Checked in" : "Checked out"} · {new Date(event.occurredAt).toLocaleString()}
          </li>
        ))}
      </ol>
    </div>
  )
}
