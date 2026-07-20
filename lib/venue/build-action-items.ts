import { addDays } from "date-fns"

export interface VenueActionItem {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  dueDate: Date
  type: "profile" | "booking" | "event" | "staff" | "documents" | "equipment"
  href?: string
}

export function buildVenueActionItems(input: {
  venue: {
    name?: string | null
    capacity?: number | null
    location?: string | null
    description?: string | null
    avatar?: string | null
  } | null
  pendingBookings?: number
  upcomingEvents?: number
  openApplications?: number
  documentCount?: number
  equipmentCount?: number
  hasSiteMap?: boolean
}): VenueActionItem[] {
  const items: VenueActionItem[] = []
  const v = input.venue

  if (v && (!v.name || !v.location || !v.capacity)) {
    items.push({
      id: "task-profile",
      title: "Complete your venue profile",
      description: !v.name
        ? "Add your venue name so bookers can find you."
        : !v.location
          ? "Add location details for discovery and booking requests."
          : "Set capacity so organizers can plan seating and tickets.",
      priority: "high",
      dueDate: addDays(new Date(), 7),
      type: "profile",
      href: "/venue/edit",
    })
  }

  if (v && !v.description) {
    items.push({
      id: "task-description",
      title: "Add a venue description",
      description: "Describe the space, amenities, and typical shows to attract better bookings.",
      priority: "medium",
      dueDate: addDays(new Date(), 10),
      type: "profile",
      href: "/venue/edit",
    })
  }

  if ((input.pendingBookings || 0) > 0) {
    items.push({
      id: "task-pending-bookings",
      title: `Review ${input.pendingBookings} booking request${input.pendingBookings === 1 ? "" : "s"}`,
      description: "Respond to holds and offers so artists and organizers can confirm dates.",
      priority: "high",
      dueDate: addDays(new Date(), 2),
      type: "booking",
      href: "/venue/bookings",
    })
  }

  if ((input.upcomingEvents || 0) === 0) {
    items.push({
      id: "task-first-event",
      title: "Confirm your next show date",
      description: "Approve a booking or create a venue-hosted event on the calendar.",
      priority: "medium",
      dueDate: addDays(new Date(), 14),
      type: "event",
      href: "/venue/dashboard/calendar",
    })
  }

  if ((input.openApplications || 0) > 0) {
    items.push({
      id: "task-hiring",
      title: `Review ${input.openApplications} staffing application${input.openApplications === 1 ? "" : "s"}`,
      description: "Move applicants through hiring so shifts stay covered.",
      priority: "high",
      dueDate: addDays(new Date(), 3),
      type: "staff",
      href: "/venue/dashboard/hiring-kanban",
    })
  }

  if ((input.documentCount || 0) === 0) {
    items.push({
      id: "task-documents",
      title: "Upload venue documents",
      description: "Add insurance, floor plans, and house rules for advancing.",
      priority: "medium",
      dueDate: addDays(new Date(), 14),
      type: "documents",
      href: "/venue/documents",
    })
  }

  if ((input.equipmentCount || 0) === 0) {
    items.push({
      id: "task-equipment",
      title: "Add equipment inventory",
      description: "Track PA, lighting, and stage gear for event readiness.",
      priority: "low",
      dueDate: addDays(new Date(), 21),
      type: "equipment",
      href: "/venue/equipment",
    })
  }

  if (input.hasSiteMap === false) {
    items.push({
      id: "task-site-map",
      title: "Create a site map",
      description: "Map stages, load-in, and emergency paths for crew and advancing.",
      priority: "medium",
      dueDate: addDays(new Date(), 21),
      type: "documents",
      href: "/venue/dashboard/site-maps",
    })
  }

  return items.slice(0, 8)
}
