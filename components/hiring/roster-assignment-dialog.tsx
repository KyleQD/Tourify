"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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
import type { HiringEntity } from "@/types/hiring-entity"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface ShiftOption {
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
}

export function RosterAssignmentDialog({
  employer,
  member,
  open,
  onOpenChange,
  onAssigned,
  contextEventId = null,
}: RosterAssignmentDialogProps) {
  const [eventId, setEventId] = useState(contextEventId || "")
  const [shiftId, setShiftId] = useState("")
  const [shifts, setShifts] = useState<ShiftOption[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)
  const [zone, setZone] = useState(member?.assignedZone ?? "")
  const [assignedManagerId, setAssignedManagerId] = useState(member?.assignedManagerId ?? "")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEventId(contextEventId || "")
      setShiftId("")
      setZone(member?.assignedZone ?? "")
      setAssignedManagerId(member?.assignedManagerId ?? "")
      setNotes("")
      setError(null)
    }
  }, [open, contextEventId, member])

  useEffect(() => {
    if (!open || !eventId) {
      setShifts([])
      return
    }

    let cancelled = false
    async function loadShifts() {
      setIsLoadingShifts(true)
      try {
        const response = await fetch(`/api/events/${eventId}/staff`, { credentials: "include", cache: "no-store" })
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
  }, [open, eventId])

  async function ensureShiftStub(): Promise<string | undefined> {
    if (shiftId) return shiftId
    if (!eventId || !member) return undefined

    const response = await fetch(`/api/events/${eventId}/staff`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_member_id: member.id,
        shift_date: new Date().toISOString().slice(0, 10),
        start_time: "09:00",
        end_time: "17:00",
        role_assignment: member.position || "crew",
        notes: "Created from roster assignment",
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || "Failed to create shift stub")
    return data?.shift?.id || data?.data?.id
  }

  async function handleSubmit() {
    if (!member) return

    setIsSubmitting(true)
    setError(null)

    try {
      const resolvedShiftId = eventId ? await ensureShiftStub() : undefined
      const response = await fetch(`/api/hiring/roster/${member.id}/assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
          event_id: eventId || undefined,
          shift_id: resolvedShiftId || undefined,
          zone: zone || undefined,
          assigned_manager_id: assignedManagerId || undefined,
          notes: notes || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Failed to assign staff member")

      onAssigned(payload.data)
      onOpenChange(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to assign staff member")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign staff member</DialogTitle>
          <DialogDescription>
            Assign {member?.profile.fullName ?? "this staff member"} to a shift, zone, or manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="event-id">Event</Label>
            {contextEventId ? (
              <Input id="event-id" value={eventId} readOnly />
            ) : (
              <Input
                id="event-id"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Event UUID"
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label>Shift</Label>
            <Select
              value={shiftId || "__create__"}
              onValueChange={(value) => setShiftId(value === "__create__" ? "" : value)}
              disabled={!eventId || isLoadingShifts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !eventId
                      ? "Select an event first"
                      : isLoadingShifts
                        ? "Loading shifts…"
                        : shifts.length
                          ? "Select a shift"
                          : "Create shift stub on assign"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__create__">
                  {shifts.length ? "Create new shift stub" : "Create shift stub on assign"}
                </SelectItem>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zone">Zone</Label>
            <Input id="zone" value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Main gate, FOH, backstage" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manager-id">Assigned manager ID</Label>
            <Input
              id="manager-id"
              value={assignedManagerId}
              onChange={(event) => setAssignedManagerId(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignment-notes">Notes</Label>
            <Textarea id="assignment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !member}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
