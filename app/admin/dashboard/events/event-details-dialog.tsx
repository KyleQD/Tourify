"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AdminEvent } from "./event-card"
import { Calendar, MapPin, Users } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface EventDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: AdminEvent | null
}

export function EventDetailsDialog({ open, onOpenChange, event }: EventDetailsDialogProps) {
  if (!event) return null

  const progress = event.capacity > 0 ? Math.round((event.tickets_sold / event.capacity) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event.name}
            <Badge variant="outline" className="ml-2">{event.status.charAt(0).toUpperCase() + event.status.slice(1)}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-purple-400">
            <Calendar className="h-4 w-4 mr-2" />
            {formatSafeDate(event.date)}
          </div>
          <div className="flex items-center text-sm text-purple-400">
            <MapPin className="h-4 w-4 mr-2" />
            {event.venue || event.location}
          </div>
          <div className="flex items-center text-sm text-purple-400">
            <Users className="h-4 w-4 mr-2" />
            {event.tickets_sold} / {event.capacity} tickets
          </div>
          <div className="text-xs text-slate-400 mt-2">Planning Progress</div>
          <div className="w-full h-2 bg-slate-800 rounded">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-green-400 font-semibold">{formatSafeCurrency(event.revenue)}</div>
          {event.description && (
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-1">Description</div>
              <div className="text-slate-200">{event.description}</div>
            </div>
          )}
        </div>
        {event.tasks && event.tasks.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-slate-400 mb-1">Pending Tasks</div>
            <ul className="space-y-1">
              {event.tasks.filter(t => t.status !== "completed").slice(0, 3).map(task => (
                <li key={task.id} className="flex items-center text-sm">
                  <span className={
                    task.status === "in-progress"
                      ? "text-amber-400"
                      : "text-slate-400"
                  }>
                    {task.name} (due {formatSafeDate(task.dueDate)})
                  </span>
                </li>
              ))}
              {event.tasks.filter(t => t.status !== "completed").length === 0 && (
                <li className="text-green-400 text-sm">All tasks completed!</li>
              )}
            </ul>
          </div>
        )}
        {event.schedule && event.schedule.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-slate-400 mb-1">Schedule</div>
            <ul className="space-y-1">
              {event.schedule.map((item, idx) => (
                <li key={idx} className="flex items-center text-sm text-slate-300">
                  <span className="w-24">{item.date} {item.time}</span>
                  <span className="ml-2">{item.activity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 