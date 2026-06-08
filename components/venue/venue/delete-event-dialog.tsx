"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { Event } from "@/app/types/events.types"

interface DeleteEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  redirectAfterDelete?: boolean
}

export function DeleteEventDialog({ open, onOpenChange, event, redirectAfterDelete = false }: DeleteEventDialogProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to delete event")
      }

      toast.success("Event deleted successfully")

      if (redirectAfterDelete) {
        router.push("/venue/events")
        router.refresh()
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Event
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete <strong>{event.name}</strong>? This action cannot be undone.
          </p>
          <p className="text-xs text-muted-foreground">
            This will permanently remove the event and all associated data including tickets, attendees, and analytics.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
