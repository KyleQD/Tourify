import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

// Validation schemas
const addExistingUserSchema = z.object({
  venue_id: z.string().uuid(),
  user_id: z.string().uuid(),
  position: z.string().min(1),
  department: z.string().min(1),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  start_date: z.string().optional(),
  salary: z.number().optional(),
  permissions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  onboarding_template_id: z.string().uuid().optional()
})

const inviteNewUserSchema = z.object({
  venue_id: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().min(1),
  department: z.string().min(1),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  start_date: z.string().optional(),
  salary: z.number().optional(),
  permissions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  onboarding_template_id: z.string().uuid().optional(),
  message: z.string().optional()
})

const onboardingResponseSchema = z.object({
  candidate_id: z.string().uuid(),
  responses: z.record(z.any()),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string()
  })).optional()
})

export interface OnboardingCandidate {
  id: string
  venue_id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'approved'
  stage: 'invitation' | 'onboarding' | 'review' | 'approved' | 'rejected'
  application_date: string
  avatar_url?: string
  experience_years: number
  skills: string[]
  documents: any[]
  notes: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  template_id?: string
  invitation_token?: string
  onboarding_responses?: any
  review_notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface OnboardingTemplate {
  id: string
  venue_id: string
  name: string
  department: string
  position: string
  description?: string
  estimated_days: number
  required_documents: string[]
  required_fields: any[]
  assignees: string[]
  tags: string[]
  is_default: boolean
  last_used?: string
  use_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

export class EnhancedOnboardingService {
  /**
   * Add an existing user to the onboarding process
   */
  static async addExistingUser(data: z.infer<typeof addExistingUserSchema>) {
    try {
      const validatedData = addExistingUserSchema.parse(data)

      // Get user profile
      const { data: userProfile, error: userError } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', validatedData.user_id)
        .single()

      if (userError) throw new Error('User not found')

      // Check if user is already in onboarding for this venue (by email)
      let existingCandidateQuery = getSupabase()
        .from('staff_onboarding_candidates')
        .select('id')
        .eq('email', userProfile.email)
      
      // Only filter by venue_id if the column exists
      try {
        const { data: columnCheck } = await getSupabase()
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'staff_onboarding_candidates')
          .eq('column_name', 'venue_id')
          .single()
        
        if (columnCheck) {
          existingCandidateQuery = existingCandidateQuery.eq('venue_id', validatedData.venue_id)
        }
      } catch (error) {
        // Column doesn't exist, continue without venue_id filter
      }
      
      const { data: existingCandidate } = await existingCandidateQuery.single()

      if (existingCandidate) {
        throw new Error('User is already in onboarding process for this venue')
      }

      // Create onboarding candidate
      const candidateData: any = {
        name: userProfile.full_name || userProfile.name || 'Unknown',
        email: userProfile.email || '',
        position: validatedData.position,
        department: validatedData.department,
        status: 'in_progress',
        stage: 'onboarding',
        employment_type: validatedData.employment_type,
        start_date: validatedData.start_date,
        salary: validatedData.salary,
        notes: validatedData.notes,
        template_id: validatedData.onboarding_template_id,
        onboarding_progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only add venue_id if the column exists
      try {
        const { data: columnCheck } = await getSupabase()
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'staff_onboarding_candidates')
          .eq('column_name', 'venue_id')
          .single()
        
        if (columnCheck) {
          candidateData.venue_id = validatedData.venue_id
        }
      } catch (error) {
        // Column doesn't exist, continue without venue_id
      }

      const { data: candidate, error: candidateError } = await getSupabase()
        .from('staff_onboarding_candidates')
        .insert(candidateData)
        .select()
        .single()

      if (candidateError) throw candidateError

      // Create notification for the user
      await getSupabase()
        .from('notifications')
        .insert({
          user_id: validatedData.user_id,
          type: 'onboarding_started',
          title: 'Onboarding Started',
          content: `You have been added to the onboarding process for ${validatedData.position} at ${validatedData.department}`,
          metadata: {
            candidate_id: candidate.id,
            venue_id: validatedData.venue_id,
            position: validatedData.position,
            department: validatedData.department
          },
          created_at: new Date().toISOString()
        })

      return { success: true, data: candidate }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error adding existing user:', error)
      throw error
    }
  }

  /**
   * Invite a new user to join and complete onboarding
   */
  static async inviteNewUser(data: z.infer<typeof inviteNewUserSchema>) {
    try {
      const validatedData = inviteNewUserSchema.parse(data)

      if (!validatedData.email && !validatedData.phone) {
        throw new Error('Email or phone is required')
      }

      // Generate invitation token
      const invitationToken = crypto.randomUUID()

      // Create onboarding candidate
      const candidateData: any = {
        name: validatedData.email?.split('@')[0] || 'New User',
        email: validatedData.email || '',
        phone: validatedData.phone || '',
        position: validatedData.position,
        department: validatedData.department,
        status: 'pending',
        stage: 'invitation',
        employment_type: validatedData.employment_type,
        start_date: validatedData.start_date,
        salary: validatedData.salary,
        notes: validatedData.notes,
        template_id: validatedData.onboarding_template_id,
        invitation_token: invitationToken,
        onboarding_progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only add venue_id if the column exists
      try {
        const { data: columnCheck } = await getSupabase()
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'staff_onboarding_candidates')
          .eq('column_name', 'venue_id')
          .single()
        
        if (columnCheck) {
          candidateData.venue_id = validatedData.venue_id
        }
      } catch (error) {
        // Column doesn't exist, continue without venue_id
      }

      const { data: candidate, error: candidateError } = await getSupabase()
        .from('staff_onboarding_candidates')
        .insert(candidateData)
        .select()
        .single()

      if (candidateError) throw candidateError

      // Create invitation record
      await getSupabase()
        .from('staff_invitations')
        .insert({
          email: validatedData.email,
          phone: validatedData.phone,
          position_details: {
            title: validatedData.position,
            description: `${validatedData.position} in ${validatedData.department}`,
            startDate: validatedData.start_date,
            location: 'Venue Location',
            compensation: validatedData.salary ? `$${validatedData.salary}/year` : 'To be discussed'
          },
          token: invitationToken,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      // Send invitation notification
      if (validatedData.email) {
        await getSupabase()
          .from('notifications')
          .insert({
            type: 'staff_signup_invite',
            title: 'You\'ve been invited to join our team!',
            content: `You've been invited to join as ${validatedData.position} in ${validatedData.department}`,
            metadata: {
              candidate_id: candidate.id,
              invitation_token: invitationToken,
              position: validatedData.position,
              department: validatedData.department,
              signup_link: `${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${invitationToken}&type=staff`
            },
            created_at: new Date().toISOString()
          })
      }

      return { 
        success: true, 
        data: candidate,
        invitation_token: invitationToken
      }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error inviting new user:', error)
      throw error
    }
  }

  /**
   * Get onboarding candidates for a venue
   */
  static async getOnboardingCandidates(venueId: string) {
    try {
      // First check if venue_id column exists
      const { data: columnCheck, error: columnError } = await getSupabase()
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'staff_onboarding_candidates')
        .eq('column_name', 'venue_id')
        .single()

      let query = getSupabase()
        .from('staff_onboarding_candidates')
        .select(`
          *,
          template:staff_onboarding_templates(name, description)
        `)

      // Only filter by venue_id if the column exists
      if (columnCheck) {
        query = query.eq('venue_id', venueId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error fetching candidates:', error)
      throw error
    }
  }

  /**
   * Get onboarding templates for a venue
   */
  static async getOnboardingTemplates(venueId: string) {
    try {
      // First check if venue_id column exists
      const { data: columnCheck, error: columnError } = await getSupabase()
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'staff_onboarding_templates')
        .eq('column_name', 'venue_id')
        .single()

      let query = getSupabase()
        .from('staff_onboarding_templates')
        .select('*')

      // Only filter by venue_id if the column exists
      if (columnCheck) {
        query = query.eq('venue_id', venueId)
      }

      const { data, error } = await query
        .order('is_default', { ascending: false })
        .order('use_count', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error fetching templates:', error)
      throw error
    }
  }

  /**
   * Submit onboarding responses
   */
  static async submitOnboardingResponses(data: z.infer<typeof onboardingResponseSchema>) {
    try {
      const validatedData = onboardingResponseSchema.parse(data)

      // Update candidate with responses
      const { data: candidate, error: candidateError } = await getSupabase()
        .from('staff_onboarding_candidates')
        .update({
          onboarding_responses: validatedData.responses,
          status: 'completed',
          stage: 'review',
          onboarding_progress: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.candidate_id)
        .select()
        .single()

      if (candidateError) throw candidateError

      // Create notification for admin review
      await getSupabase()
        .from('notifications')
        .insert({
          type: 'onboarding_completed',
          title: 'Onboarding Completed - Review Required',
          content: `${candidate.name} has completed their onboarding for ${candidate.position}`,
          metadata: {
            candidate_id: candidate.id,
            venue_id: candidate.venue_id,
            position: candidate.position,
            department: candidate.department
          },
          created_at: new Date().toISOString()
        })

      return { success: true, data: candidate }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error submitting responses:', error)
      throw error
    }
  }

  /**
   * Review and approve/reject onboarding candidate
   */
  static async reviewCandidate(
    candidateId: string, 
    action: 'approve' | 'reject', 
    reviewNotes?: string,
    reviewerId?: string
  ) {
    try {
      const { data: candidate, error: candidateError } = await getSupabase()
        .from('staff_onboarding_candidates')
        .select('*')
        .eq('id', candidateId)
        .single()

      if (candidateError) throw candidateError

      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        stage: action === 'approve' ? 'approved' : 'rejected',
        review_notes: reviewNotes,
        updated_at: new Date().toISOString()
      }

      if (action === 'approve' && reviewerId) {
        updateData.approved_by = reviewerId
        updateData.approved_at = new Date().toISOString()
      }

      const { data: updatedCandidate, error: updateError } = await getSupabase()
        .from('staff_onboarding_candidates')
        .update(updateData)
        .eq('id', candidateId)
        .select()
        .single()

      if (updateError) throw updateError

      // If approved, add to venue team
      if (action === 'approve' && candidate.user_id) {
        await this.addToVenueTeam(candidate)
      }

      // Create notification for candidate
      if (candidate.user_id) {
        await getSupabase()
          .from('notifications')
          .insert({
            user_id: candidate.user_id,
            type: action === 'approve' ? 'onboarding_approved' : 'onboarding_rejected',
            title: action === 'approve' ? 'Onboarding Approved!' : 'Onboarding Update',
            content: action === 'approve' 
              ? `Congratulations! Your onboarding has been approved. Welcome to the team!`
              : `Your onboarding application has been reviewed. Please contact HR for more information.`,
            metadata: {
              candidate_id: candidate.id,
              venue_id: candidate.venue_id,
              position: candidate.position,
              department: candidate.department,
              review_notes: reviewNotes
            },
            created_at: new Date().toISOString()
          })
      }

      return { success: true, data: updatedCandidate }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error reviewing candidate:', error)
      throw error
    }
  }

  /**
   * Add approved candidate to venue team
   */
  private static async addToVenueTeam(candidate: OnboardingCandidate) {
    try {
      if (!candidate.id) return

      // Add to venue team members
      await getSupabase()
        .from('venue_team_members')
        .insert({
          venue_id: candidate.venue_id,
          user_id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          role: candidate.position,
          department: candidate.department,
          employment_type: candidate.employment_type,
          hire_date: candidate.start_date || new Date().toISOString(),
          hourly_rate: candidate.salary ? candidate.salary / 2080 : null, // Convert annual to hourly
          status: 'active',
          is_available: true,
          onboarding_completed: true,
          permissions: [],
          notes: candidate.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      console.log('✅ [Enhanced Onboarding Service] Added candidate to venue team')
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error adding to venue team:', error)
      throw error
    }
  }

  /**
   * Get onboarding statistics for a venue
   */
  static async getOnboardingStats(venueId: string) {
    try {
      // First check if venue_id column exists
      const { data: columnCheck, error: columnError } = await getSupabase()
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'staff_onboarding_candidates')
        .eq('column_name', 'venue_id')
        .single()

      let query = getSupabase()
        .from('staff_onboarding_candidates')
        .select('status, stage, onboarding_progress')

      // Only filter by venue_id if the column exists
      if (columnCheck) {
        query = query.eq('venue_id', venueId)
      }

      const { data: candidates, error } = await query

      if (error) throw error

      const stats = {
        total: candidates.length,
        pending: candidates.filter(c => c.status === 'pending').length,
        in_progress: candidates.filter(c => c.status === 'in_progress').length,
        completed: candidates.filter(c => c.status === 'completed').length,
        approved: candidates.filter(c => c.status === 'approved').length,
        rejected: candidates.filter(c => c.status === 'rejected').length,
        average_progress: candidates.length > 0 
          ? Math.round(candidates.reduce((acc, c) => acc + (c.onboarding_progress || 0), 0) / candidates.length)
          : 0
      }

      return stats
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Service] Error fetching stats:', error)
      throw error
    }
  }
} 