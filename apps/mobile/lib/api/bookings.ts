import { apiRequest } from "@/lib/api/client"
import {
  paymentCheckoutResponseSchema,
  paymentVerifyResponseSchema,
} from "@tourify/api-contracts"
import type { PaymentCheckoutResponse, PaymentVerifyResponse } from "@tourify/api-contracts"

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

export async function createCheckoutSession(body: {
  bookingId: string
  eventId: string
  ticketQuantity: number
  mobileRedirectUri?: string
}) {
  const response = await apiRequest<PaymentCheckoutResponse>("/api/payment", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      mobileRedirectUri: body.mobileRedirectUri
    })
  })
  return paymentCheckoutResponseSchema.parse(response)
}

export async function verifyCheckoutSession(params: { bookingId: string; sessionId: string }) {
  const search = new URLSearchParams({
    booking_id: params.bookingId,
    session_id: params.sessionId
  })
  const response = await apiRequest<PaymentVerifyResponse>(`/api/payment?${search.toString()}`)
  return paymentVerifyResponseSchema.parse(response)
}
