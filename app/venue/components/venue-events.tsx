import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Ticket, Settings, BarChart3 } from "lucide-react"
import type { EventFormData } from "./create-event-modal"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueEventsProps {
  events: EventFormData[]
  onCreateEvent: () => void
  isOwner?: boolean
}

export function VenueEvents({ events, onCreateEvent, isOwner }: VenueEventsProps) {
  const router = useRouter()

  const formatDate = (date: Date) => {
    return formatSafeDate(date.toISOString())
  }

  function handleManage(event: EventFormData) {
    // Navigate to the event management dashboard
    router.push(`/venue/manage-event/${event.id}`)
  }

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" /> Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 mb-4">No events scheduled yet</p>
                <Button 
                  onClick={onCreateEvent}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create Your First Event
                </Button>
              </div>
            ) : (
              events.map(event => (
                <div key={event.id} className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-white">{event.title}</h3>
                        <Badge variant={event.status === "confirmed" ? "default" : event.status === "pending" ? "secondary" : "destructive"}>
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.capacity && (
                          <div className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            <span>{event.attendance || 0}/{event.capacity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage(event)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Event
                      </Button>
                      <Button 
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleManage(event)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {events.length > 0 && (
            <Button variant="outline" className="w-full mt-6" onClick={onCreateEvent}>
              <Calendar className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
          )}
        </CardContent>
      </Card>

      {isOwner && events.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" /> Event Management Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{events.length}</div>
                <div className="text-xs text-gray-400">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {events.filter(e => e.status === "confirmed").length}
                </div>
                <div className="text-xs text-gray-400">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {events.filter(e => e.status === "pending").length}
                </div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={onCreateEvent}>
                <Calendar className="h-4 w-4 mr-2" /> Create New Event
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => router.push("/venue?tab=events")}
              >
                <BarChart3 className="h-4 w-4 mr-2" /> View All Events
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
