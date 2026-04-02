import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, Mail, Phone, User } from "lucide-react"
import type { Conversation } from "./types"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface MessageDetailsProps {
  conversation: Conversation
}

export default function MessageDetails({ conversation }: MessageDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Participants</h3>
        <div className="space-y-4">
          {conversation.participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={participant.avatar || "/placeholder.svg"} alt={participant.name} />
                <AvatarFallback>
                  {participant.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{participant.name}</div>
                {participant.role && <div className="text-sm text-muted-foreground">{participant.role}</div>}
              </div>
              <div className="flex gap-1">
                {participant.email && (
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                {participant.phone && (
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {conversation.eventName && (
        <div>
          <h3 className="text-lg font-medium mb-4">Related Event</h3>
          <div className="border rounded-lg p-4">
            <div className="font-medium text-lg mb-2">{conversation.eventName}</div>
            {conversation.eventDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span>{formatSafeDate(conversation.eventDate)}</span>
              </div>
            )}
            <Button variant="outline" className="mt-2">
              View Event Details
            </Button>
          </div>
        </div>
      )}

      {conversation.type === "inquiries" && (
        <div>
          <h3 className="text-lg font-medium mb-4">Inquiry Details</h3>
          <div className="border rounded-lg p-4">
            <div className="text-sm mb-2">
              <span className="font-medium">Source:</span> Website Contact Form
            </div>
            <div className="text-sm mb-2">
              <span className="font-medium">Received:</span> {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(conversation.createdAt))}
            </div>
            <div className="text-sm">
              <span className="font-medium">Status:</span> <span className="text-orange-500">Open</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
