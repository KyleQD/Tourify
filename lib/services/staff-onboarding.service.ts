import { supabase } from '@/lib/supabase'

export interface StaffOnboardingData {
  name: string
  email: string
  phone?: string
  position: string
  department: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  start_date: string
  hourly_rate?: number
  skills: string[]
  notes?: string
  venue_id: string
  onboarding_template_id?: string
  permissions?: {
    manage_bookings: boolean
    manage_events: boolean
    view_analytics: boolean
    manage_team: boolean
    manage_documents: boolean
  }
}

export interface StaffOnboardingResult {
  success: boolean
  staff_profile: any
  user_account: {
    id: string
    email: string
    existing_user: boolean
    temp_password?: string
  }
  message: string
}

export class StaffOnboardingService {
  /**
   * Create a new staff member with a real user account
   */
  static async createStaffMember(data: StaffOnboardingData): Promise<StaffOnboardingResult> {
    try {
      console.log('🏗️ [Staff Onboarding Service] Creating staff member:', data.email)
      
      const response = await fetch('/api/venue/staff-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [Staff Onboarding Service] Staff member created successfully')
      
      return result
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error creating staff member:', error)
      throw error
    }
  }

  /**
   * Get onboarding data for a venue
   */
  static async getOnboardingData(venueId: string) {
    try {
      const response = await fetch(`/api/venue/staff-onboarding?venue_id=${venueId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.onboarding_data || []
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error fetching onboarding data:', error)
      throw error
    }
  }

  /**
   * Update onboarding progress for a staff member
   */
  static async updateOnboardingProgress(
    staffId: string, 
    progress: number, 
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
  ) {
    try {
      const { data, error } = await supabase
        .from('staff_onboarding')
        .update({
          progress,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', staffId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error updating onboarding progress:', error)
      throw error
    }
  }

  /**
   * Complete onboarding for a staff member
   */
  static async completeOnboarding(staffId: string) {
    try {
      // Update staff member status
      const { data: staffUpdate, error: staffError } = await supabase
        .from('venue_team_members')
        .update({
          onboarding_completed: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()

      if (staffError) throw staffError

      // Update onboarding record
      await this.updateOnboardingProgress(staffId, 100, 'completed')

      return staffUpdate
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error completing onboarding:', error)
      throw error
    }
  }

  /**
   * Send welcome email to new staff member
   */
  static async sendWelcomeEmail(staffId: string, tempPassword?: string) {
    try {
      // Get staff member details
      const { data: staff, error: staffError } = await supabase
        .from('venue_team_members')
        .select('*')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError

      // Get venue details
      const { data: venue, error: venueError } = await supabase
        .from('venue_profiles')
        .select('name, address')
        .eq('id', staff.venue_id)
        .single()

      if (venueError) throw venueError

      // Send welcome email
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: staff.email,
        password: tempPassword || 'temp123',
        options: {
          data: {
            full_name: staff.name,
            temp_password: tempPassword,
            venue_name: venue.name,
            position: staff.role,
            welcome_message: `Welcome to ${venue.name}! You've been added as a ${staff.role} in the ${staff.department} department.`
          }
        }
      })

      if (emailError) throw emailError

      return { success: true, message: 'Welcome email sent successfully' }
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error sending welcome email:', error)
      throw error
    }
  }

  /**
   * Get onboarding templates
   */
  static async getOnboardingTemplates() {
    try {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error fetching onboarding templates:', error)
      throw error
    }
  }

  /**
   * Create onboarding template
   */
  static async createOnboardingTemplate(templateData: {
    name: string
    description: string
    steps: any[]
    estimated_days: number
    department: string
    position: string
  }) {
    try {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error creating onboarding template:', error)
      throw error
    }
  }

  /**
   * Get staff members for a venue
   */
  static async getVenueStaff(venueId: string) {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error fetching venue staff:', error)
      throw error
    }
  }

  /**
   * Update staff member permissions
   */
  static async updateStaffPermissions(staffId: string, permissions: Record<string, boolean>) {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .update({
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ [Staff Onboarding Service] Error updating staff permissions:', error)
      throw error
    }
  }
} 