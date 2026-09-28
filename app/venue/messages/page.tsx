"use client"

import { Suspense } from "react"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { MessagesPageClient } from "@/app/messages/messages-page-client"
import { MessagesSkeleton } from "@/app/messages/messages-skeleton"
import { VenuePageHeader } from "@/components/dashboard/venue-page-header"
import { Button } from "@/components/ui/button"

export default function VenueMessagesPage() {
  return (
    <div className="space-y-4">
      <VenuePageHeader
        title="Messages"
        subtitle="Venue inbox for artists, organizers, and staff. Stay on this account to keep threads scoped to the venue."
        icon={MessageSquare}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="border-zinc-700">
              <Link href="/venue/bookings">Booking requests</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-zinc-700">
              <Link href="/venue/events">Events</Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesPageClient />
      </Suspense>
    </div>
  )
}
