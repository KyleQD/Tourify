import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Star, Ticket, Users } from "lucide-react"

interface VenueStatsProps {
  venue: any
  stats?: any
}

export function VenueStats({ venue, stats }: VenueStatsProps) {
  const actualStats = stats || venue?.stats || {}

  const events = actualStats.totalBookings ?? actualStats.events ?? 0
  const rating = actualStats.averageRating ?? actualStats.rating ?? 0
  const bookingRequests = actualStats.pendingRequests ?? actualStats.bookingRequests ?? 0
  const teamMembers = actualStats.teamMembers ?? 0
  const upcomingEvents = actualStats.upcomingEvents ?? 0
  const totalReviews = actualStats.totalReviews ?? 0

  const ratingLabel = typeof rating === "number" && Number.isFinite(rating) ? rating.toFixed(1) : "0.0"

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-gray-400">Total events</p>
              <p className="text-2xl font-bold text-white tabular-nums">{Number(events).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {upcomingEvents > 0 ? `${upcomingEvents} upcoming` : "No upcoming events"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-900/20 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-gray-400">Venue rating</p>
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-2xl font-bold text-white tabular-nums">{ratingLabel}</p>
                <Star className="h-5 w-5 text-yellow-500 fill-current shrink-0" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalReviews > 0 ? `${totalReviews} review${totalReviews === 1 ? "" : "s"}` : "No reviews yet"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-900/20 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-gray-400">Booking requests</p>
              <p className="text-2xl font-bold text-white tabular-nums">{bookingRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting your response</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-900/20 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-gray-400">Team members</p>
              <p className="text-2xl font-bold text-white tabular-nums">{teamMembers}</p>
              <p className="text-xs text-gray-500 mt-1">Active on this venue</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-900/20 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
