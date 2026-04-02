import { supabase } from '@/lib/supabase/client'
import type { 
  VenueProfile, 
  VenueBookingRequest, 
  VenueDocument, 
  VenueTeamMember,
  VenueEquipment,
  VenueReview,
  VenueAnalytics,
  VenueDashboardStats,
  VenueBookingRequestCreateData,
  VenueDocumentCreateData,
  VenueTeamMemberCreateData
} from '@/types/database.types'

class VenueService {
  private supabase = supabase
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private getCacheKey(key: string): string {
    return `venue_${key}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(this.getCacheKey(key))
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T
    }
    this.cache.delete(this.getCacheKey(key))
    return null
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(this.getCacheKey(key), { data, timestamp: Date.now() })
  }

  // =============================================================================
  // VENUE PROFILE METHODS
  // =============================================================================

  async getVenueProfile(venueId: string): Promise<VenueProfile | null> {
    try {
      const cached = this.getFromCache<VenueProfile>(`profile_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_profiles')
        .select('*')
        .eq('id', venueId)
        .single()

      if (error) {
        console.error('Error fetching venue profile:', error)
        return null
      }

      this.setCache(`profile_${venueId}`, data)
      return data
    } catch (error) {
      console.error('Error in getVenueProfile:', error)
      return null
    }
  }

  // Get all venues for the current user
  async getAllUserVenues(): Promise<VenueProfile[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const cached = this.getFromCache<VenueProfile[]>(`user_venues_${user.id}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_profiles')
        .select('*')
        .or(`user_id.eq.${user.id},main_profile_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user venues:', error)
        return []
      }

      const venues = data || []
      this.setCache(`user_venues_${user.id}`, venues)
      return venues
    } catch (error) {
      console.error('Error in getAllUserVenues:', error)
      return []
    }
  }

  // Get current venue (or first venue if multiple exist)
  async getCurrentUserVenue(): Promise<VenueProfile | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return null

      // First check if user has selected a specific venue
      const activeVenueId = this.getActiveVenueId()
      if (activeVenueId) {
        const venue = await this.getVenueProfile(activeVenueId)
        if (venue) {
          return venue
        }
      }

      // Otherwise get the first venue
      const venues = await this.getAllUserVenues()
      return venues[0] || null
    } catch (error) {
      console.error('Error in getCurrentUserVenue:', error)
      return null
    }
  }

  // Get/Set active venue ID for multi-venue users
  private activeVenueId: string | null = null

  setCurrentVenueId(venueId: string): void {
    this.activeVenueId = venueId
    // Also store in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_venue_id', venueId)
    }
  }

  getActiveVenueId(): string | null {
    if (this.activeVenueId) {
      return this.activeVenueId
    }
    // Try to get from sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('active_venue_id')
      if (stored) {
        this.activeVenueId = stored
        return stored
      }
    }
    return null
  }

  clearActiveVenueId(): void {
    this.activeVenueId = null
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_venue_id')
    }
  }

  async updateVenueProfile(venueId: string, updates: Partial<VenueProfile>): Promise<VenueProfile | null> {
    try {
      // Filter out any undefined values and only include valid database fields
      const validFields = [
        'venue_name', 'description', 'address', 'city', 'state', 'country', 
        'postal_code', 'capacity', 'venue_types', 'contact_info', 'social_links',
        'verification_status', 'account_tier', 'settings', 'avatar_url', 'cover_image_url'
      ]
      
      const cleanUpdates: any = {}
      for (const [key, value] of Object.entries(updates)) {
        if (validFields.includes(key) && value !== undefined) {
          cleanUpdates[key] = value
        }
      }
      
      // Add updated timestamp
      cleanUpdates.updated_at = new Date().toISOString()
      
      console.log('Sending to database:', cleanUpdates)

      const { data, error } = await this.supabase
        .from('venue_profiles')
        .update(cleanUpdates)
        .eq('id', venueId)
        .select()
        .single()

      if (error) {
        console.error('Error updating venue profile:', error)
        throw new Error(`Failed to update venue profile: ${error.message}`)
      }

      // Clear cache
      this.cache.delete(this.getCacheKey(`profile_${venueId}`))
      
      return data
    } catch (error) {
      console.error('Error in updateVenueProfile:', error)
      throw error
    }
  }

  // =============================================================================
  // IMAGE UPLOAD METHODS
  // =============================================================================

  async updateVenueAvatar(venueId: string, avatarUrl: string): Promise<void> {
    try {
      await this.updateVenueProfile(venueId, { avatar_url: avatarUrl })
    } catch (error) {
      console.error('Error updating venue avatar:', error)
      throw error
    }
  }

  async updateVenueCoverImage(venueId: string, coverImageUrl: string): Promise<void> {
    try {
      await this.updateVenueProfile(venueId, { cover_image_url: coverImageUrl })
    } catch (error) {
      console.error('Error updating venue cover image:', error)
      throw error
    }
  }

  // =============================================================================
  // DASHBOARD STATS METHODS
  // =============================================================================

  async getVenueDashboardStats(venueId: string): Promise<VenueDashboardStats> {
    try {
      const cached = this.getFromCache<VenueDashboardStats>(`stats_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .rpc('get_venue_dashboard_stats', { p_venue_id: venueId })

      if (!error && data) {
        this.setCache(`stats_${venueId}`, data)
        return data
      }

      console.error('Error fetching venue stats:', error)

      // Fallback stats from direct tables when RPC is unavailable
      const nowIso = new Date().toISOString()
      const [approvedBookings, pendingRequests, reviewStats, teamMembers, eventsV2Count, legacyEventsCount] =
        await Promise.all([
          this.supabase
            .from('venue_booking_requests')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', venueId)
            .eq('status', 'approved'),
          this.supabase
            .from('venue_booking_requests')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', venueId)
            .eq('status', 'pending'),
          this.supabase
            .from('venue_reviews')
            .select('rating')
            .eq('venue_id', venueId),
          this.supabase
            .from('venue_team_members')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', venueId)
            .eq('status', 'active'),
          this.supabase
            .from('events_v2')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', venueId)
            .gte('start_at', nowIso),
          this.supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', venueId)
            .gte('start_date', nowIso),
        ])

      const ratings = reviewStats.data || []
      const averageRating =
        ratings.length > 0
          ? Number((ratings.reduce((sum, r: any) => sum + (Number(r.rating) || 0), 0) / ratings.length).toFixed(2))
          : 0

      const fallbackStats: VenueDashboardStats = {
        totalBookings: approvedBookings.count || 0,
        pendingRequests: pendingRequests.count || 0,
        thisMonthRevenue: 0,
        averageRating,
        totalReviews: ratings.length,
        teamMembers: teamMembers.count || 0,
        upcomingEvents: (eventsV2Count.count || 0) + (legacyEventsCount.count || 0),
      }

      this.setCache(`stats_${venueId}`, fallbackStats)
      return fallbackStats
    } catch (error) {
      console.error('Error in getVenueDashboardStats:', error)
      return {
        totalBookings: 0,
        pendingRequests: 0,
        thisMonthRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
        teamMembers: 0,
        upcomingEvents: 0
      }
    }
  }

  // =============================================================================
  // BOOKING REQUESTS METHODS
  // =============================================================================

  async getVenueBookingRequests(venueId: string): Promise<VenueBookingRequest[]> {
    try {
      const cached = this.getFromCache<VenueBookingRequest[]>(`bookings_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_booking_requests')
        .select('*')
        .eq('venue_id', venueId)
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error fetching booking requests:', error)
        return []
      }

      this.setCache(`bookings_${venueId}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueBookingRequests:', error)
      return []
    }
  }

  async createBookingRequest(data: VenueBookingRequestCreateData): Promise<VenueBookingRequest | null> {
    try {
      const { data: booking, error } = await this.supabase
        .from('venue_booking_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error creating booking request:', error)
        throw new Error(`Failed to create booking request: ${error.message}`)
      }

      // Clear cache
      this.cache.delete(this.getCacheKey(`bookings_${data.venue_id}`))

      return booking
    } catch (error) {
      console.error('Error in createBookingRequest:', error)
      throw error
    }
  }

  async respondToBookingRequest(requestId: string, status: 'approved' | 'rejected', message?: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('respond_to_booking_request', {
          p_request_id: requestId,
          p_status: status,
          p_response_message: message
        })

      if (error) {
        console.error('Error responding to booking request:', error)
        throw new Error(`Failed to respond to booking request: ${error.message}`)
      }

      // Clear booking requests cache for all venues (we don't know which venue this belongs to)
      for (const [key] of this.cache) {
        if (key.includes('bookings_')) {
          this.cache.delete(key)
        }
      }

      return data
    } catch (error) {
      console.error('Error in respondToBookingRequest:', error)
      throw error
    }
  }

  // =============================================================================
  // DOCUMENTS METHODS
  // =============================================================================

  async getVenueDocuments(venueId: string): Promise<VenueDocument[]> {
    try {
      const cached = this.getFromCache<VenueDocument[]>(`documents_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_documents')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching venue documents:', error)
        return []
      }

      this.setCache(`documents_${venueId}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueDocuments:', error)
      return []
    }
  }

  async createDocument(data: VenueDocumentCreateData): Promise<VenueDocument | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      const { data: document, error } = await this.supabase
        .from('venue_documents')
        .insert([{ ...data, uploaded_by: user?.id }])
        .select()
        .single()

      if (error) {
        console.error('Error creating document:', error)
        throw new Error(`Failed to create document: ${error.message}`)
      }

      // Clear cache
      this.cache.delete(this.getCacheKey(`documents_${data.venue_id}`))

      return document
    } catch (error) {
      console.error('Error in createDocument:', error)
      throw error
    }
  }

  // =============================================================================
  // TEAM MEMBERS METHODS
  // =============================================================================

  async getVenueTeamMembers(venueId: string): Promise<VenueTeamMember[]> {
    try {
      const cached = this.getFromCache<VenueTeamMember[]>(`team_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_team_members')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching team members:', error)
        return []
      }

      this.setCache(`team_${venueId}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueTeamMembers:', error)
      return []
    }
  }

  async addTeamMember(data: VenueTeamMemberCreateData): Promise<VenueTeamMember | null> {
    try {
      const { data: member, error } = await this.supabase
        .from('venue_team_members')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding team member:', error)
        throw new Error(`Failed to add team member: ${error.message}`)
      }

      // Clear cache
      this.cache.delete(this.getCacheKey(`team_${data.venue_id}`))

      return member
    } catch (error) {
      console.error('Error in addTeamMember:', error)
      throw error
    }
  }

  // =============================================================================
  // UPCOMING EVENTS METHODS
  // =============================================================================

  async getUpcomingEvents(venueId: string): Promise<any[]> {
    try {
      const cached = this.getFromCache<any[]>(`upcoming_${venueId}`)
      if (cached) return cached

      const nowIso = new Date().toISOString()
      const { data: v2Data, error: v2Error } = await this.supabase
        .from('events_v2')
        .select('id, title, start_at, end_at, status, venue_id, settings')
        .eq('venue_id', venueId)
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(10)

      if (!v2Error && v2Data) {
        const normalizedV2Events = v2Data.map((event: any) => ({
          ...event,
          date: event.start_at,
          event_table: 'events_v2'
        }))
        this.setCache(`upcoming_${venueId}`, normalizedV2Events)
        return normalizedV2Events
      }

      const { data, error } = await this.supabase
        .from('events')
        .select(`
          *,
          venue_booking_requests!inner(venue_id)
        `)
        .eq('venue_booking_requests.venue_id', venueId)
        .gte('start_date', nowIso)
        .order('start_date', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error fetching upcoming events:', v2Error || error)
        return []
      }

      const normalizedLegacyEvents = (data || []).map((event: any) => ({
        ...event,
        date: event.date || event.start_date || event.event_date || null,
        event_table: 'events'
      }))
      this.setCache(`upcoming_${venueId}`, normalizedLegacyEvents)
      return normalizedLegacyEvents
    } catch (error) {
      console.error('Error in getUpcomingEvents:', error)
      return []
    }
  }

  // =============================================================================
  // BOOKINGS CALENDAR METHODS
  // =============================================================================

  /**
   * Fetch confirmed booking requests for a venue within a date range to power the calendar
   */
  async getConfirmedBookingsByRange(
    venueId: string,
    rangeStartIso: string,
    rangeEndIso: string
  ): Promise<VenueBookingRequest[]> {
    try {
      const cacheKey = `confirmed_bookings_${venueId}_${rangeStartIso}_${rangeEndIso}`
      const cached = this.getFromCache<VenueBookingRequest[]>(cacheKey)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_booking_requests')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'approved')
        .gte('event_date', rangeStartIso)
        .lte('event_date', rangeEndIso)
        .order('event_date', { ascending: true })

      if (error) {
        console.error('Error fetching confirmed bookings range:', error)
        return []
      }

      this.setCache(cacheKey, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getConfirmedBookingsByRange:', error)
      return []
    }
  }

  /**
   * Fetch venue-created events (internal or public) for calendar within range
   * Requires events.venue_id column (added by migration 20250813120000) or falls back to created_by
   */
  async getVenueEventsByRange(
    venueId: string,
    rangeStartIso: string,
    rangeEndIso: string
  ): Promise<any[]> {
    try {
      const cacheKey = `venue_events_${venueId}_${rangeStartIso}_${rangeEndIso}`
      const cached = this.getFromCache<any[]>(cacheKey)
      if (cached) return cached

      const { data: v2Data, error: v2Error } = await this.supabase
        .from('events_v2')
        .select('id, title, start_at, end_at, status, venue_id, settings')
        .eq('venue_id', venueId)
        .gte('start_at', rangeStartIso)
        .lte('start_at', rangeEndIso)
        .order('start_at', { ascending: true })

      let legacyData: any[] = []
      let legacyError: any = null
      const legacyDateQuery = await this.supabase
        .from('events')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', rangeStartIso)
        .lte('date', rangeEndIso)
        .order('date', { ascending: true })

      if (legacyDateQuery.error) {
        const legacyStartDateQuery = await this.supabase
          .from('events')
          .select('*')
          .eq('venue_id', venueId)
          .gte('start_date', rangeStartIso)
          .lte('start_date', rangeEndIso)
          .order('start_date', { ascending: true })
        legacyData = legacyStartDateQuery.data || []
        legacyError = legacyStartDateQuery.error
      } else {
        legacyData = legacyDateQuery.data || []
      }

      if (v2Error && legacyError) {
        console.error('Error fetching venue events range:', v2Error, legacyError)
        return []
      }

      const normalizedV2Events = (v2Data || []).map((event: any) => ({
        ...event,
        date: event.start_at,
        event_table: 'events_v2'
      }))

      const normalizedLegacyEvents = legacyData.map((event: any) => ({
        ...event,
        title: event.title || event.name || 'Event',
        date: event.date || event.start_date || event.event_date || null,
        event_table: 'events'
      }))

      const combinedEvents = [...normalizedV2Events, ...normalizedLegacyEvents].sort((a, b) => {
        const firstTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER
        const secondTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER
        return firstTime - secondTime
      })

      this.setCache(cacheKey, combinedEvents)
      return combinedEvents
    } catch (error) {
      console.error('Error in getVenueEventsByRange:', error)
      return []
    }
  }

  // =============================================================================
  // RECURRING EVENTS / SLOTS
  // =============================================================================

  async createRecurringTemplate(params: {
    venueId: string
    title: string
    genre?: string
    weekday: number
    startTime: string
    durationMinutes: number
    startDate: string
    endDate?: string
    capacity?: number
  }) {
    const { error } = await this.supabase.from('venue_recurring_templates').insert({
      venue_id: params.venueId,
      title: params.title,
      genre: params.genre,
      weekday: params.weekday,
      start_time: params.startTime,
      duration_minutes: params.durationMinutes,
      start_date: params.startDate,
      end_date: params.endDate ?? null,
      capacity: params.capacity ?? null
    })
    if (error) throw new Error(error.message)
  }

  async generateSlotsForTemplate(templateId: string, fromIso: string, toIso: string): Promise<number> {
    const from = fromIso.split('T')[0]
    const to = toIso.split('T')[0]
    const { data, error } = await this.supabase.rpc('generate_slots_for_template', { p_template_id: templateId, p_from: from, p_to: to })
    if (error) throw new Error(error.message)
    return data as number
  }

  async listOpenSlotsByRange(venueId: string, rangeStartIso: string, rangeEndIso: string) {
    const { data, error } = await this.supabase
      .from('venue_booking_slots')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'open')
      .gte('slot_start', rangeStartIso)
      .lte('slot_end', rangeEndIso)
      .order('slot_start', { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
  }

  // =============================================================================
  // EQUIPMENT METHODS
  // =============================================================================

  async getVenueEquipment(venueId: string): Promise<VenueEquipment[]> {
    try {
      const cached = this.getFromCache<VenueEquipment[]>(`equipment_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_equipment')
        .select('*')
        .eq('venue_id', venueId)
        .order('category', { ascending: true })

      if (error) {
        console.error('Error fetching venue equipment:', error)
        return []
      }

      this.setCache(`equipment_${venueId}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueEquipment:', error)
      return []
    }
  }

  // =============================================================================
  // REVIEWS METHODS
  // =============================================================================

  async getVenueReviews(venueId: string): Promise<VenueReview[]> {
    try {
      const cached = this.getFromCache<VenueReview[]>(`reviews_${venueId}`)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('venue_reviews')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching venue reviews:', error)
        return []
      }

      this.setCache(`reviews_${venueId}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueReviews:', error)
      return []
    }
  }

  // =============================================================================
  // ANALYTICS METHODS
  // =============================================================================

  async getVenueAnalytics(venueId: string, days: number = 30): Promise<VenueAnalytics[]> {
    try {
      const cached = this.getFromCache<VenueAnalytics[]>(`analytics_${venueId}_${days}`)
      if (cached) return cached

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await this.supabase
        .from('venue_analytics')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching venue analytics:', error)
        return []
      }

      this.setCache(`analytics_${venueId}_${days}`, data || [])
      return data || []
    } catch (error) {
      console.error('Error in getVenueAnalytics:', error)
      return []
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  clearCache(): void {
    this.cache.clear()
  }

  clearVenueCache(venueId: string): void {
    for (const [key] of this.cache) {
      if (key.includes(venueId)) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const venueService = new VenueService()
export default venueService 