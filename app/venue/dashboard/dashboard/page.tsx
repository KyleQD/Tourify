"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Users, DollarSign, Music, Ticket, BarChart3, Building, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export default function VenueDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const handleNavigation = (path: string) => {
    toast({
      title: "Navigating",
      description: `Going to ${path}`,
    })
    router.push(path)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venue Dashboard</h1>
        <Button onClick={() => handleNavigation("/events/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Event
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => handleNavigation("/events")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-purple-400" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <p className="text-sm text-gray-400">2 events today</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => handleNavigation("/bookings")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-400" />
              Pending Bookings
            </CardTitle>
            <CardDescription>Requires approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-sm text-gray-400">5 new since yesterday</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => handleNavigation("/teams")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-400" />
              Team Members
            </CardTitle>
            <CardDescription>Active staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">15</div>
            <p className="text-sm text-gray-400">3 working today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-700">
                      <div className="rounded-full bg-gray-700 p-2">
                        {i === 1 ? (
                          <Calendar className="h-4 w-4" />
                        ) : i === 2 ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {i === 1
                            ? "New booking request received"
                            : i === 2
                              ? "Team member schedule updated"
                              : "Payment processed successfully"}
                        </p>
                        <p className="text-xs text-gray-400">{i * 20} minutes ago</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={() => handleNavigation("/activity")}>
                  View All Activity
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-5 w-5 text-green-400" />
                      <span>Monthly Revenue</span>
                    </div>
                    <Button variant="link" onClick={() => handleNavigation("/finances")}>
                      <span className="font-medium">$24,500</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Music className="mr-2 h-5 w-5 text-purple-400" />
                      <span>Performances</span>
                    </div>
                    <Button variant="link" onClick={() => handleNavigation("/events")}>
                      <span className="font-medium">32 this month</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Ticket className="mr-2 h-5 w-5 text-blue-400" />
                      <span>Tickets Sold</span>
                    </div>
                    <Button variant="link" onClick={() => handleNavigation("/tickets")}>
                      <span className="font-medium">1,245</span>
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full mt-2" onClick={() => handleNavigation("/analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button size="sm" onClick={() => handleNavigation("/events")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-gray-700 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {i === 1 ? "Jazz Night" : i === 2 ? "Electronic Dance Party" : "Acoustic Session"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatSafeDate(new Date(2025, 3, 15 + i * 2).toISOString())} • {6 + i}:00 PM
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleNavigation(`/events/${i}`)}>
                      Details
                    </Button>
                  </div>
                ))}
                <Button className="w-full" onClick={() => handleNavigation("/events/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Button size="sm" onClick={() => handleNavigation("/bookings")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-gray-700 flex items-center justify-center">
                        <Building className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {i === 1 ? "Corporate Event" : i === 2 ? "Wedding Reception" : "Birthday Party"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatSafeDate(new Date(2025, 3, 20 + i * 3).toISOString())} • {i === 1 ? "Pending" : "Confirmed"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleNavigation(`/bookings/${i}`)}>
                      Review
                    </Button>
                  </div>
                ))}
                <Button className="w-full" onClick={() => handleNavigation("/bookings/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Financial Overview</CardTitle>
              <Button size="sm" onClick={() => handleNavigation("/finances")}>
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gray-750 border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">$24,500</div>
                      <p className="text-xs text-gray-400">+12% from last month</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-750 border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-400">$14,200</div>
                      <p className="text-xs text-gray-400">-3% from last month</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-750 border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-400">$10,300</div>
                      <p className="text-xs text-gray-400">+24% from last month</p>
                    </CardContent>
                  </Card>
                </div>
                <Button className="w-full" onClick={() => handleNavigation("/finances")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Financial Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
