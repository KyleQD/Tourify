import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"
import { createCheckoutSession, verifyCheckoutSession } from "@/lib/api/bookings"
import { apiRequest } from "@/lib/api/client"
import { interpretPaymentVerifyResponse } from "@/lib/api/checkout-status"

export type CheckoutVerificationResult =
  | { status: "completed" }
  | { status: "pending" }
  | { status: "failed"; message?: string }

interface VerifyTicketSaleResponse {
  purchase?: unknown
  error?: string
  payment_status?: string
}

export async function openBookingCheckout(params: {
  bookingId: string
  eventId: string
  ticketQuantity: number
}) {
  const redirectUri = Linking.createURL("/checkout")
  const payload = await createCheckoutSession({
    bookingId: params.bookingId,
    eventId: params.eventId,
    ticketQuantity: params.ticketQuantity,
    mobileRedirectUri: redirectUri
  })
  await WebBrowser.openBrowserAsync(payload.url)
  return payload
}

export async function verifyBookingPayment(params: {
  bookingId: string
  sessionId: string
}): Promise<CheckoutVerificationResult> {
  try {
    const result = await verifyCheckoutSession(params)
    if (result.success) return { status: "completed" }
    return { status: "pending" }
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Payment verification failed"
    }
  }
}

export async function verifyTicketCheckoutSession(params: {
  sessionId: string
}): Promise<CheckoutVerificationResult> {
  try {
    const search = new URLSearchParams({ session_id: params.sessionId })
    const response = await apiRequest<VerifyTicketSaleResponse>(
      `/api/ticketing/verify?${search.toString()}`,
      { authRequired: true }
    )

    return interpretPaymentVerifyResponse(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed"
    if (/not completed|pending/i.test(message)) return { status: "pending" }
    return { status: "failed", message }
  }
}

export async function reconcileCheckoutPayment(params: {
  bookingId?: string
  sessionId?: string
  orderId?: string
}): Promise<CheckoutVerificationResult> {
  if (params.bookingId && params.sessionId)
    return verifyBookingPayment({
      bookingId: params.bookingId,
      sessionId: params.sessionId
    })

  if (params.sessionId) return verifyTicketCheckoutSession({ sessionId: params.sessionId })

  if (params.orderId) {
    // Free / already-issued tickets may only have an order id and no Stripe session.
    return { status: "completed" }
  }

  return {
    status: "failed",
    message: "Missing payment session to verify"
  }
}

export async function pollCheckoutPayment(
  params: {
    bookingId?: string
    sessionId?: string
    orderId?: string
  },
  options?: { attempts?: number; delayMs?: number }
): Promise<CheckoutVerificationResult> {
  const attempts = options?.attempts ?? 5
  const delayMs = options?.delayMs ?? 1500

  let lastResult: CheckoutVerificationResult = { status: "pending" }

  for (let attempt = 0; attempt < attempts; attempt++) {
    lastResult = await reconcileCheckoutPayment(params)
    if (lastResult.status !== "pending") return lastResult
    if (attempt < attempts - 1) await sleep(delayMs)
  }

  return lastResult
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
