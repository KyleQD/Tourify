import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface LodgingProvider {
  id: string
  name: string
  type: 'hotel' | 'motel' | 'resort' | 'apartment' | 'house' | 'airbnb' | 'hostel' | 'camping'
  address: string
  city: string
  state: string
  postal_code?: string
  country: string
  phone?: string
  email?: string
  website?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  amenities: string[]
  max_capacity?: number
  parking_available: boolean
  parking_spaces?: number
  wifi_available: boolean
  breakfast_included: boolean
  pool_available: boolean
  gym_available: boolean
  tax_id?: string
  payment_terms: string
  credit_limit: number
  preferred_vendor: boolean
  status: 'active' | 'inactive' | 'suspended' | 'blacklisted'
  rating: number
  total_bookings: number
  last_booking_date?: string
  notes?: string
  special_requirements?: string
  cancellation_policy?: string
  check_in_time: string
  check_out_time: string
  created_at: string
  updated_at: string
}

export interface LodgingRoomType {
  id: string
  provider_id: string
  name: string
  description?: string
  capacity: number
  bed_configuration?: string
  amenities: string[]
  base_rate: number
  weekend_rate?: number
  holiday_rate?: number
  group_rate?: number
  min_stay: number
  max_stay?: number
  available_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
  lodging_providers?: {
    name: string
    type: string
    city: string
    state: string
  }
}

export interface LodgingBooking {
  id: string
  booking_number: string
  event_id?: string
  tour_id?: string
  provider_id: string
  room_type_id: string
  check_in_date: string
  check_out_date: string
  check_in_time?: string
  check_out_time?: string
  rooms_booked: number
  guests_per_room: number
  total_guests: number
  primary_guest_name: string
  primary_guest_email?: string
  primary_guest_phone?: string
  special_requests?: string
  dietary_restrictions: string[]
  accessibility_needs: string[]
  rate_per_night: number
  total_nights: number
  subtotal: number
  tax_amount: number
  fees: number
  discount_amount: number
  total_amount: number
  deposit_amount: number
  paid_amount: number
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'overdue'
  booking_source: 'direct' | 'travel_agent' | 'online_travel_agent' | 'corporate' | 'group'
  confirmation_number?: string
  cancellation_policy?: string
  cancellation_deadline?: string
  assigned_by?: string
  managed_by?: string
  created_at: string
  updated_at: string
  lodging_providers?: {
    name: string
    type: string
    city: string
    state: string
  }
  lodging_room_types?: {
    name: string
    capacity: number
    bed_configuration?: string
  }
  events?: {
    name: string
  }
  tours?: {
    name: string
  }
}

export interface LodgingGuestAssignment {
  id: string
  booking_id: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  guest_type: 'crew' | 'artist' | 'staff' | 'vendor' | 'guest' | 'vip'
  staff_id?: string
  crew_member_id?: string
  team_member_id?: string
  room_number?: string
  bed_preference?: string
  roommate_preference?: string
  dietary_restrictions: string[]
  accessibility_needs: string[]
  special_requests?: string
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  actual_check_in?: string
  actual_check_out?: string
  check_in_notes?: string
  check_out_notes?: string
  created_at: string
  updated_at: string
  lodging_bookings?: {
    booking_number: string
    check_in_date: string
    check_out_date: string
  }
  staff_profiles?: {
    first_name: string
    last_name: string
  }
  venue_crew_members?: {
    name: string
  }
  venue_team_members?: {
    name: string
  }
}

export interface LodgingPayment {
  id: string
  booking_id: string
  payment_number: string
  payment_type: 'deposit' | 'partial' | 'final' | 'refund' | 'cancellation_fee'
  amount: number
  payment_method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'paypal' | 'corporate_account'
  transaction_id?: string
  payment_date: string
  processed_by?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  notes?: string
  created_at: string
  updated_at: string
  lodging_bookings?: {
    booking_number: string
    primary_guest_name: string
  }
  staff_profiles?: {
    first_name: string
    last_name: string
  }
}

export interface LodgingCalendarEvent {
  id: string
  booking_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  calendar_type: 'lodging' | 'transportation' | 'event' | 'crew'
  external_calendar_id?: string
  is_all_day: boolean
  reminder_minutes: number[]
  notification_sent: boolean
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  lodging_bookings?: {
    booking_number: string
    primary_guest_name: string
    lodging_providers?: {
      name: string
    }
  }
}

export interface LodgingAvailability {
  id: string
  provider_id: string
  room_type_id: string
  date_from: string
  date_to: string
  rooms_available: number
  rooms_reserved: number
  rooms_blocked: number
  base_rate?: number
  special_rate?: number
  rate_notes?: string
  is_blocked: boolean
  block_reason?: string
  blocked_by?: string
  created_at: string
  updated_at: string
  lodging_providers?: {
    name: string
    type: string
  }
  lodging_room_types?: {
    name: string
    capacity: number
    base_rate: number
  }
}

export interface LodgingAnalytics {
  month: string
  quarter: string
  year: string
  total_bookings: number
  unique_providers: number
  unique_events: number
  unique_tours: number
  total_revenue: number
  total_paid: number
  avg_booking_value: number
  total_nights: number
  total_guests: number
  avg_guests_per_booking: number
  confirmed_bookings: number
  active_bookings: number
  cancelled_bookings: number
  paid_bookings: number
  overdue_bookings: number
  active_providers: number
  avg_provider_rating: number
}

export interface LodgingUtilization {
  provider_id: string
  provider_name: string
  provider_type: string
  city: string
  state: string
  room_type_id: string
  room_type_name: string
  capacity: number
  base_rate: number
  total_availability_days: number
  total_rooms_available: number
  total_rooms_reserved: number
  total_rooms_blocked: number
  utilization_percentage: number
  total_bookings: number
  total_revenue: number
  avg_booking_value: number
  total_guests: number
  avg_guests_per_booking: number
}

// =============================================================================
// MAIN LODGING HOOK
// =============================================================================

export function useLodging() {
  const { toast } = useToast()
  
  // State for different data types
  const [providers, setProviders] = useState<LodgingProvider[]>([])
  const [roomTypes, setRoomTypes] = useState<LodgingRoomType[]>([])
  const [bookings, setBookings] = useState<LodgingBooking[]>([])
  const [guestAssignments, setGuestAssignments] = useState<LodgingGuestAssignment[]>([])
  const [payments, setPayments] = useState<LodgingPayment[]>([])
  const [calendarEvents, setCalendarEvents] = useState<LodgingCalendarEvent[]>([])
  const [availability, setAvailability] = useState<LodgingAvailability[]>([])
  const [analytics, setAnalytics] = useState<LodgingAnalytics[]>([])
  const [utilization, setUtilization] = useState<LodgingUtilization[]>([])

  // Loading states
  const [providersLoading, setProvidersLoading] = useState(false)
  const [roomTypesLoading, setRoomTypesLoading] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [guestAssignmentsLoading, setGuestAssignmentsLoading] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [utilizationLoading, setUtilizationLoading] = useState(false)

  // Error states
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [roomTypesError, setRoomTypesError] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [guestAssignmentsError, setGuestAssignmentsError] = useState<string | null>(null)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [calendarEventsError, setCalendarEventsError] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [utilizationError, setUtilizationError] = useState<string | null>(null)

  // =============================================================================
  // FETCH FUNCTIONS
  // =============================================================================

  const fetchProviders = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    provider_id?: string
  }) => {
    setProvidersLoading(true)
    setProvidersError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'providers',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

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

      setProviders(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching providers:', error)
      setProvidersError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch lodging providers",
        variant: "destructive"
      })
    } finally {
      setProvidersLoading(false)
    }
  }, [toast])

  const fetchRoomTypes = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    provider_id?: string
  }) => {
    setRoomTypesLoading(true)
    setRoomTypesError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'room_types',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setRoomTypes(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching room types:', error)
      setRoomTypesError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch room types",
        variant: "destructive"
      })
    } finally {
      setRoomTypesLoading(false)
    }
  }, [toast])

  const fetchBookings = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    provider_id?: string
    event_id?: string
    tour_id?: string
    date_from?: string
    date_to?: string
  }) => {
    setBookingsLoading(true)
    setBookingsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'bookings',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)
      if (params?.event_id) searchParams.append('event_id', params.event_id)
      if (params?.tour_id) searchParams.append('tour_id', params.tour_id)
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setBookings(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching bookings:', error)
      setBookingsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch lodging bookings",
        variant: "destructive"
      })
    } finally {
      setBookingsLoading(false)
    }
  }, [toast])

  const fetchGuestAssignments = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    provider_id?: string
  }) => {
    setGuestAssignmentsLoading(true)
    setGuestAssignmentsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'guest_assignments',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setGuestAssignments(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching guest assignments:', error)
      setGuestAssignmentsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch guest assignments",
        variant: "destructive"
      })
    } finally {
      setGuestAssignmentsLoading(false)
    }
  }, [toast])

  const fetchPayments = useCallback(async (params?: {
    limit?: number
    offset?: number
    status?: string
    provider_id?: string
  }) => {
    setPaymentsLoading(true)
    setPaymentsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'payments',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.status) searchParams.append('status', params.status)
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setPayments(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching payments:', error)
      setPaymentsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch lodging payments",
        variant: "destructive"
      })
    } finally {
      setPaymentsLoading(false)
    }
  }, [toast])

  const fetchCalendarEvents = useCallback(async (params?: {
    limit?: number
    offset?: number
    date_from?: string
    date_to?: string
  }) => {
    setCalendarEventsLoading(true)
    setCalendarEventsError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'calendar_events',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setCalendarEvents(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching calendar events:', error)
      setCalendarEventsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch calendar events",
        variant: "destructive"
      })
    } finally {
      setCalendarEventsLoading(false)
    }
  }, [toast])

  const fetchAvailability = useCallback(async (params?: {
    limit?: number
    offset?: number
    provider_id?: string
    date_from?: string
    date_to?: string
  }) => {
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    
    try {
      const searchParams = new URLSearchParams({
        type: 'availability',
        limit: params?.limit?.toString() || '50',
        offset: params?.offset?.toString() || '0'
      })
      
      if (params?.provider_id) searchParams.append('provider_id', params.provider_id)
      if (params?.date_from) searchParams.append('date_from', params.date_from)
      if (params?.date_to) searchParams.append('date_to', params.date_to)

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAvailability(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching availability:', error)
      setAvailabilityError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch availability",
        variant: "destructive"
      })
    } finally {
      setAvailabilityLoading(false)
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

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Analytics fetch failed:', response.status, response.statusText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setAnalytics(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching analytics:', error)
      setAnalyticsError(error.message)
      toast({
        title: "Error",
        description: "Failed to fetch lodging analytics",
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

      const response = await fetch(`/api/admin/lodging?${searchParams}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setUtilization(result.data || [])
    } catch (error: any) {
      console.error('[useLodging] Error fetching utilization:', error)
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

  const createProvider = useCallback(async (providerData: Partial<LodgingProvider>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_provider',
          ...providerData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Provider created successfully",
        variant: "default"
      })

      // Refresh providers list
      await fetchProviders()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error creating provider:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create provider",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchProviders, toast])

  const updateProvider = useCallback(async (id: string, providerData: Partial<LodgingProvider>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_provider',
          id,
          ...providerData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Provider updated successfully",
        variant: "default"
      })

      // Refresh providers list
      await fetchProviders()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error updating provider:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update provider",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchProviders, toast])

  const deleteProvider = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/lodging?action=delete_provider&id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Provider deleted successfully",
        variant: "default"
      })

      // Refresh providers list
      await fetchProviders()
    } catch (error: any) {
      console.error('[useLodging] Error deleting provider:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete provider",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchProviders, toast])

  const createBooking = useCallback(async (bookingData: Partial<LodgingBooking>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_booking',
          ...bookingData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Booking created successfully",
        variant: "default"
      })

      // Refresh bookings list
      await fetchBookings()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error creating booking:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchBookings, toast])

  const updateBooking = useCallback(async (id: string, bookingData: Partial<LodgingBooking>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_booking',
          id,
          ...bookingData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Booking updated successfully",
        variant: "default"
      })

      // Refresh bookings list
      await fetchBookings()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error updating booking:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchBookings, toast])

  const deleteBooking = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/lodging?action=delete_booking&id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Booking deleted successfully",
        variant: "default"
      })

      // Refresh bookings list
      await fetchBookings()
    } catch (error: any) {
      console.error('[useLodging] Error deleting booking:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchBookings, toast])

  const createGuestAssignment = useCallback(async (assignmentData: Partial<LodgingGuestAssignment>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_guest_assignment',
          ...assignmentData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Guest assignment created successfully",
        variant: "default"
      })

      // Refresh guest assignments list
      await fetchGuestAssignments()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error creating guest assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create guest assignment",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGuestAssignments, toast])

  const updateGuestAssignment = useCallback(async (id: string, assignmentData: Partial<LodgingGuestAssignment>) => {
    try {
      const response = await fetch('/api/admin/lodging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_guest_assignment',
          id,
          ...assignmentData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Guest assignment updated successfully",
        variant: "default"
      })

      // Refresh guest assignments list
      await fetchGuestAssignments()
      return result.data
    } catch (error: any) {
      console.error('[useLodging] Error updating guest assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update guest assignment",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGuestAssignments, toast])

  const deleteGuestAssignment = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/lodging?action=delete_guest_assignment&id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || "Guest assignment deleted successfully",
        variant: "default"
      })

      // Refresh guest assignments list
      await fetchGuestAssignments()
    } catch (error: any) {
      console.error('[useLodging] Error deleting guest assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete guest assignment",
        variant: "destructive"
      })
      throw error
    }
  }, [fetchGuestAssignments, toast])

  // =============================================================================
  // INITIAL DATA LOADING
  // =============================================================================

  useEffect(() => {
    // Load initial data
    fetchProviders()
    fetchBookings()
    fetchAnalytics()
    fetchUtilization()
  }, [fetchProviders, fetchBookings, fetchAnalytics, fetchUtilization])

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProviders()
      fetchBookings()
      fetchAnalytics()
      fetchUtilization()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchProviders, fetchBookings, fetchAnalytics, fetchUtilization])

  // =============================================================================
  // RETURN OBJECT
  // =============================================================================

  return {
    // Data
    providers,
    roomTypes,
    bookings,
    guestAssignments,
    payments,
    calendarEvents,
    availability,
    analytics,
    utilization,

    // Loading states
    providersLoading,
    roomTypesLoading,
    bookingsLoading,
    guestAssignmentsLoading,
    paymentsLoading,
    calendarEventsLoading,
    availabilityLoading,
    analyticsLoading,
    utilizationLoading,

    // Error states
    providersError,
    roomTypesError,
    bookingsError,
    guestAssignmentsError,
    paymentsError,
    calendarEventsError,
    availabilityError,
    analyticsError,
    utilizationError,

    // Fetch functions
    fetchProviders,
    fetchRoomTypes,
    fetchBookings,
    fetchGuestAssignments,
    fetchPayments,
    fetchCalendarEvents,
    fetchAvailability,
    fetchAnalytics,
    fetchUtilization,

    // CRUD functions
    createProvider,
    updateProvider,
    deleteProvider,
    createBooking,
    updateBooking,
    deleteBooking,
    createGuestAssignment,
    updateGuestAssignment,
    deleteGuestAssignment
  }
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

export function useLodgingProviders() {
  const { providers, providersLoading, providersError, fetchProviders, createProvider, updateProvider, deleteProvider } = useLodging()
  return { providers, loading: providersLoading, error: providersError, fetchProviders, createProvider, updateProvider, deleteProvider }
}

export function useLodgingBookings() {
  const { bookings, bookingsLoading, bookingsError, fetchBookings, createBooking, updateBooking, deleteBooking } = useLodging()
  return { bookings, loading: bookingsLoading, error: bookingsError, fetchBookings, createBooking, updateBooking, deleteBooking }
}

export function useLodgingGuestAssignments() {
  const { guestAssignments, guestAssignmentsLoading, guestAssignmentsError, fetchGuestAssignments, createGuestAssignment, updateGuestAssignment, deleteGuestAssignment } = useLodging()
  return { guestAssignments, loading: guestAssignmentsLoading, error: guestAssignmentsError, fetchGuestAssignments, createGuestAssignment, updateGuestAssignment, deleteGuestAssignment }
}

export function useLodgingAnalytics() {
  const { analytics, analyticsLoading, analyticsError, fetchAnalytics } = useLodging()
  return { analytics, loading: analyticsLoading, error: analyticsError, fetchAnalytics }
}

export function useLodgingUtilization() {
  const { utilization, utilizationLoading, utilizationError, fetchUtilization } = useLodging()
  return { utilization, loading: utilizationLoading, error: utilizationError, fetchUtilization }
} 