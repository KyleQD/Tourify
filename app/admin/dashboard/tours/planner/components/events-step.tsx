"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  Edit3,
  FileText,
  CheckCircle
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"

interface EventsStepProps {
  tourData: {
    events: Array<{
      id: string
      name: string
      venue: string
      date: string
      time: string
      description: string
      capacity: number
    }>
    route: Array<{
      city: string
      venue: string
      date: string
      coordinates: { lat: number; lng: number }
    }>
  }
  updateTourData: (updates: any) => void
}

export function EventsStep({ tourData, updateTourData }: EventsStepProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState({
    name: "",
    venue: "",
    date: "",
    time: "",
    description: "",
    capacity: 0
  })

  const handleAddEvent = () => {
    if (newEvent.name && newEvent.venue && newEvent.date && newEvent.time) {
      const event = {
        id: Date.now().toString(),
        ...newEvent,
        capacity: parseInt(newEvent.capacity.toString()) || 0
      }
      updateTourData({
        events: [...tourData.events, event]
      })
      setNewEvent({
        name: "",
        venue: "",
        date: "",
        time: "",
        description: "",
        capacity: 0
      })
      setIsAddingEvent(false)
    }
  }

  const handleUpdateEvent = (eventId: string, updates: any) => {
    const updatedEvents = tourData.events.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    )
    updateTourData({ events: updatedEvents })
    setEditingEvent(null)
  }

  const handleRemoveEvent = (eventId: string) => {
    const updatedEvents = tourData.events.filter(event => event.id !== eventId)
    updateTourData({ events: updatedEvents })
  }

  const getEventFromRoute = (routeItem: any) => {
    return {
      name: `${routeItem.city} Show`,
      venue: routeItem.venue,
      date: routeItem.date,
      time: "20:00",
      description: `Tour stop in ${routeItem.city}`,
      capacity: 5000
    }
  }

  const createEventsFromRoute = () => {
    const routeEvents = tourData.route.map((routeItem, index) => ({
      id: `route-${index}`,
      ...getEventFromRoute(routeItem)
    }))
    updateTourData({ events: routeEvents })
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Tour Events</h3>
          <p className="text-slate-400">Create individual events for your tour</p>
        </div>
        <div className="flex space-x-2">
          {tourData.route.length > 0 && (
            <Button
              variant="outline"
              onClick={createEventsFromRoute}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create from Route
            </Button>
          )}
          <Button
            onClick={() => setIsAddingEvent(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Add Event Form */}
      {isAddingEvent && (
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white text-sm">Event Name *</Label>
              <Input
                placeholder="Enter event name..."
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Venue *</Label>
              <Input
                placeholder="Enter venue name..."
                value={newEvent.venue}
                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Date *</Label>
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Time *</Label>
              <Input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Capacity</Label>
              <Input
                type="number"
                placeholder="Enter capacity..."
                value={newEvent.capacity}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    capacity: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10),
                  })
                }
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Description</Label>
              <Textarea
                placeholder="Enter event description..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            <Button
              onClick={handleAddEvent}
              disabled={!newEvent.name || !newEvent.venue || !newEvent.date || !newEvent.time}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add Event
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAddingEvent(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {tourData.events.map((event) => (
          <Card key={event.id} className="p-6 bg-slate-900/30 border-slate-700">
            {editingEvent === event.id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Event Name</Label>
                  <Input
                    value={event.name}
                    onChange={(e) => handleUpdateEvent(event.id, { name: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Venue</Label>
                  <Input
                    value={event.venue}
                    onChange={(e) => handleUpdateEvent(event.id, { venue: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Date</Label>
                  <Input
                    type="date"
                    value={event.date}
                    onChange={(e) => handleUpdateEvent(event.id, { date: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Time</Label>
                  <Input
                    type="time"
                    value={event.time}
                    onChange={(e) => handleUpdateEvent(event.id, { time: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Capacity</Label>
                  <Input
                    type="number"
                    value={event.capacity}
                    onChange={(e) =>
                      handleUpdateEvent(event.id, {
                        capacity: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10),
                      })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Description</Label>
                  <Textarea
                    value={event.description}
                    onChange={(e) => handleUpdateEvent(event.id, { description: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white min-h-[80px]"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setEditingEvent(null)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingEvent(null)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-white">{event.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {formatSafeNumber(event.capacity)} capacity
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{event.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{formatSafeDate(event.date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{event.time}</span>
                    </div>
                  </div>
                  {event.description && (
                    <div className="flex items-start space-x-2 mt-2">
                      <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                      <p className="text-slate-400 text-sm">{event.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEvent(event.id)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEvent(event.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {tourData.events.length === 0 && !isAddingEvent && (
        <Card className="p-12 bg-slate-900/30 border-slate-700 border-dashed">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Events Created</h3>
            <p className="text-slate-400 mb-4">
              Start by adding events to your tour or create them from your route
            </p>
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => setIsAddingEvent(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Event
              </Button>
              {tourData.route.length > 0 && (
                <Button
                  variant="outline"
                  onClick={createEventsFromRoute}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create from Route
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.events.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">
              {tourData.events.length} event{tourData.events.length !== 1 ? 's' : ''} created
            </span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Create at least one event to continue</span>
          </>
        )}
      </div>
    </div>
  )
} 