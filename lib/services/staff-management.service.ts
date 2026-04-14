import { supabase } from "@/lib/supabase"

// Types for our three-tier system
export interface StaffMember {
  id: string
  venue_id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  role: string
  department?: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  hire_date?: string
  hourly_rate?: number
  permissions: Record<string, boolean>
  weekly_schedule?: Record<string, any>
  performance_metrics?: Record<string, any>
  emergency_contact?: Record<string, any>
  avatar_url?: string
  notes?: string
  last_active?: string
  created_at: string
  updated_at: string
}

export interface CrewMember {
  id: string
  venue_id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  specialty: string
  skills: string[]
  certifications: string[]
  rate: number
  rate_type: 'hourly' | 'daily' | 'project'
  availability: string[]
  rating: number
  events_completed: number
  is_available: boolean
  preferred_event_types: string[]
  equipment: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface TeamContractor {
  id: string
  venue_id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  role: string
  contract_type: 'freelance' | 'contractor' | 'agency'
  specialization: string[]
  rate: number
  rate_type: 'hourly' | 'project' | 'monthly'
  active_contracts: number
  completed_projects: number
  rating: number
  is_active: boolean
  last_project?: string
  portfolio_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface EventCrewAssignment {
  id: string
  event_id: string
  venue_id: string
  crew_member_id: string
  role: string
  start_time: string
  end_time: string
  rate_agreed: number
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
}

export interface StaffDashboardStats {
  totalStaff: number
  activeStaff: number
  totalCrew: number
  availableCrew: number
  totalTeam: number
  activeTeam: number
}

export class StaffManagementService {
  // =============================================================================
  // STAFF MANAGEMENT (venue_team_members)
  // =============================================================================

  static async getStaffMembers(venueId: string): Promise<StaffMember[]> {
    const { data, error } = await supabase
      .from('venue_team_members')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (error) {
      console.error('Error fetching staff members:', error)
      throw error
    }

    return data || []
  }

  static async getStaffMember(id: string): Promise<StaffMember | null> {
    const { data, error } = await supabase
      .from('venue_team_members')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching staff member:', error)
      throw error
    }

    return data
  }

  static async createStaffMember(staffData: Partial<StaffMember>): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('venue_team_members')
      .insert([staffData])
      .select()
      .single()

    if (error) {
      console.error('Error creating staff member:', error)
      throw error
    }

    return data
  }

  static async updateStaffMember(id: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('venue_team_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating staff member:', error)
      throw error
    }

    return data
  }

  static async deleteStaffMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('venue_team_members')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting staff member:', error)
      throw error
    }
  }

  // =============================================================================
  // CREW MANAGEMENT (venue_crew_members)
  // =============================================================================

  static async getCrewMembers(venueId: string): Promise<CrewMember[]> {
    const { data, error } = await supabase
      .from('venue_crew_members')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (error) {
      console.error('Error fetching crew members:', error)
      throw error
    }

    return data || []
  }

  static async getAvailableCrewMembers(venueId: string, specialty?: string): Promise<CrewMember[]> {
    let query = supabase
      .from('venue_crew_members')  
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_available', true)

    if (specialty) {
      query = query.eq('specialty', specialty)
    }

    const { data, error } = await query.order('rating', { ascending: false })

    if (error) {
      console.error('Error fetching available crew members:', error)
      throw error
    }

    return data || []
  }

  static async createCrewMember(crewData: Partial<CrewMember>): Promise<CrewMember> {
    const { data, error } = await supabase
      .from('venue_crew_members')
      .insert([crewData])
      .select()
      .single()

    if (error) {
      console.error('Error creating crew member:', error)
      throw error
    }

    return data
  }

  static async updateCrewMember(id: string, updates: Partial<CrewMember>): Promise<CrewMember> {
    const { data, error } = await supabase
      .from('venue_crew_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating crew member:', error)
      throw error
    }

    return data
  }

  static async assignCrewToEvent(assignment: Partial<EventCrewAssignment>): Promise<EventCrewAssignment> {
    const { data, error } = await supabase
      .from('event_crew_assignments')
      .insert([assignment])
      .select()
      .single()

    if (error) {
      console.error('Error assigning crew to event:', error)
      throw error
    }

    return data
  }

  static async getEventCrewAssignments(eventId: string): Promise<EventCrewAssignment[]> {
    const { data, error } = await supabase
      .from('event_crew_assignments')
      .select(`
        *,
        crew_member:venue_crew_members(*)
      `)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error fetching event crew assignments:', error)
      throw error
    }

    return data || []
  }

  // =============================================================================
  // TEAM/CONTRACTOR MANAGEMENT (venue_team_contractors)
  // =============================================================================

  static async getTeamContractors(venueId: string): Promise<TeamContractor[]> {
    const { data, error } = await supabase
      .from('venue_team_contractors')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (error) {
      console.error('Error fetching team contractors:', error)
      throw error
    }

    return data || []
  }

  static async createTeamContractor(teamData: Partial<TeamContractor>): Promise<TeamContractor> {
    const { data, error } = await supabase
      .from('venue_team_contractors')
      .insert([teamData])
      .select()
      .single()

    if (error) {
      console.error('Error creating team contractor:', error)
      throw error
    }

    return data
  }

  static async updateTeamContractor(id: string, updates: Partial<TeamContractor>): Promise<TeamContractor> {
    const { data, error } = await supabase
      .from('venue_team_contractors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating team contractor:', error)
      throw error
    }

    return data
  }

  // =============================================================================
  // DASHBOARD STATS
  // =============================================================================

  static async getStaffDashboardStats(venueId: string): Promise<StaffDashboardStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_staff_dashboard_stats', { p_venue_id: venueId })

      if (error) {
        console.error('Error fetching dashboard stats:', error)
        // Fallback to manual calculation if RPC function doesn't exist
        return await this.getStaffDashboardStatsFallback(venueId)
      }

      return data || {
        totalStaff: 0,
        activeStaff: 0,
        totalCrew: 0,
        availableCrew: 0,
        totalTeam: 0,
        activeTeam: 0
      }
    } catch (error) {
      console.error('Error with dashboard stats RPC:', error)
      return await this.getStaffDashboardStatsFallback(venueId)
    }
  }

  private static async getStaffDashboardStatsFallback(venueId: string): Promise<StaffDashboardStats> {
    const [staffData, crewData, teamData] = await Promise.all([
      supabase.from('venue_team_members').select('status').eq('venue_id', venueId),
      supabase.from('venue_crew_members').select('is_available').eq('venue_id', venueId),
      supabase.from('venue_team_contractors').select('is_active').eq('venue_id', venueId)
    ])

    const staff = staffData.data || []
    const crew = crewData.data || []
    const team = teamData.data || []

    return {
      totalStaff: staff.length,
      activeStaff: staff.filter(s => s.status === 'active').length,
      totalCrew: crew.length,
      availableCrew: crew.filter(c => c.is_available).length,
      totalTeam: team.length,
      activeTeam: team.filter(t => t.is_active).length
    }
  }

  // =============================================================================
  // JOB BOARD INTEGRATION
  // =============================================================================

  static async getJobApplications(venueId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('staff_applications')
      .select(`
        *,
        job:staff_jobs(*),
        applicant:profiles(*)
      `)
      .eq('job.venue_id', venueId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error fetching job applications:', error)
      throw error
    }

    return data || []
  }

  static async hireFromJobBoard(
    applicationId: string,
    hireType: 'staff' | 'crew' | 'team',
    venueId: string,
    rate: number,
    additionalInfo?: any
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('hire_from_job_board', {
          p_application_id: applicationId,
          p_hire_type: hireType,
          p_venue_id: venueId,
          p_rate: rate,
          p_additional_info: additionalInfo || {}
        })

      if (error) {
        console.error('Error hiring from job board:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error with hire RPC function:', error)
      // Fallback to manual hiring process
      return await this.hireFromJobBoardFallback(applicationId, hireType, venueId, rate)
    }
  }

  private static async hireFromJobBoardFallback(
    applicationId: string,
    hireType: 'staff' | 'crew' | 'team',
    venueId: string,
    rate: number
  ): Promise<boolean> {
    // Get application details
    const { data: application, error: appError } = await supabase
      .from('staff_applications')
      .select(`
        *,
        job:staff_jobs(*),
        applicant:profiles(*)
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      throw new Error('Application not found')
    }

    // Update application status
    await supabase
      .from('staff_applications')
      .update({
        status: 'accepted',
        hired_as: hireType,
        hired_date: new Date().toISOString(),
        final_rate: rate
      })
      .eq('id', applicationId)

    // Create appropriate record based on hire type
    const baseData = {
      venue_id: venueId,
      user_id: application.applicant_id,
      name: application.applicant?.full_name || 'New Hire',
      email: application.applicant?.email || 'unknown@email.com',
      rate: rate
    }

    if (hireType === 'staff') {
      await this.createStaffMember({
        ...baseData,
        role: application.job?.title || 'Staff Member',
        employment_type: 'full_time',
        status: 'active',
        hire_date: new Date().toISOString(),
        hourly_rate: rate,
        permissions: {}
      })
    } else if (hireType === 'crew') {
      await this.createCrewMember({
        ...baseData,
        specialty: application.job?.title || 'General Crew',
        rate_type: 'daily',
        skills: [],
        certifications: [],
        availability: [],
        rating: 0,
        events_completed: 0,
        is_available: true,
        preferred_event_types: [],
        equipment: []
      })
    } else if (hireType === 'team') {
      await this.createTeamContractor({
        ...baseData,
        role: application.job?.title || 'Contractor',
        contract_type: 'freelance',
        rate_type: 'project',
        specialization: [],
        active_contracts: 0,
        completed_projects: 0,
        rating: 0,
        is_active: true
      })
    }

    return true
  }

  // =============================================================================
  // SEARCH AND FILTER UTILITIES
  // =============================================================================

  static async searchStaffMembers(
    venueId: string,
    query: string,
    filters?: {
      status?: string
      department?: string
      employment_type?: string
    }
  ): Promise<StaffMember[]> {
    let supabaseQuery = supabase
      .from('venue_team_members')
      .select('*')
      .eq('venue_id', venueId)

    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`)
    }

    if (filters?.status && filters.status !== 'all') {
      supabaseQuery = supabaseQuery.eq('status', filters.status)
    }

    if (filters?.department && filters.department !== 'all') {
      supabaseQuery = supabaseQuery.eq('department', filters.department)
    }

    if (filters?.employment_type && filters.employment_type !== 'all') {
      supabaseQuery = supabaseQuery.eq('employment_type', filters.employment_type)
    }

    const { data, error } = await supabaseQuery.order('name')

    if (error) {
      console.error('Error searching staff members:', error)
      throw error
    }

    return data || []
  }

  static async searchCrewMembers(
    venueId: string,
    query: string,
    filters?: {
      specialty?: string
      availability?: boolean
    }
  ): Promise<CrewMember[]> {
    let supabaseQuery = supabase
      .from('venue_crew_members')
      .select('*')
      .eq('venue_id', venueId)

    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,specialty.ilike.%${query}%,skills.cs.{${query}}`)
    }

    if (filters?.specialty && filters.specialty !== 'all') {
      supabaseQuery = supabaseQuery.eq('specialty', filters.specialty)
    }

    if (filters?.availability !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_available', filters.availability)
    }

    const { data, error } = await supabaseQuery.order('rating', { ascending: false })

    if (error) {
      console.error('Error searching crew members:', error)
      throw error
    }

    return data || []
  }
} 