import { apiRequest } from "@/lib/api/client"

export interface Booking {
  id: string
  status: "pending" | "confirmed" | "cancelled"
  ticket_quantity: number
  total_price: number
  created_at: string
}

export interface EventRow {
  id: string
  title: string
  date: string
  location: string
  price: number
}

export function createCheckoutSession(body: {
  bookingId: string
  eventId: string
  ticketQuantity: number
  mobileRedirectUri?: string
}) {
  return apiRequest<{ url: string; sessionId?: string }>("/api/payment", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      mobileRedirectUri: body.mobileRedirectUri
    })
  })
}

export function verifyCheckoutSession(params: { bookingId: string; sessionId: string }) {
  const search = new URLSearchParams({
    booking_id: params.bookingId,
    session_id: params.sessionId
  })
  return apiRequest<{ success: boolean }>(`/api/payment?${search.toString()}`)
}
