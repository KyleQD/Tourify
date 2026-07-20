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
  invitation_token?: string
}

function mapInviteResult({
  data,
  email,
}: {
  data: Record<string, any>
  email: string
}): StaffOnboardingResult {
  const candidate = data.candidate || data
  const invitation = data.invitation || {}
  const token =
    typeof invitation.token === 'string'
      ? invitation.token
      : typeof candidate.invitation_token === 'string'
        ? candidate.invitation_token
        : undefined

  return {
    success: true,
    staff_profile: candidate,
    user_account: {
      id: String(candidate.user_id || candidate.id || invitation.id || ''),
      email,
      existing_user: Boolean(candidate.user_id),
    },
    message: token
      ? 'Staff invitation created. Share the onboarding link to finish setup.'
      : 'Staff invitation created successfully',
    invitation_token: token,
  }
}

export class StaffOnboardingService {
  /**
   * Invite a staff member through the modern hiring invite flow.
   */
  static async createStaffMember(data: StaffOnboardingData): Promise<StaffOnboardingResult> {
    try {
      const response = await fetch('/api/hiring/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          phone: data.phone,
          position: data.position,
          department: data.department,
          employment_type: data.employment_type,
          template_id: data.onboarding_template_id ?? null,
          venue_id: data.venue_id,
          employer_entity_type: 'venue',
          employer_entity_id: data.venue_id,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || payload?.error || `HTTP ${response.status}: ${response.statusText}`,
        )
      }

      return mapInviteResult({
        data: payload.data || payload,
        email: data.email,
      })
    } catch (error) {
      console.error('[Staff Onboarding Service] Error creating staff member:', error)
      throw error
    }
  }

  /**
   * Get onboarding / roster data for a venue via hiring roster API.
   */
  static async getOnboardingData(venueId: string) {
    try {
      const params = new URLSearchParams({
        venue_id: venueId,
        employer_entity_type: 'venue',
        employer_entity_id: venueId,
        limit: '250',
      })

      const response = await fetch(`/api/hiring/roster?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || payload?.error || `HTTP ${response.status}: ${response.statusText}`,
        )
      }

      const members = Array.isArray(payload?.data?.members)
        ? payload.data.members
        : Array.isArray(payload?.data)
          ? payload.data
          : []

      return members.map((row: Record<string, any>) => ({
        ...row,
        progress: row.onboarding_completed || row.status === 'active' ? 100 : Number(row.onboarding_progress || 0),
        onboarding_status:
          row.onboarding_completed || row.status === 'active'
            ? 'completed'
            : row.status || 'pending',
      }))
    } catch (error) {
      console.error('[Staff Onboarding Service] Error fetching onboarding data:', error)
      throw error
    }
  }

  /**
   * Update onboarding progress for a staff member
   */
  static async updateOnboardingProgress(
    staffId: string,
    progress: number,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ) {
    try {
      const { data, error } = await supabase
        .from('staff_onboarding')
        .update({
          progress,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('staff_id', staffId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[Staff Onboarding Service] Error updating onboarding progress:', error)
      throw error
    }
  }

  /**
   * Complete onboarding for a staff member
   */
  static async completeOnboarding(staffId: string) {
    try {
      const { data: staffUpdate, error: staffError } = await supabase
        .from('venue_team_members')
        .update({
          onboarding_completed: true,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId)
        .select()
        .single()

      if (staffError) throw staffError

      await this.updateOnboardingProgress(staffId, 100, 'completed')

      return staffUpdate
    } catch (error) {
      console.error('[Staff Onboarding Service] Error completing onboarding:', error)
      throw error
    }
  }

  /**
   * Send welcome email to new staff member
   */
  static async sendWelcomeEmail(staffId: string, tempPassword?: string) {
    try {
      const { data: staff, error: staffError } = await supabase
        .from('venue_team_members')
        .select('*')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError

      const { data: venue, error: venueError } = await supabase
        .from('venue_profiles')
        .select('name, address')
        .eq('id', staff.venue_id)
        .single()

      if (venueError) throw venueError

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
            welcome_message: `Welcome to ${venue.name}! You've been added as a ${staff.role} in the ${staff.department} department.`,
          },
        },
      })

      if (emailError) throw emailError

      return { success: true, message: 'Welcome email sent successfully' }
    } catch (error) {
      console.error('[Staff Onboarding Service] Error sending welcome email:', error)
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
      console.error('[Staff Onboarding Service] Error fetching onboarding templates:', error)
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
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[Staff Onboarding Service] Error creating onboarding template:', error)
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
      console.error('[Staff Onboarding Service] Error fetching venue staff:', error)
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[Staff Onboarding Service] Error updating staff permissions:', error)
      throw error
    }
  }
}
