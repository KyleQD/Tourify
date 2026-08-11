import { redirect } from "next/navigation"

interface BookingRequestRedirectProps {
  params: Promise<{ id: string }>
}

/** Operator twin → canonical public booking request */
export default async function VenueDashboardBookingRequestRedirectPage({
  params,
}: BookingRequestRedirectProps) {
  const { id } = await params
  redirect(`/venues/${encodeURIComponent(id)}/booking-request`)
}
