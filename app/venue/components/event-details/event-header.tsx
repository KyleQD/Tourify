"use client"

import type { Event } from "@/app/types/events.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Clock, Edit2Icon, Trash2Icon } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { CreateEventModal } from "../events/create-event-modal"
import { DeleteEventDialog } from "./delete-event-dialog"

interface EventHeaderProps {
  event: any // TODO: Replace 'any' with a proper event type
}

export default function EventHeader({ event }: EventHeaderProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "concert":
        return "bg-purple-100 text-purple-800"
      case "entertainment":
        return "bg-blue-100 text-blue-800"
      case "private":
        return "bg-pink-100 text-pink-800"
      case "corporate":
        return "bg-indigo-100 text-indigo-800"
      case "community":
        return "bg-teal-100 text-teal-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold break-words">{event.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {event.startTime} - {event.endTime}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit2Icon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2Icon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
        <Badge className={getTypeColor(event.type)}>{event.type}</Badge>
        {event.isPublic && <Badge variant="outline">Public Event</Badge>}
        {!event.isPublic && <Badge variant="outline">Private Event</Badge>}
      </div>

      {showEditModal && (
        <CreateEventModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
      )}

      {showDeleteDialog && (
        <DeleteEventDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          event={event}
          redirectAfterDelete={true}
        />
      )}
    </>
  )
}
