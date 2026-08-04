import { ArtistBookingManager } from '@/components/bookings/artist-booking-manager'

export default function BookingRequestsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ArtistBookingManager defaultView="sent" />
    </div>
  )
}
