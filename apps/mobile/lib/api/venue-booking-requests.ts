import { apiRequest } from "@/lib/api/client"

export interface VenueBookingRequest {
  id: string
  event_name: string
  event_date: string
  expected_attendance: number | null
  contact_email: string
  status: "pending" | "approved" | "rejected" | "accepted" | "declined" | "cancelled"
  requested_at: string
  venue_id?: string
}

interface ListResponse {
  success: boolean
  data?: VenueBookingRequest[]
  error?: string
}

interface UpdateResponse {
  success: boolean
  data?: VenueBookingRequest
  error?: string
}

export async function listVenueBookingRequests(params: {
  venueId: string
  limit?: number
}) {
  const search = new URLSearchParams({
    venue_id: params.venueId,
    limit: String(params.limit ?? 50),
  })

  const response = await apiRequest<ListResponse>(
    `/api/venue/booking-requests?${search.toString()}`
  )

  if (!response.success) {
    throw new Error(response.error || "Failed to load booking requests")
  }

  return response.data || []
}

export async function updateVenueBookingRequestStatus(params: {
  requestId: string
  status: "approved" | "rejected"
}) {
  const response = await apiRequest<UpdateResponse>("/api/venue/booking-requests", {
    method: "PATCH",
    body: JSON.stringify({
      requestId: params.requestId,
      status: params.status,
    }),
  })

  if (!response.success) {
    throw new Error(response.error || "Failed to update booking request")
  }

  return response.data
}
