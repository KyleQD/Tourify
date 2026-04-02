"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, Plus, Ticket, Trash } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface TicketGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string | null
}

export function TicketGeneratorModal({ isOpen, onClose, eventId }: TicketGeneratorModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    price: 0,
    quantity: 0,
    description: "",
  })

  // Mock function to fetch event details
  useEffect(() => {
    if (eventId) {
      // This would be an API call in a real application
      const mockEvent = {
        id: eventId,
        title: "Summer Jam Festival",
        date: "2025-06-15T14:00:00",
        venue: "Central Park",
        location: "New York, NY",
        ticketTypes: [
          {
            id: "ticket-1",
            name: "General Admission",
            price: 75,
            quantity: 1500,
            sold: 1000,
            description: "Standard entry to the event",
          },
          {
            id: "ticket-2",
            name: "VIP Access",
            price: 150,
            quantity: 500,
            sold: 250,
            description: "Premium access with exclusive areas and complimentary drinks",
          },
        ],
      }
      setEvent(mockEvent)
    }
  }, [eventId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTicketType({
      ...newTicketType,
      [name]: name === "price" || name === "quantity" ? Number(value) : value,
    })
  }

  const handleAddTicketType = () => {
    if (!newTicketType.name || newTicketType.price <= 0 || newTicketType.quantity <= 0) {
      toast({
        title: "Invalid ticket details",
        description: "Please provide a name, price, and quantity for the ticket type.",
        variant: "destructive",
      })
      return
    }

    // In a real app, this would be an API call
    const updatedTicketTypes = [
      ...event.ticketTypes,
      {
        id: `ticket-${event.ticketTypes.length + 1}`,
        name: newTicketType.name,
        price: newTicketType.price,
        quantity: newTicketType.quantity,
        sold: 0,
        description: newTicketType.description,
      },
    ]

    setEvent({
      ...event,
      ticketTypes: updatedTicketTypes,
    })

    setNewTicketType({
      name: "",
      price: 0,
      quantity: 0,
      description: "",
    })

    toast({
      title: "Ticket type added",
      description: `${newTicketType.name} tickets have been added to your event.`,
    })
  }

  const handleRemoveTicketType = (ticketId: string) => {
    const updatedTicketTypes = event.ticketTypes.filter((ticket: any) => ticket.id !== ticketId)
    setEvent({
      ...event,
      ticketTypes: updatedTicketTypes,
    })

    toast({
      title: "Ticket type removed",
      description: "The ticket type has been removed from your event.",
    })
  }

  const handleGenerateTickets = async () => {
    setIsSubmitting(true)

    try {
      // This would be an API call in a real application
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Tickets generated",
        description: "Your tickets have been generated and are ready to sell.",
      })

      onClose()
    } catch (error) {
      console.error("Error generating tickets:", error)
      toast({
        title: "Error generating tickets",
        description: "There was an error generating your tickets. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Generate Tickets for {event.title}</DialogTitle>
          <DialogDescription className="text-gray-400">Create and manage ticket types for your event</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {formatSafeDate(event.date)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {event.venue}, {event.location}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Current Ticket Types</h3>
            {event.ticketTypes.length === 0 ? (
              <p className="text-sm text-gray-400">No ticket types created yet.</p>
            ) : (
              <div className="space-y-3">
                {event.ticketTypes.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{ticket.name}</h4>
                        <Badge variant="outline" className="border-gray-700">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                          }).format(ticket.price)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        <span>Quantity: {ticket.quantity}</span>
                        <span>Sold: {ticket.sold}</span>
                        <span>Available: {ticket.quantity - ticket.sold}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTicketType(ticket.id)}
                      disabled={ticket.sold > 0}
                      className="text-red-500 hover:text-red-400 hover:bg-red-900/20"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-gray-800 pt-4">
            <h3 className="text-sm font-medium">Add New Ticket Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ticket Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newTicketType.name}
                  onChange={handleInputChange}
                  placeholder="e.g. General Admission"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTicketType.price || ""}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={newTicketType.quantity || ""}
                  onChange={handleInputChange}
                  placeholder="Number of tickets"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  name="description"
                  value={newTicketType.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this ticket type"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <Button onClick={handleAddTicketType} variant="outline" className="border-gray-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Ticket Type
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-700">
            Cancel
          </Button>
          <Button onClick={handleGenerateTickets} disabled={isSubmitting || event.ticketTypes.length === 0}>
            <Ticket className="h-4 w-4 mr-2" />
            {isSubmitting ? "Generating..." : "Generate Tickets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
