import { supabase } from "@/lib/supabase"
import { staffSummarySelect, toStaffSummaryDto } from "@/lib/venue/staff-dto"

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

export interface StaffDashboardStats {
  totalStaff: number
  activeStaff: number
  totalCrew: number
  availableCrew: number
  totalTeam: number
  activeTeam: number
}

export class StaffManagementService {
  // Staff Management
  static async getStaffMembers(venueId: string): Promise<StaffMember[]> {
    // VEN-017: roster reads project only permission-scoped summary columns —
    // never HR/pay/PII fields (date_of_birth, emergency_contact, hourly_rate, …).
    const { data, error } = await supabase
      .from('venue_team_members')
      .select(staffSummarySelect())
      .eq('venue_id', venueId)
      .order('name')

    if (error) throw error
    return (data || []).map((row) => toStaffSummaryDto(row)) as unknown as StaffMember[]
  }

  static async createStaffMember(staffData: Partial<StaffMember>): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('venue_team_members')
      .insert([staffData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Crew Management
  static async getCrewMembers(venueId: string): Promise<CrewMember[]> {
    const { data, error } = await supabase
      .from('venue_crew_members')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (error) throw error
    return data || []
  }

  static async createCrewMember(crewData: Partial<CrewMember>): Promise<CrewMember> {
    const { data, error } = await supabase
      .from('venue_crew_members')
      .insert([crewData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Team Management
  static async getTeamContractors(venueId: string): Promise<TeamContractor[]> {
    const { data, error } = await supabase
      .from('venue_team_contractors')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (error) throw error
    return data || []
  }

  static async createTeamContractor(teamData: Partial<TeamContractor>): Promise<TeamContractor> {
    const { data, error } = await supabase
      .from('venue_team_contractors')
      .insert([teamData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Dashboard Stats
  static async getStaffDashboardStats(venueId: string): Promise<StaffDashboardStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_staff_dashboard_stats', { p_venue_id: venueId })

      if (error) {
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
      activeStaff: staff.filter((s: any) => s.status === 'active').length,
      totalCrew: crew.length,
      availableCrew: crew.filter((c: any) => c.is_available).length,
      totalTeam: team.length,
      activeTeam: team.filter((t: any) => t.is_active).length
    }
  }
} 