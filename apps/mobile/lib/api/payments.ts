import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"
import { createCheckoutSession } from "@/lib/api/bookings"

export async function openBookingCheckout(params: { bookingId: string; eventId: string; ticketQuantity: number }) {
  const redirectUri = Linking.createURL("/(tabs)/bookings")
  const payload = await createCheckoutSession({
    bookingId: params.bookingId,
    eventId: params.eventId,
    ticketQuantity: params.ticketQuantity,
    mobileRedirectUri: redirectUri
  })
  await WebBrowser.openBrowserAsync(payload.url)
}
