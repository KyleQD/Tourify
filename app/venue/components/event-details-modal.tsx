import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatSafeDateTime } from '@/lib/events/admin-event-normalization'

interface EventDetailsModalProps {
  event: {
    id?: string | number
    title: string
    description: string
    date: Date
    status: string
    type: string
    capacity: number
    attendance?: number
  } | null
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EventDetailsModal({ event, onEdit, onDelete, onClose }: EventDetailsModalProps) {
  if (!event) return null

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
        </DialogHeader>
        <div>
          <div className="font-bold text-lg mb-2">{event.title}</div>
          <div>Description: {event.description}</div>
          <div>Date: {formatSafeDateTime(event.date.toISOString())}</div>
          <div>Status: {event.status}</div>
          <div>Type: {event.type}</div>
          <div>Capacity: {event.capacity}</div>
          {typeof event.attendance === 'number' && (
            <div>Attendance: {event.attendance}</div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={onEdit}>Edit</Button>
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 