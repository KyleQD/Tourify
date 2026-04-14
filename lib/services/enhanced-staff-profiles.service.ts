import { supabase } from "@/lib/supabase"
import { 
  VenueTeamMember, 
  StaffCertification, 
  StaffPerformanceReview, 
  StaffSkill, 
  StaffDocument, 
  StaffAvailability, 
  StaffTimeOffRequest 
} from "@/types/database.types"

// supabase imported directly above

export interface StaffProfileData extends VenueTeamMember {
  certifications?: StaffCertification[]
  performance_reviews?: StaffPerformanceReview[]
  skills?: StaffSkill[]
  documents?: StaffDocument[]
  availability?: StaffAvailability[]
  time_off_requests?: StaffTimeOffRequest[]
}

export interface CreateStaffProfileData {
  venue_id: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  role: string
  department?: string
  role_category?: 'foh' | 'tech' | 'security' | 'bar' | 'kitchen' | 'management' | 'marketing' | 'maintenance' | 'other'
  role_level?: 'entry' | 'mid' | 'senior' | 'manager' | 'director'
  employment_type?: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  hourly_rate?: number
  salary?: number
  pay_frequency?: 'hourly' | 'weekly' | 'biweekly' | 'monthly'
  hire_date?: string
  pronouns?: string
  bio?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  emergency_contact?: Record<string, any>
}

export interface UpdateStaffProfileData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  department?: string
  role_category?: 'foh' | 'tech' | 'security' | 'bar' | 'kitchen' | 'management' | 'marketing' | 'maintenance' | 'other'
  role_level?: 'entry' | 'mid' | 'senior' | 'manager' | 'director'
  employment_type?: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  hourly_rate?: number
  salary?: number
  pay_frequency?: 'hourly' | 'weekly' | 'biweekly' | 'monthly'
  pronouns?: string
  bio?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  emergency_contact?: Record<string, any>
  internal_notes?: string
  admin_notes?: string
  is_available?: boolean
  status?: 'active' | 'inactive' | 'terminated'
}

export class EnhancedStaffProfilesService {
  // =============================================================================
  // STAFF PROFILE MANAGEMENT
  // =============================================================================

  static async getStaffProfiles(venueId: string): Promise<StaffProfileData[]> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .select(`
          *,
          certifications:staff_certifications(*),
          performance_reviews:staff_performance_reviews(*),
          skills:staff_skills(*),
          documents:staff_documents(*),
          availability:staff_availability(*),
          time_off_requests:staff_time_off_requests(*)
        `)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching staff profiles:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffProfiles:', error)
      throw error
    }
  }

  static async getStaffProfile(staffId: string): Promise<StaffProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .select(`
          *,
          certifications:staff_certifications(*),
          performance_reviews:staff_performance_reviews(*),
          skills:staff_skills(*),
          documents:staff_documents(*),
          availability:staff_availability(*),
          time_off_requests:staff_time_off_requests(*)
        `)
        .eq('id', staffId)
        .single()

      if (error) {
        console.error('Error fetching staff profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getStaffProfile:', error)
      throw error
    }
  }

  static async createStaffProfile(profileData: CreateStaffProfileData): Promise<VenueTeamMember> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .insert({
          ...profileData,
          name: `${profileData.first_name} ${profileData.last_name}`,
          permissions: {
            manage_bookings: false,
            manage_events: false,
            view_analytics: false,
            manage_team: false,
            manage_documents: false
          },
          status: 'active',
          is_available: true,
          onboarding_completed: false
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating staff profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createStaffProfile:', error)
      throw error
    }
  }

  static async updateStaffProfile(staffId: string, updateData: UpdateStaffProfileData): Promise<VenueTeamMember> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .update({
          ...updateData,
          ...(updateData.first_name && updateData.last_name && {
            name: `${updateData.first_name} ${updateData.last_name}`
          })
        })
        .eq('id', staffId)
        .select()
        .single()

      if (error) {
        console.error('Error updating staff profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateStaffProfile:', error)
      throw error
    }
  }

  static async deleteStaffProfile(staffId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('venue_team_members')
        .delete()
        .eq('id', staffId)

      if (error) {
        console.error('Error deleting staff profile:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteStaffProfile:', error)
      throw error
    }
  }

  // =============================================================================
  // CERTIFICATIONS MANAGEMENT
  // =============================================================================

  static async getStaffCertifications(staffId: string): Promise<StaffCertification[]> {
    try {
      const { data, error } = await supabase
        .from('staff_certifications')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('expiration_date', { ascending: true })

      if (error) {
        console.error('Error fetching staff certifications:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffCertifications:', error)
      throw error
    }
  }

  static async addCertification(certificationData: Omit<StaffCertification, 'id' | 'created_at' | 'updated_at'>): Promise<StaffCertification> {
    try {
      const { data, error } = await supabase
        .from('staff_certifications')
        .insert(certificationData)
        .select()
        .single()

      if (error) {
        console.error('Error adding certification:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in addCertification:', error)
      throw error
    }
  }

  static async updateCertification(certificationId: string, updateData: Partial<StaffCertification>): Promise<StaffCertification> {
    try {
      const { data, error } = await supabase
        .from('staff_certifications')
        .update(updateData)
        .eq('id', certificationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating certification:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateCertification:', error)
      throw error
    }
  }

  static async deleteCertification(certificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('staff_certifications')
        .delete()
        .eq('id', certificationId)

      if (error) {
        console.error('Error deleting certification:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteCertification:', error)
      throw error
    }
  }

  // =============================================================================
  // PERFORMANCE REVIEWS MANAGEMENT
  // =============================================================================

  static async getPerformanceReviews(staffId: string): Promise<StaffPerformanceReview[]> {
    try {
      const { data, error } = await supabase
        .from('staff_performance_reviews')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('review_date', { ascending: false })

      if (error) {
        console.error('Error fetching performance reviews:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getPerformanceReviews:', error)
      throw error
    }
  }

  static async createPerformanceReview(reviewData: Omit<StaffPerformanceReview, 'id' | 'created_at' | 'updated_at'>): Promise<StaffPerformanceReview> {
    try {
      const { data, error } = await supabase
        .from('staff_performance_reviews')
        .insert(reviewData)
        .select()
        .single()

      if (error) {
        console.error('Error creating performance review:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createPerformanceReview:', error)
      throw error
    }
  }

  static async updatePerformanceReview(reviewId: string, updateData: Partial<StaffPerformanceReview>): Promise<StaffPerformanceReview> {
    try {
      const { data, error } = await supabase
        .from('staff_performance_reviews')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .single()

      if (error) {
        console.error('Error updating performance review:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updatePerformanceReview:', error)
      throw error
    }
  }

  // =============================================================================
  // SKILLS MANAGEMENT
  // =============================================================================

  static async getStaffSkills(staffId: string): Promise<StaffSkill[]> {
    try {
      const { data, error } = await supabase
        .from('staff_skills')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('skill_name')

      if (error) {
        console.error('Error fetching staff skills:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffSkills:', error)
      throw error
    }
  }

  static async addSkill(skillData: Omit<StaffSkill, 'id' | 'created_at' | 'updated_at'>): Promise<StaffSkill> {
    try {
      const { data, error } = await supabase
        .from('staff_skills')
        .insert(skillData)
        .select()
        .single()

      if (error) {
        console.error('Error adding skill:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in addSkill:', error)
      throw error
    }
  }

  static async updateSkill(skillId: string, updateData: Partial<StaffSkill>): Promise<StaffSkill> {
    try {
      const { data, error } = await supabase
        .from('staff_skills')
        .update(updateData)
        .eq('id', skillId)
        .select()
        .single()

      if (error) {
        console.error('Error updating skill:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateSkill:', error)
      throw error
    }
  }

  static async deleteSkill(skillId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('staff_skills')
        .delete()
        .eq('id', skillId)

      if (error) {
        console.error('Error deleting skill:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteSkill:', error)
      throw error
    }
  }

  // =============================================================================
  // DOCUMENTS MANAGEMENT
  // =============================================================================

  static async getStaffDocuments(staffId: string): Promise<StaffDocument[]> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('upload_date', { ascending: false })

      if (error) {
        console.error('Error fetching staff documents:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffDocuments:', error)
      throw error
    }
  }

  static async addDocument(documentData: Omit<StaffDocument, 'id' | 'created_at' | 'updated_at'>): Promise<StaffDocument> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .insert(documentData)
        .select()
        .single()

      if (error) {
        console.error('Error adding document:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in addDocument:', error)
      throw error
    }
  }

  static async updateDocument(documentId: string, updateData: Partial<StaffDocument>): Promise<StaffDocument> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateDocument:', error)
      throw error
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        console.error('Error deleting document:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteDocument:', error)
      throw error
    }
  }

  // =============================================================================
  // AVAILABILITY MANAGEMENT
  // =============================================================================

  static async getStaffAvailability(staffId: string): Promise<StaffAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('day_of_week')

      if (error) {
        console.error('Error fetching staff availability:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffAvailability:', error)
      throw error
    }
  }

  static async updateAvailability(availabilityData: Omit<StaffAvailability, 'id' | 'created_at' | 'updated_at'>): Promise<StaffAvailability> {
    try {
      const { data, error } = await supabase
        .from('staff_availability')
        .upsert(availabilityData, { onConflict: 'staff_member_id,day_of_week' })
        .select()
        .single()

      if (error) {
        console.error('Error updating availability:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateAvailability:', error)
      throw error
    }
  }

  // =============================================================================
  // TIME OFF REQUESTS MANAGEMENT
  // =============================================================================

  static async getTimeOffRequests(staffId: string): Promise<StaffTimeOffRequest[]> {
    try {
      const { data, error } = await supabase
        .from('staff_time_off_requests')
        .select('*')
        .eq('staff_member_id', staffId)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching time off requests:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getTimeOffRequests:', error)
      throw error
    }
  }

  static async createTimeOffRequest(requestData: Omit<StaffTimeOffRequest, 'id' | 'created_at' | 'updated_at'>): Promise<StaffTimeOffRequest> {
    try {
      const { data, error } = await supabase
        .from('staff_time_off_requests')
        .insert(requestData)
        .select()
        .single()

      if (error) {
        console.error('Error creating time off request:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createTimeOffRequest:', error)
      throw error
    }
  }

  static async updateTimeOffRequest(requestId: string, updateData: Partial<StaffTimeOffRequest>): Promise<StaffTimeOffRequest> {
    try {
      const { data, error } = await supabase
        .from('staff_time_off_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single()

      if (error) {
        console.error('Error updating time off request:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateTimeOffRequest:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  static async getExpiringCertifications(venueId: string, daysThreshold: number = 30): Promise<StaffCertification[]> {
    try {
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

      const { data, error } = await supabase
        .from('staff_certifications')
        .select(`
          *,
          venue_team_members!inner(name, email)
        `)
        .eq('venue_id', venueId)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', thresholdDate.toISOString().split('T')[0])
        .order('expiration_date')

      if (error) {
        console.error('Error fetching expiring certifications:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getExpiringCertifications:', error)
      throw error
    }
  }

  static async getUpcomingReviews(venueId: string, daysThreshold: number = 30): Promise<StaffPerformanceReview[]> {
    try {
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

      const { data, error } = await supabase
        .from('staff_performance_reviews')
        .select(`
          *,
          venue_team_members!inner(name, email)
        `)
        .eq('venue_id', venueId)
        .gte('next_review_date', new Date().toISOString().split('T')[0])
        .lte('next_review_date', thresholdDate.toISOString().split('T')[0])
        .order('next_review_date')

      if (error) {
        console.error('Error fetching upcoming reviews:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUpcomingReviews:', error)
      throw error
    }
  }

  static async getStaffByRole(venueId: string, roleCategory: string): Promise<VenueTeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .select('*')
        .eq('venue_id', venueId)
        .eq('role_category', roleCategory)
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error fetching staff by role:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStaffByRole:', error)
      throw error
    }
  }

  static async getAvailableStaff(venueId: string): Promise<VenueTeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('venue_team_members')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_available', true)
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error fetching available staff:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAvailableStaff:', error)
      throw error
    }
  }
} 