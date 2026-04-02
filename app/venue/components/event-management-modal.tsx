import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventFormData } from "./create-event-modal"
import { X, Edit, Trash, Upload, Users, MessageSquare, Save, Check, Loader2, File, Download } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { updateEvent, deleteEvent, uploadEventDocument } from "../actions/event-actions"
import { toast } from "sonner"
import { PeopleTab } from './people-tab'
import { ChatTab } from './chat-tab'
import { TeamRole } from '../types/team'
import { ChatMessage } from '../types/chat'
import { PromotionsTab } from './promotions-tab'
import { Promotion } from '../types/promotion'
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EventManagementModalProps {
  event: EventFormData | null
  isOpen: boolean
  onClose: () => void
  currentUser: {
    id: string
    fullName: string
    avatar?: string
    role: TeamRole
  }
  teamMembers: Array<{
    id: string
    userId: string
    eventId: string
    role: TeamRole
    status: 'active' | 'pending' | 'inactive'
    joinedAt: string
    user: {
      id: string
      fullName: string
      email: string
      avatar?: string
    }
  }>
  teamInvites: Array<{
    id: string
    eventId: string
    email: string
    role: TeamRole
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: string
    expiresAt: string
  }>
  chatMessages: ChatMessage[]
  promotions: Promotion[]
}

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  ticketPrice: z.number().min(0, "Ticket price must be 0 or more"),
  isPublic: z.boolean(),
  status: z.string(),
  type: z.string(),
})

function EventDetailsForm({ event, isEditing, onChange, errors }: {
  event: EventFormData
  isEditing: boolean
  onChange: (field: keyof EventFormData, value: any) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-2">
      {isEditing ? (
        <>
          <Input
            aria-label="Event Title"
            value={event.title}
            onChange={e => onChange("title", e.target.value)}
            placeholder="Title"
            className="mb-1"
          />
          {errors.title && <div className="text-xs text-red-500">{errors.title}</div>}
          <Input
            aria-label="Event Description"
            value={event.description}
            onChange={e => onChange("description", e.target.value)}
            placeholder="Description"
            className="mb-1"
          />
          {errors.description && <div className="text-xs text-red-500">{errors.description}</div>}
          <Input
            aria-label="Event Date"
            type="date"
            value={event.date.toISOString().slice(0, 10)}
            onChange={e => onChange("date", new Date(e.target.value))}
            className="mb-1"
          />
          <div className="flex gap-2">
            <Input
              aria-label="Start Time"
              type="time"
              value={event.startTime}
              onChange={e => onChange("startTime", e.target.value)}
              className="mb-1"
            />
            <Input
              aria-label="End Time"
              type="time"
              value={event.endTime}
              onChange={e => onChange("endTime", e.target.value)}
              className="mb-1"
            />
          </div>
          <Input
            aria-label="Capacity"
            type="number"
            value={event.capacity}
            onChange={e => onChange("capacity", Number(e.target.value))}
            placeholder="Capacity"
            className="mb-1"
          />
          <Input
            aria-label="Ticket Price"
            type="number"
            value={event.ticketPrice}
            onChange={e => onChange("ticketPrice", Number(e.target.value))}
            placeholder="Ticket Price"
            className="mb-1"
          />
        </>
      ) : (
        <>
          <div className="font-bold text-lg">{event.title}</div>
          <div className="text-gray-400 mb-2">{event.description}</div>
          <div className="text-sm text-gray-400">Date: {formatSafeDate(event.date.toISOString())} {event.startTime} - {event.endTime}</div>
          <div className="text-sm text-gray-400">Capacity: {event.capacity}</div>
          <div className="text-sm text-gray-400">Ticket Price: ${event.ticketPrice}</div>
          <div className="text-sm text-gray-400">Visibility: {event.isPublic ? "Public" : "Private"}</div>
        </>
      )}
    </div>
  )
}

function DeleteConfirmationDialog({ isOpen, onCancel, onConfirm, isLoading }: {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  isLoading: boolean
}) {
  if (!isOpen) return null
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>
        <div className="text-red-500 mb-4">Are you sure you want to delete this event? This action cannot be undone.</div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Trash className="h-4 w-4 mr-1" />} Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocumentUpload({ eventId }: { eventId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; url: string }>>([])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadEventDocument(eventId, file)
        if (result.success) {
          // TODO: Replace with actual file data from your storage
          setUploadedFiles(prev => [...prev, { 
            id: Math.random().toString(), 
            name: file.name, 
            url: URL.createObjectURL(file) 
          }])
          toast.success(`Uploaded ${file.name}`)
        } else {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    } catch (error) {
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="font-semibold text-white flex items-center gap-2">
        <Upload className="h-4 w-4" /> Upload Documents/Photos
      </div>
      <Input 
        type="file" 
        multiple 
        className="bg-gray-800 border-gray-700"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-400">Uploaded Files</div>
          {uploadedFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href={file.url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EventManagementModal({ event, isOpen, onClose, currentUser, teamMembers, teamInvites, chatMessages, promotions }: EventManagementModalProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isEditing, setIsEditing] = useState(false)
  const [editEvent, setEditEvent] = useState<EventFormData | null>(event)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!event) return null

  function handleEditChange(field: keyof EventFormData, value: any) {
    if (!editEvent) return
    setEditEvent({ ...editEvent, [field]: value })
  }

  function handleEdit() {
    setIsEditing(true)
    setEditEvent(event)
    setErrors({})
    setActionError(null)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setEditEvent(event)
    setErrors({})
    setActionError(null)
  }

  async function handleSaveEdit() {
    if (!editEvent) return
    const result = eventSchema.safeParse(editEvent)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(e => {
        if (e.path[0]) fieldErrors[e.path[0] as string] = e.message
      })
      setErrors(fieldErrors)
      return
    }

    try {
      const result = await updateEvent(editEvent)
      if (result.success) {
        setIsEditing(false)
        setErrors({})
        setActionError(null)
        toast.success('Event updated successfully')
      } else {
        setActionError(result.error || 'Failed to update event')
        toast.error(result.error || 'Failed to update event')
      }
    } catch (error) {
      setActionError('Failed to update event')
      toast.error('Failed to update event')
    }
  }

  function handleDelete() {
    setIsDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!event?.id) return
    setIsDeleting(true)
    try {
      const result = await deleteEvent(String(event.id))
      if (result.success) {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        onClose()
        toast.success('Event deleted successfully')
      } else {
        setActionError(result.error || 'Failed to delete event')
        toast.error(result.error || 'Failed to delete event')
      }
    } catch (error) {
      setActionError('Failed to delete event')
      toast.error('Failed to delete event')
    } finally {
      setIsDeleting(false)
    }
  }

  // Tab content modularization
  function renderTabContent() {
    if (activeTab === "details") {
      if ((isEditing && !editEvent) || !event) return null
      return (
        <EventDetailsForm
          event={isEditing ? editEvent! : event}
          isEditing={isEditing}
          onChange={handleEditChange}
          errors={errors}
        />
      )
    }
    if (activeTab === "documents") {
      if (!event) return null
      return <DocumentUpload eventId={String(event.id)} />
    }
    if (activeTab === "people") {
      if (!event) return null
      return (
        <PeopleTab
          eventId={String(event.id)}
          members={teamMembers}
          invites={teamInvites}
          currentUserRole={currentUser.role}
        />
      )
    }
    if (activeTab === "chat") {
      if (!event) return null
      return (
        <ChatTab
          eventId={String(event.id)}
          messages={chatMessages}
          currentUser={currentUser}
        />
      )
    }
    if (activeTab === "promotions") {
      if (!event) return null
      return (
        <PromotionsTab
          eventId={String(event.id)}
          promotions={promotions}
        />
      )
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage Event: <span className="text-purple-400">{event.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Event Details */}
          <div className="flex-1 space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge>{event.status}</Badge>
                  <span className="text-xs text-gray-400">{event.type}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderTabContent()}
                {actionError && <div className="text-xs text-red-500 mt-2">{actionError}</div>}
              </CardContent>
            </Card>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="default" size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Right: Tabs for Documents, People, Chat */}
          <div className="flex-1 space-y-4">
            <div className="flex gap-2 mb-2" role="tablist">
              <Button variant={activeTab === "details" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("details")}>Details</Button>
              <Button variant={activeTab === "documents" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("documents")}>Documents</Button>
              <Button variant={activeTab === "people" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("people")}>People</Button>
              <Button variant={activeTab === "chat" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("chat")}>Chat</Button>
              <Button variant={activeTab === "promotions" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("promotions")}>Promotions</Button>
            </div>
            {renderTabContent()}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-1" /> Close</Button>
        </DialogFooter>
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      </DialogContent>
    </Dialog>
  )
} 