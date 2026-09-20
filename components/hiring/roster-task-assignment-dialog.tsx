"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useActingContext } from "@/hooks/use-acting-context"
import { cn } from "@/lib/utils"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface EventOption { id: string; label: string }

interface RosterTaskAssignmentDialogProps {
  member: RosterMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RosterTaskAssignmentDialog({ member, open, onOpenChange }: RosterTaskAssignmentDialogProps) {
  const { actingHeaders } = useActingContext()
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [dueAt, setDueAt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEventId("")
    setTitle("")
    setDescription("")
    setPriority("medium")
    setDueAt("")
    setError(null)

    let cancelled = false
    void fetch("/api/admin/events?sort=start_at&order=asc&limit=100", {
      credentials: "include",
      cache: "no-store",
      headers: actingHeaders,
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}))
      if (cancelled || !response.ok) return
      const rows = Array.isArray(payload.events) ? payload.events : Array.isArray(payload.items) ? payload.items : []
      setEvents(rows.map((event: Record<string, unknown>) => ({
        id: String(event.id),
        label: String(event.name ?? event.title ?? "Untitled event"),
      })))
    }).catch(() => {
      if (!cancelled) setEvents([])
    })
    return () => { cancelled = true }
  }, [open])

  async function submitTask() {
    if (!member || !eventId || !title.trim()) return
    if (!member.userId) {
      setError("This roster member does not have a linked user identity yet.")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/events/${eventId}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          assignee_id: member.userId,
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          priority,
          status: "todo",
          labels: ["staff-assignment"],
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to create task")
      onOpenChange(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to create task")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(detailSurfacePattern.dialogContent, "sm:max-w-lg")}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>Assign task to {member?.profile.fullName ?? "team member"}</DialogTitle>
          <DialogDescription className={detailSurfacePattern.description}>Tasks belong to an event and will appear in that event&apos;s workflow.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="task-event" className={detailSurfacePattern.label}>Event</Label>
            <Select value={eventId} onValueChange={setEventId}><SelectTrigger id="task-event" className={detailSurfacePattern.selectTrigger}><SelectValue placeholder="Select an event" /></SelectTrigger><SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.id}>{event.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-2"><Label htmlFor="task-title" className={detailSurfacePattern.label}>Task</Label><Input id="task-title" className={detailSurfacePattern.input} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Complete venue safety walk" /></div>
          <div className="grid gap-2"><Label htmlFor="task-description" className={detailSurfacePattern.label}>Description</Label><Textarea id="task-description" className={detailSurfacePattern.textarea} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="task-priority" className={detailSurfacePattern.label}>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger id="task-priority" className={detailSurfacePattern.selectTrigger}><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="task-due" className={detailSurfacePattern.label}>Due</Label><Input id="task-due" type="datetime-local" className={detailSurfacePattern.input} value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div>
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
        <DialogFooter className={detailSurfacePattern.footer}>
          <Button variant="outline" className={detailSurfacePattern.btnOutline} onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button className={detailSurfacePattern.btnPrimary} onClick={() => void submitTask()} disabled={isSubmitting || !member || !eventId || !title.trim()}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Assign task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
