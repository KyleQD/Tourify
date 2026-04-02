import { createClient } from '@/lib/supabase'

type EventTableName = 'artist_events' | 'events' | 'events_v2'

export class EventPageService {
  private static instance: EventPageService
  private supabase = createClient()

  static getInstance(): EventPageService {
    if (!EventPageService.instance) {
      EventPageService.instance = new EventPageService()
    }
    return EventPageService.instance
  }

  /**
   * Create event page settings when a new event is created
   */
  async createEventPageSettings(eventId: string, eventTable: EventTableName = 'artist_events') {
    try {
      const { data, error } = await this.supabase
        .from('event_page_settings')
        .insert({
          event_id: eventId,
          event_table: eventTable,
          is_page_enabled: true,
          allow_public_posts: false,
          allow_attendee_posts: true,
          require_approval_for_posts: false,
          show_attendance_count: true,
          show_attendee_list: true,
          allow_comments: true,
          page_theme: {
            primary_color: '#8B5CF6',
            cover_image: null
          },
          custom_fields: {},
          seo_settings: {
            title: null,
            description: null,
            keywords: []
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating event page settings:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createEventPageSettings:', error)
      throw error
    }
  }

  /**
   * Get event page data including attendance, posts, and settings
   */
  async getEventPageData(eventId: string, eventTable: EventTableName = 'artist_events') {
    try {
      // Get event details
      const tableName: EventTableName = eventTable
      const { data: event, error: eventError } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      // Get event page settings
      const { data: settings, error: settingsError } = await this.supabase
        .from('event_page_settings')
        .select('*')
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      // Get attendance data
      const { data: attendance, error: attendanceError } = await this.supabase
        .from('event_attendance')
        .select(`
          status,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('event_id', eventId)
        .eq('event_table', eventTable)

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
      }

      // Get event posts
      const { data: posts, error: postsError } = await this.supabase
        .from('event_posts')
        .select(`
          id,
          user_id,
          content,
          type,
          media_urls,
          is_announcement,
          is_pinned,
          visibility,
          likes_count,
          comments_count,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      return {
        event,
        settings,
        attendance: attendance || [],
        posts: posts || []
      }
    } catch (error) {
      console.error('Error in getEventPageData:', error)
      throw error
    }
  }

  /**
   * Update event page settings
   */
  async updateEventPageSettings(
    eventId: string, 
    settings: Partial<{
      is_page_enabled: boolean
      allow_public_posts: boolean
      allow_attendee_posts: boolean
      require_approval_for_posts: boolean
      show_attendance_count: boolean
      show_attendee_list: boolean
      allow_comments: boolean
      page_theme: { primary_color: string; cover_image?: string }
      custom_fields: Record<string, any>
      seo_settings: { title?: string; description?: string; keywords: string[] }
    }>,
    eventTable: EventTableName = 'artist_events'
  ) {
    try {
      const { data, error } = await this.supabase
        .from('event_page_settings')
        .upsert({
          event_id: eventId,
          event_table: eventTable,
          ...settings
        }, {
          onConflict: 'event_id,event_table'
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating event page settings:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateEventPageSettings:', error)
      throw error
    }
  }

  /**
   * Create attendance record
   */
  async updateAttendance(
    eventId: string,
    userId: string,
    status: 'attending' | 'interested' | 'not_going',
    eventTable: EventTableName = 'artist_events'
  ) {
    try {
      const { data, error } = await this.supabase
        .from('event_attendance')
        .upsert({
          event_id: eventId,
          event_table: eventTable,
          user_id: userId,
          status
        }, {
          onConflict: 'event_id,user_id,event_table'
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating attendance:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateAttendance:', error)
      throw error
    }
  }

  /**
   * Create event post
   */
  async createEventPost(
    eventId: string,
    userId: string,
    content: string,
    options: {
      type?: string
      media_urls?: string[]
      is_announcement?: boolean
      is_pinned?: boolean
      visibility?: 'public' | 'attendees' | 'collaborators'
      eventTable?: EventTableName
    } = {}
  ) {
    try {
      const {
        type = 'text',
        media_urls = [],
        is_announcement = false,
        is_pinned = false,
        visibility = 'attendees',
        eventTable = 'artist_events'
      } = options

      const { data, error } = await this.supabase
        .from('event_posts')
        .insert({
          event_id: eventId,
          event_table: eventTable,
          user_id: userId,
          content,
          type,
          media_urls,
          is_announcement,
          is_pinned,
          visibility
        })
        .select(`
          id,
          user_id,
          content,
          type,
          media_urls,
          is_announcement,
          is_pinned,
          visibility,
          likes_count,
          comments_count,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .single()

      if (error) {
        console.error('Error creating event post:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createEventPost:', error)
      throw error
    }
  }

  /**
   * Generate event page URL
   */
  getEventPageUrl(eventId: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com')
    return `${base}/events/${eventId}`
  }

  /**
   * Check if user can manage event
   */
  async canUserManageEvent(userId: string, eventId: string, eventTable: EventTableName = 'artist_events'): Promise<boolean> {
    try {
      // Check if user is the event creator
      const tableName: EventTableName = eventTable
      const userIdColumn = eventTable === 'artist_events' ? 'user_id' : eventTable === 'events' ? 'artist_id' : 'created_by'
      
      const { data: event, error: eventError } = await this.supabase
        .from(tableName)
        .select(userIdColumn)
        .eq('id', eventId)
        .single()

      if (eventError) return false

      if ((event as any)[userIdColumn] === userId) return true

      // Check if user is an admin collaborator
      const { data: collaborator, error: collaboratorError } = await this.supabase
        .from('event_collaborators')
        .select('role')
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (collaboratorError) return false

      return collaborator?.role === 'admin'
    } catch (error) {
      console.error('Error checking user permissions:', error)
      return false
    }
  }

  /**
   * Check if user can post to event
   */
  async canUserPostToEvent(userId: string, eventId: string, eventTable: EventTableName = 'artist_events'): Promise<boolean> {
    try {
      // Check if user can manage the event
      if (await this.canUserManageEvent(userId, eventId, eventTable)) {
        return true
      }

      // Check if user is a collaborator with posting permissions
      const { data: collaborator, error: collaboratorError } = await this.supabase
        .from('event_collaborators')
        .select('permissions')
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (!collaboratorError && collaborator?.permissions?.can_post_updates) {
        return true
      }

      // Check if user is attending and attendee posts are allowed
      const { data: attendance, error: attendanceError } = await this.supabase
        .from('event_attendance')
        .select('status')
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .eq('user_id', userId)
        .single()

      if (attendanceError || attendance?.status !== 'attending') {
        return false
      }

      // Check if attendee posts are allowed
      const { data: settings, error: settingsError } = await this.supabase
        .from('event_page_settings')
        .select('allow_attendee_posts')
        .eq('event_id', eventId)
        .eq('event_table', eventTable)
        .single()

      if (settingsError) return false

      return settings?.allow_attendee_posts === true
    } catch (error) {
      console.error('Error checking post permissions:', error)
      return false
    }
  }
}

// Export singleton instance
export const eventPageService = EventPageService.getInstance() 