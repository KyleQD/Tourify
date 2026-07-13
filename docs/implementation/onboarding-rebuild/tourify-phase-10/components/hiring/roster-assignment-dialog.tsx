"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import type { HiringEntity } from "@/types/hiring-entity"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface RosterAssignmentDialogProps {
  employer: HiringEntity
  member: RosterMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: (member: RosterMember) => void
}

export function RosterAssignmentDialog({
  employer,
  member,
  open,
  onOpenChange,
  onAssigned,
}: RosterAssignmentDialogProps) {
  const [eventId, setEventId] = useState("")
  const [shiftId, setShiftId] = useState("")
  const [zone, setZone] = useState(member?.assignedZone ?? "")
  const [assignedManagerId, setAssignedManagerId] = useState(member?.assignedManagerId ?? "")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!member) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/hiring/roster/${member.id}/assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
          event_id: eventId || undefined,
          shift_id: shiftId || undefined,
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
            <Label htmlFor="event-id">Event ID</Label>
            <Input id="event-id" value={eventId} onChange={(event) => setEventId(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shift-id">Shift ID</Label>
            <Input id="shift-id" value={shiftId} onChange={(event) => setShiftId(event.target.value)} />
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
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
