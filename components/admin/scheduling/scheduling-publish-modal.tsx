"use client"

import { useMemo, useState } from "react"
import { BellRing, CheckCircle2, Send, Users } from "lucide-react"

import { Button } from "@/components/admin/scheduling/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/scheduling/ui/dialog"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"

export function PublishModal() {
  const { data, publishOpen, closePublish, publishShifts } = useScheduling()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState<string | null>(null)

  const pendingShifts = useMemo(
    () => data.shifts.filter((shift) => shift.status === "pending" || shift.status === "published" || shift.status === "draft"),
    [data.shifts],
  )

  function handleOpenChange(open: boolean) {
    if (!open) {
      closePublish()
      setDone(false)
      setError(null)
      setResultSummary(null)
    }
  }

  async function handlePublish(notify: boolean) {
    setError(null)
    const ids = pendingShifts.map((shift) => shift.id)
    if (ids.length === 0) {
      setError("No pending shifts to publish in this week.")
      return
    }
    const result = await publishShifts(ids, { notify })
    if (!result.ok) {
      setError(result.error ?? "Failed to publish schedule")
      return
    }
    setResultSummary(
      notify
        ? `Published ${ids.length} shifts and notified assigned crew.`
        : `Published ${ids.length} shifts without sending notifications.`,
    )
    setDone(true)
  }

  return (
    <Dialog open={publishOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-neon-green/15 text-neon-green">
                <CheckCircle2 className="size-6" />
              </span>
              <DialogTitle>Schedule published</DialogTitle>
              <DialogDescription>
                {resultSummary ?? `${pendingShifts.length} shifts were published.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-neon-purple/15 text-neon-purple">
                <Send className="size-5" />
              </span>
              <DialogTitle>Publish this schedule?</DialogTitle>
              <DialogDescription>
                Publishing syncs Work Mode invites and can notify assigned staff so they can accept or decline.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Users className="size-3.5 text-neon-cyan" /> {data.staff.length} staff across{" "}
                {new Set(data.shifts.map((shift) => shift.eventName)).size} events
              </span>
              <span className="flex items-center gap-2">
                <BellRing className="size-3.5 text-neon-amber" /> {pendingShifts.length} shifts pending confirmation
              </span>
            </div>

            {error ? <p className="text-xs text-neon-red">{error}</p> : null}

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="secondary" disabled={data.saving} onClick={() => void handlePublish(false)}>
                Publish Schedule
              </Button>
              <Button
                disabled={data.saving}
                onClick={() => void handlePublish(true)}
                className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
              >
                <Send data-icon="inline-start" /> Publish &amp; Notify
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
