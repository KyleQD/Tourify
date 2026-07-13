"use client"

import { motion } from "framer-motion"
import { Check, Heart, Loader2, Share2, Ticket, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { AttendanceData, AttendanceStatus, EventData } from "./types"
import { buildEventSignupUrl } from "./utils"

interface EventRsvpActionsProps {
  event: EventData
  attendance: AttendanceData | null
  isSignedIn: boolean
  isUpdating: boolean
  layout?: "hero" | "sidebar"
  onUpdate: (status: AttendanceStatus) => void
  onShare: () => void
}

export function EventRsvpActions({
  event,
  attendance,
  isSignedIn,
  isUpdating,
  layout = "hero",
  onUpdate,
  onShare,
}: EventRsvpActionsProps) {
  const router = useRouter()
  const { tokens } = useEventSkin()
  const isAttending = attendance?.user_status === "attending"
  const isInterested = attendance?.user_status === "interested"
  const isStacked = layout === "sidebar"

  function handleRsvp(status: AttendanceStatus) {
    if (!isSignedIn) {
      router.push(buildEventSignupUrl(event, status))
      return
    }
    onUpdate(status)
  }

  return (
    <div className={cn("flex flex-col gap-2", isStacked ? "w-full" : "min-w-[180px]")}>
      <div className={cn("flex gap-2", isStacked && "flex-col")}>
        <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
          <Button
            onClick={() => handleRsvp("attending")}
            disabled={isUpdating}
            className={cn("w-full", isAttending ? tokens.btnPrimaryActive : tokens.btnPrimary)}
            size="sm"
          >
            {isUpdating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : isAttending ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <Users className="mr-1.5 h-4 w-4" />
            )}
            {isAttending ? "Attending" : isSignedIn ? "Attend" : "Sign up to Attend"}
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
          <Button
            onClick={() => handleRsvp("interested")}
            disabled={isUpdating}
            variant="outline"
            className={cn("w-full", isInterested ? tokens.btnGhostActive : tokens.btnGhost)}
            size="sm"
          >
            {isInterested ? <Check className="mr-1.5 h-4 w-4" /> : <Heart className="mr-1.5 h-4 w-4" />}
            {isInterested ? "Interested ✓" : "Interested"}
          </Button>
        </motion.div>
      </div>

      {event.ticket_url ? (
        <Button asChild className={cn("w-full", tokens.btnTicket)} size="sm">
          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
            <Ticket className="mr-1.5 h-4 w-4" />
            Get Tickets
          </a>
        </Button>
      ) : event.ticketing_enabled && event.ticketing_event_id ? (
        <Button asChild className={cn("w-full", tokens.btnTicket)} size="sm">
          <Link href={`/tickets/purchase?event_id=${event.ticketing_event_id}&title=${encodeURIComponent(event.title || 'Event')}`}>
            <Ticket className="mr-1.5 h-4 w-4" />
            Get Tickets
          </Link>
        </Button>
      ) : null}

      <Button onClick={onShare} variant="outline" className={cn("w-full", tokens.btnGhost)} size="sm">
        <Share2 className="mr-1.5 h-4 w-4" />
        Share Event
      </Button>

      {!isSignedIn && (
        <p className={cn("text-center text-xs", tokens.muted)}>Create a free account to RSVP</p>
      )}
    </div>
  )
}
