import { supabase } from '@/lib/supabase'
import type { 
  JobApplication, 
  OnboardingCandidate, 
  StaffMember, 
  TeamCommunication,
  StaffShift,
  StaffZone
} from '@/types/admin-onboarding'

export class RealTimeStaffService {
  private static subscriptions: Map<string, any> = new Map()

  /**
   * Subscribe to real-time job application updates
   */
  static subscribeToApplications(venueId: string, callback: (applications: JobApplication[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to applications...')
      
      const subscription = supabase
        .channel(`applications-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_applications',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Application update received:', payload)
            
            // Fetch updated applications
            const { data: applications, error } = await supabase
              .from('job_applications')
              .select('*')
              .eq('venue_id', venueId)
              .order('applied_at', { ascending: false })

            if (!error && applications) {
              callback(applications)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`applications-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to applications:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time onboarding candidate updates
   */
  static subscribeToOnboardingCandidates(venueId: string, callback: (candidates: OnboardingCandidate[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to onboarding candidates...')
      
      const subscription = supabase
        .channel(`candidates-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_onboarding_candidates',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Candidate update received:', payload)
            
            // Fetch updated candidates
            const { data: candidates, error } = await supabase
              .from('staff_onboarding_candidates')
              .select('*')
              .eq('venue_id', venueId)
              .order('application_date', { ascending: false })

            if (!error && candidates) {
              callback(candidates)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`candidates-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to candidates:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time staff member updates
   */
  static subscribeToStaffMembers(venueId: string, callback: (staffMembers: StaffMember[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to staff members...')
      
      const subscription = supabase
        .channel(`staff-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_members',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Staff member update received:', payload)
            
            // Fetch updated staff members
            const { data: staffMembers, error } = await supabase
              .from('staff_members')
              .select('*')
              .eq('venue_id', venueId)
              .order('created_at', { ascending: false })

            if (!error && staffMembers) {
              callback(staffMembers)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`staff-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to staff members:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time team communications
   */
  static subscribeToTeamCommunications(venueId: string, callback: (communications: TeamCommunication[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to team communications...')
      
      const subscription = supabase
        .channel(`communications-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_communications',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Communication update received:', payload)
            
            // Fetch updated communications
            const { data: communications, error } = await supabase
              .from('team_communications')
              .select('*')
              .eq('venue_id', venueId)
              .order('sent_at', { ascending: false })

            if (!error && communications) {
              callback(communications)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`communications-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to communications:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time shift updates
   */
  static subscribeToShifts(venueId: string, callback: (shifts: StaffShift[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to shifts...')
      
      const subscription = supabase
        .channel(`shifts-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_shifts',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Shift update received:', payload)
            
            // Fetch updated shifts
            const { data: shifts, error } = await supabase
              .from('staff_shifts')
              .select('*')
              .eq('venue_id', venueId)
              .order('shift_date', { ascending: true })

            if (!error && shifts) {
              callback(shifts)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`shifts-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to shifts:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time zone updates
   */
  static subscribeToZones(venueId: string, callback: (zones: StaffZone[]) => void) {
    try {
      console.log('🔧 [Real-time Staff Service] Subscribing to zones...')
      
      const subscription = supabase
        .channel(`zones-${venueId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_zones',
            filter: `venue_id=eq.${venueId}`
          },
          async (payload) => {
            console.log('📡 [Real-time Staff Service] Zone update received:', payload)
            
            // Fetch updated zones
            const { data: zones, error } = await supabase
              .from('staff_zones')
              .select('*')
              .eq('venue_id', venueId)
              .order('zone_name', { ascending: true })

            if (!error && zones) {
              callback(zones)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(`zones-${venueId}`, subscription)
      return subscription
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error subscribing to zones:', error)
      throw error
    }
  }

  /**
   * Send real-time notification to staff members
   */
  static async sendRealTimeNotification(
    venueId: string,
    recipients: string[],
    message: string,
    type: 'info' | 'warning' | 'error' | 'success'
  ) {
    try {
      console.log('🔧 [Real-time Staff Service] Sending real-time notification...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create notification record
      const { data: notification, error } = await supabase
        .from('team_communications')
        .insert({
          venue_id: venueId,
          sender_id: user.id,
          recipients,
          subject: `Real-time ${type} notification`,
          content: message,
          message_type: 'announcement',
          priority: type === 'error' ? 'urgent' : type === 'warning' ? 'high' : 'normal',
          read_by: [],
          sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Send real-time message to specific channel
      const channel = supabase.channel(`notifications-${venueId}`)
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          id: notification.id,
          message,
          type,
          recipients,
          timestamp: new Date().toISOString()
        }
      })

      return notification
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error sending real-time notification:', error)
      throw error
    }
  }

  /**
   * Get real-time dashboard statistics
   */
  static async getRealTimeStats(venueId: string) {
    try {
      console.log('🔧 [Real-time Staff Service] Getting real-time stats...')
      
      // Get real-time counts
      const [applicationsResult, candidatesResult, staffResult, communicationsResult] = await Promise.all([
        supabase.from('job_applications').select('id', { count: 'exact' }).eq('venue_id', venueId),
        supabase.from('staff_onboarding_candidates').select('id', { count: 'exact' }).eq('venue_id', venueId),
        supabase.from('staff_members').select('id', { count: 'exact' }).eq('venue_id', venueId),
        supabase.from('team_communications').select('id', { count: 'exact' }).eq('venue_id', venueId)
      ])

      return {
        applicationsCount: applicationsResult.count || 0,
        candidatesCount: candidatesResult.count || 0,
        staffCount: staffResult.count || 0,
        communicationsCount: communicationsResult.count || 0,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error getting real-time stats:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from all real-time subscriptions
   */
  static unsubscribeAll() {
    try {
      console.log('🔧 [Real-time Staff Service] Unsubscribing from all channels...')
      
      this.subscriptions.forEach((subscription, key) => {
        subscription.unsubscribe()
        console.log(`📡 [Real-time Staff Service] Unsubscribed from ${key}`)
      })
      
      this.subscriptions.clear()
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error unsubscribing:', error)
    }
  }

  /**
   * Unsubscribe from specific channel
   */
  static unsubscribeFromChannel(channelKey: string) {
    try {
      const subscription = this.subscriptions.get(channelKey)
      if (subscription) {
        subscription.unsubscribe()
        this.subscriptions.delete(channelKey)
        console.log(`📡 [Real-time Staff Service] Unsubscribed from ${channelKey}`)
      }
    } catch (error) {
      console.error('❌ [Real-time Staff Service] Error unsubscribing from channel:', error)
    }
  }

  /**
   * Get connection status
   */
  static getConnectionStatus() {
    return {
      isConnected: this.subscriptions.size > 0,
      activeChannels: Array.from(this.subscriptions.keys()),
      totalSubscriptions: this.subscriptions.size
    }
  }
} 