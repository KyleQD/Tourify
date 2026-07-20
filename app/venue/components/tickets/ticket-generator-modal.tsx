"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Ticket } from "lucide-react"

interface TicketGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string | null
}

/**
 * Read-only venue ticketing summary + scanner link.
 * Paid inventory management lives in the admin event ticket manager.
 */
export function TicketGeneratorModal({ isOpen, onClose, eventId }: TicketGeneratorModalProps) {
  const [summary, setSummary] = useState<{
    title?: string
    tickets_sold?: number
    tickets_remaining?: number
    sell_through_pct?: number
    finances?: { assigned_share?: number } | null
    can_scan?: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !eventId) return
    setIsLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/ticketing/reports?event_id=${eventId}`, {
          credentials: "include",
          cache: "no-store",
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setSummary({
            tickets_sold: data.tickets_sold,
            tickets_remaining: data.tickets_remaining,
            sell_through_pct: data.sell_through_pct,
            finances: data.finances,
            can_scan: true,
          })
        } else {
          setSummary({ can_scan: false })
        }
      } catch {
        setSummary(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [isOpen, eventId])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-gray-800 bg-gray-950 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-cyan-400" />
            Event ticket summary
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Venue hosts see sell-through and door tools when granted. Full finance editing stays with the event operator.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : summary ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2">
              <span className="text-gray-400">Sold</span>
              <Badge variant="outline" className="border-gray-700">
                {summary.tickets_sold ?? "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2">
              <span className="text-gray-400">Remaining</span>
              <Badge variant="outline" className="border-gray-700">
                {summary.tickets_remaining ?? "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2">
              <span className="text-gray-400">Sell-through</span>
              <Badge variant="outline" className="border-gray-700">
                {summary.sell_through_pct != null ? `${summary.sell_through_pct}%` : "—"}
              </Badge>
            </div>
            {!summary.finances ? (
              <p className="text-xs text-gray-500">
                Full financials are hidden. Ask the event operator for an assigned revenue share grant if you need your cut preview.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No ticketing summary available for this event.</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-gray-700">
            Close
          </Button>
          {eventId ? (
            <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
              <Link href={`/venue/events/${eventId}/check-in`}>
                <QrCode className="mr-2 h-4 w-4" />
                Open scanner
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
