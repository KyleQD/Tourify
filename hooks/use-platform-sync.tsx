import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { useRealTimeCommunications } from './use-real-time-communications'
import { createCommunicationsClient, createAnalyticsClient, SupabasePerformanceMonitor } from '@/lib/supabase/optimized-client'
import { useAuth } from '@/lib/auth/role-based-auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// UNIFIED PLATFORM DATA TYPES
// =============================================================================

export interface Tour {
  id: string
  name: string
  description?: string
  artist_id: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  start_date?: string
  end_date?: string
  total_shows: number
  completed_shows: number
  budget: number
  expenses: number
  revenue: number
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  tour_id?: string
  venue_id?: string
  venue_name?: string
  event_date: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  capacity: number
  tickets_sold: number
  expected_revenue: number
  actual_revenue: number
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  department?: string
  status: 'active' | 'inactive' | 'on_leave'
  tour_id?: string
  event_id?: string
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  venue_name: string
  city?: string
  state?: string
  capacity?: number
  venue_types: string[]
  verification_status: 'verified' | 'pending' | 'unverified'
  created_at: string
  updated_at: string
}

export interface PlatformAnalytics {
  tours: {
    total: number
    active: number
    completed: number
    revenue_total: number
  }
  events: {
    total: number
    upcoming: number
    completed: number
    capacity_utilization: number
  }
  staff: {
    total: number
    active: number
    departments: Record<string, number>
  }
  communications: {
    channels: number
    messages_today: number
    active_users: number
  }
}

// =============================================================================
// PLATFORM STATE INTERFACE
// =============================================================================

export interface PlatformState {
  tours: Tour[]
  events: Event[]
  staff: StaffMember[]
  venues: Venue[]
  analytics: PlatformAnalytics
  
  // Real-time status
  isConnected: boolean
  lastUpdate?: Date
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  
  // Performance metrics
  queryLatency: number
  subscriptionCount: number
  activeUsers: string[]
}

// =============================================================================
// SYNCHRONIZATION CONTEXT
// =============================================================================

interface PlatformSyncContextType extends PlatformState {
  // Data operations
  refreshTours: () => Promise<void>
  refreshEvents: () => Promise<void>
  refreshStaff: () => Promise<void>
  refreshVenues: () => Promise<void>
  refreshAnalytics: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // Real-time subscriptions
  subscribeTo: (tables: string[]) => void
  unsubscribeFrom: (tables: string[]) => void
  
  // Filtered data getters
  getTourEvents: (tourId: string) => Event[]
  getTourStaff: (tourId: string) => StaffMember[]
  getEventStaff: (eventId: string) => StaffMember[]
  getVenueEvents: (venueId: string) => Event[]
  
  // Performance monitoring
  getPerformanceStats: () => any
  resetPerformanceStats: () => void
}

const PlatformSyncContext = createContext<PlatformSyncContextType>({} as PlatformSyncContextType)

// =============================================================================
// PLATFORM SYNC PROVIDER
// =============================================================================

interface PlatformSyncProviderProps {
  children: React.ReactNode
  autoConnect?: boolean
  subscriptions?: string[]
}

export function PlatformSyncProvider({ 
  children, 
  autoConnect = true, 
  subscriptions = ['tours', 'events', 'staff', 'venues'] 
}: PlatformSyncProviderProps) {
  // Auth context
  const { user, permissions, hasPermission } = useAuth()
  
  // Platform state
  const [platformState, setPlatformState] = useState<PlatformState>({
    tours: [],
    events: [],
    staff: [],
    venues: [],
    analytics: {
      tours: { total: 0, active: 0, completed: 0, revenue_total: 0 },
      events: { total: 0, upcoming: 0, completed: 0, capacity_utilization: 0 },
      staff: { total: 0, active: 0, departments: {} },
      communications: { channels: 0, messages_today: 0, active_users: 0 }
    },
    isConnected: false,
    connectionQuality: 'disconnected',
    queryLatency: 0,
    subscriptionCount: 0,
    activeUsers: []
  })
  
  // Clients and subscriptions
  const clientsRef = useRef({
    communications: createCommunicationsClient(),
    analytics: createAnalyticsClient()
  })
  const subscriptionsRef = useRef<RealtimeChannel[]>([])
  
  // Communication system integration
  const communicationSystem = useRealTimeCommunications({
    enablePresence: true,
    autoReconnect: true
  })

  // =============================================================================
  // DATA FETCHING OPERATIONS
  // =============================================================================

  const refreshTours = useCallback(async () => {
    if (!hasPermission('tours.view')) return
    
    const startTime = Date.now()
    try {
      const { data, error } = await clientsRef.current.communications
        .from('tours')
        .select(`
          id, name, description, artist_id, status,
          start_date, end_date, total_shows, completed_shows,
          budget, expenses, revenue, created_at, updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPlatformState(prev => ({
        ...prev,
        tours: (data as Tour[]) || [],
        lastUpdate: new Date()
      }))

      SupabasePerformanceMonitor.trackQuery('refreshTours', startTime)
    } catch (error) {
      console.error('Error refreshing tours:', error)
    }
  }, [hasPermission])

  const refreshEvents = useCallback(async () => {
    if (!hasPermission('events.view')) return
    
    const startTime = Date.now()
    try {
      const { data, error } = await clientsRef.current.communications
        .from('events')
        .select(`
          id, name, tour_id, venue_id, venue_name,
          event_date, status, capacity, tickets_sold,
          expected_revenue, actual_revenue, created_at, updated_at
        `)
        .order('event_date', { ascending: true })

      if (error) throw error

      setPlatformState(prev => ({
        ...prev,
        events: (data as Event[]) || [],
        lastUpdate: new Date()
      }))

      SupabasePerformanceMonitor.trackQuery('refreshEvents', startTime)
    } catch (error) {
      console.error('Error refreshing events:', error)
    }
  }, [hasPermission])

  const refreshStaff = useCallback(async () => {
    if (!hasPermission('staff.view')) return
    
    const startTime = Date.now()
    try {
      // This would need to be adapted based on your actual staff table structure
      const { data, error } = await clientsRef.current.communications
        .from('venue_team_members') // Using existing table as example
        .select(`
          id, name, role, department, status,
          created_at, updated_at
        `)

      if (error) throw error

      const staffMembers: StaffMember[] = ((data as any[]) || []).map(member => ({
        id: member.id,
        name: member.name,
        role: member.role,
        department: member.department,
        status: member.status,
        created_at: member.created_at,
        updated_at: member.updated_at
      }))

      setPlatformState(prev => ({
        ...prev,
        staff: staffMembers,
        lastUpdate: new Date()
      }))

      SupabasePerformanceMonitor.trackQuery('refreshStaff', startTime)
    } catch (error) {
      console.error('Error refreshing staff:', error)
    }
  }, [hasPermission])

  const refreshVenues = useCallback(async () => {
    const startTime = Date.now()
    try {
      const { data, error } = await clientsRef.current.communications
        .from('venue_profiles')
        .select(`
          id, venue_name, city, state, capacity,
          venue_types, verification_status,
          created_at, updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPlatformState(prev => ({
        ...prev,
        venues: (data as Venue[]) || [],
        lastUpdate: new Date()
      }))

      SupabasePerformanceMonitor.trackQuery('refreshVenues', startTime)
    } catch (error) {
      console.error('Error refreshing venues:', error)
    }
  }, [])

  const refreshAnalytics = useCallback(async () => {
    if (!hasPermission('analytics.view')) return
    
    const startTime = Date.now()
    try {
      // Aggregate analytics from multiple sources
      const [toursData, eventsData, staffData] = await Promise.all([
        clientsRef.current.analytics
          .from('tours')
          .select('id, status, revenue, expenses'),
        clientsRef.current.analytics
          .from('events')
          .select('id, status, capacity, tickets_sold'),
        clientsRef.current.analytics
          .from('venue_team_members')
          .select('id, status, department')
      ])

      // Calculate analytics
      const tourStats = {
        total: (toursData.data as any[])?.length || 0,
        active: (toursData.data as any[])?.filter(t => t.status === 'active').length || 0,
        completed: (toursData.data as any[])?.filter(t => t.status === 'completed').length || 0,
        revenue_total: (toursData.data as any[])?.reduce((sum, t) => sum + (t.revenue || 0), 0) || 0
      }

      const eventStats = {
        total: (eventsData.data as any[])?.length || 0,
        upcoming: (eventsData.data as any[])?.filter(e => e.status === 'scheduled').length || 0,
        completed: (eventsData.data as any[])?.filter(e => e.status === 'completed').length || 0,
        capacity_utilization: (eventsData.data as any[])?.length > 0 
          ? (eventsData.data as any[]).reduce((sum, e) => sum + (e.tickets_sold / e.capacity), 0) / (eventsData.data as any[]).length 
          : 0
      }

      const staffStats = {
        total: (staffData.data as any[])?.length || 0,
        active: (staffData.data as any[])?.filter(s => s.status === 'active').length || 0,
        departments: (staffData.data as any[])?.reduce((acc, s) => {
          if (s.department) {
            acc[s.department] = (acc[s.department] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>) || {}
      }

      setPlatformState(prev => ({
        ...prev,
        analytics: {
          tours: tourStats,
          events: eventStats,
          staff: staffStats,
          communications: {
            channels: communicationSystem.channels.length,
            messages_today: communicationSystem.messages.filter(
              m => new Date(m.created_at) > new Date(Date.now() - 24*60*60*1000)
            ).length,
            active_users: communicationSystem.onlineUsers.length
          }
        },
        lastUpdate: new Date()
      }))

      SupabasePerformanceMonitor.trackQuery('refreshAnalytics', startTime)
    } catch (error) {
      console.error('Error refreshing analytics:', error)
    }
  }, [hasPermission, communicationSystem])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshTours(),
      refreshEvents(),
      refreshStaff(),
      refreshVenues(),
      refreshAnalytics()
    ])
  }, [refreshTours, refreshEvents, refreshStaff, refreshVenues, refreshAnalytics])

  // =============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================================================

  const setupRealTimeSubscriptions = useCallback(() => {
    if (!user) return

    // Clear existing subscriptions
    subscriptionsRef.current.forEach(channel => {
      clientsRef.current.communications.removeChannel(channel)
    })
    subscriptionsRef.current = []

    subscriptions.forEach(tableName => {
      const channel = clientsRef.current.communications
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            
            // Update local state based on the change
            if (tableName === 'tours') refreshTours()
            else if (tableName === 'events') refreshEvents()
            else if (tableName === 'venue_team_members') refreshStaff()
            else if (tableName === 'venue_profiles') refreshVenues()
            
            // Update connection quality based on response time
            const now = Date.now()
            const latency = now - (payload.commit_timestamp ? new Date(payload.commit_timestamp).getTime() : now)
            
            setPlatformState(prev => ({
              ...prev,
              queryLatency: latency,
              connectionQuality: latency < 100 ? 'excellent' : latency < 500 ? 'good' : 'poor',
              lastUpdate: new Date()
            }))
          }
        )
        .subscribe()

      subscriptionsRef.current.push(channel)
    })

    setPlatformState(prev => ({
      ...prev,
      subscriptionCount: subscriptionsRef.current.length,
      isConnected: true
    }))
  }, [user, subscriptions, refreshTours, refreshEvents, refreshStaff, refreshVenues])

  const subscribeTo = useCallback((tables: string[]) => {
    tables.forEach(table => {
      if (!subscriptions.includes(table)) {
        subscriptions.push(table)
      }
    })
    setupRealTimeSubscriptions()
  }, [subscriptions, setupRealTimeSubscriptions])

  const unsubscribeFrom = useCallback((tables: string[]) => {
    tables.forEach(table => {
      const index = subscriptions.indexOf(table)
      if (index > -1) {
        subscriptions.splice(index, 1)
      }
    })
    setupRealTimeSubscriptions()
  }, [subscriptions, setupRealTimeSubscriptions])

  // =============================================================================
  // DATA FILTERING UTILITIES
  // =============================================================================

  const getTourEvents = useCallback((tourId: string) => {
    return platformState.events.filter(event => event.tour_id === tourId)
  }, [platformState.events])

  const getTourStaff = useCallback((tourId: string) => {
    return platformState.staff.filter(staff => staff.tour_id === tourId)
  }, [platformState.staff])

  const getEventStaff = useCallback((eventId: string) => {
    return platformState.staff.filter(staff => staff.event_id === eventId)
  }, [platformState.staff])

  const getVenueEvents = useCallback((venueId: string) => {
    return platformState.events.filter(event => event.venue_id === venueId)
  }, [platformState.events])

  // =============================================================================
  // PERFORMANCE MONITORING
  // =============================================================================

  const getPerformanceStats = useCallback(() => {
    return {
      ...SupabasePerformanceMonitor.getPerformanceStats(),
      platform: {
        connectionQuality: platformState.connectionQuality,
        queryLatency: platformState.queryLatency,
        subscriptionCount: platformState.subscriptionCount,
        lastUpdate: platformState.lastUpdate,
        dataFreshness: platformState.lastUpdate 
          ? Date.now() - platformState.lastUpdate.getTime() 
          : null
      }
    }
  }, [platformState])

  const resetPerformanceStats = useCallback(() => {
    SupabasePerformanceMonitor.resetStats()
  }, [])

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initialize data and subscriptions
  useEffect(() => {
    if (autoConnect && user) {
      refreshAll()
      setupRealTimeSubscriptions()
    }

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach(channel => {
        clientsRef.current.communications.removeChannel(channel)
      })
    }
  }, [autoConnect, user, refreshAll, setupRealTimeSubscriptions])

  // Sync with communication system
  useEffect(() => {
    setPlatformState(prev => ({
      ...prev,
      activeUsers: communicationSystem.onlineUsers,
      isConnected: communicationSystem.isConnected && prev.isConnected
    }))
  }, [communicationSystem.onlineUsers, communicationSystem.isConnected])

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: PlatformSyncContextType = {
    ...platformState,
    refreshTours,
    refreshEvents,
    refreshStaff,
    refreshVenues,
    refreshAnalytics,
    refreshAll,
    subscribeTo,
    unsubscribeFrom,
    getTourEvents,
    getTourStaff,
    getEventStaff,
    getVenueEvents,
    getPerformanceStats,
    resetPerformanceStats
  }

  return (
    <PlatformSyncContext.Provider value={contextValue}>
      {children}
    </PlatformSyncContext.Provider>
  )
}

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

export function usePlatformSync() {
  const context = useContext(PlatformSyncContext)
  if (!context) {
    throw new Error('usePlatformSync must be used within a PlatformSyncProvider')
  }
  return context
}

// Specialized hooks for different data types
export function useTours() {
  const { tours, refreshTours, getTourEvents, getTourStaff } = usePlatformSync()
  return { tours, refreshTours, getTourEvents, getTourStaff }
}

export function useEvents() {
  const { events, refreshEvents, getEventStaff } = usePlatformSync()
  return { events, refreshEvents, getEventStaff }
}

export function useStaff() {
  const { staff, refreshStaff } = usePlatformSync()
  return { staff, refreshStaff }
}

export function useVenues() {
  const { venues, refreshVenues, getVenueEvents } = usePlatformSync()
  return { venues, refreshVenues, getVenueEvents }
}

export function usePlatformAnalytics() {
  const { analytics, refreshAnalytics, getPerformanceStats } = usePlatformSync()
  return { analytics, refreshAnalytics, getPerformanceStats }
}

// Hook for real-time status monitoring
export function usePlatformStatus() {
  const { 
    isConnected, 
    connectionQuality, 
    queryLatency, 
    subscriptionCount, 
    activeUsers,
    lastUpdate 
  } = usePlatformSync()
  
  return {
    isConnected,
    connectionQuality,
    queryLatency,
    subscriptionCount,
    activeUsers,
    lastUpdate,
    isHealthy: isConnected && connectionQuality !== 'poor' && queryLatency < 1000
  }
}

// Hook for cross-feature synchronization
export function useCrossFeatureSync(tourId?: string, eventId?: string) {
  const { getTourEvents, getTourStaff, getEventStaff, refreshAll } = usePlatformSync()
  
  const tourData = tourId ? {
    events: getTourEvents(tourId),
    staff: getTourStaff(tourId)
  } : null
  
  const eventData = eventId ? {
    staff: getEventStaff(eventId)
  } : null
  
  return {
    tourData,
    eventData,
    refreshAll,
    isStale: (threshold = 30000) => {
      const { lastUpdate } = usePlatformSync()
      return !lastUpdate || Date.now() - lastUpdate.getTime() > threshold
    }
  }
}


