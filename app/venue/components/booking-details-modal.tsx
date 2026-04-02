import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChangeEvent } from 'react'
import { formatSafeDate, formatSafeDateTime } from '@/lib/events/admin-event-normalization'

interface BookingDetailsModalProps {
  booking: {
    id: string
    eventName: string
    organizer: string
    date: string
    attendees: number
    status: string
    received: string
  } | null
  notes: string
  onChangeNote: (note: string) => void
  onClose: () => void
}

export function BookingDetailsModal({ booking, notes, onChangeNote, onClose }: BookingDetailsModalProps) {
  if (!booking) return null

  function handleNoteChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChangeNote(e.target.value)
  }

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        <div>
          <div className="font-bold text-lg mb-2">{booking.eventName}</div>
          <div>Organizer: {booking.organizer}</div>
          <div>Date: {formatSafeDateTime(booking.date)}</div>
          <div>Attendees: {booking.attendees}</div>
          <div>Status: {booking.status}</div>
          <div>Received: {formatSafeDate(booking.received)}</div>
          <div className="mt-4">
            <label className="block text-xs text-gray-400 mb-1">Internal Notes</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
              value={notes}
              onChange={handleNoteChange}
              rows={3}
              placeholder="Add notes for this booking (private)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 