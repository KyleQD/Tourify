import { ArtistBookingWorkspace } from '@/components/bookings/artist-booking-workspace'

export default async function BookingRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container mx-auto px-4 py-8">
      <ArtistBookingWorkspace bookingId={id} />
    </div>
  )
}
