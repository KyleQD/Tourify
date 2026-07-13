import { supabase } from "@/lib/supabase"
import { getJobApplications, type JobApplication } from "@/lib/api/job-applications"

export interface ShiftItem {
  id: string
  roleTitle: string
  department: string | null
  status: "invited" | "confirmed" | "active"
  startsAt: string | null
  endsAt: string | null
  isUrgent: boolean
}

export interface VenueBookingItem {
  id: string
  venueId: string
  eventName: string | null
  eventDate: string | null
  status: string
  requestedAt: string | null
}

export interface AggregatedNeeds {
  shifts: ShiftItem[]
  jobApplications: JobApplication[]
  venueBookings: VenueBookingItem[]
}

async function fetchShifts(userId: string): Promise<ShiftItem[]> {
  const { data, error } = await supabase
    .from("employment_assignments")
    .select("id, role_title, department, status, starts_at, ends_at")
    .eq("user_id", userId)
    .in("status", ["invited", "confirmed", "active"])
    .order("starts_at", { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    roleTitle: row.role_title || "Assignment",
    department: row.department ?? null,
    status: (row.status as ShiftItem["status"]) || "invited",
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    isUrgent: row.status === "invited",
  }))
}

async function fetchVenueBookings(venueProfileIds: string[]): Promise<VenueBookingItem[]> {
  if (venueProfileIds.length === 0) return []

  const { data, error } = await supabase
    .from("venue_booking_requests")
    .select("id, venue_id, event_name, event_date, status, requested_at")
    .in("venue_id", venueProfileIds)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(50)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    venueId: row.venue_id,
    eventName: row.event_name ?? null,
    eventDate: row.event_date ?? null,
    status: row.status,
    requestedAt: row.requested_at ?? null,
  }))
}

async function fetchJobApplications(): Promise<JobApplication[]> {
  try {
    const applications = await getJobApplications()
    return applications.filter((app) =>
      ["pending", "under_review", "submitted"].includes(app.status)
    )
  } catch {
    return []
  }
}

export async function getAggregatedNeeds(params: {
  userId: string
  venueProfileIds: string[]
}): Promise<AggregatedNeeds> {
  const [shifts, venueBookings, jobApplications] = await Promise.all([
    fetchShifts(params.userId),
    fetchVenueBookings(params.venueProfileIds),
    fetchJobApplications(),
  ])

  return { shifts, venueBookings, jobApplications }
}
