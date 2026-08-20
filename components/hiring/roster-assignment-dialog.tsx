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
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)
  const [zone, setZone] = useState(member?.position ?? "")
  const [assignedManagerId, setAssignedManagerId] = useState(member?.assignedManagerId ?? "")
  const [notes, setNotes] = useState("")
  const [propagationMode, setPropagationMode] = useState<"current_events" | "current_and_future_events">("current_events")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEventId(contextEventId || "")
      setTourId(contextTourId || employer.scope?.tourId || "")
      setShiftId("")
      setZone(member?.position ?? "")
      setAssignedManagerId(member?.assignedManagerId ?? "")
      setNotes("")
      setPropagationMode("current_events")
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
      if (tourId) {
        const response = await fetch("/api/admin/workforce/tour-memberships", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            staffMemberId: member.id,
            tourId,
            role: member.position,
            zone: zone || null,
            managerUserId: assignedManagerId || null,
            notes: notes || null,
            propagationMode,
            selectedEventIds: singleEventId ? [singleEventId] : [],
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error ?? "Failed to assign tour access")

        // A shift is only created by the shared shift workflow. Selecting an
        // existing shift here links the worker; tour membership alone does not.
        if (shiftId) await callAssignmentApi(singleEventId || undefined, tourId, shiftId)
        onAssigned({
          ...member,
          assignedZone: zone || member.assignedZone,
          assignedManagerId: assignedManagerId || member.assignedManagerId,
          notes: notes || member.notes,
        })
        onOpenChange(false)
      } else {
        const data = await callAssignmentApi(singleEventId || undefined, undefined, shiftId || undefined)
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
                      All current events in {tours.find((t) => t.id === tourId)?.label ?? "this tour"}
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
          {tourId ? <div className="grid gap-2">
            <Label className={detailSurfacePattern.label}>Future events</Label>
            <Select value={propagationMode} onValueChange={(value) => setPropagationMode(value as typeof propagationMode)}>
              <SelectTrigger className={detailSurfacePattern.selectTrigger}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current_events">Current events only</SelectItem>
                <SelectItem value="current_and_future_events">Current and future events</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">This grants event information and task access. It does not confirm a shift.</p>
          </div> : null}
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
                      ? "Create shifts separately"
                      : !singleEventId
                        ? "Select an event first"
                        : isLoadingShifts
                          ? "Loading shifts…"
                          : shifts.length ? "Select an existing shift" : "No published shifts yet"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No shift — tour access only</SelectItem>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
