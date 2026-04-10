import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TravelGroup {
  id: string
  name: string
  description?: string
  group_type: 'crew' | 'artists' | 'staff' | 'vendors' | 'guests' | 'vip' | 'media' | 'security' | 'catering' | 'technical' | 'management'
  department?: string
  priority_level: number
  arrival_date: string
  departure_date: string
  arrival_location?: string
  departure_location?: string
  total_members: number
  confirmed_members: number
  group_leader_id?: string
  backup_contact_id?: string
  special_requirements: string[]
  dietary_restrictions: string[]
  accessibility_needs: string[]
  status: 'planning' | 'confirmed' | 'in_transit' | 'arrived' | 'departed' | 'cancelled'
  coordination_status: 'pending' | 'flights_booked' | 'hotels_booked' | 'transport_arranged' | 'complete'
  event_id?: string
  tour_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  staff_profiles?: {
    first_name: string
    last_name: string
    email: string
  }
}

export interface TravelGroupMember {
  id: string
  group_id: string
  member_name: string
  member_email?: string
  member_phone?: string
  member_role?: string
  staff_id?: string
  crew_member_id?: string
  team_member_id?: string
  seat_preference?: string
  meal_preference?: string
  special_assistance: boolean
  wheelchair_required: boolean
  mobility_assistance: boolean
  status: 'pending' | 'confirmed' | 'checked_in' | 'in_transit' | 'arrived' | 'no_show' | 'cancelled'
  check_in_status: 'pending' | 'confirmed' | 'checked_in' | 'late_check_in' | 'no_show'
  actual_arrival_time?: string
  actual_departure_time?: string
  created_at: string
  updated_at: string
  travel_groups?: {
    name: string
    group_type: string
    department?: string
  }
  staff_profiles?: {
    first_name: string
    last_name: string
    email: string
  }
  venue_crew_members?: {
    name: string
    specialty: string
  }
  venue_team_members?: {
    name: string
    role: string
  }
}

export interface FlightCoordination {
  id: string
  flight_number: string
  airline: string
  departure_airport: string
  arrival_airport: string
  departure_time: string
  arrival_time: string
  aircraft_type?: string
  total_seats?: number
  booked_seats: number
  available_seats?: number
  group_id?: string
  is_group_flight: boolean
  booking_reference?: string
  ticket_class: 'economy' | 'premium_economy' | 'business' | 'first'
  fare_type: 'standard' | 'flexible' | 'refundable' | 'group'
  status: 'scheduled' | 'confirmed' | 'boarding' | 'in_flight' | 'landed' | 'delayed' | 'cancelled'
  gate?: string
  terminal?: string
  ticket_cost?: number
  total_cost?: number
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
  event_id?: string
  tour_id?: string
  assigned_by?: string
  created_at: string
  updated_at: string
  travel_groups?: {
    name: string
    group_type: string
    department?: string
  }
}

export interface FlightPassengerAssignment {
  id: string
  flight_id: string
  group_member_id: string
  seat_number?: string
  seat_class: 'economy' | 'premium_economy' | 'business' | 'first'
  ticket_number?: string
  ticket_cost?: number
  ticket_status: 'pending' | 'issued' | 'checked_in' | 'used' | 'cancelled'
  boarding_time?: string
  boarding_group?: string
  checked_in: boolean
  checked_in_time?: string
  special_meal?: string
  special_assistance: boolean
  wheelchair_assistance: boolean
  status: 'confirmed' | 'checked_in' | 'boarded' | 'no_show' | 'cancelled'
  created_at: string
  updated_at: string
  flight_coordination?: {
    flight_number: string
    airline: string
    departure_airport: string
    arrival_airport: string
  }
  travel_group_members?: {
    member_name: string
    member_email?: string
    member_role?: string
  }
}

export interface GroundTransportationCoordination {
  id: string
  transport_type: 'shuttle_bus' | 'limo' | 'van' | 'car' | 'train' | 'subway' | 'walking'
  provider_name?: string
  vehicle_details: Record<string, any>
  pickup_location: string
  dropoff_location: string
  pickup_time: string
  estimated_dropoff_time: string
  actual_dropoff_time?: string
  vehicle_capacity?: number
  assigned_passengers: number
  group_id?: string
  driver_name?: string
  driver_phone?: string
  driver_license?: string
  vehicle_plate?: string
  status: 'scheduled' | 'en_route' | 'arrived' | 'completed' | 'delayed' | 'cancelled'
  tracking_enabled: boolean
  current_location?: string
  cost_per_person?: number
  total_cost?: number
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
  event_id?: string
  tour_id?: string
  flight_id?: string
  assigned_by?: string
  created_at: string
  updated_at: string
  travel_groups?: {
    name: string
    group_type: string
    department?: string
  }
  flight_coordination?: {
    flight_number: string
    airline: string
  }
}

export interface TransportationPassengerAssignment {
  id: string
  transportation_id: string
  group_member_id: string
  pickup_instructions?: string
  dropoff_instructions?: string
  status: 'confirmed' | 'picked_up' | 'in_transit' | 'dropped_off' | 'no_show' | 'cancelled'
  pickup_confirmed: boolean
  pickup_time?: string
  dropoff_time?: string
  special_assistance: boolean
  wheelchair_required: boolean
  luggage_count: number
  created_at: string
  updated_at: string
  ground_transportation_coordination?: {
    transport_type: string
    provider_name?: string
    pickup_location: string
    dropoff_location: string
  }
  travel_group_members?: {
    member_name: string
    member_email?: string
    member_role?: string
  }
}

export interface HotelRoomAssignment {
  id: string
  lodging_booking_id: string
  group_member_id: string
  room_number?: string
  room_type?: string
  bed_configuration?: string
  roommate_preference?: string
  floor_preference?: string
  accessibility_required: boolean
  check_in_status: 'pending' | 'confirmed' | 'checked_in' | 'late_check_in' | 'no_show'
  check_out_status: 'pending' | 'checked_out' | 'late_check_out' | 'extended'
  actual_check_in_time?: string
  actual_check_out_time?: string
  dietary_restrictions: string[]
  accessibility_needs: string[]
  special_requests?: string
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  created_at: string
  updated_at: string
  lodging_bookings?: {
    booking_number: string
    lodging_providers?: {
      name: string
    }
  }
  travel_group_members?: {
    member_name: string
    member_email?: string
    member_role?: string
  }
}

export interface TravelCoordinationTimeline {
  id: string
  entry_type: 'flight' | 'transport' | 'hotel_checkin' | 'hotel_checkout' | 'meeting' | 'meal' | 'activity'
  title: string
  description?: string
  start_time: string
  end_time: string
  timezone: string
  location?: string
  location_details?: string
  group_id?: string
  affected_members: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  event_id?: string
  tour_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  travel_groups?: {
    name: string
    group_type: string
  }
}

export interface TravelCoordinationAnalytics {
  date: string
  week: string
  month: string
  total_groups: number
  total_travelers: number
  arrived_groups: number
  fully_coordinated_groups: number
  total_flights: number
  total_flight_passengers: number
  completed_flights: number
  total_transport_runs: number
  total_transport_passengers: number
  completed_transport: number
  total_hotel_bookings: number
  total_room_assignments: number
  checked_in_guests: number
  total_flight_cost: number
  total_transport_cost: number
  total_hotel_cost: number
  total_travel_cost: number
  coordination_completion_rate: number
  arrival_success_rate: number
}

export interface TravelGroupUtilization {
  group_id: string
  group_name: string
  group_type: string
  department?: string
  priority_level: number
  total_members: number
  confirmed_members: number
  total_flights: number
  flight_passengers: number
  flight_utilization_percentage: number
  total_transport_runs: number
  transport_passengers: number
  transport_utilization_percentage: number
  total_hotel_bookings: number
  hotel_guests: number
  hotel_utilization_percentage: number
  coordination_status: string
  group_status: string
  total_flight_cost: number
  total_transport_cost: number
  total_hotel_cost: number
  total_group_cost: number
  confirmation_rate: number
}

// =============================================================================
// MAIN TRAVEL COORDINATION HOOK
// =============================================================================

export function useTravelCoordination() {
  const { toast } = useToast()

  function buildReadRequestInit(): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  }

  function buildMutationRequestInit(input: {
    method: 'POST' | 'PUT' | 'DELETE'
    body?: Record<string, unknown>
  }): RequestInit {
    return {
      method: input.method,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    }
  }
  
  // State for different data types
  const [groups, setGroups] = useState<TravelGroup[]>([])
  const [groupMembers, setGroupMembers] = useState<TravelGroupMember[]>([])
  const [flights, setFlights] = useState<FlightCoordination[]>([])
  const [flightPassengers, setFlightPassengers] = useState<FlightPassengerAssignment[]>([])
  const [transportation, setTransportation] = useState<GroundTransportationCoordination[]>([])
  const [transportationPassengers, setTransportationPassengers] = useState<TransportationPassengerAssignment[]>([])
  const [hotelAssignments, setHotelAssignments] = useState<HotelRoomAssignment[]>([])
  const [timeline, setTimeline] = useState<TravelCoordinationTimeline[]>([])
  const [analytics, setAnalytics] = useState<TravelCoordinationAnalytics[]>([])
  const [utilization, setUtilization] = useState<TravelGroupUtilization[]>([])

  // Loading states
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupMembersLoading, setGroupMembersLoading] = useState(false)
  const [flightsLoading, setFlightsLoading] = useState(false)
  const [flightPassengersLoading, setFlightPassengersLoading] = useState(false)
  const [transportationLoading, setTransportationLoading] = useState(false)
  const [transportationPassengersLoading, setTransportationPassengersLoading] = useState(false)
  const [hotelAssignmentsLoading, setHotelAssignmentsLoading] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [utilizationLoading, setUtilizationLoading] = useState(false)

  // Error states
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [groupMembersError, setGroupMembersError] = useState<string | null>(null)
  const [flightsError, setFlightsError] = useState<string | null>(null)
  const [flightPassengersError, setFlightPassengersError] = useState<string | null>(null)
  const [transportationError, setTransportationError] = useState<string | null>(null)
  const [transportationPassengersError, setTransportationPassengersError] = useState<string | null>(null)
  const [hotelAssignmentsError, setHotelAssignmentsError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [utilizationError, setUtilizationError] = useState<string | null>(null)

  // =============================================================================
  // FETCH FUNCTIONS
  // =============================================================================

  const fetchGroups = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    group_type?: string
    event_id?: string
    tour_id?: string
    date_from?: string
    date_to?: string
  }) => {
    setGroupsLoading(true)
    setGroupsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'groups',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.group_type) searchParams.append('group_type', params.group_type)
      if (params?.event_id) searchParams.append('event_id', params.event_id)
      if (params?.tour_id) searchParams.append('tour_id', params.tour_id)
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.message) {
        toast({
          title: "Info",
          description: result.message,
          variant: "default"
        })
      }

      setGroups(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching groups:', error)
      setGroupsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch travel groups",
        variant: "destructive"
      })
    } finally {
      setGroupsLoading(false)
    }
  }, [toast])

  const fetchGroupMembers = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    group_type?: string
  }) => {
    setGroupMembersLoading(true)
    setGroupMembersError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'group_members',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.group_type) searchParams.append('group_type', params.group_type)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setGroupMembers(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching group members:', error)
      setGroupMembersError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch group members",
        variant: "destructive"
      })
    } finally {
      setGroupMembersLoading(false)
    }
  }, [toast])

  const fetchFlights = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    event_id?: string
    tour_id?: string
    date_from?: string
    date_to?: string
  }) => {
    setFlightsLoading(true)
    setFlightsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'flights',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.event_id) searchParams.append('event_id', params.event_id)
      if (params?.tour_id) searchParams.append('tour_id', params.tour_id)
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setFlights(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching flights:', error)
      setFlightsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch flight coordination",
        variant: "destructive"
      })
    } finally {
      setFlightsLoading(false)
    }
  }, [toast])

  const fetchFlightPassengers = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
  }) => {
    setFlightPassengersLoading(true)
    setFlightPassengersError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'flight_passengers',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setFlightPassengers(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching flight passengers:', error)
      setFlightPassengersError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch flight passengers",
        variant: "destructive"
      })
    } finally {
      setFlightPassengersLoading(false)
    }
  }, [toast])

  const fetchTransportation = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    event_id?: string
    tour_id?: string
    date_from?: string
    date_to?: string
  }) => {
    setTransportationLoading(true)
    setTransportationError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'transportation',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.event_id) searchParams.append('event_id', params.event_id)
      if (params?.tour_id) searchParams.append('tour_id', params.tour_id)
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setTransportation(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching transportation:', error)
      setTransportationError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch transportation coordination",
        variant: "destructive"
      })
    } finally {
      setTransportationLoading(false)
    }
  }, [toast])

  const fetchTransportationPassengers = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
  }) => {
    setTransportationPassengersLoading(true)
    setTransportationPassengersError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'transportation_passengers',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setTransportationPassengers(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching transportation passengers:', error)
      setTransportationPassengersError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch transportation passengers",
        variant: "destructive"
      })
    } finally {
      setTransportationPassengersLoading(false)
    }
  }, [toast])

  const fetchHotelAssignments = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
  }) => {
    setHotelAssignmentsLoading(true)
    setHotelAssignmentsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'hotel_assignments',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setHotelAssignments(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching hotel assignments:', error)
      setHotelAssignmentsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch hotel assignments",
        variant: "destructive"
      })
    } finally {
      setHotelAssignmentsLoading(false)
    }
  }, [toast])

  const fetchTimeline = useCallback(async (params?: {
    limit?: number
    offset?: number
    date_from?: string
    date_to?: string
  }) => {
    setTimelineLoading(true)
    setTimelineError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'timeline',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setTimeline(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching timeline:', error)
      setTimelineError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch travel timeline",
        variant: "destructive"
      })
    } finally {
      setTimelineLoading(false)
    }
  }, [toast])

  const fetchAnalytics = useCallback(async (params?: {
    limit?: number
    offset?: number
  }) => {
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'analytics',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAnalytics(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching analytics:', error)
      setAnalyticsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch travel analytics",
        variant: "destructive"
      })
    } finally {
      setAnalyticsLoading(false)
    }
  }, [toast])

  const fetchUtilization = useCallback(async (params?: {
    limit?: number
    offset?: number
  }) => {
    setUtilizationLoading(true)
    setUtilizationError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'utilization',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })

      const response = await fetch(`/api/admin/travel-coordination?${searchParams}`, buildReadRequestInit())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setUtilization(result.data || [])
    } catch (error: any) {
      console.error('[useTravelCoordination] Error fetching utilization:', error)
      setUtilizationError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch utilization data",
        variant: "destructive"
      })
    } finally {
      setUtilizationLoading(false)
    }
  }, [toast])

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const createTravelGroup = useCallback(async (groupData: Partial<TravelGroup>) => {
    try {
      const response = await fetch(
        '/api/admin/travel-coordination',
        buildMutationRequestInit({
          method: 'POST',
          body: {
            action: 'create_travel_group',
            ...groupData,
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Travel group created successfully",
        variant: "default"
      })

      // Refresh groups list
      await fetchGroups()
      return result.data
    } catch (error: any) {
      console.error('[useTravelCoordination] Error creating travel group:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create travel group",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroups, toast])

  const updateTravelGroup = useCallback(async (id: string, groupData: Partial<TravelGroup>) => {
    try {
      const response = await fetch(
        '/api/admin/travel-coordination',
        buildMutationRequestInit({
          method: 'PUT',
          body: {
            action: 'update_travel_group',
            id,
            ...groupData,
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Travel group updated successfully",
        variant: "default"
      })

      // Refresh groups list
      await fetchGroups()
      return result.data
    } catch (error: any) {
      console.error('[useTravelCoordination] Error updating travel group:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update travel group",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroups, toast])

  const deleteTravelGroup = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `/api/admin/travel-coordination?action=delete_travel_group&id=${id}`,
        buildMutationRequestInit({ method: 'DELETE' })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Travel group deleted successfully",
        variant: "default"
      })

      // Refresh groups list
      await fetchGroups()
    } catch (error: any) {
      console.error('[useTravelCoordination] Error deleting travel group:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete travel group",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroups, toast])

  const createGroupMember = useCallback(async (memberData: Partial<TravelGroupMember>) => {
    try {
      const response = await fetch(
        '/api/admin/travel-coordination',
        buildMutationRequestInit({
          method: 'POST',
          body: {
            action: 'create_group_member',
            ...memberData,
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Group member created successfully",
        variant: "default"
      })

      // Refresh group members list
      await fetchGroupMembers()
      return result.data
    } catch (error: any) {
      console.error('[useTravelCoordination] Error creating group member:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create group member",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroupMembers, toast])

  const bulkCreateGroupMembers = useCallback(async (groupId: string, members: Partial<TravelGroupMember>[]) => {
    try {
      const response = await fetch(
        '/api/admin/travel-coordination',
        buildMutationRequestInit({
          method: 'POST',
          body: {
            action: 'bulk_create_group_members',
            group_id: groupId,
            members,
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: `${members.length} group members created successfully`,
        variant: "default"
      })

      // Refresh group members list
      await fetchGroupMembers()
      return result.data
    } catch (error: any) {
      console.error('[useTravelCoordination] Error bulk creating group members:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create group members",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroupMembers, toast])

  const autoCoordinateGroup = useCallback(async (groupId: string) => {
    try {
      const response = await fetch(
        '/api/admin/travel-coordination',
        buildMutationRequestInit({
          method: 'POST',
          body: {
            action: 'auto_coordinate_group',
            group_id: groupId,
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Group auto-coordinated successfully",
        variant: "default"
      })

      // Refresh all data
      await Promise.all([
        fetchGroups(),
        fetchFlights(),
        fetchTransportation(),
        fetchHotelAssignments()
      ])
      
      return result.data
    } catch (error: any) {
      console.error('[useTravelCoordination] Error auto-coordinating group:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to auto-coordinate group",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGroups, fetchFlights, fetchTransportation, fetchHotelAssignments, toast])

  // =============================================================================
  // INITIAL DATA LOADING
  // =============================================================================

  useEffect(() => {
    // Load initial data
    fetchGroups()
    fetchAnalytics()
    fetchUtilization()
  }, [fetchGroups, fetchAnalytics, fetchUtilization])

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGroups()
      fetchAnalytics()
      fetchUtilization()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchGroups, fetchAnalytics, fetchUtilization])

  // =============================================================================
  // RETURN OBJECT
  // =============================================================================

  return {
    // Data
    groups,
    groupMembers,
    flights,
    flightPassengers,
    transportation,
    transportationPassengers,
    hotelAssignments,
    timeline,
    analytics,
    utilization,

    // Loading states
    groupsLoading,
    groupMembersLoading,
    flightsLoading,
    flightPassengersLoading,
    transportationLoading,
    transportationPassengersLoading,
    hotelAssignmentsLoading,
    timelineLoading,
    analyticsLoading,
    utilizationLoading,

    // Error states
    groupsError,
    groupMembersError,
    flightsError,
    flightPassengersError,
    transportationError,
    transportationPassengersError,
    hotelAssignmentsError,
    timelineError,
    analyticsError,
    utilizationError,

    // Fetch functions
    fetchGroups,
    fetchGroupMembers,
    fetchFlights,
    fetchFlightPassengers,
    fetchTransportation,
    fetchTransportationPassengers,
    fetchHotelAssignments,
    fetchTimeline,
    fetchAnalytics,
    fetchUtilization,

    // CRUD functions
    createTravelGroup,
    updateTravelGroup,
    deleteTravelGroup,
    createGroupMember,
    bulkCreateGroupMembers,
    autoCoordinateGroup
  }
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

export function useTravelGroups() {
  const { groups, groupsLoading, groupsError, fetchGroups, createTravelGroup, updateTravelGroup, deleteTravelGroup } = useTravelCoordination()
  return { groups, loading: groupsLoading, error: groupsError, fetchGroups, createTravelGroup, updateTravelGroup, deleteTravelGroup }
}

export function useTravelGroupMembers() {
  const { groupMembers, groupMembersLoading, groupMembersError, fetchGroupMembers, createGroupMember, bulkCreateGroupMembers } = useTravelCoordination()
  return { groupMembers, loading: groupMembersLoading, error: groupMembersError, fetchGroupMembers, createGroupMember, bulkCreateGroupMembers }
}

export function useFlightCoordination() {
  const { flights, flightsLoading, flightsError, fetchFlights } = useTravelCoordination()
  return { flights, loading: flightsLoading, error: flightsError, fetchFlights }
}

export function useTransportationCoordination() {
  const { transportation, transportationLoading, transportationError, fetchTransportation } = useTravelCoordination()
  return { transportation, loading: transportationLoading, error: transportationError, fetchTransportation }
}

export function useTravelAnalytics() {
  const { analytics, analyticsLoading, analyticsError, fetchAnalytics } = useTravelCoordination()
  return { analytics, loading: analyticsLoading, error: analyticsError, fetchAnalytics }
}

export function useTravelUtilization() {
  const { utilization, utilizationLoading, utilizationError, fetchUtilization } = useTravelCoordination()
  return { utilization, loading: utilizationLoading, error: utilizationError, fetchUtilization }
} 