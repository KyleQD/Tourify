"use client"

import { useState, useEffect } from "react"
import { Bell, Box, Building, Calendar, Clock, FileText, MapPin, MessageSquare, Plane, Truck, Users, Utensils, Plus, Edit, Trash2, AlertCircle, Loader2, Zap, Guitar, Mic, Piano, Drum, CheckCircle, Target } from "lucide-react"
import { Header } from "@/components/header"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useLogistics, useTransportation, useEquipment, useLogisticsAnalytics } from "@/hooks/use-logistics"
import { EventSelect } from "@/components/events/event-select"
import { useRentals, useRentalAgreements, useRentalAnalytics, useEquipmentUtilization } from "@/hooks/use-rentals"
import { useLodging, useLodgingBookings, useLodgingAnalytics, useLodgingUtilization } from "@/hooks/use-lodging"
import { useTravelCoordination } from "@/hooks/use-travel-coordination"
import { TravelCoordinationHub } from "@/components/admin/travel-coordination-hub"
import { LogisticsDynamicManager } from "@/components/admin/logistics-dynamic-manager"
import { LogisticsCollaboration } from "@/components/admin/logistics-collaboration"
import { SiteMapManager } from "@/components/admin/logistics/site-map-manager"
import { SiteMapManagerEnhanced } from "@/components/admin/logistics/site-map-manager-enhanced"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export default function LogisticsPage() {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [selectedTour, setSelectedTour] = useState<string | null>(null)

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Fetch logistics data
  const { data: logisticsData, loading: logisticsLoading, error: logisticsError, refetch: refetchLogistics } = useLogistics({
    eventId: selectedEvent || undefined,
    tourId: selectedTour || undefined,
    autoRefresh: true,
    refreshInterval: 30000
  })

  // Fetch specialized data for different tabs
  const { data: transportationData, loading: transportationLoading, error: transportationError } = useTransportation({
    eventId: selectedEvent || undefined,
    tourId: selectedTour || undefined
  })

  const { data: equipmentData, loading: equipmentLoading, error: equipmentError } = useEquipment({
    eventId: selectedEvent || undefined,
    tourId: selectedTour || undefined
  })

  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useLogisticsAnalytics({
    eventId: selectedEvent || undefined,
    tourId: selectedTour || undefined
  })

  // Fetch rental data
  const { agreements: rentalAgreements, loading: rentalsLoading, error: rentalError } = useRentalAgreements({
    status: 'active',
    limit: 10
  })

  const { analytics: rentalAnalytics, loading: rentalAnalyticsLoading, error: rentalAnalyticsError } = useRentalAnalytics()

  const { utilization: equipmentUtilization, loading: utilizationLoading, error: utilizationError } = useEquipmentUtilization()

  // Fetch lodging data
  const { bookings: lodgingBookings, loading: lodgingBookingsLoading, error: lodgingError } = useLodgingBookings()

  const { analytics: lodgingAnalytics, loading: lodgingAnalyticsLoading, error: lodgingAnalyticsError } = useLodgingAnalytics()

  const { utilization: lodgingUtilization, loading: lodgingUtilizationLoading, error: lodgingUtilizationError } = useLodgingUtilization()

  // Fetch travel coordination data
  const { 
    groups: travelGroups, 
    flights: travelFlights, 
    transportation: travelTransportation,
    analytics: travelAnalytics,
    groupsLoading: travelGroupsLoading,
  } = useTravelCoordination()

  // Calculate status metrics
  const calculateStatusMetrics = () => {
    // Default metrics object with all required properties
    const defaultMetrics = {
      transportation: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      equipment: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      backline: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      rentals: { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 },
      lodging: { percentage: 0, items: 0, completed: 0, status: 'No Bookings', revenue: 0 },
      travelCoordination: { percentage: 0, items: 0, completed: 0, status: 'Not Started', travelers: 0 },
      accommodations: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      catering: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      communication: { percentage: 0, items: 0, completed: 0, status: 'Not Started' }
    }

    if (!logisticsData) return defaultMetrics

    try {
      const transportation = logisticsData.transportation || []
      const equipment = logisticsData.equipment || []
      const assignments = logisticsData.assignments || []

      // Transportation metrics
      const transportTotal = transportation.length
      const transportCompleted = transportation.filter(t => t.status === 'completed').length
      const transportPercentage = transportTotal > 0 ? Math.round((transportCompleted / transportTotal) * 100) : 0
      const transportStatus = transportPercentage === 100 ? 'Completed' : transportPercentage > 50 ? 'In Progress' : 'Not Started'

      // Equipment metrics
      const equipTotal = equipment.length
      const equipAssigned = assignments.length
      const equipPercentage = equipTotal > 0 ? Math.round((equipAssigned / equipTotal) * 100) : 0
      const equipStatus = equipPercentage === 100 ? 'Completed' : equipPercentage > 50 ? 'In Progress' : 'Not Started'

      // Backline metrics (filter equipment by backline category)
      const backlineEquipment = equipment.filter(e => e.category === 'backline' || e.category === 'instruments')
      const backlineTotal = backlineEquipment.length
      const backlineAssigned = assignments.filter(a => backlineEquipment.some(e => e.id === a.equipment_id)).length
      const backlinePercentage = backlineTotal > 0 ? Math.round((backlineAssigned / backlineTotal) * 100) : 0
      const backlineStatus = backlinePercentage === 100 ? 'Completed' : backlinePercentage > 50 ? 'In Progress' : 'Not Started'

      // Rental metrics from real data
      const activeRentals = rentalAgreements?.length || 0
      const totalRentalRevenue = rentalAnalytics?.[0]?.total_revenue || 0
      const rentalPercentage = activeRentals > 0 ? Math.min(100, Math.round((activeRentals / 10) * 100)) : 0 // Assuming 10 is max for 100%
      const rentalStatus = activeRentals > 0 ? 'Active' : 'No Rentals'

      // Lodging metrics from real data
      const activeLodgingBookings = lodgingBookings?.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length || 0
      const totalLodgingRevenue = lodgingAnalytics?.[0]?.total_revenue || 0
      const lodgingPercentage = activeLodgingBookings > 0 ? Math.min(100, Math.round((activeLodgingBookings / 20) * 100)) : 0 // Assuming 20 is max for 100%
      const lodgingStatus = activeLodgingBookings > 0 ? 'Active' : 'No Bookings'

      // Travel coordination metrics
      const totalTravelGroups = travelGroups?.length || 0
      const totalTravelers = travelGroups?.reduce((sum, group) => sum + (group.total_members || 0), 0) || 0
      const fullyCoordinatedGroups = travelGroups?.filter(g => g.coordination_status === 'complete').length || 0
      const travelCoordinationPercentage = totalTravelGroups > 0 ? Math.round((fullyCoordinatedGroups / totalTravelGroups) * 100) : 0
      const travelCoordinationStatus = travelCoordinationPercentage === 100 ? 'Complete' : travelCoordinationPercentage > 50 ? 'In Progress' : 'Not Started'

      return {
        transportation: { percentage: transportPercentage, items: transportTotal, completed: transportCompleted, status: transportStatus },
        equipment: { percentage: equipPercentage, items: equipTotal, completed: equipAssigned, status: equipStatus },
        backline: { percentage: backlinePercentage, items: backlineTotal, completed: backlineAssigned, status: backlineStatus },
        rentals: { percentage: rentalPercentage, items: activeRentals, completed: activeRentals, status: rentalStatus, revenue: totalRentalRevenue },
        lodging: { percentage: lodgingPercentage, items: activeLodgingBookings, completed: activeLodgingBookings, status: lodgingStatus, revenue: totalLodgingRevenue },
        travelCoordination: { percentage: travelCoordinationPercentage, items: totalTravelGroups, completed: fullyCoordinatedGroups, status: travelCoordinationStatus, travelers: totalTravelers },
        accommodations: { percentage: 90, items: 12, completed: 11, status: 'Confirmed' }, // Mock data for now
        catering: { percentage: 10, items: 5, completed: 0, status: 'Not Started' }, // Mock data for now
        communication: { percentage: 75, items: 16, completed: 12, status: 'Active' } // Mock data for now
      }
    } catch (error) {
      console.error('Error calculating metrics:', error)
      return defaultMetrics
    }
  }

  const metrics = calculateStatusMetrics()

  // Handle errors
  useEffect(() => {
    if (logisticsError) {
      toast({
        title: "Error",
        description: logisticsError,
        variant: "destructive"
      })
    }
  }, [logisticsError, toast])

  // Show loading state if any critical data is loading
  const isLoading = logisticsLoading || transportationLoading || equipmentLoading || analyticsLoading || rentalsLoading || rentalAnalyticsLoading || utilizationLoading || lodgingBookingsLoading || lodgingAnalyticsLoading || lodgingUtilizationLoading || travelGroupsLoading

  // Show error state if there are critical errors
  const hasCriticalError = logisticsError || transportationError || equipmentError || analyticsError

  if (hasCriticalError) {
    return (
      <div className="container mx-auto p-4">
        <Header />
        <PageHeader
          title="Logistics Management"
          icon={Truck}
          description="Coordinate transportation, equipment, and venue logistics for all events"
        />
        
        <Card className="bg-slate-900/50 border-red-500/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Something went wrong!</h3>
                <p className="text-slate-400 mb-4">We apologize for the inconvenience. Please try again.</p>
                <div className="flex items-center justify-center space-x-4">
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Try again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/admin/dashboard'}
                  >
                    Go to Admin Home
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Header />
      <PageHeader
        title="Logistics Management"
        icon={Truck}
        description="Coordinate transportation, equipment, and venue logistics for all events"
      />

      {/* Scope selector */}
      <div className="mb-4">
        <EventSelect onSelect={(evt) => setSelectedEvent(evt?.id || null)} placeholder="Filter by event (optional)" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-900/80 p-1 mb-8 grid grid-cols-8 gap-2 backdrop-blur-xl border border-slate-700/30 rounded-2xl shadow-2xl shadow-slate-900/50">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-purple-300 data-[state=active]:border-purple-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Truck className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Overview</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="transportation"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-cyan-500/30 data-[state=active]:text-blue-300 data-[state=active]:border-blue-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Truck className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Transport</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="accommodations"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:text-green-300 data-[state=active]:border-green-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Building className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Hotels & Flights</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="equipment"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/30 data-[state=active]:to-red-500/30 data-[state=active]:text-orange-300 data-[state=active]:border-orange-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Box className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Equipment</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="backline"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:text-purple-300 data-[state=active]:border-purple-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Zap className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Backline</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="catering"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-orange-500/30 data-[state=active]:text-yellow-300 data-[state=active]:border-yellow-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <Utensils className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Catering</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="communication"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <MessageSquare className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Communication</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger
            value="site-maps"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/30 data-[state=active]:to-teal-500/30 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 data-[state=active]:backdrop-blur-sm relative group hover:bg-slate-800/50 hover:scale-105 transition-all duration-500 rounded-xl p-4 border border-transparent"
          >
            <div className="flex items-center justify-center space-x-2">
              <MapPin className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-sm font-medium tracking-wide">Site Maps</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-2 text-slate-400">Loading logistics data...</span>
            </div>
          ) : (
            <>
              {/* Quick Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border-blue-500/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-400 font-medium">Overall Progress</p>
                        <p className="text-2xl font-bold text-white">
                          {Math.round(((metrics?.transportation?.percentage || 0) + (metrics?.accommodations?.percentage || 0) + (metrics?.equipment?.percentage || 0) + (metrics?.backline?.percentage || 0) + (metrics?.rentals?.percentage || 0) + (metrics?.lodging?.percentage || 0) + (metrics?.travelCoordination?.percentage || 0) + (metrics?.catering?.percentage || 0) + (metrics?.communication?.percentage || 0)) / 9)}%
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Complete across all categories</p>
                      </div>
                      <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-400 font-medium">Active Items</p>
                        <p className="text-2xl font-bold text-white">
                          {(metrics?.transportation?.items || 0) + (metrics?.accommodations?.items || 0) + (metrics?.equipment?.items || 0) + (metrics?.backline?.items || 0) + (metrics?.rentals?.items || 0) + (metrics?.lodging?.items || 0) + (metrics?.travelCoordination?.items || 0) + (metrics?.catering?.items || 0) + (metrics?.communication?.items || 0)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Total logistics items</p>
                      </div>
                      <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-purple-500/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-400 font-medium">Completed</p>
                        <p className="text-2xl font-bold text-white">
                          {(metrics?.transportation?.completed || 0) + (metrics?.accommodations?.completed || 0) + (metrics?.equipment?.completed || 0) + (metrics?.backline?.completed || 0) + (metrics?.rentals?.completed || 0) + (metrics?.lodging?.completed || 0) + (metrics?.travelCoordination?.completed || 0) + (metrics?.catering?.completed || 0) + (metrics?.communication?.completed || 0)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Items completed</p>
                      </div>
                      <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Calendar className="mr-2 h-5 w-5 text-purple-500" />
                Logistics Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 pb-1">
                <div className="absolute top-0 bottom-0 left-3.5 w-px bg-slate-700"></div>
                {Array.isArray(logisticsData?.transportation) && logisticsData?.transportation.length > 0 ? (
                  logisticsData.transportation
                    .filter((t: any) => t?.due_date || t?.departure_time)
                    .sort((a: any, b: any) => new Date(a.due_date || a.departure_time).getTime() - new Date(b.due_date || b.departure_time).getTime())
                    .slice(0, 8)
                    .map((t: any) => (
                      <TimelineItem
                        key={t.id}
                        date={new Date(t.due_date || t.departure_time).toLocaleString()}
                        title={t.title || t.type || 'Logistics Item'}
                        description={t.description || ''}
                        status={t.status || 'scheduled'}
                      />
                    ))
                ) : (
                  <div className="text-slate-400 text-sm">No upcoming logistics items</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Users className="mr-2 h-5 w-5 text-purple-500" />
                Logistics Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TeamMemberCard
                  name="Jessica Lee"
                  role="Transportation Manager"
                  email="jessica@tourify.com"
                  phone="(555) 123-4567"
                />

                <TeamMemberCard
                  name="David Wilson"
                  role="Equipment Coordinator"
                  email="david@tourify.com"
                  phone="(555) 234-5678"
                />

                <TeamMemberCard
                  name="Amanda Garcia"
                  role="Catering Manager"
                  email="amanda@tourify.com"
                  phone="(555) 345-6789"
                />

                <TeamMemberCard
                  name="Robert Taylor"
                  role="Security Coordinator"
                  email="robert@tourify.com"
                  phone="(555) 456-7890"
                />

                <TeamMemberCard
                  name="Michael Chen"
                  role="Venue Liaison"
                  email="michael@tourify.com"
                  phone="(555) 567-8901"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transportation" className="mt-0">
          {transportationLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-2 text-slate-400">Loading transportation data...</span>
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <Truck className="mr-2 h-5 w-5 text-purple-500" />
                    Transportation Schedule
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transportation
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transportationData?.transportation && transportationData.transportation.length > 0 ? (
                  <div className="rounded-md border border-slate-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Provider
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              From
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              To
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                          {transportationData.transportation.map((transport) => (
                            <TransportationRow
                              key={transport.id}
                              dateTime={new Date(transport.departure_time).toLocaleString()}
                              description={`${transport.type} - ${transport.vehicle_details?.description || 'Transport'}`}
                              provider={transport.provider || 'TBD'}
                              from={transport.departure_location}
                              to={transport.arrival_location}
                              status={transport.status}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No Transportation Scheduled</h3>
                    <p className="text-slate-400 mb-4">Get started by adding transportation arrangements for your event.</p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Transportation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <FileText className="mr-2 h-5 w-5 text-purple-500" />
                Transportation Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProviderCard
                  name="Elite Transport Services"
                  type="VIP Transportation"
                  contact="John Driver"
                  phone="(555) 123-4567"
                  email="john@elitetransport.com"
                />

                <ProviderCard
                  name="Roadrunner Logistics"
                  type="Equipment Transport"
                  contact="Sarah Trucker"
                  phone="(555) 234-5678"
                  email="sarah@roadrunner.com"
                />

                <ProviderCard
                  name="City Shuttle Services"
                  type="Staff Transportation"
                  contact="Mike Shuttle"
                  phone="(555) 345-6789"
                  email="mike@cityshuttle.com"
                />

                <ProviderCard
                  name="Luxury Limos"
                  type="VIP Limousines"
                  contact="Lisa Luxury"
                  phone="(555) 456-7890"
                  email="lisa@luxurylimos.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodations" className="mt-0">
          <TravelCoordinationHub eventId={selectedEvent || undefined} tourId={selectedTour || undefined} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-0">
          <div className="space-y-6">
            {/* Equipment Management */}
            <LogisticsDynamicManager 
              type="equipment"
              enableEditing={true}
              autoSave={true}
              showFilters={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="backline" className="mt-0">
          {(equipmentLoading || utilizationLoading) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-2 text-slate-400">Loading backline data...</span>
            </div>
          ) : (
            <>
              {/* Backline Inventory */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 flex items-center justify-between text-base">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-5 w-5 text-purple-500" />
                      Backline Inventory
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Backline
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentUtilization && equipmentUtilization.length > 0 ? (
                    <div className="rounded-md border border-slate-700">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-800/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Instrument
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Condition
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Rental Rate
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                            {equipmentUtilization.slice(0, 10).map((item) => (
                              <BacklineRow
                                key={item.id}
                                instrument={item.name}
                                category={item.category}
                                condition="Good"
                                rentalRate={item.rental_rate}
                                status={item.current_status.toLowerCase()}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-300 mb-2">No Backline Available</h3>
                      <p className="text-slate-400 mb-4">Get started by adding backline equipment to your inventory.</p>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Backline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Rentals */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-100 flex items-center text-base">
                    <Calendar className="mr-2 h-5 w-5 text-purple-500" />
                    Active Rentals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rentalsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      <span className="ml-2 text-slate-400">Loading rental data...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rentalAgreements?.map((agreement) => (
                        <RentalCard
                          key={agreement.id}
                          instrument={agreement.rental_agreement_items?.[0]?.equipment?.name || 'Equipment'}
                          client={agreement.rental_clients?.name || 'Unknown Client'}
                          startDate={agreement.start_date}
                          endDate={agreement.end_date}
                          dailyRate={agreement.rental_agreement_items?.[0]?.daily_rate || 0}
                          totalAmount={agreement.total_amount}
                          status={agreement.status === 'active' ? 'active' : agreement.status === 'confirmed' ? 'upcoming' : 'completed'}
                        />
                      ))}
                      {(!rentalAgreements || rentalAgreements.length === 0) && (
                        <div className="text-center py-8 text-slate-500">
                          No active rentals found
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rental Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-100 text-sm">Revenue This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">
                      ${rentalAnalytics?.[0]?.total_revenue?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {rentalAnalytics?.[0]?.total_rentals || 0} total rentals
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-100 text-sm">Active Rentals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-400">
                      {rentalAnalytics?.[0]?.active_rentals || 0}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {rentalAnalytics?.[0]?.overdue_rentals || 0} overdue
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-100 text-sm">Utilization Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-400">
                      {equipmentUtilization?.length ? Math.round((equipmentUtilization.filter(e => e.current_status === 'Currently Rented').length / equipmentUtilization.length) * 100) : 0}%
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {equipmentUtilization?.filter(e => e.current_status === 'Available').length || 0} items available
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="catering" className="mt-0">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Utensils className="mr-2 h-5 w-5 text-purple-500" />
                Catering Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <CateringCard
                  title="Artist & Crew Meals"
                  provider="Gourmet Caterers"
                  servingTime="Aug 15, 12:00 PM - 10:00 PM"
                  location="Backstage Area"
                  meals={75}
                  specialRequests={8}
                />

                <CateringCard
                  title="VIP Reception"
                  provider="Elite Event Catering"
                  servingTime="Aug 15, 06:00 PM - 08:00 PM"
                  location="VIP Lounge"
                  meals={150}
                  specialRequests={15}
                />

                <CateringCard
                  title="Staff Meals"
                  provider="Gourmet Caterers"
                  servingTime="Aug 15, 11:00 AM - 11:00 PM"
                  location="Staff Area"
                  meals={50}
                  specialRequests={3}
                />

                <CateringCard
                  title="After Party"
                  provider="Nightlife Catering Co."
                  servingTime="Aug 15, 11:00 PM - 02:00 AM"
                  location="Luxury Hotel Rooftop"
                  meals={100}
                  specialRequests={10}
                />
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-200 mb-3">Special Dietary Requirements</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Vegetarian</span>
                    <span className="text-purple-400">24 meals</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Vegan</span>
                    <span className="text-purple-400">12 meals</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Gluten-Free</span>
                    <span className="text-purple-400">8 meals</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Nut Allergies</span>
                    <span className="text-purple-400">6 meals</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Dairy-Free</span>
                    <span className="text-purple-400">10 meals</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <FileText className="mr-2 h-5 w-5 text-purple-500" />
                Catering Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProviderCard
                  name="Gourmet Caterers"
                  type="Full-Service Catering"
                  contact="Chef Maria Rodriguez"
                  phone="(555) 789-0123"
                  email="maria@gourmetcaterers.com"
                />

                <ProviderCard
                  name="Elite Event Catering"
                  type="VIP & Premium Catering"
                  contact="Chef James Wilson"
                  phone="(555) 890-1234"
                  email="james@eliteeventcatering.com"
                />

                <ProviderCard
                  name="Nightlife Catering Co."
                  type="After-Hours Catering"
                  contact="Chef Daniel Black"
                  phone="(555) 901-2345"
                  email="daniel@nightlifecatering.com"
                />

                <ProviderCard
                  name="Fresh Bites Food Trucks"
                  type="Mobile Food Service"
                  contact="Lisa Green"
                  phone="(555) 012-3456"
                  email="lisa@freshbites.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="mt-0">
          <div className="space-y-6">
            {/* Team Collaboration */}
            <LogisticsCollaboration 
              eventId={selectedEvent || undefined}
              tourId={selectedTour || undefined}
              teamMembers={['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Davis']}
            />
          </div>
        </TabsContent>

        <TabsContent value="site-maps" className="mt-0">
          <div className="space-y-6">
            {/* Interactive Site Maps - Enhanced with Fallback */}
            <SiteMapManagerEnhanced />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface LogisticsStatusCardProps {
  title: string
  icon: any
  status: string
  percentage: number
  items: number
  completed: number
}

function LogisticsStatusCard({ title, icon: Icon, status, percentage, items, completed }: LogisticsStatusCardProps) {
  const getStatusColor = () => {
    if (percentage === 100) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (percentage > 50) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (percentage > 0) return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <Badge className={`mt-1 ${getStatusColor()}`}>{status}</Badge>
          </div>
          <div className="bg-purple-500/20 p-2 rounded-md">
            <Icon className="h-5 w-5 text-purple-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-slate-500">
              {completed} of {items} items completed
            </div>
            <div className="text-xs text-purple-400">{percentage}%</div>
          </div>
          <Progress value={percentage} className="h-1.5 bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </Progress>
        </div>
      </CardContent>
    </Card>
  )
}

interface TimelineItemProps {
  date: string
  title: string
  description: string
  status: string
  daysAway?: number
}

function TimelineItem({ date, title, description, status, daysAway }: TimelineItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-green-500"
      case "in-progress":
        return "bg-blue-500 text-blue-500"
      case "scheduled":
        return "bg-purple-500 text-purple-500"
      case "delayed":
        return "bg-amber-500 text-amber-500"
      default:
        return "bg-slate-500 text-slate-500"
    }
  }

  return (
    <div className="mb-6 relative">
      <div
        className={`absolute -left-8 mt-1.5 h-4 w-4 rounded-full border-2 border-slate-900 ${getStatusColor()}`}
      ></div>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <div className="mb-1 sm:mb-0 sm:mr-4 sm:w-32 text-xs text-slate-500">{date}</div>
        <div>
          <h4 className="text-sm font-medium text-slate-200">{title}</h4>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
          {daysAway && (
            <Badge className="mt-2 bg-purple-500/10 text-purple-400 border-purple-500/20">{daysAway} days away</Badge>
          )}
        </div>
      </div>
    </div>
  )
}

interface TeamMemberCardProps {
  name: string
  role: string
  email: string
  phone: string
}

function TeamMemberCard({ name, role, email, phone }: TeamMemberCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50 flex items-start space-x-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src="/placeholder.svg?height=40&width=40" alt={name} />
        <AvatarFallback className="bg-slate-700 text-purple-500">{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <h4 className="text-sm font-medium text-slate-200">{name}</h4>
        <p className="text-xs text-purple-400">{role}</p>
        <p className="text-xs text-slate-400 mt-1">{email}</p>
        <p className="text-xs text-slate-400">{phone}</p>
      </div>
    </div>
  )
}

interface TransportationRowProps {
  dateTime: string
  description: string
  provider: string
  from: string
  to: string
  status: string
}

function TransportationRow({ dateTime, description, provider, from, to, status }: TransportationRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case "in-progress":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Progress</Badge>
      case "scheduled":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Scheduled</Badge>
      case "delayed":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Delayed</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{dateTime}</td>
      <td className="px-4 py-3 text-slate-300">{description}</td>
      <td className="px-4 py-3 text-slate-300">{provider}</td>
      <td className="px-4 py-3 text-slate-300">{from}</td>
      <td className="px-4 py-3 text-slate-300">{to}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface ProviderCardProps {
  name: string
  type: string
  contact: string
  phone: string
  email: string
}

function ProviderCard({ name, type, contact, phone, email }: ProviderCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <h4 className="text-sm font-medium text-slate-200">{name}</h4>
      <Badge className="mt-1 bg-slate-700/50 text-slate-300 border-slate-600/50">{type}</Badge>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-slate-400">
          Contact: <span className="text-slate-300">{contact}</span>
        </p>
        <p className="text-xs text-slate-400">
          Phone: <span className="text-slate-300">{phone}</span>
        </p>
        <p className="text-xs text-slate-400">
          Email: <span className="text-slate-300">{email}</span>
        </p>
      </div>
    </div>
  )
}

interface EquipmentRowProps {
  item: string
  category: string
  condition: string
  location: string
  status: string
}

function EquipmentRow({ item, category, condition, location, status }: EquipmentRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
      case "in_use":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Use</Badge>
      case "maintenance":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
      case "retired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Retired</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const getConditionBadge = () => {
    switch (condition) {
      case "excellent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>
      case "fair":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{condition}</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{item}</td>
      <td className="px-4 py-3 text-slate-300">{category}</td>
      <td className="px-4 py-3">{getConditionBadge()}</td>
      <td className="px-4 py-3 text-slate-300">{location}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface CateringCardProps {
  title: string
  provider: string
  servingTime: string
  location: string
  meals: number
  specialRequests: number
}

function CateringCard({ title, provider, servingTime, location, meals, specialRequests }: CateringCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <h4 className="text-sm font-medium text-slate-200">{title}</h4>
      <p className="text-xs text-purple-400">{provider}</p>

      <div className="mt-3 space-y-2">
        <div className="flex items-start">
          <Clock className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{servingTime}</p>
        </div>
        <div className="flex items-start">
          <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{location}</p>
        </div>
        <div className="flex items-start">
          <Utensils className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{meals} meals total</p>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{specialRequests} special dietary requests</p>
        </div>
      </div>
    </div>
  )
}

// New component interfaces and implementations

interface AccommodationCardProps {
  hotel: string
  checkIn: string
  checkOut: string
  rooms: number
  guests: number
  status: string
  contact: string
  phone: string
}

function AccommodationCard({ hotel, checkIn, checkOut, rooms, guests, status, contact, phone }: AccommodationCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200">{hotel}</h4>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start">
          <Calendar className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>Check-in: {checkIn}</div>
            <div>Check-out: {checkOut}</div>
          </div>
        </div>
        <div className="flex items-start">
          <Users className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>{rooms} rooms • {guests} guests</div>
          </div>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>Contact: {contact}</div>
            <div>Phone: {phone}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlightCardProps {
  flight: string
  departure: string
  date: string
  passengers: number
  status: string
  airline: string
}

function FlightCard({ flight, departure, date, passengers, status, airline }: FlightCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
      case "delayed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Delayed</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200">{flight}</h4>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start">
          <Plane className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{departure}</div>
        </div>
        <div className="flex items-start">
          <Calendar className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{date}</div>
        </div>
        <div className="flex items-start">
          <Users className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{passengers} passengers</div>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{airline}</div>
        </div>
      </div>
    </div>
  )
}

interface DocumentCardProps {
  title: string
  status: string
  description: string
  icon: string
}

function DocumentCard({ title, status, description, icon }: DocumentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "Completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Active":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Updated":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        <Badge className={`${getStatusColor()} text-xs`}>{status}</Badge>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  )
}

interface ChatMessageProps {
  sender: string
  message: string
  time: string
  unread: boolean
}

function ChatMessage({ sender, message, time, unread }: ChatMessageProps) {
  return (
    <div className={`p-3 rounded-md ${unread ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-slate-800/30'}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{sender}</span>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-300">{message}</p>
      {unread && <div className="mt-2 h-2 w-2 rounded-full bg-purple-500"></div>}
    </div>
  )
}

interface NotificationItemProps {
  title: string
  message: string
  time: string
  type: 'info' | 'warning' | 'success' | 'error'
}

function NotificationItem({ title, message, time, type }: NotificationItemProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10'
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10'
      case 'success':
        return 'border-green-500/30 bg-green-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/10'
      default:
        return 'border-slate-500/30 bg-slate-500/10'
    }
  }

  return (
    <div className={`p-3 rounded-md border ${getTypeColor()}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  )
}

interface QuickActionButtonProps {
  title: string
  description: string
  icon: string
}

function QuickActionButton({ title, description, icon }: QuickActionButtonProps) {
  return (
    <button className="w-full p-3 rounded-md bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-left">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <div className="h-6 w-6 rounded-md bg-purple-500/20 flex items-center justify-center">
          <FileText className="h-3 w-3 text-purple-500" />
        </div>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  )
}

interface ContactCardProps {
  name: string
  role: string
  phone: string
  email: string
  emergency: boolean
}

function ContactCard({ name, role, phone, email, emergency }: ContactCardProps) {
  return (
    <div className={`p-4 rounded-md border ${emergency ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt={name} />
          <AvatarFallback className={`${emergency ? 'bg-red-700 text-white' : 'bg-slate-700 text-purple-500'}`}>
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-slate-200">{name}</h4>
          <p className={`text-xs ${emergency ? 'text-red-400' : 'text-purple-400'}`}>{role}</p>
          <p className="text-xs text-slate-400 mt-1">{phone}</p>
          <p className="text-xs text-slate-400">{email}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// BACKLINE & RENTALS COMPONENTS
// =============================================================================

interface BacklineRowProps {
  instrument: string
  category: string
  condition: string
  rentalRate: number
  status: string
}

function BacklineRow({ instrument, category, condition, rentalRate, status }: BacklineRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
      case "rented":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rented</Badge>
      case "maintenance":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const getConditionBadge = () => {
    switch (condition) {
      case "excellent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>
      case "fair":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{condition}</Badge>
    }
  }

  const getCategoryIcon = () => {
    switch (category.toLowerCase()) {
      case "guitar":
      case "electric":
      case "acoustic":
        return <Guitar className="h-4 w-4 text-purple-400" />
      case "drums":
      case "percussion":
        return <Drum className="h-4 w-4 text-purple-400" />
      case "piano":
      case "keyboard":
        return <Piano className="h-4 w-4 text-purple-400" />
      case "microphone":
      case "vocal":
        return <Mic className="h-4 w-4 text-purple-400" />
      default:
        return <Zap className="h-4 w-4 text-purple-400" />
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3">
        <div className="flex items-center">
          {getCategoryIcon()}
          <span className="ml-2 text-slate-300">{instrument}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300 capitalize">{category}</td>
      <td className="px-4 py-3">{getConditionBadge()}</td>
      <td className="px-4 py-3 text-slate-300">${rentalRate}/day</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface RentalCardProps {
  instrument: string
  client: string
  startDate: string
  endDate: string
  dailyRate: number
  totalAmount: number
  status: 'active' | 'upcoming' | 'completed' | 'overdue'
}

function RentalCard({ instrument, client, startDate, endDate, dailyRate, totalAmount, status }: RentalCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Upcoming</Badge>
      case "completed":
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Completed</Badge>
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const daysRemaining = () => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-purple-500 mr-2" />
          <h4 className="font-medium text-slate-200">{instrument}</h4>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2 text-sm">
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Client:</span> {client}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Period:</span> {formatDate(startDate)} - {formatDate(endDate)}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Rate:</span> ${dailyRate}/day
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Total:</span> ${totalAmount}
        </p>
        {status === 'active' && (
          <p className="text-amber-400">
            <span className="font-medium">Due in:</span> {daysRemaining()} days
          </p>
        )}
      </div>
      
      <div className="flex space-x-2 mt-4">
        <Button size="sm" variant="outline" className="flex-1">
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <Calendar className="h-3 w-3 mr-1" />
          Extend
        </Button>
        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Return
        </Button>
      </div>
    </div>
  )
}
