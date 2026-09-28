"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useActingContext } from "@/hooks/use-acting-context"

import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface ShiftOption {
  id: string
  label: string
}

interface EventOption {
  id: string
  label: string
  tourId?: string
}

interface ManagerOption {
  id: string
  label: string
}

interface TourOption {
  id: string
  label: string
}

interface RosterAssignmentDialogProps {
  employer: HiringEntity
  member: RosterMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: (member: RosterMember) => void
  contextEventId?: string | null
  contextTourId?: string | null
}

export function RosterAssignmentDialog({
  employer,
  member,
  open,
  onOpenChange,
  onAssigned,
  contextEventId = null,
  contextTourId = null,
}: RosterAssignmentDialogProps) {
  const { actingHeaders } = useActingContext()
  const [eventId, setEventId] = useState(contextEventId || "")
  const [tourId, setTourId] = useState(contextTourId || employer.scope?.tourId || "")
  const [events, setEvents] = useState<EventOption[]>([])
  const [tours, setTours] = useState<TourOption[]>([])
  const [shiftId, setShiftId] = useState("")
  const [shifts, setShifts] = useState<ShiftOption[]>([])
  const [shiftDate, setShiftDate] = useState("")
  const [shiftStart, setShiftStart] = useState("")
  const [shiftEnd, setShiftEnd] = useState("")
  const [shiftRole, setShiftRole] = useState(member?.position ?? "")
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)
  const [zone, setZone] = useState(member?.position ?? "")
  const [assignedManagerId, setAssignedManagerId] = useState(member?.assignedManagerId ?? "")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEventId(contextEventId || "")
      setTourId(contextTourId || employer.scope?.tourId || "")
      setShiftId("")
      setShiftDate("")
      setShiftStart("")
      setShiftEnd("")
      setShiftRole(member?.position ?? "")
      setZone(member?.position ?? "")
      setAssignedManagerId(member?.assignedManagerId ?? "")
      setNotes("")
      setError(null)
    }
  }, [open, contextEventId, contextTourId, employer.scope?.tourId, member])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    async function loadOptions() {
      try {
        const [eventsResponse, toursResponse, managersResponse] = await Promise.allSettled([
          fetch("/api/admin/events", { credentials: "include", cache: "no-store", headers: actingHeaders }),
          fetch("/api/admin/tours", { credentials: "include", cache: "no-store", headers: actingHeaders }),
          fetch(
            `/api/hiring/roster?entity_type=${encodeURIComponent(employer.entityType)}&entity_id=${encodeURIComponent(
              employer.entityId
            )}&status=active&limit=200`,
            { credentials: "include", cache: "no-store", headers: actingHeaders }
          ),
        ])

        if (cancelled) return

        if (eventsResponse.status === "fulfilled") {
          const payload = await eventsResponse.value.json().catch(() => ({}))
          const rows = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload?.data) ? payload.data : []
          setEvents(
            rows
              .map((event: any) => ({
                id: String(event.id),
                label: String(event.name ?? event.title ?? "Untitled event"),
                // events_v2 response includes a `tours` array from the join — grab the first tour's id
                tourId: event.tours?.[0]?.id ? String(event.tours[0].id) : undefined,
              }))
              .filter((event: EventOption) => event.id)
          )
        }

        if (toursResponse.status === "fulfilled") {
          const payload = await toursResponse.value.json().catch(() => ({}))
          const rows = Array.isArray(payload?.tours) ? payload.tours : Array.isArray(payload?.data) ? payload.data : []
          setTours(
            rows
              .map((tour: any) => ({
                id: String(tour.id),
                label: String(tour.name ?? tour.title ?? "Untitled tour"),
              }))
              .filter((tour: TourOption) => tour.id)
          )
        }

        if (managersResponse.status === "fulfilled") {
          const payload = await managersResponse.value.json().catch(() => ({}))
          const rows = Array.isArray(payload?.data?.members) ? payload.data.members : []
          setManagers(
            rows
              .filter((row: any) => row.id !== member?.id)
              .map((row: any) => ({
                id: String(row.userId ?? row.user_id ?? row.id),
                label: String(row.profile?.fullName ?? row.name ?? row.email ?? "Staff member"),
              }))
          )
        }
      } catch {
        if (!cancelled) {
          setEvents([])
          setTours([])
          setManagers([])
        }
      }
    }

    void loadOptions()
    return () => {
      cancelled = true
    }
  }, [employer.entityId, employer.entityType, member?.id, open])

  // When tour changes, clear the event selection so the filtered list takes effect
  useEffect(() => {
    if (!contextEventId) setEventId("")
    setShiftId("")

  }, [tourId])

  // Events visible in the dropdown — filtered by selected tour when one is chosen
  const visibleEvents = tourId
    ? events.filter((e) => e.tourId === tourId)
    : events

  // The effective single eventId for shift loading (not "__all_tour_events__")
  const singleEventId = eventId && eventId !== "__all_tour_events__" ? eventId : ""

  useEffect(() => {
    if (!open || !singleEventId) {
      setShifts([])
      return
    }

    let cancelled = false
    async function loadShifts() {
      setIsLoadingShifts(true)
      try {
        const response = await fetch(`/api/events/${singleEventId}/staff`, { credentials: "include", cache: "no-store", headers: actingHeaders })
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        const rows = Array.isArray(data?.shifts) ? data.shifts : []
        setShifts(
          rows.map((shift: any) => ({
            id: String(shift.id),
            label: [
              shift.role_assignment || shift.role || "Shift",
              shift.shift_date,
              shift.start_time && shift.end_time ? `${shift.start_time}-${shift.end_time}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))
        )
      } catch {
        if (!cancelled) setShifts([])
      } finally {
        if (!cancelled) setIsLoadingShifts(false)
      }
    }
    void loadShifts()
    return () => {
      cancelled = true
    }
  }, [open, singleEventId])

  async function resolveShift(targetEventId: string): Promise<string | undefined> {
    if (shiftId && shiftId !== "__create__" && eventId === targetEventId) return shiftId
    if (shiftId !== "__create__") return undefined
    if (!targetEventId || !member) throw new Error("Select an event before creating a shift")
    if (!shiftDate || !shiftStart || !shiftEnd || !shiftRole.trim()) {
      throw new Error("Date, start time, end time, and role are required for a new shift")
    }

    const response = await fetch(`/api/events/${targetEventId}/staff`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...actingHeaders },
      body: JSON.stringify({
        staff_member_id: member.id,
        shift_date: shiftDate,
        start_time: shiftStart,
        end_time: shiftEnd,
        role_assignment: shiftRole.trim(),
        zone: zone || undefined,
        notes: notes || "Created from roster assignment",
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || "Failed to create shift")
    return data?.shift?.id || data?.data?.id
  }

  async function callAssignmentApi(targetEventId?: string, targetTourId?: string, resolvedShiftId?: string) {
    const response = await fetch(`/api/hiring/roster/${member!.id}/assignment`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...actingHeaders },
      body: JSON.stringify({
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
        event_id: targetEventId || undefined,
        tour_id: targetTourId || undefined,
        shift_id: resolvedShiftId || undefined,
        zone: zone || undefined,
        assigned_manager_id: assignedManagerId || undefined,
        notes: notes || undefined,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? "Failed to assign staff member")
    return payload.data
  }

  async function handleSubmit() {
    if (!member) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (eventId === "__all_tour_events__") {
        // Fan-out: assign to every event in the selected tour individually,
        // then record one tour-level assignment with no specific event.
        const tourEvents = visibleEvents // already filtered to this tour
        let failed = 0
        let lastMember = null

        for (const ev of tourEvents) {
          try {
            lastMember = await callAssignmentApi(ev.id, tourId || undefined, undefined)
          } catch {
            failed++
          }
        }

        // Tour-level record (no event_id)
        try {
          lastMember = await callAssignmentApi(undefined, tourId || undefined, undefined)
        } catch {
          failed++
        }

        if (failed > 0 && failed >= tourEvents.length + 1) {
          throw new Error(`All assignments failed (${failed})`)
        }

        if (lastMember) onAssigned(lastMember)
        if (failed > 0) setError(`${failed} of ${tourEvents.length + 1} assignments failed — the rest succeeded.`)
        else onOpenChange(false)
      } else {
        // Single event or tour-only assignment
        const resolvedShiftId = singleEventId ? await resolveShift(singleEventId) : undefined
        const data = await callAssignmentApi(singleEventId || undefined, tourId || undefined, resolvedShiftId)
        onAssigned(data)
        onOpenChange(false)
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to assign staff member")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(detailSurfacePattern.dialogContent, "sm:max-w-lg")}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>Assign {member?.profile.fullName ?? "staff member"}</DialogTitle>
          <DialogDescription className={detailSurfacePattern.description}>
            Assign {member?.profile.fullName ?? "this staff member"} to a tour, event, shift, zone, or manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="tour-id" className={detailSurfacePattern.label}>Tour</Label>
            {contextTourId || employer.scope?.tourId ? (
              <Input id="tour-id" className={detailSurfacePattern.input} value={tourId} readOnly />
            ) : (
              <Select value={tourId || "__none__"} onValueChange={(value) => setTourId(value === "__none__" ? "" : value)}>
                <SelectTrigger id="tour-id" className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select tour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No tour</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-id" className={detailSurfacePattern.label}>Event</Label>
            {contextEventId ? (
              <Input id="event-id" className={detailSurfacePattern.input} value={eventId} readOnly />
            ) : (
              <Select value={eventId || "__none__"} onValueChange={(value) => setEventId(value === "__none__" ? "" : value)}>
                <SelectTrigger id="event-id" className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No event</SelectItem>
                  {tourId && visibleEvents.length > 0 && (
                    <SelectItem value="__all_tour_events__">
                      All events in {tours.find((t) => t.id === tourId)?.label ?? "this tour"}
                    </SelectItem>
                  )}
                  {visibleEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label className={detailSurfacePattern.label}>Shift</Label>
            <Select
              value={shiftId || "__none__"}
              onValueChange={(value) => setShiftId(value === "__none__" ? "" : value)}
              disabled={!singleEventId || isLoadingShifts || eventId === "__all_tour_events__"}
            >
              <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                <SelectValue
                  placeholder={
                    eventId === "__all_tour_events__"
                      ? "Assigning to tour events without shifts"
                      : !singleEventId
                        ? "Select an event first"
                        : isLoadingShifts
                          ? "Loading shifts…"
                          : "Select or create a shift"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No shift — event assignment only</SelectItem>
                <SelectItem value="__create__">Create a new shift</SelectItem>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {shiftId === "__create__" ? (
            <div className="grid gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="new-shift-role" className={detailSurfacePattern.label}>Shift role</Label>
                <Input id="new-shift-role" className={detailSurfacePattern.input} value={shiftRole} onChange={(event) => setShiftRole(event.target.value)} placeholder="Stage manager, security, runner" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="new-shift-date" className={detailSurfacePattern.label}>Date</Label>
                <Input id="new-shift-date" type="date" className={detailSurfacePattern.input} value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-shift-start" className={detailSurfacePattern.label}>Start time</Label>
                <Input id="new-shift-start" type="time" className={detailSurfacePattern.input} value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-shift-end" className={detailSurfacePattern.label}>End time</Label>
                <Input id="new-shift-end" type="time" className={detailSurfacePattern.input} value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="zone" className={detailSurfacePattern.label}>Zone</Label>
            <Input
              id="zone"
              className={detailSurfacePattern.input}
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              placeholder="Main gate, FOH, backstage"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manager-id" className={detailSurfacePattern.label}>Assigned manager</Label>
            <Select
              value={assignedManagerId || "__none__"}
              onValueChange={(value) => setAssignedManagerId(value === "__none__" ? "" : value)}
            >
              <SelectTrigger id="manager-id" className={detailSurfacePattern.selectTrigger}>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No manager</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignment-notes" className={detailSurfacePattern.label}>Notes</Label>
            <Textarea
              id="assignment-notes"
              className={detailSurfacePattern.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>

        <DialogFooter className={detailSurfacePattern.footer}>
          <Button
            variant="outline"
            className={detailSurfacePattern.btnOutline}
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className={detailSurfacePattern.btnPrimary}
            onClick={handleSubmit}
            disabled={isSubmitting || !member}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
