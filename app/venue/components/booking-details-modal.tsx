import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ChangeEvent } from 'react'
import { formatSafeDate, formatSafeDateTime } from '@/lib/events/admin-event-normalization'
import { detailSurfacePattern } from '@/components/dashboard/detail-surface-pattern'
import { cn } from '@/lib/utils'

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
      <DialogContent className={detailSurfacePattern.dialogContent}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>Booking Details</DialogTitle>
        </DialogHeader>
        <div className={cn(detailSurfacePattern.subtleText, "space-y-1 text-slate-200")}>
          <div className={cn(detailSurfacePattern.title, "font-bold text-lg mb-2")}>{booking.eventName}</div>
          <div>Organizer: {booking.organizer}</div>
          <div>Date: {formatSafeDateTime(booking.date)}</div>
          <div>Attendees: {booking.attendees}</div>
          <div>Status: {booking.status}</div>
          <div>Received: {formatSafeDate(booking.received)}</div>
          <div className="mt-4">
            <label className={cn(detailSurfacePattern.label, "block text-xs mb-1")}>Internal Notes</label>
            <textarea
              className={cn(detailSurfacePattern.textarea, "w-full p-2")}
              value={notes}
              onChange={handleNoteChange}
              rows={3}
              placeholder="Add notes for this booking (private)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className={detailSurfacePattern.btnPrimary}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
