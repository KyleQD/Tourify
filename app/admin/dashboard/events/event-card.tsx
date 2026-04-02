import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, MapPin, Pencil, Trash2, Users } from "lucide-react"
import * as React from "react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

export interface Task {
  id: string
  name: string
  status: "completed" | "in-progress" | "not-started"
  dueDate: string
  description?: string
}

export interface AdminEvent {
  id: string
  name: string
  date: string
  status: "draft" | "active" | "completed" | "cancelled"
  location: string
  venue?: string
  capacity: number
  tickets_sold: number
  revenue: number
  cover_image_url?: string
  description?: string
  tasks?: Task[]
  schedule?: { date: string; time: string; activity: string }[]
  type?: string
}

interface EventCardProps {
  event: AdminEvent
  onEdit: (event: AdminEvent) => void
  onDelete: (event: AdminEvent) => void
  onView: (event: AdminEvent) => void
}

export function EventCard({ event, onEdit, onDelete, onView }: EventCardProps) {
  const progress = event.capacity > 0 ? Math.round((event.tickets_sold / event.capacity) * 100) : 0
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden" aria-label={`Event card for ${event.name}`}> 
      {event.cover_image_url && (
        <img
          src={event.cover_image_url}
          alt={event.name}
          className="w-full h-32 object-cover rounded-t-lg mb-2"
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-slate-100">{event.name}</CardTitle>
          <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700/50">
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-slate-400">
          <Calendar className="h-4 w-4 mr-2 text-purple-500" />
          {formatSafeDate(event.date)}
        </div>
        <div className="flex items-center text-sm text-slate-400">
          <MapPin className="h-4 w-4 mr-2 text-purple-500" />
          {event.venue || event.location}
        </div>
        <div className="flex items-center text-sm text-slate-400">
          <Users className="h-4 w-4 mr-2 text-purple-500" />
          {event.tickets_sold} / {event.capacity} tickets
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-slate-500">Planning Progress</div>
            <div className="text-xs text-purple-400">{progress}%</div>
          </div>
          <Progress value={progress} className="h-1.5 bg-slate-800" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-green-400 border-green-700 bg-green-900/20">
            {formatSafeCurrency(event.revenue)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 pt-4 flex gap-2">
        <Button variant="outline" className="flex-1" aria-label="View event details" onClick={() => onView(event)}>
          View Details
        </Button>
        <Button variant="outline" className="flex-1" aria-label="Edit event" onClick={() => onEdit(event)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button variant="destructive" className="flex-1" aria-label="Delete event" onClick={() => onDelete(event)}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  )
} 