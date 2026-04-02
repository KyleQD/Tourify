"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import type { VenueEvent } from "@/app/venue/lib/hooks/use-venue-events"
import { formatSafeTime } from "@/lib/events/admin-event-normalization"
import DetailsTab from "./details-tab"
import AttendeesTab from "./attendees-tab"
import EquipmentTab from "./equipment-tab"
import FinancialsTab from "./financials-tab"
import type { Event as UiEvent } from "@/app/types/events.types"

interface EventTabsProps {
  event: VenueEvent
}

export default function EventTabs({ event }: EventTabsProps) {
  const router = useRouter()

  const uiEvent: UiEvent = {
    id: event.id,
    name: event.title,
    description: event.description,
    start_date: event.startDate,
    end_date: event.endDate,
    total_tickets: event.capacity,
    tickets_sold: 0,
    venue_id: undefined,
    capacity: event.capacity,
    notes: undefined,
    ticketPrice: undefined,
    location: event.location,
    date: event.startDate,
    startTime: formatSafeTime(event.startDate),
    endTime: formatSafeTime(event.endDate),
    type: event.type,
    status: event.isPublic ? "public" : "private",
  }

  return (
    <Tabs defaultValue="details" className="w-full">
      <div className="flex justify-between items-center mb-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <Button onClick={() => router.push(`/events/${event.id}/attendance`)}>
          <Users className="h-4 w-4 mr-2" />
          Attendance Manager
        </Button>
      </div>

      <TabsContent value="details">
        <DetailsTab event={uiEvent} />
      </TabsContent>

      <TabsContent value="attendees">
        <AttendeesTab event={uiEvent} />
      </TabsContent>

      <TabsContent value="equipment">
        <EquipmentTab event={uiEvent} />
      </TabsContent>

      <TabsContent value="financials">
        <FinancialsTab />
      </TabsContent>
    </Tabs>
  )
}
